import React, { useState } from 'react';
import { doc, runTransaction, updateDoc, arrayUnion } from 'firebase/firestore';
import { calculateMarketMetrics, getMarketStatus } from '../utils';
import BetButton from './BetButton';
import MarketComments from './MarketComments';

// 환경 변수 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';

/**
 * 마켓 상세 및 베팅 컴포넌트
 */
const MarketDetail = ({ market, userId, userProfile, db, setSelectedMarketId, formatDateTime }) => {
    const { yesPrice, noPrice, yesProb, noProb } = calculateMarketMetrics(market.yesContracts, market.noContracts);
    const [buyAmount, setBuyAmount] = useState(1); // 계약 수
    const [isProcessing, setIsProcessing] = useState(false);
    
    // [수정] 마켓 상태 로직
    const marketStatus = getMarketStatus(market);
    const isMarketOpen = marketStatus === 'ongoing';
    const isMarketScheduled = marketStatus === 'scheduled';
    
    // [수정] 정산 가능 조건
    const isReadyForResolution = market.creatorId === userId && !market.resolved && market.endDate.toDate() < new Date();

    // 사용자 포트폴리오에서 이 시장의 계약 정보
    const userPortfolio = userProfile?.portfolio?.[market.id] || {};
    const userHolding = userPortfolio.Yes?.amount || 0;
    const userHoldingNo = userPortfolio.No?.amount || 0;
    const totalUserContracts = userHolding + userHoldingNo;
    const winningHoldings = market.winningOutcome === 'Yes' ? userHolding : userHoldingNo;

    const handleBuy = async (contractType) => {
        if (!isMarketOpen || isProcessing) return;
        if (buyAmount < 1) {
            alert("계약 수량은 최소 1개 이상이어야 합니다.");
            return;
        }

        setIsProcessing(true);

        const contractPrice = contractType === 'Yes' ? yesPrice : noPrice;
        const totalCost = contractPrice * buyAmount;

        if (userProfile.balance < totalCost) {
            alert("STACK 잔액이 부족합니다. 현재 잔액으로 구매 가능한 수량을 확인해주세요.");
            setIsProcessing(false);
            return;
        }

        const marketRef = doc(db, `artifacts/${appId}/public/data/markets`, market.id);
        const userRef = doc(db, `artifacts/${appId}/users/${userId}/private/profile`);

        try {
            await runTransaction(db, async (transaction) => {
                const marketSnap = await transaction.get(marketRef);
                const userSnap = await transaction.get(userRef);

                if (!marketSnap.exists() || !userSnap.exists()) {
                    throw "Market or User document does not exist!";
                }

                const marketData = marketSnap.data();
                const userData = userSnap.data();

                // 1. 시장 데이터 업데이트
                const newContracts = (marketData[`${contractType.toLowerCase()}Contracts`] || 0) + buyAmount;
                transaction.update(marketRef, {
                    [`${contractType.toLowerCase()}Contracts`]: newContracts,
                });

                // 2. 사용자 잔액 업데이트
                const newBalance = userData.balance - totalCost;
                if (newBalance < 0) {
                    throw new Error("Insufficient funds during transaction.");
                }
                
                // 3. 사용자 포트폴리오 업데이트
                const newPortfolio = { ...userData.portfolio };
                if (!newPortfolio[market.id]) {
                    newPortfolio[market.id] = { Yes: { amount: 0, cost: 0 }, No: { amount: 0, cost: 0 } };
                }

                const existingAmount = newPortfolio[market.id][contractType]?.amount || 0;
                const existingCost = newPortfolio[market.id][contractType]?.cost || 0;

                newPortfolio[market.id][contractType] = {
                    amount: existingAmount + buyAmount,
                    cost: existingCost + totalCost,
                };
                
                // 4. 모든 업데이트 실행
                transaction.update(userRef, {
                    balance: newBalance,
                    portfolio: newPortfolio,
                });
            });

            console.log(`${contractType} ${buyAmount} 계약 구매 완료. 비용: ${totalCost} STACK`);
        } catch (error) {
            console.error("구매 트랜잭션 실패:", error);
            alert("거래 처리 중 오류가 발생했습니다. (잔액 부족 또는 데이터 오류)");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResolve = async (winningOutcome) => {
        if (!market.creatorId || market.creatorId !== userId) {
            alert("시장 개설자만 정산할 수 있습니다.");
            return;
        }

        if (market.resolved) {
            alert("이미 정산된 시장입니다.");
            return;
        }
        
        if (confirm(`정말로 이 시장의 결과를 '${winningOutcome === 'Yes' ? 'YES (성공)' : 'NO (실패)'}'로 확정하시겠습니까?`)) {
            const marketRef = doc(db, `artifacts/${appId}/public/data/markets`, market.id);
            await updateDoc(marketRef, {
                resolved: true,
                winningOutcome: winningOutcome,
                resolvedAt: new Date(),
            });

            alert("정산이 완료되었습니다. 사용자들은 이제 수익금을 수령할 수 있습니다.");
        }
    };
    
    // 수익금 수령 로직
    const handleClaimWinnings = async () => {
        if (!market.resolved || market.claimedUsers?.includes(userId)) return;

        const winningType = market.winningOutcome;

        const userMarketPortfolio = userProfile?.portfolio?.[market.id] || {};
        const winningHoldings = userMarketPortfolio[winningType]?.amount || 0;

        if (winningHoldings === 0) {
             alert("수령할 금액이 없습니다. (당첨된 계약이 0개)");
            return;
        }

        setIsProcessing(true);
        const userRef = doc(db, `artifacts/${appId}/users/${userId}/private/profile`);
        const marketRef = doc(db, `artifacts/${appId}/public/data/markets`, market.id);

        try {
             await runTransaction(db, async (transaction) => {
                const marketSnap = await transaction.get(marketRef);
                const userSnap = await transaction.get(userRef);

                if (marketSnap.data().claimedUsers?.includes(userId)) {
                    throw new Error("이미 수익금을 수령했습니다.");
                }

                const userData = userSnap.data();

                // 1. 총 상금 계산
                const totalWinnings = winningHoldings * 100;

                // 2. 잔액 업데이트
                const newBalance = userData.balance + totalWinnings;

                // 3. 사용자 잔액 및 claimedUsers 목록 업데이트
                transaction.update(userRef, {
                    balance: newBalance,
                });
                transaction.update(marketRef, {
                    claimedUsers: arrayUnion(userId)
                });
            });

            alert(`총 ${totalWinnings} STACK을 수령했습니다!`);
        } catch (error) {
             console.error("수익금 수령 트랜잭션 실패:", error);
            alert(`수익금 수령에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <button onClick={() => setSelectedMarketId(null)} className="text-indigo-500 hover:text-indigo-700 mb-4 flex items-center">
                <span className="text-xl mr-1">←</span> 목록으로 돌아가기
            </button>

            {/* 시장 상세 정보 */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                <p className="text-sm font-medium text-indigo-500">{market.companyName} 예측</p>
                <h2 className="text-2xl font-bold mt-1 text-gray-900">{market.question}</h2>
                <p className="text-sm text-gray-500 mt-2">
                    {market.startDate && `시작일: ${formatDateTime(market.startDate.toDate())} | `}
                    마감일: {formatDateTime(market.endDate.toDate())} | 개설자: {market.creatorName} ({market.creatorId.substring(0, 5)}...)
                </p>
                <p className="mt-3 text-gray-700 whitespace-pre-line">{market.description}</p>
            </div>

            {/* 시장 상태 및 베팅 인터페이스 */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4">시장 현황 (100 STACK = 100 KRW)</h3>

                <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-green-600">YES ({yesProb}%)</span>
                    <span className="text-xl font-bold text-red-600">NO ({noProb}%)</span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-3">
                    <div className="bg-green-600 h-3 rounded-full" style={{ width: `${yesProb}%` }}></div>
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">총 참여 계약: {market.yesContracts + market.noContracts}개</p>

                {/* 베팅 섹션 */}
                {isMarketOpen ? (
                    <div className="mt-6 border-t pt-4 space-y-4">
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium">계약 수량:</label>
                            <input
                                type="number"
                                value={buyAmount}
                                onChange={(e) => setBuyAmount(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                className="w-20 p-2 border rounded-lg text-center font-mono"
                            />
                        </div>

                        <div className="flex space-x-4">
                            <BetButton
                                label={`YES (${yesPrice} STACK/계약)`}
                                color="bg-green-500 hover:bg-green-600"
                                totalCost={yesPrice * buyAmount}
                                onClick={() => handleBuy('Yes')}
                                disabled={isProcessing}
                            />
                            <BetButton
                                label={`NO (${noPrice} STACK/계약)`}
                                color="bg-red-500 hover:bg-red-600"
                                totalCost={noPrice * buyAmount}
                                onClick={() => handleBuy('No')}
                                disabled={isProcessing}
                            />
                        </div>
                    </div>
                ) : (
                    <p className="mt-6 text-center text-lg font-semibold text-gray-500">
                        {market.resolved ? `정산 완료. 승리: ${market.winningOutcome}` : '베팅 마감'}
                    </p>
                )}
            </div>

            {/* 사용자 포트폴리오 */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4">내 포트폴리오 ({totalUserContracts} 계약)</h3>
                <div className="space-y-2">
                    <p className="text-gray-700">
                        <span className="font-semibold text-green-600">YES 보유:</span> {userHolding} 계약
                    </p>
                    <p className="text-gray-700">
                        <span className="font-semibold text-red-600">NO 보유:</span> {userHoldingNo} 계약
                    </p>
                </div>

                {/* 정산 섹션 */}
                {market.resolved && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-lg font-bold mb-2">결과 확정: {market.winningOutcome === 'Yes' ? 'YES 승리' : 'NO 승리'}</p>
                         {market.claimedUsers?.includes(userId) ? (
                            <p className="text-green-600 font-bold">✅ 수익금 수령 완료</p>
                        ) : (
                            <button 
                                onClick={handleClaimWinnings}
                                disabled={isProcessing || market.claimedUsers?.includes(userId)}
                                className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {isProcessing ? '수령 중...' : `수익금 수령하기 (${winningHoldings * 100} STACK)`}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 시장 개설자 전용 정산 버튼 (UserId가 일치할 경우에만 보임) */}
            {market.creatorId === userId && !market.resolved && (
                <div className="bg-yellow-50 p-6 rounded-xl shadow-lg border-2 border-yellow-300 space-y-3">
                    <h3 className="text-xl font-bold text-yellow-800">개설자 관리 (정산)</h3>
                    <p className="text-sm text-yellow-700">이 시장의 결과를 최종 확정합니다. 신중하게 결정하세요.</p>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => handleResolve('Yes')}
                            className="flex-1 bg-green-700 text-white p-3 rounded-lg font-bold hover:bg-green-800 transition-colors disabled:opacity-50"
                            disabled={isProcessing}
                        >
                            YES로 정산
                        </button>
                        <button
                            onClick={() => handleResolve('No')}
                            className="flex-1 bg-red-700 text-white p-3 rounded-lg font-bold hover:bg-red-800 transition-colors disabled:opacity-50"
                            disabled={isProcessing}
                        >
                            NO로 정산
                        </button>
                    </div>
                </div>
            )}
            
            {/* 토론 기능 추가 */}
            <MarketComments marketId={market.id} db={db} userId={userId} userName={userProfile.displayName} userProfile={userProfile} />
        </div>
    );
};

export default MarketDetail;
