import React, { useState } from 'react';
import { Search, Plus, Bell, Sparkles, MessageSquare, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotifDropdown from './NotifDropdown';

function StatItem({ label, value, sub }) {
  return (
    <div className="flex-1 lg:w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.06] transition-all group/stat">
       <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1 group-hover/stat:text-primary transition-colors">{label}</p>
       <div className="flex items-end gap-2">
          <p className="text-2xl font-black text-white">{value}</p>
          {sub && <span className="text-[9px] font-bold text-gray-600 mb-1">{sub}</span>}
       </div>
    </div>
  );
}

export default function ForumHeader({ 
  searchQuery, 
  setSearchQuery, 
  onNewPost, 
  notifications = [],
  onMarkRead,
  onDeleteOne,
  onDeleteAll
}) {
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 sm:space-y-8 mb-8 sm:mb-12 md:mb-20">
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-5 items-center justify-between">
        <div className="relative w-full md:max-w-2xl group">
          <div className="absolute inset-y-0 left-4 sm:left-5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-primary transition-all scale-90 group-focus-within:scale-110" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the knowledge base..."
            className="w-full bg-white/[0.02] border border-white/5 rounded-[1.5rem] py-3.5 sm:py-5 pl-11 sm:pl-14 pr-6 text-white placeholder-gray-700 focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all shadow-[0_0_30px_rgba(0,0,0,0.2)] text-sm font-medium tracking-tight"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-widest">
             <Terminal className="w-3 h-3" /> Search
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
          <div className="flex -space-x-3 items-center mr-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#03000a] bg-white/10 overflow-hidden ring-1 ring-white/10 transition-transform hover:scale-110 hover:z-10 cursor-pointer">
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=user${i}`} alt="user" />
              </div>
            ))}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#03000a] bg-primary/20 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-primary ring-1 ring-primary/20">
              +42
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={`relative p-3.5 sm:p-5 rounded-[1.5rem] border transition-all group flex-shrink-0 ${showNotifs ? 'bg-primary/20 border-primary text-white' : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              <Bell className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${showNotifs ? 'scale-110' : 'group-hover:rotate-12'}`} />
              {unreadCount > 0 && (
                <span className="absolute top-3 sm:top-4 right-3 sm:right-4 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(138,43,226,0.8)]" />
              )}
            </button>

            <AnimatePresence>
              {showNotifs && (
                <NotifDropdown
                  notifications={notifications}
                  onMarkRead={onMarkRead}
                  onDeleteOne={onDeleteOne}
                  onDeleteAll={onDeleteAll}
                  onClose={() => setShowNotifs(false)}
                />
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={onNewPost}
            className="flex-1 md:flex-none px-5 sm:px-8 py-3.5 sm:py-5 rounded-[1.5rem] bg-primary text-white font-black flex items-center justify-center gap-2 sm:gap-3 transition-all hover:scale-[1.03] active:scale-95 shadow-[0_10px_40px_rgba(138,43,226,0.3)] hover:shadow-[0_15px_50px_rgba(138,43,226,0.4)] relative overflow-hidden group text-sm sm:text-base"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="sm:hidden">New</span><span className="hidden sm:inline">New Topic</span> <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Section - Cinema Upgrade */}
      <div className="glass-panel p-5 sm:p-8 md:p-14 rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] border border-white/5 relative overflow-hidden group shadow-2xl">
         {/* Tech Grid Background Overlay */}
         <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
         <div className="absolute -top-24 -right-24 w-64 sm:w-96 h-64 sm:h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-colors duration-1000" />

         <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6 sm:gap-10 lg:gap-24">
            <div className="flex-1 text-center lg:text-left">
               <div className="flex items-center gap-3 mb-4 sm:mb-6 justify-center lg:justify-start">
                  <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Intelligence Hub v2.0</span>
                  </div>
               </div>
               <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-white italic tracking-tighter mb-4 sm:mb-6 leading-none">
                  Research. <span className="text-primary group-hover:text-white transition-colors">Create.</span> <br />
                  <span className="text-gray-600">Dominate.</span>
               </h2>
               <p className="text-gray-500 font-bold text-xs sm:text-sm md:text-lg max-w-xl leading-relaxed">
                  Discover the latest AI breakthroughs, share technical knowledge, and grow with the LudusGen community.
               </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 sm:gap-6 w-full lg:w-auto min-w-[200px] sm:min-w-[240px]">
               <StatItem label="Active Topics" value="8,421" sub="+12 today" />
               <StatItem label="Engineers" value="2.4K" sub="42 online" />
               <StatItem label="Successful Gen" value="15M+" sub="Asset count" />
            </div>
         </div>
      </div>
    </div>
  );
}
