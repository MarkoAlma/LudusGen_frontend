import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Menu, X, LogOut, Settings, 
  ChevronDown, LayoutDashboard, MessageSquare, 
  Image as ImageIcon, Music, Box, Users 
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
    <header className={`fixed top-0 left-0 right-0 z-[50] transition-all duration-500`}>
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <nav className={`relative glass-panel rounded-[2.5rem] border border-white/10 transition-all duration-500 ${
          scrolled ? 'bg-black/60 backdrop-blur-3xl py-2 px-6 shadow-2xl scale-[0.99]' : 'bg-black/20 backdrop-blur-2xl py-3 px-8'
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
                <div className="relative">
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
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="px-6 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                >
                  Access Hub
                </button>
              )}

              {/* Mobile Toggle */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white hover:bg-white/5 rounded-xl transition-all"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setMobileMenuOpen(false)}
               className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md md:hidden"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-[120] w-[85%] max-w-sm bg-[#05050a] border-l border-white/5 md:hidden flex flex-col p-8 shadow-2xl"
            >
              {/* Cinematic Background Glows */}
              <div className="absolute top-[-10%] right-[-10%] w-[100%] h-[60%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="flex justify-end mb-8">
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="space-y-6 mb-12">
                  <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)}>Main Hall</MobileNavLink>
                  <MobileNavLink to="/chat" onClick={() => setMobileMenuOpen(false)}>AI Studio</MobileNavLink>
                  <MobileNavLink to="/forum" onClick={() => setMobileMenuOpen(false)}>Community</MobileNavLink>
                  <MobileNavLink to="/settings" onClick={() => setMobileMenuOpen(false)}>Lab Settings</MobileNavLink>
                </div>

                <div className="mt-auto space-y-4">
                  {!user ? (
                    <button 
                      onClick={() => { setMobileMenuOpen(false); setIsAuthOpen(true); }}
                      className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95"
                    >
                      Authenticate
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                        <img src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} className="w-10 h-10 rounded-xl" alt="avatar" />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white uppercase truncate">{user.name || 'User'}</p>
                          <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setMobileMenuOpen(false); logoutUser(); }}
                        className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                      >
                        Deactivate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
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

function MobileNavLink({ to, children, onClick }) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className="block text-4xl font-black italic tracking-tighter text-gray-500 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
