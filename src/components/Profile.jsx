import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * 프로필 화면 컴포넌트 (Image 2 스타일 반영)
 */
// [수정] userLikedComments, likedCommentsLoading props 추가
const Profile = ({ userProfile, markets, formatCurrency, userComments, commentsLoading, userLikedComments, likedCommentsLoading, db }) => {
    
    // [추가] 프로필 편집 상태
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editProfileData, setEditProfileData] = useState({
        displayName: userProfile.displayName,
        bio: userProfile.bio || '',
        photoURL: userProfile.photoURL || '',
    });

    // [추가] 편집 폼 데이터 변경 핸들러
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditProfileData(prev => ({ ...prev, [name]: value }));
    };

    // [추가] 편집 시작 핸들러
    const handleEditStart = () => {
        // 현재 프로필 정보로 폼 초기화
        setEditProfileData({
            displayName: userProfile.displayName,
            bio: userProfile.bio || '',
            photoURL: userProfile.photoURL || '',
        });
        setIsEditing(true);
    };

    // [추가] 편집 취소 핸들러
    const handleEditCancel = () => {
        setIsEditing(false);
    };

    // [추가] 프로필 저장 핸들러
    const handleSaveProfile = async () => {
        if (!editProfileData.displayName) {
            alert("닉네임은 필수입니다.");
            return;
        }
        setIsSaving(true);
        
        // userProfile에 userId가 포함되어 있는지 확인 (initializeUser에서 추가됨)
        if (!userProfile.userId) {
            console.error("User ID is missing from userProfile.");
            alert("프로필 저장 중 오류가 발생했습니다. (사용자 ID 없음)");
            setIsSaving(false);
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';
        // db는 props로 전달받아야 함
        if (!db) {
            console.error("Database not available");
            alert("데이터베이스 연결이 없습니다.");
            setIsSaving(false);
            return;
        }
        const userRef = doc(db, `artifacts/${appId}/users/${userProfile.userId}/private/profile`);
        
        try {
            await updateDoc(userRef, {
                displayName: editProfileData.displayName,
                bio: editProfileData.bio,
                photoURL: editProfileData.photoURL,
            });
            
            // onSnapshot이 AppLayout에서 userProfile을 실시간으로 업데이트하므로
            // 별도 상태 업데이트 없이 UI가 자동으로 변경됩니다.
            
            setIsEditing(false);
            alert("프로필이 저장되었습니다.");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("프로필 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };
    // 포트폴리오를 시장별로 재구성
    const userMarketHoldings = useMemo(() => {
        const holdings = [];
        if (!userProfile?.portfolio) return holdings;

        for (const marketId in userProfile.portfolio) {
            const market = markets.find(m => m.id === marketId);
            if (!market) continue;

            const portfolioEntry = userProfile.portfolio[marketId];
            const totalContracts = (portfolioEntry.Yes?.amount || 0) + (portfolioEntry.No?.amount || 0);

            if (totalContracts > 0) {
                const isResolved = market.resolved;
                const claimed = market.claimedUsers?.includes(userProfile.userId);

                holdings.push({
                    id: marketId,
                    companyName: market.companyName,
                    question: market.question,
                    isResolved,
                    claimed,
                    winningOutcome: market.winningOutcome,
                    totalContracts,
                    holdingDetails: portfolioEntry,
                });
            }
        }
        return holdings.sort((a, b) => b.isResolved - a.isResolved);
    }, [userProfile, markets]);

    return (
        <div className="pb-20 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-4">내 프로필</h2>

            {/* [수정] 프로필 카드 - 편집 모드 / 보기 모드 */}
            {isEditing ? (
                // --- 편집 모드 ---
                <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 self-start">프로필 편집</h3>
                    <input
                        type="text"
                        name="displayName"
                        value={editProfileData.displayName}
                        onChange={handleEditChange}
                        placeholder="닉네임 (필수)"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                    <input
                        type="text"
                        name="bio"
                        value={editProfileData.bio}
                        onChange={handleEditChange}
                        placeholder="한 줄 소개"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                        type="url"
                        name="photoURL"
                        value={editProfileData.photoURL}
                        onChange={handleEditChange}
                        placeholder="프로필 사진 URL (예: https://.../image.png)"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="flex w-full space-x-2 mt-2">
                        <button 
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="flex-1 bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? '저장 중...' : '저장'}
                        </button>
                        <button 
                            onClick={handleEditCancel}
                            disabled={isSaving}
                            className="flex-1 bg-gray-200 text-gray-800 p-3 rounded-lg font-bold hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            취소
                        </button>
                    </div>
                </div>
            ) : (
                // --- 보기 모드 ---
                <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center relative">
                    {/* 편집 버튼 */}
                    <button 
                        onClick={handleEditStart}
                        className="absolute top-3 right-3 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label="프로필 편집"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </button>
                    
                    {/* [수정] 프로필 사진 */}
                    {userProfile.photoURL ? (
                        <img 
                            src={userProfile.photoURL} 
                            alt={userProfile.displayName} 
                            className="w-16 h-16 rounded-full object-cover" 
                            // [추가] 이미지 로드 실패 시 대체
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                    ) : null}
                    {/* Fallback Initial */}
                    <div 
                        className={`w-16 h-16 bg-indigo-200 rounded-full items-center justify-center text-xl font-bold text-indigo-700 ${userProfile.photoURL ? 'hidden' : 'flex'}`}
                    >
                        {userProfile.displayName.substring(0, 1)}
                    </div>
                    
                    <h3 className="text-xl font-bold mt-3 text-gray-900">{userProfile.displayName}</h3>
                    {/* [수정] '지인 대상 모의 투자자' -> bio 필드로 변경 */}
                    <p className="text-sm text-gray-500">{userProfile.bio || '한 줄 소개가 없습니다.'}</p>
                    <div className="flex space-x-2 mt-3">
                        <span className="px-3 py-1 text-xs bg-gray-100 rounded-full text-gray-600">비상장 관심</span>
                        <span className="px-3 py-1 text-xs bg-gray-100 rounded-full text-gray-600">프로토타입 테스트</span>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                <h3 className="text-lg font-bold text-gray-800 mb-2">총 보유 STACK (가상 잔액)</h3>
                <p className="text-3xl font-extrabold text-green-600">
                    {formatCurrency(userProfile.balance || 0).replace('KRW', 'STACK')}
                </p>
                <p className="text-xs text-gray-500 mt-1">1 STACK은 모의 베팅에서 1 KRW의 가치를 지닙니다.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">나의 참여 시장 ({userMarketHoldings.length}개)</h3>
                <div className="space-y-3">
                    {userMarketHoldings.length > 0 ? (
                        userMarketHoldings.map((holding) => (
                            <div key={holding.id} className={`p-3 border rounded-lg ${holding.isResolved ? 'bg-gray-50' : 'hover:bg-indigo-50'}`}>
                                {/* [수정] companyName을 카테고리로 표시 */}
                                <p className="font-semibold text-gray-800">{holding.companyName} 예측</p>
                                <p className="text-xs text-gray-600 truncate">{holding.question}</p>
                                <div className="mt-1 text-sm">
                                    <span className="font-bold text-indigo-600 mr-2">{holding.totalContracts} 계약</span>
                                    {holding.isResolved ? (
                                        <span className={`text-xs font-semibold ${holding.winningOutcome === 'Yes' ? 'text-green-600' : 'text-red-600'}`}>
                                            | 결과: {holding.winningOutcome} ({holding.claimed ? '수령 완료' : '수령 가능'})
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-500">| 진행 중</span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">아직 참여한 시장이 없습니다。</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">나의 댓글 활동</h3>
                {commentsLoading ? (
                     <p className="text-sm text-gray-500 text-center py-4">댓글 활동 로딩 중...</p>
                ) : userComments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">아직 작성한 댓글이 없습니다. 마켓에서 의견을 남겨보세요!</p>
                ) : (
                    <div className="space-y-3">
                        {userComments.map((comment) => (
                            <div key={comment.id} className="p-3 border rounded-lg bg-indigo-50">
                                <p className="text-xs text-indigo-600 font-medium truncate">
                                    {comment.marketCompanyName} - {comment.marketQuestion}
                                </p>
                                <p className="mt-1 text-sm text-gray-800 whitespace-pre-line">{comment.text}</p>
                                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                    <span>❤️ {comment.likedBy?.length || 0}</span>
                                    <span>{comment.createdAt?.toDate()?.toLocaleDateString('ko-KR')} 작성</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* [신규] 좋아요 누른 의견 섹션 */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">좋아요 누른 의견</h3>
                {likedCommentsLoading ? (
                     <p className="text-sm text-gray-500 text-center py-4">좋아요 누른 의견 로딩 중...</p>
                ) : userLikedComments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">아직 좋아요 누른 의견이 없습니다.</p>
                ) : (
                    <div className="space-y-3">
                        {userLikedComments.map((comment) => (
                            <div key={comment.id} className="p-3 border rounded-lg bg-gray-50">
                                <p className="text-xs text-indigo-600 font-medium truncate">
                                    {comment.marketCompanyName} - {comment.marketQuestion}
                                </p>
                                <p className="mt-1 text-sm text-gray-800 whitespace-pre-line">{comment.text}</p>
                                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                    <span>❤️ {comment.likedBy?.length || 0}</span>
                                    <span>작성자: {comment.userName}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
        </div>
    );
};

export default Profile;
