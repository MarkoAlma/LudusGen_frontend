import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Menu, X, LogOut,
  ChevronDown, LayoutDashboard, MessageSquare,
  ImageIcon, Music, Box, Users, Home,
  Zap, Plus, User as UserIcon, ShoppingBag
} from 'lucide-react';
import { MyUserContext } from '../../context/MyUserProvider';
import { tokens } from '../../styles/tokens';
import bgMobileMenu from '../../assets/bg-mobile-menu.png';

function NavLink({ to, children, active }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${active ? 'text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studioDropdownOpen, setStudioDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { setIsAuthOpen, showNavbar, user, logoutUser, setShowCreditTopup } = useContext(MyUserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isLudusgenAdmin = typeof user?.email === 'string' && user.email.trim().toLowerCase() === 'ludusgen@gmail.com';
  const previousUserIdRef = useRef(user?.uid ?? null);
  const suppressUserMenuUntilRef = useRef(0);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, x: '20%', scale: 1.05, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: "spring",
        damping: 30,
        stiffness: 200,
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      x: '10%',
      filter: 'blur(10px)',
      transition: {
        duration: 0.4,
        ease: "easeInOut",
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 200
      }
    },
    exit: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setStudioDropdownOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const currentUserId = user?.uid ?? null;

    if (currentUserId !== previousUserIdRef.current) {
      setUserDropdownOpen(false);

      if (currentUserId && !previousUserIdRef.current) {
        suppressUserMenuUntilRef.current = window.performance.now() + 650;
      }

      previousUserIdRef.current = currentUserId;
    }
  }, [user?.uid]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const studioItems = [
    { label: 'AI Code', icon: MessageSquare, path: '/chat?tab=chat' },
    { label: 'AI Image', icon: ImageIcon, path: '/chat?tab=image' },
    { label: 'AI Audio', icon: Music, path: '/chat?tab=audio' },
    { label: 'AI 3D', icon: Box, path: '/chat?tab=3d' },
  ];

  if (!showNavbar) return null;
  if (location.pathname.startsWith('/chat')) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-[110] transition-all duration-500">
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <nav className={`relative transition-all duration-500 md:rounded-[2.5rem] md:border md:border-white/10 ${
          scrolled ? 'md:bg-black/60 md:backdrop-blur-3xl md:py-2 md:px-6 md:shadow-2xl md:scale-[0.99]' : 'md:bg-black/20 md:backdrop-blur-2xl md:py-3 md:px-8 py-2 md:glass-panel'
        }`}>
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group outline-none">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-primary fill-primary/30" />
              </div>
              <span className="text-lg font-black tracking-tighter italic text-white group-hover:text-primary transition-colors pr-2">
                LudusGen.
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              <NavLink to="/" active={location.pathname === '/'}>Home</NavLink>

              <div
                className="relative"
                onMouseLeave={() => setStudioDropdownOpen(false)}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setStudioDropdownOpen(!studioDropdownOpen);
                  }}
                  onMouseEnter={() => setStudioDropdownOpen(true)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                    location.pathname.startsWith('/chat') ? 'text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  AI Studio <ChevronDown className={`w-3.5 h-3.5 transition-transform ${studioDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {studioDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 w-56 pt-3"
                      style={{ zIndex: 120 }}
                    >
                      <div className="glass-panel border border-white/10 rounded-2xl p-2 shadow-2xl">
                        {studioItems.map((item) => {
                          const urlParams = new URLSearchParams(item.path.split('?')[1] || '');
                          const targetTab = urlParams.get('tab');
                          const currentParams = new URLSearchParams(location.search);
                          const currentTab = currentParams.get('tab');
                          const isActive = location.pathname.startsWith('/chat') && currentTab === targetTab;

                          return (
                            <Link
                              key={item.label}
                              to={item.path}
                              onClick={() => setStudioDropdownOpen(false)}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${isActive ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                            >
                              <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-primary/30 text-primary' : 'bg-white/5 group-hover:bg-primary/20 group-hover:text-primary'}`}>
                                <item.icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <NavLink to="/marketplace" active={location.pathname.startsWith('/marketplace')}>Marketplace</NavLink>
              <NavLink to="/forum" active={location.pathname.startsWith('/forum')}>Community</NavLink>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="relative">
                  <button
                    id="user-menu-trigger"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      if (window.performance.now() < suppressUserMenuUntilRef.current) {
                        setUserDropdownOpen(false);
                        return;
                      }

                      setUserDropdownOpen((open) => !open);
                    }}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 bg-white/10">
                      <img
                        src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                        alt="profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#b490f5]" />
                      <span className="text-[13px] font-bold text-[#b490f5]">{(user.credits ?? 0).toLocaleString()}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <>
                        <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setUserDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          className="fixed left-3 right-3 top-[4.75rem] rounded-2xl bg-[#16141c] border border-white/10 shadow-2xl overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-64"
                          style={{ zIndex: 9999 }}
                        >
                          <div className="p-4 border-b border-white/5">
                            <p className="font-bold text-white text-sm truncate">{user.name}</p>
                            <p className="text-gray-500 text-xs truncate mt-0.5">{user.email}</p>
                          </div>
                          <div className="p-3 border-b border-white/5">
                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary" />
                                <span className="text-white font-black">{(user.credits ?? 0).toLocaleString()}</span>
                              </div>
                              <button
                                onClick={() => { setUserDropdownOpen(false); setShowCreditTopup(true); }}
                                className="px-2 py-1 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider"
                              >
                                Topup
                              </button>
                            </div>
                          </div>
                          <div className="p-2">
                            {isLudusgenAdmin && (
                              <button
                                onClick={() => { setUserDropdownOpen(false); navigate("/admin"); }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold"
                              >
                                <LayoutDashboard className="w-4 h-4" /> Admin Reports
                              </button>
                            )}
                            <button
                              onClick={() => { setUserDropdownOpen(false); navigate("/profile"); }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold"
                            >
                              <UserIcon className="w-4 h-4" /> Profile Settings
                            </button>
                            <button
                              onClick={() => { setUserDropdownOpen(false); logoutUser(); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#f87171] hover:text-[#fca5a5] hover:bg-red-500/10 transition-all text-[13px] font-medium"
                            >
                              <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-6 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  Access Hub
                </button>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white hover:bg-white/5 rounded-xl transition-all"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[100] bg-[#050508] flex flex-col"
          >
            <div className="absolute inset-0 z-0 opacity-30">
              <img src={bgMobileMenu} className="w-full h-full object-cover" alt="" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="p-6 flex justify-between items-center border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <span className="text-xl font-black text-white italic">LudusGen</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {user && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                    <img src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} className="w-12 h-12 rounded-xl" alt="" />
                    <div>
                      <p className="text-white font-bold">{user.name}</p>
                      <p className="text-gray-500 text-xs">{(user.credits ?? 0).toLocaleString()} Credits</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <MobileNavItem to="/" icon={Home} label="Home" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavItem to="/chat" icon={Sparkles} label="AI Studio" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavItem to="/marketplace" icon={ShoppingBag} label="Marketplace" onClick={() => setMobileMenuOpen(false)} />
                  <MobileNavItem to="/forum" icon={Users} label="Community" onClick={() => setMobileMenuOpen(false)} />
                  {isLudusgenAdmin && (
                    <MobileNavItem to="/admin" icon={LayoutDashboard} label="Admin Reports" onClick={() => setMobileMenuOpen(false)} />
                  )}
                </div>

                {user ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); logoutUser(); }}
                    className="w-full p-4 rounded-2xl bg-red-500/10 text-red-400 font-bold uppercase tracking-wider text-center"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setIsAuthOpen(true); }}
                    className="w-full p-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-center"
                  >
                    Neural Access
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileNavItem({ to, icon: Icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-400 hover:text-white'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-bold uppercase tracking-widest text-sm">{label}</span>
    </Link>
  );
}
