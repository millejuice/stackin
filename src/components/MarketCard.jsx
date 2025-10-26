import React from 'react';
import { calculateMarketMetrics, calculateDDay } from '../utils';

/** 카드 – 두 번째 이미지 스타일 */
const MarketCard = ({ market, status, onClick, formatDateTime }) => {
  const yes = market.yesContracts ?? 0;
  const no = market.noContracts ?? 0;
  const { yesProb, noProb } = calculateMarketMetrics(yes, no);

  const totalContracts = yes + no;
  const totalValue = totalContracts * 100;

  let borderClass = 'border-l-4';
  let cursorClass = 'cursor-pointer';

  if (status === 'ongoing') {
    borderClass += ' border-indigo-400';
    cursorClass = 'cursor-pointer';
  } else if (status === 'scheduled') {
    borderClass += ' border-blue-400';
    cursorClass = 'cursor-not-allowed';
  } else {
    borderClass += ' border-gray-300';
    cursorClass = 'cursor-pointer';
  }

  const handleClick = status === 'scheduled' ? undefined : onClick;

  return (
    <div
      onClick={handleClick}
      className={`bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow ${borderClass} ${cursorClass}`}
    >
      {/* 상단: 좌측 카테고리/질문 / 우측 상태 */}
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-2">
          <p className="text-xs font-medium text-indigo-500">{market.companyName} 예측</p>
          <h3 className="text-lg font-bold text-gray-900 mt-1">{market.question}</h3>
        </div>

        <div className="text-right ml-2">
          {status === 'ongoing' && (
            <span className="text-sm font-semibold text-red-500">
              마감 {calculateDDay(market.endDate.toDate())}
            </span>
          )}

          {status === 'scheduled' && (
            <span className="text-sm font-semibold text-blue-500">
              시작 {calculateDDay(market.startDate.toDate())}
            </span>
          )}

          {status === 'closed' && (
            <span className="text-sm text-gray-500">
              마감: {formatDateTime(market.endDate.toDate())}
            </span>
          )}
        </div>
      </div>

      {/* 본문: 상태별 내용 */}
      <div className="mt-3">
        {status === 'ongoing' ? (
          <>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-green-600">YES ({yesProb}%)</span>
              <span className="text-red-600">NO ({noProb}%)</span>
            </div>

            {/* 베이스(연한 회색) + 초록 진행바 (두 번째 이미지 느낌) */}
            <div className="w-full bg-red-200/40 rounded-full h-2.5 mt-1">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{ width: `${yesProb}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>총 참여: {totalContracts} 계약</span>
              <span>총 금액: {totalValue.toLocaleString('ko-KR')} STACK</span>
            </div>
          </>
        ) : status === 'scheduled' ? (
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-600 font-semibold text-sm">시작 예정</p>
            <p className="text-xs text-blue-500">
              {formatDateTime(market.startDate.toDate())} 부터 베팅 가능
            </p>
          </div>
        ) : (
          // closed
          <div className="text-right text-xs text-gray-500">
            {/* 필요 시 결과 표기: market.winningOutcome */}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketCard;
