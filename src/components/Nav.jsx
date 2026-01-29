import { useState } from "react";
import { Sparkles, Menu, X, ArrowRight } from "lucide-react";

export default function Navbar({ scrollY }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollY > 50
          ? "bg-black/60 backdrop-blur-2xl border-b border-white/5 shadow-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3 group cursor-pointer">
       
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Ludus Gen
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-10">
            <a href="#home" className="relative group text-sm font-medium">
              <span className="relative z-10">Kezdőlap</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
            <a href="#features" className="relative group text-sm font-medium">
              <span className="relative z-10">Funkciók</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
            <a href="#pricing" className="relative group text-sm font-medium">
              <span className="relative z-10">Árak</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
            <a href="#contact" className="relative group text-sm font-medium">
              <span className="relative z-10">Kapcsolat</span>
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
            <button className="relative group overflow-hidden px-8 py-3 rounded-full font-semibold">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 opacity-100 group-hover:opacity-0 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 flex items-center">
                Kezdd el most{" "}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>

          <button
            className="md:hidden p-2 rounded-lg bg-white/5 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-2xl border-t border-white/10">
          <div className="px-4 py-8 space-y-6">
            <a
              href="#home"
              className="block text-lg font-medium hover:text-purple-400 transition"
            >
              Kezdőlap
            </a>
            <a
              href="#features"
              className="block text-lg font-medium hover:text-purple-400 transition"
            >
              Funkciók
            </a>
            <a
              href="#pricing"
              className="block text-lg font-medium hover:text-purple-400 transition"
            >
              Árak
            </a>
            <a
              href="#contact"
              className="block text-lg font-medium hover:text-purple-400 transition"
            >
              Kapcsolat
            </a>
            <button className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 px-8 py-4 rounded-full font-semibold">
              Kezdd el most
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
