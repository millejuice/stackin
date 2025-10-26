import React from 'react';

/**
 * 베팅 버튼 컴포넌트 - 모던 디자인
 */
const BetButton = ({ label, color, totalCost, onClick, disabled }) => {
    const isGreen = color.includes('green');
    const isRed = color.includes('red');
    
    const buttonClass = `
        flex-1 relative overflow-hidden rounded-2xl p-4 font-bold text-white
        shadow-lg transform transition-all duration-300 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isGreen ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' : ''}
        ${isRed ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : ''}
        hover:shadow-xl hover:-translate-y-1
    `;

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={buttonClass}
        >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            {/* Content */}
            <div className="relative z-10">
                <div className="text-lg font-bold mb-1">{label}</div>
                <div className="text-sm font-medium opacity-90">총 비용: {totalCost} STACK</div>
            </div>

            {/* Icon */}
            <div className="absolute top-2 right-2 text-white/60">
                {isGreen ? '📈' : isRed ? '📉' : '💰'}
            </div>
        </button>
    );
};

export default BetButton;
