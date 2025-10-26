import React from 'react';

const NavBar = ({ activeView, setActiveView, setSelectedMarketId }) => {
  const NavItem = ({ view, icon, label }) => {
    const isActive = activeView === view;
    return (
      <button
        onClick={() => {
          setActiveView(view);
          setSelectedMarketId?.(null);
        }}
        className="flex flex-col items-center p-2 transition-colors"
        aria-current={isActive ? 'page' : undefined}
      >
        <span className={`text-lg ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
          {icon}
        </span>
        <span className={`text-xs mt-1 ${isActive ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <footer className="mt-auto w-full bg-white border-t border-gray-200 shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
      <div className="mx-auto max-w-md w-full">
        <nav className="grid grid-cols-3 w-full text-center">
          <NavItem view="markets" icon="📈" label="마켓" />
          <NavItem view="create" icon="✍️" label="개설" />
          <NavItem view="profile" icon="👤" label="프로필" />
        </nav>
      </div>
    </footer>
  );
};

export default NavBar;
