import React from 'react';

// 환경 변수 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : 'stacking-prototype-dev';

/**
 * 로딩 컴포넌트 - 모던 디자인
 */
const Loading = ({ isLoading, marketLoading, commentsLoading, likedCommentsLoading }) => {
    if (!isLoading && !marketLoading && !commentsLoading && !likedCommentsLoading) {
        return null;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="text-center">
                {/* Main Loading Card */}
                <div className="modern-card rounded-3xl p-8 max-w-sm mx-auto backdrop-blur-xl bg-white/80 border border-white/20">
                    {/* Animated Logo */}
                    <div className="relative mb-6">
                        <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                            <span className="text-white font-bold text-2xl">S</span>
                        </div>
                        <div className="absolute inset-0 w-16 h-16 mx-auto">
                            <div className="w-full h-full border-4 border-blue-200 rounded-2xl animate-spin"></div>
                        </div>
                    </div>

                    {/* Loading Text */}
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-800">Stacking</h3>
                        <p className="text-gray-600">데이터 로딩 중...</p>
                        <p className="text-sm text-gray-500">인증 및 데이터 연결 시도 중</p>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex justify-center space-x-2 mt-6">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>

                    {/* App ID */}
                    <div className="mt-4 p-2 bg-gray-100 rounded-lg">
                        <p className="text-xs text-gray-500">앱 ID: {appId.substring(0, 10)}...</p>
                    </div>
                </div>

                {/* Background Animation */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute top-40 left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>
            </div>
        </div>
    );
};

export default Loading;
