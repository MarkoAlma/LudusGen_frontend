import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Menu, X, LogOut, Settings, 
  ChevronDown, LayoutDashboard, MessageSquare, 
  Image as ImageIcon, Music, Box, Users, Home
} from 'lucide-react';
import { MyUserContext } from '../../context/MyUserProvider';
import { tokens } from '../../styles/tokens';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studioDropdownOpen, setStudioDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  const { setIsAuthOpen, showNavbar, user, logoutUser } = useContext(MyUserContext);
  const navigate = useNavigate();
  const location = useLocation();

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

  const studioItems = [
    { label: 'AI Chat', icon: MessageSquare, path: '/chat?tab=chat' },
    { label: 'AI Image', icon: ImageIcon, path: '/chat?tab=image' },
    { label: 'AI Audio', icon: Music, path: '/chat?tab=audio' },
    { label: 'AI 3D', icon: Box, path: '/chat?tab=3d' },
  ];

  if (!showNavbar) return null;

  return (
    <header className={`fixed top-0 left-0 right-0 z-[110] transition-all duration-500`}>
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <nav className={`relative transition-all duration-500 md:rounded-[2.5rem] md:border md:border-white/10 ${
          scrolled ? 'md:bg-black/60 md:backdrop-blur-3xl md:py-2 md:px-6 md:shadow-2xl md:scale-[0.99]' : 'md:bg-black/20 md:backdrop-blur-2xl md:py-3 md:px-8 py-2 md:glass-panel'
        }`}>
          <div className="flex items-center justify-end md:justify-between">
            {/* Logo - Hidden on mobile */}
            <Link to="/" className="hidden md:flex items-center gap-3 group outline-none">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-primary fill-primary/30" />
              </div>
              <span className="text-lg font-black tracking-tighter italic text-white group-hover:text-primary transition-colors pr-2">
                LudusGen.
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/" active={location.pathname === '/'}>Home</NavLink>
              
              <div className="relative">
                <button 
                  onClick={() => setStudioDropdownOpen(!studioDropdownOpen)}
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
                      onMouseLeave={() => setStudioDropdownOpen(false)}
                      className="absolute top-full left-0 mt-2 w-56 glass-panel border border-white/10 rounded-2xl p-2 shadow-2xl"
                    >
                      {studioItems.map((item) => {
                        const isActive = location.pathname.startsWith('/chat') && location.search === item.path.substring(item.path.indexOf('?'));
                        return (
                        <Link 
                          key={item.label}
                          to={item.path}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${isActive ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                        >
                          <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-primary/30 text-primary' : 'bg-white/5 group-hover:bg-primary/20 group-hover:text-primary'}`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                        </Link>
                      )})}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <NavLink to="/forum" active={location.pathname.startsWith('/forum')}>Community</NavLink>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="hidden md:block relative">
                  <button 
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="w-10 h-10 rounded-xl border border-white/10 p-0.5 hover:border-primary/50 transition-all overflow-hidden"
                  >
                    <img src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} alt="Avatar" className="w-full h-full object-cover rounded-[inherit]" />
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-64 glass-panel border border-white/10 rounded-2xl p-2 shadow-2xl"
                      >
                        <div className="p-4 border-b border-white/5 mb-2">
                          <p className="text-xs font-black text-white uppercase tracking-widest truncate">{user.name || 'Developer'}</p>
                          <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                        </div>
                        <button onClick={() => navigate('/settings')} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                          <Settings className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
                        </button>
                        <button onClick={logoutUser} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 text-red-500/80 hover:text-red-500 transition-all">
                          <LogOut className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:block">
                  <button 
                    onClick={() => setIsAuthOpen(true)}
                    className="px-6 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                  >
                    Access Hub
                  </button>
                </div>
              )}

              {/* Mobile Toggle */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white hover:bg-white/5 rounded-xl transition-all relative z-[120]"
              >
                <div className="w-6 h-6 flex items-center justify-center relative">
                  <motion.div
                    animate={{ 
                      rotate: mobileMenuOpen ? 90 : 0,
                      opacity: mobileMenuOpen ? 0 : 1,
                      scale: mobileMenuOpen ? 0.5 : 1
                    }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                  <motion.div
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ 
                      rotate: mobileMenuOpen ? 0 : -90,
                      opacity: mobileMenuOpen ? 1 : 0,
                      scale: mobileMenuOpen ? 1 : 0.5
                    }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                </div>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Premium Mobile Menu Drawer */}
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
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
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
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col">
                {/* User Card if Authenticated */}
                {user && (
                   <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-5 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl relative overflow-hidden group"
                   >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-primary/20 bg-black shadow-inner">
                           <img src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} alt="user" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                           <h4 className="text-white font-black text-base uppercase italic tracking-tight truncate">{user.name || 'Developer'}</h4>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Node-Active</span>
                           </div>
                        </div>
                      </div>
                   </motion.div>
                )}

                {/* Bento Grid Navigation */}
                <div className="flex-1 grid grid-cols-2 gap-4 mb-4 mt-2">
                  <a
                    onClick={() => { setMobileMenuOpen(false); navigate('/'); }}
                    className="col-span-2 group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl blur-xl" />
                    <div className="relative z-10 flex items-center sm:block">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center sm:mb-4 group-hover:scale-110 transition-transform duration-300 mr-4 sm:mr-0">
                        <Home className="w-6 h-6 text-white" />
                      </div>
                      <div>
                         <h3 className="text-white font-bold text-xl sm:mb-1">Main Hall</h3>
                         <p className="text-white/50 text-sm hidden sm:block">Kezdőlap és Irányítópult</p>
                      </div>
                    </div>
                  </a>

                  <a
                    onClick={() => { setMobileMenuOpen(false); navigate('/chat'); }}
                    className="group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl blur-xl" />
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-white font-bold text-lg sm:text-xl md:mb-1">Studio</h3>
                      <p className="text-white/50 text-xs sm:text-sm">Neuronhálózat</p>
                    </div>
                  </a>

                  <a
                    onClick={() => { setMobileMenuOpen(false); navigate('/forum'); }}
                    className="group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-pink-600 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl blur-xl" />
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-white font-bold text-lg sm:text-xl md:mb-1">Forum</h3>
                      <p className="text-white/50 text-xs sm:text-sm">Közösség</p>
                    </div>
                  </a>

                  {user && (
                  <a
                    onClick={() => { setMobileMenuOpen(false); navigate('/settings'); }}
                    className="group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl blur-xl" />
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-white font-bold text-lg sm:text-xl md:mb-1">System</h3>
                      <p className="text-white/50 text-xs sm:text-sm">Beállítások</p>
                    </div>
                  </a>
                  )}
                </div>

                <div className="mt-4">
                  {user ? (
                    <button 
                      onClick={() => { setMobileMenuOpen(false); logoutUser(); }} 
                      className="w-full relative overflow-hidden cursor-pointer group flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-300"
                    >
                      <LogOut className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                      <span className="text-red-400 font-bold text-lg uppercase tracking-wider">Offline</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setMobileMenuOpen(false); setIsAuthOpen(true); }} 
                      className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest shadow-[0_10px_40px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all"
                    >
                      Neural_Access
                    </button>
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
    </header>
  );
}

function NavLink({ to, children, active }) {
  return (
    <Link 
      to={to} 
      className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
        active ? 'text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children, onClick, isActive }) {
  return (
    <div className="relative overflow-hidden group rounded-2xl border border-transparent hover:border-white/10 hover:bg-white/[0.04] transition-all">
       <Link 
         to={to} 
         onClick={onClick}
         className={`block px-5 py-4 text-xl sm:text-2xl font-black italic tracking-tighter transition-colors ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}
       >
         {children}
       </Link>
       {isActive && (
          <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(138,43,226,0.8)]" />
       )}
    </div>
  );
}
