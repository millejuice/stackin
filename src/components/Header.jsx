import React from 'react';

const Header = ({ userProfile, formatCurrency }) => (
  <header className="fixed inset-x-0 top-0 bg-white shadow-sm z-50">
    {/* 바는 전체폭 */}
    <div className="w-full">
      {/* 안쪽 내용은 가운데 고정폭 */}
      <div className="max-w-2xl mx-auto flex justify-between items-center px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Stacking</h1>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">잔액 (STACK)</p>
            <p className="text-sm font-semibold text-green-600">
              {formatCurrency ? formatCurrency(100000) : '₩100,000'}
            </p>
          </div>
          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
            {userProfile?.displayName?.[0] || 'T'}
          </div>
        </div>
      </div>
    </div>
  </header>
);


export default Header;
