import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Menu,
  X,
  ArrowRight,
  Zap,
  Home,
  Bolt,
  Gem,
  Phone,
  User as UserIcon,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { MyUserContext } from "../context/MyUserProvider";

export default function Navbar({ scrollY }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navRef = useRef(null);

  const {
    isAuthOpen,
    setIsAuthOpen,
    showNavbar,
    setShowNavbar,
    user,
    logoutUser,
  } = useContext(MyUserContext);

  const navigate = useNavigate();

  // Advanced mouse tracking (only for desktop)
  useEffect(() => {
    let rafId;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        setMousePosition({ 
          x: e.clientX, 
          y: e.clientY
        });
        
        lastX = e.clientX;
        lastY = e.clientY;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setUserDropdownOpen(false);
    if (userDropdownOpen) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [userDropdownOpen]);

  const menuItems = [
    {
      href: "#home",
      label: "Kezdőlap",
      icon: Home,
      color: "from-violet-400 to-fuchsia-600",
      glow: "violet",
    },
    {
      href: "#features",
      label: "Funkciók",
      icon: Bolt,
      color: "from-cyan-400 to-blue-600",
      glow: "cyan",
    },
    {
      href: "#pricing",
      label: "Árak",
      icon: Gem,
      color: "from-rose-400 to-pink-600",
      glow: "rose",
    },
    {
      href: "#contact",
      label: "Kapcsolat",
      icon: Phone,
      color: "from-amber-400 to-orange-600",
      glow: "amber",
    },
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

  // Anti-spam toggle function
  const toggleMobileMenu = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setMobileMenuOpen(!mobileMenuOpen);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 700);
  };

  return (
    <>
      {/* ============================================ */}
      {/* DESKTOP NAVBAR - PREMIUM DESIGN */}
      {/* ============================================ */}
      <nav
        ref={navRef}
        className={`fixed top-0 w-full p-0 z-[60] transition-all duration-500 ${
          mobileMenuOpen 
            ? 'bg-transparent backdrop-blur-none border-none' 
            : scrollY > 50
            ? "bg-black/70 backdrop-blur-3xl border-b border-purple-500/30"
            : "bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-cyan-900/20 backdrop-blur-xl"
        }`}
        style={{
          boxShadow: mobileMenuOpen 
            ? 'none'
            : scrollY > 50
            ? "0 0 60px rgba(168,85,247,0.5), 0 0 100px rgba(236,72,153,0.3)"
            : "0 0 30px rgba(168,85,247,0.2)",
          display: showNavbar ? "block" : "none",
        }}
      >
        {/* Animated gradient overlay - only when menu closed */}
        {!mobileMenuOpen && (
          <>
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168,85,247,0.15), transparent 40%)`,
              }}
            />
            {/* Glowing top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60 animate-pulse" />
          </>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 sm:h-24">
            {/* Logo with extreme effects */}
            <a>
              <div
                onClick={() => navigate("/")}
                className="flex items-center space-x-2 sm:space-x-4 group cursor-pointer relative"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {/* Icon container with advanced effects */}
                <div className="relative">
                  <Sparkles className="w-8 h-8 text-purple-400 group-hover:text-cyan-400 transition-all duration-300 group-hover:rotate-180 group-hover:scale-110" />
                  {isHovering && (
                    <>
                      <div className="absolute inset-0 animate-ping">
                        <Sparkles className="w-8 h-8 text-purple-400 opacity-50" />
                      </div>
                      <div className="absolute -inset-2 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
                    </>
                  )}
                </div>

                {/* Logo text with superior typography */}
                <span className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent relative group-hover:scale-105 transition-transform duration-300">
                  LudusGen
                  <span className="absolute -inset-1 bg-gradient-to-r from-purple-600/0 via-pink-600/50 to-cyan-600/0 blur-2xl group-hover:blur-3xl transition-all opacity-0 group-hover:opacity-100" />
                </span>

                {/* Animated lightning bolt */}
                <Zap className="w-5 h-5 text-yellow-400 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {menuItems.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="relative group text-sm font-bold uppercase tracking-wider"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="absolute -inset-2 bg-gradient-to-r from-purple-600/0 via-pink-600/0 to-cyan-600/0 group-hover:from-purple-600/20 group-hover:via-pink-600/20 group-hover:to-cyan-600/20 rounded-lg blur-xl transition-all duration-300" />

                  <span className="relative z-10 bg-gradient-to-r from-white to-gray-300 group-hover:from-purple-300 group-hover:via-pink-300 group-hover:to-cyan-300 bg-clip-text text-transparent transition-all duration-300">
                    {item.label}
                  </span>

                  <span className="absolute inset-x-0 -bottom-1 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full" />
                </a>
              ))}

              <button
                onClick={() => login()}
                className="relative group overflow-hidden cursor-pointer px-8 py-3 rounded-full font-bold text-base shadow-2xl"
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />

                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-x" />

                {/* Glowing border effect */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-[-2px] bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-full blur-sm animate-spin-slow" />
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                </div>

                {/* Button text */}
                <span className="relative z-10 flex items-center font-black uppercase tracking-wide">
                  Chatelj
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  <Zap className="ml-1 w-4 h-4 animate-pulse" />
                </span>

                {/* Pulse effect */}
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-20" />
              </button>

              {/* User Section - Desktop */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserDropdownOpen(!userDropdownOpen);
                    }}
                    className="relative cursor-pointer group overflow-hidden px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-x" />

                    <div className="relative z-10 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
                        {user.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt="profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <span className="max-w-[120px] truncate">
                        {user.displayName}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${
                          userDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-black/90 via-purple-950/90 to-black/90 border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.5)] animate-slideDown">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-cyan-600/10" />

                      {/* User Info */}
                      <div className="relative p-4 border-b border-purple-500/30">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600">
                            {user.profilePicture ? (
                              <img
                                src={user.profilePicture}
                                alt="profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="font-bold text-white">{user.name}</p>
                            <p className="text-xs text-purple-300">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="relative p-2">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigate("/settings");
                          }}
                          className="w-full cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-600/20 transition-all duration-300 group"
                        >
                          <Settings className="w-5 h-5 text-purple-400 group-hover:text-cyan-400 transition-colors" />
                          <span className="text-white font-semibold">
                            Beállítások
                          </span>
                        </button>

                        <button
                          onClick={logout}
                          className="w-full cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-600/20 transition-all duration-300 group"
                        >
                          <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors" />
                          <span className="text-white font-semibold">
                            Kijelentkezés
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={login}
                  className="relative group overflow-hidden cursor-pointer px-8 py-3 rounded-full font-bold text-base shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-x" />

                  <span className="relative z-10 flex items-center font-black uppercase tracking-wide">
                    Bejelentkezés
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                </button>
              )}
            </div>

            {/* Mobile menu button - Morphing hamburger to X */}
            <button
              className="md:hidden p-2 text-white/90 hover:text-white transition-colors relative z-[70]"
              onClick={toggleMobileMenu}
              disabled={isTransitioning}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <Menu 
                  className={`w-7 h-7 absolute transition-all duration-500 ${
                    mobileMenuOpen 
                      ? 'opacity-0 rotate-90 scale-50' 
                      : 'opacity-100 rotate-0 scale-100'
                  }`} 
                />
                <X 
                  className={`w-7 h-7 absolute transition-all duration-500 ${
                    mobileMenuOpen 
                      ? 'opacity-100 rotate-0 scale-100' 
                      : 'opacity-0 -rotate-90 scale-50'
                  }`} 
                />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* ============================================ */}
      {/* MOBILE MENU - SIMPLE BENTO GRID */}
      {/* ============================================ */}
      
      {/* Backdrop with blur */}
      <div
        className={`fixed inset-0 bg-black/90 backdrop-blur-xl z-40 transition-all duration-700 md:hidden ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMobileMenu}
      >
        {/* Animated gradient orb */}
        <div className={`absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[120px] transition-all duration-1000 ${mobileMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
      </div>

      {/* Full Screen Takeover Menu */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-700 ease-out md:hidden ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-full w-full flex flex-col p-6 pt-28">
          {/* User Card - if logged in */}
          {user && (
            <div 
              className={`mb-8 p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10 backdrop-blur-xl transition-all duration-500 delay-200 ${
                mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                    <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center overflow-hidden">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-lg">{user.name}</p>
                  <p className="text-white/50 text-sm">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bento Grid Navigation */}
          <div className="flex-1 grid grid-cols-2 gap-4 mb-8">
            {menuItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                onClick={toggleMobileMenu}
                className={`group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 ${
                  index === 0 ? 'col-span-2' : ''
                }`}
                style={{
                  transitionDelay: `${(index + 3) * 100}ms`,
                  transform: mobileMenuOpen ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
                  opacity: mobileMenuOpen ? 1 : 0,
                }}
              >
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl blur-xl`} />
                
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-1">{item.label}</h3>
                  <p className="text-white/50 text-sm">Fedezd fel</p>
                </div>
              </a>
            ))}

            {/* Settings card - if logged in */}
            {user && (
              <button
                onClick={() => {
                  toggleMobileMenu();
                  navigate("/settings");
                }}
                className={`group relative
                  cursor-pointer overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:bg-white/10`}
                style={{
                  transitionDelay: `${(menuItems.length + 3) * 100}ms`,
                  transform: mobileMenuOpen ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
                  opacity: mobileMenuOpen ? 1 : 0,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl blur-xl" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white text-left font-bold text-xl mb-1">Beállítások</h3>
                  <p className="text-white/50 text-sm text-left">Testreszabás</p>
                </div>
              </button>
            )}
          </div>

          {/* CTA Button */}
          <div 
            className={`transition-all duration-500 delay-700 ${
              mobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            {user ? (
              <button
                onClick={() => {
                  toggleMobileMenu();
                  logout();
                }}
                className="w-full relative overflow-hidden cursor-pointer group flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300"
              >
                <LogOut className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                <span className="text-white font-bold text-lg">Kijelentkezés</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  toggleMobileMenu();
                  login();
                }}
                className="w-full relative overflow-hidden group flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
              >
                <span className="text-white font-bold text-lg">Kezdj el most</span>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}