import { useState, useEffect } from "react";
import { Sparkles, Menu, X, ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ scrollY }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const navigate = useNavigate()

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrollY > 50
          ? "bg-black/70 backdrop-blur-3xl border-b border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
          : "bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-cyan-900/20 backdrop-blur-xl"
      }`}
      style={{
        boxShadow: scrollY > 50 
          ? "0 0 60px rgba(168,85,247,0.5), 0 0 100px rgba(236,72,153,0.3)" 
          : "0 0 30px rgba(168,85,247,0.2)"
      }}
    >
      {/* Animated gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168,85,247,0.15), transparent 40%)`
        }}
      />
      
      {/* Glowing top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60 animate-pulse" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo with extreme effects */}
          <div 
          onClick={()=>navigate("/")}
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

          {/* Desktop Navigation with INSANE effects */}
          <div className="hidden md:flex items-center space-x-8">
            {[
              { href: "#home", label: "Kezdőlap" },
              { href: "#features", label: "Funkciók" },
              { href: "#pricing", label: "Árak" },
              { href: "#contact", label: "Kapcsolat" }
            ].map((item, index) => (
              <a 
                key={item.href}
                href={item.href} 
                className="relative group text-sm font-bold uppercase tracking-wider"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Glowing background on hover */}
                <span className="absolute -inset-2 bg-gradient-to-r from-purple-600/0 via-pink-600/0 to-cyan-600/0 group-hover:from-purple-600/20 group-hover:via-pink-600/20 group-hover:to-cyan-600/20 rounded-lg blur-xl transition-all duration-300" />
                
                {/* Text */}
                <span className="relative z-10 bg-gradient-to-r from-white to-gray-300 group-hover:from-purple-300 group-hover:via-pink-300 group-hover:to-cyan-300 bg-clip-text text-transparent transition-all duration-300">
                  {item.label}
                </span>
                
                {/* Animated underline */}
                <span className="absolute inset-x-0 -bottom-1 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full" />
                
                {/* Particles effect */}
                <span className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="absolute w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ top: '0%', left: '20%' }} />
                  <span className="absolute w-1 h-1 bg-pink-400 rounded-full animate-ping" style={{ top: '0%', left: '80%', animationDelay: '150ms' }} />
                </span>
              </a>
            ))}
            
            {/* MEGA CTA Button */}
            <button className="relative group overflow-hidden cursor-pointer px-8 py-3 rounded-full font-bold text-base shadow-2xl">
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
              <span onClick={()=>navigate('/chat')} className="relative z-10 flex items-center font-black uppercase tracking-wide ">
                Chatelj
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                <Zap className="ml-1 w-4 h-4 animate-pulse" />
              </span>
              
              {/* Pulse effect */}
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-20" />
            </button>
          </div>

          {/* Mobile menu button with effects */}
          <button
            className="md:hidden p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 hover:scale-110"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-purple-300" />
            ) : (
              <Menu className="w-6 h-6 text-purple-300" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu with EXTREME styling */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-3xl border-t border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.4)] animate-slideDown">
          <div className="px-6 py-10 space-y-6">
            {[
              { href: "#home", label: "Kezdőlap", icon: "🏠" },
              { href: "#features", label: "Funkciók", icon: "⚡" },
              { href: "#pricing", label: "Árak", icon: "💎" },
              { href: "#contact", label: "Kapcsolat", icon: "📞" }
            ].map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className="block relative group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center space-x-4 p-4 rounded-2xl bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                    {item.label}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-pink-600/0 to-cyan-600/0 group-hover:from-purple-600/10 group-hover:via-pink-600/10 group-hover:to-cyan-600/10 rounded-2xl blur-xl transition-all" />
              </a>
            ))}
            
            <button onClick={()=>navigate('/chat')} className="w-full relative group overflow-hidden px-8 py-5 rounded-2xl font-black text-lg shadow-2xl mt-4">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity animate-gradient-x" />
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="relative z-10 flex items-center justify-center uppercase tracking-wider">
                Chatelj
                <Sparkles className="ml-2 w-5 h-5 animate-pulse" />
              </span>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </nav>
  );
}