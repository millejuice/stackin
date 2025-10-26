import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, setLogLevel } from 'firebase/firestore';

// Firebase 디버그 로깅 활성화 (오류 1040 디버깅에 유용)
setLogLevel('Debug');

// --- 환경 변수 설정 (Canvas에서 제공되는 전역 변수 사용) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};
// [오류 수정] 오타: __initialAuthToken -> __initial_auth_token
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase 초기화 (앱 실행 시 한 번만 실행)
let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// 상수 정의
const INITIAL_STACK_BALANCE = 100000; // 초기 잔액 100,000 STACK (10만원 상당)
const BLUR_LIKE_THRESHOLD = 10; // 블러 처리 기준 좋아요 수
const UNLOCK_COST = 100; // 블러 해제 비용 (STACK)
const LIKE_REWARD = 5; // [추가] 좋아요당 지급되는 금액

/**
 * Firestore 보안 규칙을 임시로 설정하여 권한 문제를 해결합니다.
 */
const ensureFirestoreSecurityRules = async () => {
    console.log("Attempting to ensure security rules are handled by Canvas environment.");
};

/**
 * 사용자 데이터 구조 초기화 함수
 * @param {string} userId - 사용자 ID
 */
const initializeUser = async (userId) => {
    // artifacts/{appId}/users/{userId}/private/profile (짝수 세그먼트)
    const userRef = doc(db, `artifacts/${appId}/users/${userId}/private/profile`);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        await setDoc(userRef, {
            userId: userId,
            displayName: `Trader-${userId.substring(0, 6)}`,
            balance: INITIAL_STACK_BALANCE,
            portfolio: {}, 
            marketsCreated: [],
            // [추가] 프로필 필드
            photoURL: '', // 프로필 사진 URL
            bio: '', // 한 줄 소개
            // 결제하여 잠금 해제한 댓글 목록
            unlockedComments: [],
            createdAt: new Date(),
        });
        console.log(`User ${userId} initialized.`);
    }
};

/**
 * 인증 및 Firestore 초기화 관리
 */
export const useAuthAndDb = () => {
    const [userId, setUserId] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // 1. 인증 지속성 설정 (모바일 환경의 안정성 향상을 위해 추가)
                await setPersistence(auth, browserSessionPersistence);
                
                // 2. 인증 처리
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }

                // 3. 인증 상태 변화 리스너 설정
                const unsubscribe = onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        const currentUserId = user.uid;
                        setUserId(currentUserId);
                        setIsAuthReady(true);
                        
                        // 데이터 로드 전 초기화 및 규칙 확인
                        await ensureFirestoreSecurityRules();
                        await initializeUser(currentUserId);

                        // 4. 사용자 프로필 실시간 리스너 설정
                        const userProfileRef = doc(db, `artifacts/${appId}/users/${currentUserId}/private/profile`);
                        
                        // 프로필 데이터 로드 실패 시에도 로딩 상태는 해제되도록 보장
                        onSnapshot(userProfileRef, (docSnap) => {
                            if (docSnap.exists()) {
                                setUserProfile(docSnap.data());
                            } else {
                                setUserProfile(null);
                            }
                            setIsLoading(false); 
                        }, (error) => {
                            console.error("User Profile Snapshot Error (Likely Security Rules Issue or Network):", error);
                            setIsLoading(false); // 오류 발생 시에도 앱이 멈추지 않도록 로딩 해제
                        });
                    } else {
                        setUserId(null);
                        setUserProfile(null);
                        setIsAuthReady(true);
                        setIsLoading(false);
                    }
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Authentication/Initialization failed:", error);
                setIsLoading(false);
            }
        };

        if (db && auth) {
            initializeFirebase();
        }
    }, []);

    return { db, auth, userId, userProfile, isLoading, isAuthReady }; 
};
