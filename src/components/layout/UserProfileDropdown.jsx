import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, ChevronDown, Zap, Plus, User as UserIcon } from 'lucide-react';
import { MyUserContext } from '../../context/MyUserProvider';
import CreditTopup from '../CreditTopup';

export default function UserProfileDropdown() {
  const { user, logoutUser, setIsAuthOpen } = useContext(MyUserContext);
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showCreditTopup, setShowCreditTopup] = useState(false);

  if (!user) {
    return (
      <>
        <div className="hidden md:block">
          <button
            onClick={() => setIsAuthOpen(true)}
            className="px-6 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
          >
            Access Hub
          </button>
        </div>
        <CreditTopup isOpen={showCreditTopup} onClose={() => setShowCreditTopup(false)} />
      </>
    );
  }

  return (
    <>
      <div className="relative" style={{ isolation: "isolate" }}>
        <button
          id="user-menu-trigger"
          onClick={(e) => { e.stopPropagation(); setUserDropdownOpen(!userDropdownOpen); }}
          className={`relative flex items-center gap-2.5 p-1 pr-3 rounded-2xl border transition-all duration-300 group overflow-hidden cursor-pointer ${userDropdownOpen ? 'border-white/20 z-[9999] bg-white/5' : 'border-white/5 hover:border-white/20'}`}
          style={{ background: userDropdownOpen ? "rgba(255,255,255,0.08)" : "rgba(20,15,35,0.4)", backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
        >
          {/* Subtle hover/active gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent transition-opacity duration-300 pointer-events-none ${userDropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
          
          <div className="w-8 h-8 rounded-[12px] overflow-hidden flex-shrink-0 relative z-10 border border-white/10 shadow-inner bg-black/50">
            <img
              src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
              alt="profile"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          
          <div className="hidden sm:flex items-center gap-1.5 relative z-10 pl-1">
            <Zap className="w-3.5 h-3.5 text-[#b490f5] drop-shadow-[0_0_8px_rgba(180,144,245,0.4)] transition-transform duration-300 group-hover:scale-110" />
            <span className="text-[14px] font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-[#e0d4fc]">
              {(user.credits ?? 0).toLocaleString()}
            </span>
          </div>
          
          <ChevronDown className={`w-3.5 h-3.5 ml-1 relative z-10 transition-all duration-300 ${userDropdownOpen ? "rotate-180 text-white" : "text-gray-500 group-hover:text-white"}`} />
        </button>

        <AnimatePresence>
          {userDropdownOpen && (
            <>
              {/* Backdrop dismiss */}
              <div
                className="fixed inset-0 cursor-default"
                style={{ zIndex: 9998 }}
                onClick={() => setUserDropdownOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="absolute left-0 top-[calc(100%+8px)]"
                style={{
                  zIndex: 9999,
                  width: 280,
                  borderRadius: 18,
                  background: "rgba(15,10,25,0.85)",
                  backdropFilter: "blur(30px)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.07)",
                  overflow: "hidden",
                }}
              >
                {/* Profil header */}
                <div className="flex items-center gap-3 px-4 py-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-11 h-11 rounded-[13px] overflow-hidden flex-shrink-0 bg-white/10">
                    <img
                      src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-[14px] truncate leading-tight">{user.name}</p>
                    <p className="text-[#6b7280] text-[12px] truncate mt-0.5">{user.email}</p>
                  </div>
                </div>

                {/* Credit balance */}
                <div className="px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[#6b7280] text-[10px] font-bold uppercase tracking-[0.12em] mb-2">Kredit egyenleg</p>
                  <div className="flex items-center justify-between gap-2 px-3 py-3 rounded-2xl"
                    style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                        style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c4b5fd]">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-black text-[20px] leading-none">{(user.credits ?? 0).toLocaleString()}</div>
                        <div className="text-[#a78bfa] text-[11px] font-medium mt-0.5">kredit</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setUserDropdownOpen(false); setShowCreditTopup(true); }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:opacity-90 active:scale-95 flex-shrink-0 cursor-pointer"
                      style={{ background: "linear-gradient(135deg, #9333ea, #ec4899)", boxShadow: "0 3px 12px rgba(147,51,234,0.4)" }}
                    >
                      <Plus className="w-3 h-3" /> Feltöltés
                    </button>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-2">
                  <button
                    onClick={() => { setUserDropdownOpen(false); navigate("/settings"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#9ca3af] hover:text-white hover:bg-white/[0.06] transition-all text-[13px] font-medium cursor-pointer"
                  >
                    <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={2} /> Beállítások
                  </button>
                  <button
                    onClick={() => { setUserDropdownOpen(false); navigate("/profile"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#9ca3af] hover:text-white hover:bg-white/[0.06] transition-all text-[13px] font-medium cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 flex-shrink-0" strokeWidth={2} /> Profilom
                  </button>
                  <div className="my-1 mx-3 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <button
                    onClick={logoutUser}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#f87171] hover:text-[#fca5a5] hover:bg-red-500/10 transition-all text-[13px] font-medium cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={2} /> Kijelentkezés
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <CreditTopup isOpen={showCreditTopup} onClose={() => setShowCreditTopup(false)} />
    </>
  );
}
