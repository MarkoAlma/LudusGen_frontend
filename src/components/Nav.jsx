import { useState, useEffect } from "react";
import { Sparkles, Menu, X, ArrowRight, Zap, Home, Bolt, Gem, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AuthModal from "../pages/Login";
import { useContext } from "react";
import { MyUserContext } from "../context/MyUserProvider";

export default function Navbar({ scrollY }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const {isAuthOpen, setIsAuthOpen} = useContext(MyUserContext)
  
  const navigate = useNavigate()

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);


  const login = ()=> {
    setIsAuthOpen(true)
  }
  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const menuItems = [
    { href: "#home", label: "Kezdőlap", icon: Home },
    { href: "#features", label: "Funkciók", icon: Bolt },
    { href: "#pricing", label: "Árak", icon: Gem },
    { href: "#contact", label: "Kapcsolat", icon: Phone }
  ];

  return (
    <>
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

            {/* Desktop Navigation with INSANE effects */}
            <div className="hidden md:flex items-center space-x-8">
              {menuItems.map((item, index) => (
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
                <span onClick={() => navigate('/chat')} className="relative z-10 flex items-center font-black uppercase tracking-wide">
                  Chatelj
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                  <Zap className="ml-1 w-4 h-4 animate-pulse" />
                </span>
              </a>
            ))}

            {/* MEGA CTA Button */}
            <button onClick={()=>login()} className="relative group overflow-hidden cursor-pointer px-8 py-3 rounded-full font-bold text-base shadow-2xl">
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
              <span className="relative z-10 flex items-center font-black uppercase tracking-wide ">
                Chatelj
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                <Zap className="ml-1 w-4 h-4 animate-pulse" />
              </span>
              
              {/* Pulse effect */}
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-20" />
            </button>
                
                {/* Pulse effect */}
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-20" />
              </button>
            </div>

            {/* Mobile menu button - CSAK HA MENÜ ZÁRVA */}
            {!mobileMenuOpen && (
              <button
                className="md:hidden relative p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 hover:scale-110 overflow-hidden group"
                onClick={() => setMobileMenuOpen(true)}
              >
                {/* Rotating gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-pink-600/40 to-cyan-600/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-spin-slow" />
                
                <Menu className="w-6 h-6 text-purple-300 relative z-10 transition-transform duration-300" />
                
                {/* Pulse effect */}
                <div className="absolute inset-0 bg-purple-500/20 rounded-xl animate-ping opacity-0 group-hover:opacity-30" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Dark Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-500 md:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Side Menu - FULL SCREEN HEIGHT */}
      <div 
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-gradient-to-br from-black via-purple-950/50 to-black z-50 transform transition-transform duration-500 ease-out md:hidden shadow-[-10px_0_80px_rgba(168,85,247,0.6)] ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-cyan-600/10 animate-gradient-slow" />
        
        {/* Glowing edge */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-500 via-pink-500 to-cyan-500 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.8)]" />
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-2 h-2 bg-purple-500 rounded-full animate-float-1" style={{ top: '10%', left: '20%' }} />
          <div className="absolute w-3 h-3 bg-pink-500 rounded-full animate-float-2" style={{ top: '30%', right: '15%' }} />
          <div className="absolute w-2 h-2 bg-cyan-500 rounded-full animate-float-3" style={{ top: '60%', left: '30%' }} />
          <div className="absolute w-3 h-3 bg-purple-400 rounded-full animate-float-4" style={{ top: '80%', right: '25%' }} />
        </div>

        <div className="relative h-full flex flex-col p-8">
          {/* Close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-6 right-6 p-3 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-xl border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_rgba(168,85,247,0.7)] transition-all duration-300 hover:scale-110 hover:rotate-90 group"
          >
            <X className="w-6 h-6 text-purple-300 group-hover:text-pink-300 transition-colors" />
          </button>

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
            
            <button onClick={()=>login()} className="w-full relative group overflow-hidden px-8 py-5 rounded-2xl font-black text-lg shadow-2xl mt-4">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity animate-gradient-x" />
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <span className="relative z-10 flex items-center justify-center uppercase tracking-wider">
                Chatelj
                <Sparkles className="ml-2 w-5 h-5 animate-pulse" />
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
                    animation: `slideInRight 0.4s ease-out ${index * 0.1}s backwards`
                  }}
                >
                  {/* Glow effect */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/0 via-pink-600/0 to-cyan-600/0 group-hover:from-purple-600/20 group-hover:via-pink-600/20 group-hover:to-cyan-600/20 rounded-2xl blur-xl transition-all duration-300" />
                  
                  {/* Menu item card */}
                  <div className="relative flex items-center space-x-5 p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 hover:border-purple-400/70 backdrop-blur-xl hover:shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all duration-300 group-hover:translate-x-2">
                    {/* Icon with glow */}
                    <div className="relative">
                      <Icon className="w-7 h-7 text-purple-400 group-hover:text-cyan-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                      <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {/* Label */}
                    <span className="text-xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                      {item.label}
                    </span>
                    
                    {/* Arrow */}
                    <ArrowRight className="w-5 h-5 text-purple-400 ml-auto opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                  
                  {/* Bottom glow line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-full blur-sm" />
                </a>
              );
            })}
          </nav>

          {/* CTA Button */}
          <button 
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/chat');
            }}
            className="relative group overflow-hidden px-8 py-6 rounded-2xl font-black text-lg shadow-2xl mt-8"
            style={{ animation: 'slideInRight 0.4s ease-out 0.4s backwards' }}
          >
            {/* Animated gradient backgrounds */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x" />
            
            {/* Rotating border */}
            <div className="absolute inset-[-3px] bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm animate-spin-slow transition-opacity" />
            
            {/* Shine effect */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            
            {/* Button content */}
            <span className="relative z-10 flex items-center justify-center uppercase tracking-wider text-white">
              <Zap className="mr-2 w-6 h-6 animate-pulse" />
              Chatelj Most
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
            </span>
            
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-2xl bg-white/10 animate-ping opacity-0 group-hover:opacity-20" />
          </button>

          {/* Footer decoration */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-900/30 border border-purple-500/30 backdrop-blur-xl">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-sm text-purple-300 font-semibold">Powered by AI</span>
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes gradient-slow {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
        
        @keyframes float-1 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        
        @keyframes float-2 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(-15px); }
        }
        
        @keyframes float-3 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-25px) translateX(20px); }
        }
        
        @keyframes float-4 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-15px) translateX(-10px); }
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
        
        .animate-float-1 {
          animation: float-1 6s ease-in-out infinite;
        }
        
        .animate-float-2 {
          animation: float-2 7s ease-in-out infinite;
        }
        
        .animate-float-3 {
          animation: float-3 8s ease-in-out infinite;
        }
        
        .animate-float-4 {
          animation: float-4 5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}