import { useState, useEffect, useRef, useContext } from "react";
import { Sparkles, Menu, X, ArrowRight, Home, Bolt, Gem, Phone, User as UserIcon, LogOut, Settings, ChevronDown, MessageSquare, ForumIcon, LayoutDashboard } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { MyUserContext } from "../context/MyUserProvider";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { setIsAuthOpen, showNavbar, setShowNavbar, user, logoutUser } = useContext(MyUserContext);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [mobileMenuOpen]);

  const menuItems = [
    { path: "/", label: "Kezdőlap", icon: Home },
    { path: "/forum", label: "Fórum", icon: MessageSquare },
  ];

  const login = () => {
    setIsAuthOpen(true);
    setShowNavbar(false);
  };

  const logout = () => {
    logoutUser();
    setUserDropdownOpen(false);
    navigate("/");
  };

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 w-full z-[60] py-4 transition-all duration-300"
        style={{ display: showNavbar ? "block" : "none" }}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <motion.div 
            layout
            className={`flex justify-between items-center transition-all duration-300 px-6 ${
              isScrolled 
              ? 'h-16 glass-panel rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-white/10' 
              : 'h-20 bg-transparent border-transparent'
            }`}
          >
            {/* Logo - Hidden on mobile, shown from lg: */}
            <div 
              onClick={() => navigate("/")} 
              className="hidden lg:flex items-center space-x-3 group cursor-pointer"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6] animate-pulse" />
                <div className="absolute inset-[2px] bg-black rounded-[9px] backdrop-blur-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white">
                  Ludus<span className="text-[var(--color-primary)]">Gen</span>
                </span>
              </div>
            </div>

            {/* Desktop Navigation (Floating Pill style) */}
            <div className="hidden lg:flex items-center px-2 py-1 bg-white/5 border border-white/5 rounded-full backdrop-blur-md">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-6 py-2 rounded-full font-medium text-sm transition-all relative ${
                    location.pathname === item.path 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {location.pathname === item.path && (
                    <motion.div 
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white/10 rounded-full border border-white/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Desktop Only Actions */}
              <div className="hidden lg:flex items-center space-x-4">
                {user ? (
                  <>
                    <button 
                      onClick={() => navigate('/chat')} 
                      className="flex items-center gap-2 group px-5 py-2 rounded-full bg-gradient-to-r from-[#7C3AED]/20 to-[#3B82F6]/20 hover:from-[#7C3AED]/30 hover:to-[#3B82F6]/30 border border-white/10 transition-all font-bold text-sm text-white"
                    >
                      <LayoutDashboard className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                      Stúdió indítása
                    </button>
                    
                    <div className="relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setUserDropdownOpen(!userDropdownOpen); }} 
                        className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt="profile" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[var(--surface-active)] flex items-center justify-center font-bold text-[var(--color-primary)]">
                              {user.name?.[0]}
                            </div>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${userDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      
                      <AnimatePresence>
                        {userDropdownOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-3 w-64 glass-panel p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10 overflow-hidden"
                          >
                            <div className="px-4 py-3 border-b border-white/10 mb-2">
                              <p className="font-bold text-white text-sm truncate">{user.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Online</p>
                              </div>
                            </div>
                            
                            <button onClick={() => { setUserDropdownOpen(false); navigate("/settings"); }} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all mb-1 text-sm font-medium">
                              <Settings className="w-4 h-4" /> Beállítások
                            </button>
                            
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            
                            <button onClick={logout} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all text-sm font-medium">
                              <LogOut className="w-4 h-4" /> Kijelentkezés
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={login} 
                    className="relative group px-6 py-2.5 rounded-full font-bold text-sm text-white overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED] via-[#3B82F6] to-[#7C3AED] bg-[length:200%_auto] animate-gradient transition-transform duration-500 group-hover:scale-110" />
                    <span className="relative z-10">Csatlakozás</span>
                  </button>
                )}
              </div>

              {/* Mobile menu button - Only element visible on mobile */}
              <button 
                className="lg:hidden p-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all shadow-lg active:scale-95" 
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        </div>
         {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] flex flex-col bg-[#020205] overflow-hidden"
          >
            {/* Ambient Lighting in Menu */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full bg-black/40 backdrop-blur-3xl">
              {/* Header */}
              <div className="p-6 flex justify-between items-center border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                   </div>
                   <span className="text-xl font-black text-white tracking-tight">Ludus<span className="text-primary italic">Gen</span></span>
                </div>
                <button 
                  className="p-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-white active:scale-95 transition-all" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col">
                {/* User Card if Authenticated */}
                {user && (
                   <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-5 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl relative overflow-hidden group"
                   >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-primary/20 bg-black shadow-inner">
                           {user.profilePicture ? (
                              <img src={user.profilePicture} alt="user" className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-primary text-xl uppercase italic">
                                 {user.name?.[0]}
                              </div>
                           )}
                        </div>
                        <div className="min-w-0">
                           <h4 className="text-white font-black text-base uppercase italic tracking-tight truncate">{user.name}</h4>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Node-Active</span>
                           </div>
                        </div>
                      </div>
                   </motion.div>
                )}

                {/* Primary Navigation */}
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 pl-1">Neural Navigation</span>
                <div className="space-y-2 mb-10">
                  {menuItems.map((item, idx) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <motion.button 
                        key={item.path} 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => { setMobileMenuOpen(false); navigate(item.path); }} 
                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all relative group overflow-hidden ${
                          isActive 
                            ? 'bg-white/[0.08] text-white border border-white/10' 
                            : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/5 text-zinc-600 group-hover:bg-white/10 group-hover:text-zinc-400'}`}>
                             <item.icon className="w-5 h-5" />
                          </div>
                          <span className={`text-lg font-black uppercase italic tracking-tight transition-colors ${isActive ? 'text-white' : ''}`}>
                             {item.label}
                          </span>
                        </div>
                        <ArrowRight className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'text-primary' : 'text-zinc-800 group-hover:translate-x-1 group-hover:text-zinc-600'}`} />
                        
                        {/* Active Indicator Bar */}
                        {isActive && (
                          <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(138,43,226,0.8)]" />
                        )}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Secondary Actions */}
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 pl-1">System Terminal</span>
                <div className="space-y-3">
                  {!user ? (
                    <button 
                      onClick={() => { setMobileMenuOpen(false); login(); }} 
                      className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest shadow-[0_10px_40px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all"
                    >
                      <UserIcon className="w-5 h-5" />
                      Neural_Access
                    </button>
                  ) : (
                    <div className="space-y-3">
                       <button 
                        onClick={() => { setMobileMenuOpen(false); navigate("/chat"); }} 
                        className="w-full flex items-center justify-between px-6 py-5 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl relative overflow-hidden group"
                       >
                         <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                         <span className="relative z-10 italic">Intelligence Studio</span>
                         <LayoutDashboard className="w-5 h-5 relative z-10" />
                       </button>

                       <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => { setMobileMenuOpen(false); navigate("/settings"); }} 
                            className="flex items-center justify-center gap-2 py-4 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 font-bold text-xs uppercase hover:bg-white/10 hover:text-white transition-all"
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </button>
                          <button 
                            onClick={() => { setMobileMenuOpen(false); logout(); }} 
                            className="flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 font-bold text-xs uppercase hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                          >
                            <LogOut className="w-4 h-4" />
                            Offline
                          </button>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Footer */}
              <div className="p-8 border-t border-white/5 bg-black/20 text-center">
                 <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.5em] italic">Neural Hub — Protocol v3.1</p>
                 <div className="flex items-center justify-center gap-4 mt-3 opacity-20">
                    <div className="w-1 h-1 rounded-full bg-zinc-700" />
                    <div className="w-1 h-1 rounded-full bg-zinc-700" />
                    <div className="w-1 h-1 rounded-full bg-zinc-700" />
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s linear infinite;
        }
      `}</style>
    </>
  );
}