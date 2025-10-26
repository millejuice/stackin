import React from 'react';

/**
 * 카테고리 선택 모달 컴포넌트
 */
const CategorySelectionModal = ({ isOpen, onClose, onSelectCategory, showAllOption }) => {
    if (!isOpen) return null;

    const categories = ['정치', '경제', '비상장'];

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">카테고리 선택</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="space-y-3">
                    {showAllOption && (
                        <button
                            onClick={() => onSelectCategory('전체')}
                            className="w-full text-left p-4 rounded-lg bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors"
                        >
                            📈 전체
                        </button>
                    )}
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => onSelectCategory(category)}
                            className="w-full text-left p-4 rounded-lg bg-gray-50 text-gray-800 font-semibold hover:bg-gray-100 transition-colors"
                        >
                            {category === '정치' ? '🗳️ 정치' : category === '경제' ? '💰 경제' : '🚀 비상장'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategorySelectionModal;
