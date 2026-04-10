import React from 'react';
import { motion } from 'framer-motion';

export default function AuthTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'login', label: 'Log In' },
    { id: 'signup', label: 'Register' }
  ];

  return (
    <div className="flex gap-2 mb-8 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 relative z-10">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isActive ? 'text-white' : 'text-gray-500 hover:text-white'}`}
          >
            {isActive && (
              <motion.div
                layoutId="authTab"
                className="absolute inset-0 bg-white/10 rounded-xl border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
