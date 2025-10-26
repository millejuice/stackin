/**
 * D-Day 계산 유틸리티
 * @param {Date} date - 비교할 날짜 (Date 객체)
 * @returns {string} - D-Day 문자열 (예: D-3, D-Day, D+1)
 */
export const calculateDDay = (date) => {
    const now = new Date();
    const targetDate = new Date(date); // Ensure it's a Date object
    
    // 시간, 분, 초, 밀리초를 0으로 설정하여 날짜만 비교
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const diffTime = target.getTime() - today.getTime();
    // [수정] D-Day 로직 수정: 0일 23시간 59분 남아도 D-Day로 표시되도록 floor 대신 ceil 사용
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'D-Day';
    } else if (diffDays > 0) {
        return `D-${diffDays}`;
    } else {
        // 이미 지난 경우
        return `D+${Math.abs(diffDays)}`;
    }
};

/**
 * 마켓 상태 반환 (시작 예정, 진행 중, 마감)
 * @param {object} market - 마켓 객체 (startDate, endDate, createdAt 필요)
 * @returns {string} - 'scheduled', 'ongoing', 'closed'
 */
export const getMarketStatus = (market) => {
    const now = new Date();
    // startDate가 없는 구형 마켓 데이터 호환 (createdAt을 startDate로 간주)
    const startDate = market.startDate ? market.startDate.toDate() : market.createdAt.toDate(); 
    const endDate = market.endDate.toDate();

    if (now >= endDate || market.resolved) {
        return 'closed';
    }
    if (now < startDate) {
        return 'scheduled';
    }
    return 'ongoing';
};

/**
 * 현재 가격 및 확률 계산
 */
export const calculateMarketMetrics = (yesContracts, noContracts) => {
    const totalContracts = yesContracts + noContracts;

    if (totalContracts === 0) {
        return { yesPrice: 50, noPrice: 50, yesProb: 50, noProb: 50 };
    }

    const yesProb = Math.round((yesContracts / totalContracts) * 100);
    const noProb = 100 - yesProb;

    const yesPrice = yesProb; 
    const noPrice = noProb;

    return { yesPrice, noPrice, yesProb, noProb };
};

/**
 * 날짜와 시간을 한국어 형식으로 포맷팅
 */
export const formatDateTime = (date) => {
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
};

/**
 * 통화 포맷팅 함수
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', { 
        style: 'currency', 
        currency: 'KRW', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
    }).format(amount);
};
