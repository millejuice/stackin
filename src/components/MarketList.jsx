import React, { useMemo } from 'react';
import MarketCard from './MarketCard';
import { getMarketStatus } from '../utils';

/** 섹션 (타이틀 중앙정렬) */
const MarketSection = ({ title, markets, status, setSelectedMarketId, formatDateTime }) => (
  <section>
    <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
      {title} <span className="text-gray-500 text-sm">({markets.length})</span>
    </h3>

    {markets.length === 0 ? (
      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
        <p className="text-gray-500 text-sm">해당하는 예측이 없습니다.</p>
      </div>
    ) : (
      <div className="space-y-3">
        {markets.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            status={status}
            onClick={() => setSelectedMarketId(market.id)}
            formatDateTime={formatDateTime}
          />
        ))}
      </div>
    )}
  </section>
);

/** 마켓 목록 (중앙정렬 헤더 포함, 기존 로직 통합) */
const MarketList = ({
  markets,
  setSelectedMarketId,
  formatDateTime,
  filterCategory,
  setFilterCategory,
}) => {
  // 🔹 테스트 데이터 (기존 유지)
  const testMarkets = [
    {
      id: 'test1',
      companyName: '정치',
      question: '오늘 CPI 지수는 나스닥을 하락시킬까요?',
      yesContracts: 5,
      noContracts: 26,
      endDate: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
      startDate: { toDate: () => new Date(Date.now() - 24 * 60 * 60 * 1000) },
      resolved: false,
    },
    {
      id: 'test2',
      companyName: '경제',
      question: '삼성 10만?',
      yesContracts: 0,
      noContracts: 0,
      endDate: { toDate: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      startDate: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
      resolved: false,
    },
    {
      id: 'test3',
      companyName: '경제',
      question: '금리 인하?',
      yesContracts: 0,
      noContracts: 0,
      endDate: { toDate: () => new Date(Date.now() - 24 * 60 * 60 * 1000) },
      startDate: { toDate: () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      resolved: false,
    },
  ];

  // 🔹 실제 데이터 없으면 테스트 데이터 사용
  const allMarkets = (markets ?? []).length ? markets : testMarkets;

  // 🔹 상태별 분류 + 정렬
  const { ongoingMarkets, scheduledMarkets, closedMarkets } = useMemo(() => {
    const ongoing = [];
    const scheduled = [];
    const closed = [];

    allMarkets.forEach((m) => {
      const status = getMarketStatus(m);
      if (status === 'ongoing') ongoing.push(m);
      else if (status === 'scheduled') scheduled.push(m);
      else closed.push(m);
    });

    ongoing.sort((a, b) => a.endDate.toDate() - b.endDate.toDate()); // 마감 임박
    scheduled.sort(
      (a, b) =>
        (a.startDate ? a.startDate.toDate() : 0) -
        (b.startDate ? b.startDate.toDate() : 0)
    ); // 시작 임박
    closed.sort((a, b) => b.endDate.toDate() - a.endDate.toDate()); // 최근 마감

    return { ongoingMarkets: ongoing, scheduledMarkets: scheduled, closedMarkets: closed };
  }, [allMarkets]);

  const currentFilter = filterCategory ?? '전체';

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* 🔹 중앙 헤더 (문구 + 필터) */}
      <div className="grid grid-cols-3 items-center mt-2 mb-4">
        <div /> {/* 왼쪽 spacer */}
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          지금 바로 예측에 참여하세요!
        </h2>
        <div className="justify-self-end">
          <button
            type="button"
            onClick={() => setFilterCategory?.(currentFilter)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center space-x-1 text-gray-600"
            aria-label="카테고리"
          >
            <span className="text-sm">{currentFilter}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.572a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 🔹 섹션들 */}
      <MarketSection
        title="현재 진행 중인 예측"
        markets={ongoingMarkets}
        status="ongoing"
        setSelectedMarketId={setSelectedMarketId}
        formatDateTime={formatDateTime}
      />

      <MarketSection
        title="시작 예정인 예측"
        markets={scheduledMarkets}
        status="scheduled"
        setSelectedMarketId={setSelectedMarketId}
        formatDateTime={formatDateTime}
      />

      <MarketSection
        title="마감된 예측"
        markets={closedMarkets}
        status="closed"
        setSelectedMarketId={setSelectedMarketId}
        formatDateTime={formatDateTime}
      />
    </div>
  );
};

export default MarketList;
