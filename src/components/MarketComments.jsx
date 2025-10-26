import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, arrayUnion, arrayRemove, runTransaction } from 'firebase/firestore';

// 환경 변수 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';

// 상수 정의
const BLUR_LIKE_THRESHOLD = 10; // 블러 처리 기준 좋아요 수
const UNLOCK_COST = 100; // 블러 해제 비용 (STACK)
const LIKE_REWARD = 5; // [추가] 좋아요당 지급되는 금액

/**
 * 토론 기능 컴포넌트
 */
const MarketComments = ({ marketId, db, userId, userName, userProfile }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [argumentType, setArgumentType] = useState('Pro'); // 'Pro' 또는 'Con'
    const [commentLoading, setCommentLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        if (!db || !marketId) return;

        // Public data: artifacts/{appId}/public/data/markets/{marketId}/comments
        const commentsColRef = collection(db, `artifacts/${appId}/public/data/markets/${marketId}/comments`);
        const q = query(commentsColRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // 좋아요 수가 많은 순서로 정렬 (이미지 참고)
            setComments(commentList.sort((a, b) => (b.likedBy?.length || 0) - (a.likedBy?.length || 0)));
            setCommentLoading(false);
        }, (error) => {
            console.error("Error fetching comments:", error);
            setCommentLoading(false);
        });

        return () => unsubscribe();
    }, [db, marketId]);

    const handlePostComment = async () => {
        if (!newComment.trim() || isPosting) return;

        setIsPosting(true);

        try {
            const commentsColRef = collection(db, `artifacts/${appId}/public/data/markets/${marketId}/comments`);
            await addDoc(commentsColRef, {
                userId: userId,
                userName: userName,
                // [추가] 사용자 프로필 사진 URL 저장
                photoURL: userProfile.photoURL || '', 
                text: newComment,
                argumentType: argumentType, // 'Pro' 또는 'Con' 저장
                // 좋아요 기능을 위한 배열 초기화
                likedBy: [], 
                createdAt: new Date(),
            });
            setNewComment('');
        } catch (error) {
            console.error("Error posting comment:", error);
            alert("댓글 작성 중 오류가 발생했습니다.");
        } finally {
            setIsPosting(false);
        }
    };
    
    // [수정] 좋아요 처리 로직 - 트랜잭션을 사용하여 작성자에게 5 STACK 지급/회수
    const handleLike = async (comment) => {
        // [추가] 본인 글에는 '좋아요'를 누를 수 없음
        if (comment.userId === userId) {
            console.log("Self-liking is not allowed.");
            return;
        }

        const commentRef = doc(db, `artifacts/${appId}/public/data/markets/${marketId}/comments`, comment.id);
        const creatorRef = doc(db, `artifacts/${appId}/users/${comment.userId}/private/profile`);
        const alreadyLiked = comment.likedBy?.includes(userId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const creatorSnap = await transaction.get(creatorRef);
                const creatorData = creatorSnap.data();
                
                let newLikedBy;
                let balanceChange;

                if (alreadyLiked) {
                    // 좋아요 취소: 작성자 잔액 5 STACK 회수
                    balanceChange = -LIKE_REWARD;
                    
                    // 잔액이 부족하면 회수하지 않음 (안전장치)
                    if (creatorData.balance + balanceChange < 0) {
                        // [핵심 로직] 작성자에게 알림만 남기고 좋아요 취소만 진행.
                        console.warn("Creator balance too low for reward reversal, proceeding with like removal only.");
                    } else {
                        // [핵심 로직] 작성자에게서 잔액 회수
                        transaction.update(creatorRef, {
                            balance: creatorData.balance + balanceChange,
                        });
                    }
                    
                    // 좋아요 목록에서 제거
                    newLikedBy = arrayRemove(userId);

                } else {
                    // 좋아요 누름: 작성자 잔액 5 STACK 지급
                    balanceChange = LIKE_REWARD;
                    
                    // [핵심 로직] 작성자에게 잔액 지급
                    transaction.update(creatorRef, {
                        balance: creatorData.balance + balanceChange,
                    });
                    
                    // 좋아요 목록에 추가
                    newLikedBy = arrayUnion(userId);
                }

                // 댓글 문서의 좋아요 목록 업데이트
                transaction.update(commentRef, {
                    likedBy: newLikedBy
                });
            });

            console.log(`Like transaction successful. Change: ${alreadyLiked ? 'Canceled' : 'Received'} ${LIKE_REWARD} STACK.`);
        } catch (error) {
            console.error("Error handling like transaction:", error);
            alert("좋아요 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        }
    };

    // 결제 및 블러 해제 로직
    const handleUnlockComment = async (comment) => {
        if (userProfile.balance < UNLOCK_COST) {
            alert(`잔액이 부족합니다. 댓글을 잠금 해제하려면 ${UNLOCK_COST} STACK이 필요합니다.`);
            return;
        }

        const userRef = doc(db, `artifacts/${appId}/users/${userId}/private/profile`);
        const creatorRef = doc(db, `artifacts/${appId}/users/${comment.userId}/private/profile`);

        try {
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userRef);
                const creatorSnap = await transaction.get(creatorRef);
                
                const userData = userSnap.data();
                const creatorData = creatorSnap.data();

                if (userData.balance < UNLOCK_COST) {
                    throw new Error("Insufficient balance.");
                }

                // 1. 사용자 잔액 차감 및 잠금 해제 기록 추가
                transaction.update(userRef, {
                    balance: userData.balance - UNLOCK_COST,
                    unlockedComments: arrayUnion(comment.id)
                });

                // 2. 댓글 작성자 잔액 추가 (수익 배분)
                transaction.update(creatorRef, {
                    balance: creatorData.balance + UNLOCK_COST
                });
            });

            alert(`${UNLOCK_COST} STACK을 지불하고 댓글을 잠금 해제했습니다!`);

        } catch (error) {
            console.error("Unlock transaction failed:", error);
            alert(`잠금 해제 트랜잭션 실패: ${error.message || '알 수 없는 오류'}`);
        }
    };
    
    const ProComments = comments.filter(c => c.argumentType === 'Pro');
    const ConComments = comments.filter(c => c.argumentType === 'Con');

    // 댓글 카드 컴포넌트 (이미지 스타일 반영)
    const CommentCard = ({ comment }) => {
        const likeCount = comment.likedBy?.length || 0;
        const isBlurred = likeCount >= BLUR_LIKE_THRESHOLD;
        const isUnlocked = userProfile.unlockedComments?.includes(comment.id) || comment.userId === userId;
        const isLiked = comment.likedBy?.includes(userId);
        // [추가] 본인 댓글인지 확인
        const isOwnComment = comment.userId === userId;

        const cardBg = comment.argumentType === 'Pro' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400';
        const likeIcon = '👍'; 
        const likeColor = isLiked ? 'text-indigo-600' : 'text-gray-500'; // 좋아요 누르면 인디고 색상 유지

        const displayCommentText = isBlurred && !isUnlocked
            ? '*********** 이 의견은 블러 처리되었습니다. ***********'
            : comment.text;

        const textClass = isBlurred && !isUnlocked ? 'text-sm text-gray-500 italic filter blur-sm' : 'text-gray-800 whitespace-pre-line';
        
        return (
            <div className={`p-4 rounded-xl shadow-md border-l-4 ${cardBg} transition-all duration-300`}>
                <div className="flex justify-between items-start mb-2">
                    {/* [수정] 프로필 사진과 이름 표시 */}
                    <div className="flex items-center space-x-2">
                        {comment.photoURL ? (
                            <img src={comment.photoURL} alt={comment.userName} className="w-6 h-6 rounded-full object-cover" 
                                // [추가] 이미지 로드 실패 시 대체
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                        ) : null}
                         {/* Fallback Initial */}
                        <div 
                            className={`w-6 h-6 bg-gray-300 rounded-full items-center justify-center text-xs font-bold ${comment.photoURL ? 'hidden' : 'flex'}`}
                        >
                            {comment.userName.substring(0, 1)}
                        </div>
                        <span className="text-xs font-semibold text-gray-500">{comment.userName}</span>
                    </div>
                    <span className={`text-xl font-bold ${likeColor}`}>{likeIcon} {likeCount}</span>
                </div>
                
                <p className={`text-base font-medium ${textClass}`}>{displayCommentText}</p>
                
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-opacity-30">
                    <button 
                        onClick={() => handleLike(comment)}
                        // [수정] 본인 댓글이면 비활성화
                        disabled={isOwnComment}
                        className={`text-sm flex items-center transition-colors ${
                            isLiked ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-400'
                        } ${isOwnComment ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {/* [수정] '공감' -> '좋아요', '취소'로 워딩 변경 */}
                        {isLiked ? '👍 취소' : '👍 좋아요'}
                    </button>
                    
                    {isBlurred && !isUnlocked && (
                        <button
                            onClick={() => handleUnlockComment(comment)}
                            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            {UNLOCK_COST} STACK 결제하고 보기
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">찬/반 의견 토론</h3>

            {/* 댓글 입력 폼 */}
            <div className="mb-6 border p-4 rounded-lg bg-gray-50 space-y-3">
                <div className="flex space-x-4">
                    <button
                        type="button"
                        onClick={() => setArgumentType('Pro')}
                        className={`flex-1 p-2 rounded-lg font-bold transition-colors ${argumentType === 'Pro' ? 'bg-green-500 text-white' : 'bg-white border text-green-500 hover:bg-green-100'}`}
                    >
                        {/* [수정] 'Pro 주장하기' -> '찬성 주장하기' */}
                        + 찬성 주장하기
                    </button>
                    <button
                        type="button"
                        onClick={() => setArgumentType('Con')}
                        className={`flex-1 p-2 rounded-lg font-bold transition-colors ${argumentType === 'Con' ? 'bg-red-500 text-white' : 'bg-white border text-red-500 hover:bg-red-100'}`}
                    >
                        {/* [수정] 'Con 주장하기' -> '반대 주장하기' */}
                        + 반대 주장하기
                    </button>
                </div>
                
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    // [수정] 플레이스홀더 텍스트도 한국어로 조정
                    placeholder={`${argumentType === 'Pro' ? '찬성하는 이유' : '반대하는 이유'}에 대한 의견을 작성해주세요...`}
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
                <button
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || isPosting}
                    className="w-full bg-indigo-500 text-white p-2 rounded-lg font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                    {/* [수정] 의견 제출 버튼도 한국어로 통일 */}
                    {isPosting ? '작성 중...' : `${argumentType === 'Pro' ? '찬성 의견 제출' : '반대 의견 제출'}`}
                </button>
            </div>

            {/* 의견 목록 (Pro/Con 분리) */}
            <div className="flex flex-col md:flex-row md:space-x-4">
                {/* Pro Arguments Column */}
                <div className="flex-1 space-y-4 mb-6 md:mb-0">
                    {/* [수정] 'Top Pro Arguments' -> '최고 찬성 의견' */}
                    <h4 className="text-xl font-bold text-green-600 border-b-2 border-green-600 pb-1">최고 찬성 의견</h4>
                    {commentLoading ? (
                         <p className="text-center text-gray-500">로딩 중...</p>
                    ) : ProComments.length === 0 ? (
                        <p className="text-sm text-gray-500">찬성 의견이 없습니다.</p>
                    ) : (
                        ProComments.map(comment => (
                            <CommentCard key={comment.id} comment={comment} />
                        ))
                    )}
                </div>

                {/* Con Arguments Column */}
                <div className="flex-1 space-y-4">
                    {/* [수정] 'Top Con Arguments' -> '최고 반대 의견' */}
                    <h4 className="text-xl font-bold text-red-600 border-b-2 border-red-600 pb-1">최고 반대 의견</h4>
                     {commentLoading ? (
                         <p className="text-center text-gray-500">로딩 중...</p>
                    ) : ConComments.length === 0 ? (
                        <p className="text-sm text-gray-500">반대 의견이 없습니다.</p>
                    ) : (
                        ConComments.map(comment => (
                            <CommentCard key={comment.id} comment={comment} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketComments;
