import { useState, useEffect } from "react";
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
import AuthModal from "../pages/Login";
import { useContext } from "react";
import { MyUserContext } from "../context/MyUserProvider";

export default function Navbar({ scrollY }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const {
    isAuthOpen,
    setIsAuthOpen,
    showNavbar,
    setShowNavbar,
    user,
    logoutUser,
  } = useContext(MyUserContext);

  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
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
    { href: "#home", label: "Kezdőlap", icon: Home },
    { href: "#features", label: "Funkciók", icon: Bolt },
    { href: "#pricing", label: "Árak", icon: Gem },
    { href: "#contact", label: "Kapcsolat", icon: Phone },
  ];

  const login = () => {
    setIsAuthOpen(true);
    setShowNavbar(false);
  };

  const logout = () => {
    logoutUser();
    setUserDropdownOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrollY > 50
            ? "bg-black/70 backdrop-blur-3xl border-b border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
            : "bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-cyan-900/20 backdrop-blur-xl"
        }`}
        style={{
          boxShadow:
            scrollY > 50
              ? "0 0 60px rgba(168,85,247,0.5), 0 0 100px rgba(236,72,153,0.3)"
              : "0 0 30px rgba(168,85,247,0.2)",
          display: showNavbar ? "block" : "none",
        }}
      >
        {/* Animated gradient overlay */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168,85,247,0.15), transparent 40%)`,
          }}
        />

        {/* Glowing top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60 animate-pulse" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo with extreme effects */}
            <a href="#home">
              <div
                onClick={() => navigate("/")}
                className="flex items-center space-x-3 group cursor-pointer relative"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
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

                <span className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent relative group-hover:scale-105 transition-transform duration-300">
                  LudusGen
                  <span className="absolute -inset-1 bg-gradient-to-r from-purple-600/0 via-pink-600/50 to-cyan-600/0 blur-2xl group-hover:blur-3xl transition-all opacity-0 group-hover:opacity-100" />
                </span>

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
                    className="relative group overflow-hidden px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-x" />

                    <div className="relative z-10 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <UserIcon className="w-4 h-4" />
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
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-white" />
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
                            // navigate to profile
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-600/20 transition-all duration-300 group"
                        >
                          <Settings className="w-5 h-5 text-purple-400 group-hover:text-cyan-400 transition-colors" />
                          <span className="text-white font-semibold">
                            Beállítások
                          </span>
                        </button>

                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-600/20 transition-all duration-300 group"
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

            {/* Mobile menu button */}
            {!mobileMenuOpen && (
              <button
                className="md:hidden relative p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 hover:scale-110 overflow-hidden group"
                onClick={() => setMobileMenuOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-pink-600/40 to-cyan-600/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-spin-slow" />
                <Menu className="w-6 h-6 text-purple-300 relative z-10 transition-transform duration-300" />
                <div className="absolute inset-0 bg-purple-500/20 rounded-xl animate-ping opacity-0 group-hover:opacity-30" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Dark Overlay */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-500 md:hidden ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Side Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-gradient-to-br from-black via-purple-950/50 to-black z-50 transform transition-transform duration-500 ease-out md:hidden shadow-[-10px_0_80px_rgba(168,85,247,0.6)] ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-cyan-600/10 animate-gradient-slow" />
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-500 via-pink-500 to-cyan-500 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.8)]" />

        <div className="relative h-full flex flex-col p-8">
          {/* Close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-6 right-6 p-3 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-xl border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_rgba(168,85,247,0.7)] transition-all duration-300 hover:scale-110 hover:rotate-90 group"
          >
            <X className="w-6 h-6 text-purple-300 group-hover:text-pink-300 transition-colors" />
          </button>

          {/* Logo section */}
          <div className="mb-12 mt-4">
            <div className="flex items-center space-x-3 group">
              <div className="relative">
                <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
                <div className="absolute -inset-3 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
              </div>
              <span className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                LudusGen
              </span>
            </div>
            <div className="mt-3 h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-transparent rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          </div>

          {/* User Info - Mobile */}
          {user && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{user.name}</p>
                  <p className="text-xs text-purple-300">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Menu items */}
          <nav className="flex-1 space-y-4 overflow-y-auto">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block relative group"
                  style={{
                    animation: `slideInRight 0.4s ease-out ${
                      index * 0.1
                    }s backwards`,
                  }}
                >
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/0 via-pink-600/0 to-cyan-600/0 group-hover:from-purple-600/20 group-hover:via-pink-600/20 group-hover:to-cyan-600/20 rounded-2xl blur-xl transition-all duration-300" />

                  <div className="relative flex items-center space-x-5 p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 hover:border-purple-400/70 backdrop-blur-xl hover:shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all duration-300 group-hover:translate-x-2">
                    <div className="relative">
                      <Icon className="w-7 h-7 text-purple-400 group-hover:text-cyan-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                      <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <span className="text-xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                      {item.label}
                    </span>

                    <ArrowRight className="w-5 h-5 text-purple-400 ml-auto opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </a>
              );
            })}

            {/* Settings - Mobile (only if logged in) */}
            {user && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  // navigate to settings
                }}
                className="w-full block relative group"
                style={{
                  animation: "slideInRight 0.4s ease-out 0.4s backwards",
                }}
              >
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/0 via-pink-600/0 to-cyan-600/0 group-hover:from-purple-600/20 group-hover:via-pink-600/20 group-hover:to-cyan-600/20 rounded-2xl blur-xl transition-all duration-300" />

                <div className="relative flex items-center space-x-5 p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 hover:border-purple-400/70 backdrop-blur-xl hover:shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all duration-300 group-hover:translate-x-2">
                  <div className="relative">
                    <Settings className="w-7 h-7 text-purple-400 group-hover:text-cyan-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  </div>

                  <span className="text-xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                    Beállítások
                  </span>
                </div>
              </button>
            )}
          </nav>

          {/* CTA Button - Mobile */}
          {user ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="relative group overflow-hidden px-8 py-6 rounded-2xl font-black text-lg shadow-2xl mt-8"
              style={{ animation: "slideInRight 0.4s ease-out 0.5s backwards" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 animate-gradient-x" />
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-red-600 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x" />

              <span className="relative z-10 flex items-center justify-center uppercase tracking-wider text-white">
                <LogOut className="mr-2 w-6 h-6" />
                Kijelentkezés
              </span>
            </button>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                login();
              }}
              className="relative group overflow-hidden px-8 py-6 rounded-2xl font-black text-lg shadow-2xl mt-8"
              style={{ animation: "slideInRight 0.4s ease-out 0.5s backwards" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x" />

              <span className="relative z-10 flex items-center justify-center uppercase tracking-wider text-white">
                <Zap className="mr-2 w-6 h-6 animate-pulse" />
                Bejelentkezés
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-x {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes gradient-slow {
          0%,
          100% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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

        .animate-gradient-slow {
          background-size: 200% 200%;
          animation: gradient-slow 8s ease infinite;
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
