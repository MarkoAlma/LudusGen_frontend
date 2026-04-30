import React from 'react';

export default function AuthTabs({ activeTab, onTabChange, disabled = false }) {
  const tabs = [
    { id: 'login', label: 'Log In' },
    { id: 'signup', label: 'Register' }
  ];
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));

  return (
    <div className="grid grid-cols-2 gap-2 mb-8 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 relative z-10 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute top-1.5 bottom-1.5 left-1.5 bg-white/10 rounded-xl border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] pointer-events-none transition-transform duration-300 ease-out"
        style={{
          width: 'calc((100% - 1.25rem) / 2)',
          transform: activeIndex === 1 ? 'translateX(calc(100% + 0.5rem))' : 'translateX(0)',
        }}
      />
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`relative z-10 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${disabled ? 'cursor-default' : ''} ${isActive ? 'text-white' : 'text-gray-500 hover:text-white'}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
