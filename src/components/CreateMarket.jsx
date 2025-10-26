import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';

// 환경 변수 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';

/**
 * 마켓 생성 컴포넌트
 */
const CreateMarket = ({ db, userId, userProfile, setActiveView }) => {
    const [formData, setFormData] = useState({
        companyName: '', // 이제 '정치', '경제', '비상장' 중 하나를 저장
        question: '',
        description: '',
        startDate: '', // [추가] 시작일
        endDate: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // [추가] 카테고리 선택 모달 상태
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    
    // 현재 시간을 'YYYY-MM-DDTHH:MM' 형식으로 포맷팅 (datetime-local의 min 속성 설정용)
    const now = new Date();
    const isoDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    // [추가] 마감일의 최소값은 시작일 또는 현재 시간
    const [minEndDate, setMinEndDate] = useState(isoDate);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // [추가] 시작일이 변경되면 마감일의 최소값을 업데이트
        if (name === 'startDate') {
            setMinEndDate(value || isoDate);
            // 만약 시작일이 마감일보다 늦으면 마감일도 시작일로 설정
            if (value && formData.endDate && value > formData.endDate) {
                setFormData(prev => ({ ...prev, endDate: value }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId || !userProfile) return;
        // [수정] 시작일 유효성 검사 추가
        if (!formData.companyName || !formData.question || !formData.startDate || !formData.endDate) {
            alert("카테고리, 질문, 시작일, 마감일은 필수 입력 사항입니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            // [수정] datetime-local 필드의 값을 Date 객체로 변환
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);

            if (startDate >= endDate) {
                alert("마감일은 시작일보다 늦어야 합니다.");
                setIsSubmitting(false);
                return;
            }

            const newMarket = {
                companyName: formData.companyName,
                question: formData.question,
                description: formData.description,
                startDate: startDate, // [추가]
                endDate: endDate, 
                creatorId: userId,
                creatorName: userProfile.displayName,
                yesContracts: 0,
                noContracts: 0,
                resolved: false,
                winningOutcome: null,
                claimedUsers: [],
                createdAt: new Date(),
            };

            const marketsColRef = collection(db, `artifacts/${appId}/public/data/markets`);
            await setDoc(doc(marketsColRef), newMarket);

            alert("새 예측 시장이 성공적으로 개설되었습니다!");
            setActiveView('markets');
        } catch (error) {
            console.error("Error creating market:", error);
            alert("시장 개설 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    새 예측 시장 개설
                </h2>
                <p className="text-gray-600">투자 기회를 만들어보세요</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                {/* [수정] '비상장 기업명/주제명' 입력을 카테고리 선택 버튼으로 변경 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">카테고리 선택</label>
                    <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className={`mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm text-left ${
                            formData.companyName ? 'text-gray-900' : 'text-gray-400'
                        } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                    >
                        {formData.companyName || "카테고리 (정치/경제/비상장) 선택"}
                    </button>
                    {/* 숨겨진 input: validation을 위해 */}
                    <input
                        type="hidden"
                        value={formData.companyName}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">예측 질문</label>
                    <input
                        type="text"
                        name="question"
                        value={formData.question}
                        onChange={handleChange}
                        placeholder="예: 내년 상반기 IPO를 성공시킬까요?"
                        className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">상세 설명 (선택 사항)</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        placeholder="펀딩 조건, 성공 기준 등의 상세 정보를 입력하세요."
                        className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    ></textarea>
                </div>
                {/* [추가] 베팅 시작일 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">베팅 시작일 (날짜 및 시간)</label>
                    <input
                        type="datetime-local"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        min={isoDate} // 현재 시간 이전 선택 불가
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">베팅 마감일 (날짜 및 시간)</label>
                    <input
                        type="datetime-local" // [수정] 날짜/시간 동시 입력
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        min={minEndDate} // [수정] 최소값은 시작일
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? '시장 개설 중...' : '시장 개설하기'}
                </button>
            </form>

            {/* [추가] 카테고리 선택 모달 렌더링 */}
            <CategorySelectionModal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSelectCategory={(category) => {
                    setFormData({ ...formData, companyName: category });
                    setShowCategoryModal(false);
                }}
                showAllOption={false} // 개설 시에는 '전체' 제외
            />
        </div>
    );
};

/**
 * [신규] 카테고리 선택 모달 컴포넌트
 */
const CategorySelectionModal = ({ isOpen, onClose, onSelectCategory, showAllOption }) => {
    if (!isOpen) return null;

    const categories = ['정치', '경제', '비상장'];

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose} // 배경 클릭 시 닫기
        >
            <div 
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()} // 모달 내부 클릭 시 닫기 방지
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

export default CreateMarket;
