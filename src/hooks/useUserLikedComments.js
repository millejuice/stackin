import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

// 환경 변수 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';

/**
 * 사용자가 좋아요 누른 댓글 목록을 불러오는 Hook
 */
export const useUserLikedComments = (db, userId, markets) => {
    const [userLikedComments, setUserLikedComments] = useState([]);
    const [likedCommentsLoading, setLikedCommentsLoading] = useState(true);

    useEffect(() => {
        if (!db || !userId || markets.length === 0) {
            setLikedCommentsLoading(false);
            setUserLikedComments([]);
            return;
        }

        const unsubscribers = [];
        let allComments = [];
        let marketsToListenCount = 0;

        // 성능을 위해 최근 50개 마켓에 대해서만 댓글 리스너를 붙입니다.
        const marketsToListen = markets.slice(0, 50);

        if (marketsToListen.length === 0) {
            setLikedCommentsLoading(false);
            return;
        }

        marketsToListen.forEach(market => {
            const commentsColRef = collection(db, `artifacts/${appId}/public/data/markets/${market.id}/comments`);
            const unsubscribe = onSnapshot(commentsColRef, (snapshot) => {
                const marketComments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    marketId: market.id,
                    marketQuestion: market.question,
                    marketCompanyName: market.companyName,
                    ...doc.data()
                }));

                // 전체 댓글 목록을 업데이트하고 현재 마켓의 댓글을 최신화합니다.
                allComments = allComments
                    .filter(c => c.marketId !== market.id)
                    .concat(marketComments);

                // 현재 사용자가 '좋아요' 누른 댓글만 필터링
                const filteredComments = allComments.filter(c => c.likedBy?.includes(userId));

                // 시간 순으로 정렬 (최신순)
                setUserLikedComments(filteredComments.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)));

                marketsToListenCount++;
                if (marketsToListenCount >= marketsToListen.length) {
                    setLikedCommentsLoading(false);
                }
            }, (error) => {
                console.error(`Error fetching comments for market ${market.id}:`, error);
                marketsToListenCount++;
                if (marketsToListenCount >= marketsToListen.length) {
                    setLikedCommentsLoading(false);
                }
            });

            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [db, userId, markets.length]);

    return { userLikedComments, likedCommentsLoading };
};
