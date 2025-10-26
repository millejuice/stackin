// AppLayout.jsx
import React, { useState } from 'react';
import { useAuthAndDb, useMarkets, useUserComments, useUserLikedComments } from './hooks';
import { formatCurrency, formatDateTime } from './utils';
import {
  Header,
  NavBar,
  Loading,
  MarketList,
  MarketDetail,
  CreateMarket,
  Profile,
} from './components';

/**
 * 메인 레이아웃 및 라우팅
 */
const AppLayout = () => {
  const { db, userId, userProfile, isLoading, isAuthReady } = useAuthAndDb();
  const { markets, marketLoading } = useMarkets(db, isAuthReady);
  const { userComments, commentsLoading } = useUserComments(db, userId, markets);
  const { userLikedComments, likedCommentsLoading } = useUserLikedComments(db, userId, markets);

  const [activeView, setActiveView] = useState('markets');
  const [selectedMarketId, setSelectedMarketId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('전체');

  // 로딩 상태
  if (isLoading || marketLoading || commentsLoading || likedCommentsLoading) {
    return (
      <Loading
        isLoading={isLoading}
        marketLoading={marketLoading}
        commentsLoading={commentsLoading}
        likedCommentsLoading={likedCommentsLoading}
      />
    );
  }

  const currentMarket = markets.find((m) => m.id === selectedMarketId);

  // 내부 라우팅
  let content;
  if (selectedMarketId && currentMarket) {
    content = (
      <MarketDetail
        market={currentMarket}
        userId={userId}
        userProfile={userProfile}
        db={db}
        setSelectedMarketId={setSelectedMarketId}
        formatDateTime={formatDateTime}
      />
    );
  } else if (activeView === 'create') {
    content = (
      <CreateMarket db={db} userId={userId} userProfile={userProfile} setActiveView={setActiveView} />
    );
  } else if (activeView === 'profile') {
    content = (
      <Profile
        userProfile={userProfile}
        markets={markets}
        formatCurrency={formatCurrency}
        userComments={userComments}
        commentsLoading={commentsLoading}
        userLikedComments={userLikedComments}
        likedCommentsLoading={likedCommentsLoading}
        db={db}
      />
    );
  } else {
    content = (
      <MarketList
        markets={markets}
        setSelectedMarketId={setSelectedMarketId}
        formatDateTime={formatDateTime}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header userProfile={userProfile} formatCurrency={formatCurrency} />

      {/* <main className="flex-1 pt-16">
        <div className="max-w-md mx-auto px-4 pb-28">
          {content}
        </div>
      </main>

      <NavBar
        activeView={activeView}
        setActiveView={setActiveView}
        setSelectedMarketId={setSelectedMarketId}
      /> */}
    </div>
  );
};

export default AppLayout;
