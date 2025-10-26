import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';

// 환경 변수 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';

/**
 * 예측 시장 목록을 실시간으로 불러오는 Hook
 */
export const useMarkets = (db, isAuthReady) => {
    const [markets, setMarkets] = useState([]);
    const [marketLoading, setMarketLoading] = useState(true);

    useEffect(() => {
        if (!db || !isAuthReady) {
            if (!db) console.log("DB not initialized.");
            if (!isAuthReady) console.log("Waiting for authentication...");
            return;
        }

        // Public Data Path: artifacts/{appId}/public/data/markets
        const marketsColRef = collection(db, `artifacts/${appId}/public/data/markets`);
        const q = query(marketsColRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const marketList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMarkets(marketList.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)));
            setMarketLoading(false);
        }, (error) => {
            // 권한 오류가 발생해도 앱은 실행되도록 처리
            console.error("Error fetching markets: Missing or insufficient permissions. Loading an empty list.", error);
            setMarkets([]); 
            setMarketLoading(false);
        });

        return () => unsubscribe();
    }, [db, isAuthReady]);

    return { markets, marketLoading };
};
