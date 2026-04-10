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
            {/* Logo */}
            <div 
              onClick={() => navigate("/")} 
              className="flex items-center space-x-3 group cursor-pointer"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#7C3AED] to-[#3B82F6] animate-pulse" />
                <div className="absolute inset-[2px] bg-black rounded-[9px] backdrop-blur-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
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
              {user ? (
                <>
                  <button 
                    onClick={() => navigate('/chat')} 
                    className="hidden md:flex items-center gap-2 group px-5 py-2 rounded-full bg-gradient-to-r from-[#7C3AED]/20 to-[#3B82F6]/20 hover:from-[#7C3AED]/30 hover:to-[#3B82F6]/30 border border-white/10 transition-all font-bold text-sm text-white"
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

              {/* Mobile menu button */}
              <button 
                className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all" 
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] flex flex-col bg-[#03000a]/95 backdrop-blur-2xl"
          >
            <div className="p-6 flex justify-between items-center border-b border-white/5">
              <span className="text-xl font-black text-white">Ludus<span className="text-primary">Gen</span></span>
              <button 
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white" 
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col space-y-4">
              {menuItems.map((item) => (
                <button 
                  key={item.path} 
                  onClick={() => { setMobileMenuOpen(false); navigate(item.path); }} 
                  className={`text-2xl font-bold flex items-center justify-between p-4 rounded-2xl transition-all ${
                    location.pathname === item.path ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {item.label}
                  <ArrowRight className="w-6 h-6" />
                </button>
              ))}
              
              {!user ? (
                <div className="mt-8 space-y-4">
                  <button 
                    onClick={() => { setMobileMenuOpen(false); login(); }} 
                    className="w-full py-5 rounded-2xl bg-white text-black font-black text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  >
                    Bejelentkezés
                  </button>
                </div>
              ) : (
                <div className="mt-8 p-6 rounded-3xl bg-white/5 border border-white/10">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[var(--surface-active)] flex items-center justify-center font-bold text-2xl">
                             {user.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => { setMobileMenuOpen(false); navigate("/chat"); }} 
                    className="w-full py-4 rounded-xl bg-[var(--color-primary)] text-white font-bold mb-3"
                   >
                     AI Stúdió Indítása
                   </button>
                   <button 
                    onClick={() => { setMobileMenuOpen(false); navigate("/settings"); }} 
                    className="w-full py-4 rounded-xl bg-white/5 text-gray-400 font-bold border border-white/10"
                   >
                     Fiók Beállítások
                   </button>
                </div>
              )}
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