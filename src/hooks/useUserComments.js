import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

// 환경 변수 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';

/**
 * 사용자 댓글 목록을 불러오는 Hook
 */
export const useUserComments = (db, userId, markets) => {
    const [userComments, setUserComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(true);

    useEffect(() => {
        if (!db || !userId || markets.length === 0) {
            setCommentsLoading(false);
            setUserComments([]);
            return;
        }

        const unsubscribers = [];
        let allComments = [];
        let marketsToListenCount = 0;

        // 성능을 위해 최근 50개 마켓에 대해서만 댓글 리스너를 붙입니다.
        const marketsToListen = markets.slice(0, 50); 
        
        if (marketsToListen.length === 0) {
            setCommentsLoading(false);
            return;
        }
        
        // 각 마켓의 댓글 컬렉션에 리스너를 붙입니다.
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

                // 현재 사용자 댓글만 필터링
                const filteredComments = allComments.filter(c => c.userId === userId);
                
                // 시간 순으로 정렬 (최신순)
                setUserComments(filteredComments.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)));
                
                marketsToListenCount++;
                if (marketsToListenCount >= marketsToListen.length) {
                    setCommentsLoading(false);
                }
            }, (error) => {
                console.error(`Error fetching comments for market ${market.id}:`, error);
                marketsToListenCount++;
                if (marketsToListenCount >= marketsToListen.length) {
                    setCommentsLoading(false);
                }
            });

            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [db, userId, markets.length]);

    return { userComments, commentsLoading };
};
