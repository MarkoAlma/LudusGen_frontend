
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import "tailwindcss";
import './App.css'

import React, { useState, useEffect } from 'react';
import { MessageSquare, Zap, Crown, Rocket, Menu, X, Check, Sparkles, Star, ArrowRight, Globe, Shield, Cpu } from 'lucide-react';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const packages = [
    {
      name: 'Free',
      icon: MessageSquare,
      price: '0 Ft',
      period: 'havonta',
      features: [
        '5 AI beszélgetés naponta',
        'GPT-4 & Claude hozzáférés',
        'Standard válaszidő',
        'Email támogatás',
        'Alapvető analytics'
      ],
      gradient: 'from-slate-600 to-slate-800',
      highlight: false
    },
    {
      name: 'Pro',
      icon: Zap,
      price: '4.990 Ft',
      period: 'havonta',
      features: [
        'Korlátlan AI beszélgetések',
        'Összes prémium AI modell',
        'Villámgyors válaszidő',
        'Prioritásos 24/7 support',
        'Fejlett analytics & insights',
        'Chat történet & export',
        'API hozzáférés',
        'Egyedi promptok mentése'
      ],
      gradient: 'from-purple-600 via-pink-600 to-orange-500',
      highlight: true
    },
    {
      name: 'Business',
      icon: Crown,
      price: '14.990 Ft',
      period: 'havonta',
      features: [
        'Minden Pro funkció',
        'Csapat workspace (max 10 fő)',
        'Egyedi AI finomhangolás',
        'Dedicated account manager',
        'SSO & Advanced security',
        'Fehér címkés megoldás',
        'Prioritásos új funkciók',
        'SLA garancia 99.9%'
      ],
      gradient: 'from-amber-500 via-yellow-500 to-amber-600',
      highlight: false
    },
    {
      name: 'Enterprise',
      icon: Rocket,
      price: 'Egyedi',
      period: 'ajánlat',
      features: [
        'Minden Business funkció',
        'Korlátlan felhasználók',
        'On-premise / private cloud',
        'Egyedi AI modellek',
        'Dedikált infrastruktúra',
        'Compliance & audit support',
        '24/7 VIP technical support',
        'Teljes testreszabhatóság'
      ],
      gradient: 'from-cyan-500 via-blue-600 to-indigo-700',
      highlight: false
    }
  ];

  const features = [
    { icon: Globe, title: 'Globális AI Hálózat', desc: 'Hozzáférés a világ legfejlettebb AI modelleihez' },
    { icon: Shield, title: 'Enterprise Biztonság', desc: 'Bank-szintű titkosítás és adatvédelem' },
    { icon: Cpu, title: 'AI Orchestration', desc: 'Intelligens modellválasztás minden feladathoz' },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />
        <div 
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 bg-purple-600"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
            transition: 'all 0.3s ease-out'
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-cyan-500 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-pink-500 animate-pulse" />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-black/60 backdrop-blur-2xl border-b border-white/5 shadow-2xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <Sparkles className="w-10 h-10 text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text animate-pulse" />
                <div className="absolute inset-0 blur-xl bg-gradient-to-r from-purple-400 to-cyan-400 opacity-50 group-hover:opacity-100 transition" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                AI Nexus
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
                  Kezdd el most <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
              <a href="#home" className="block text-lg font-medium hover:text-purple-400 transition">Kezdőlap</a>
              <a href="#features" className="block text-lg font-medium hover:text-purple-400 transition">Funkciók</a>
              <a href="#pricing" className="block text-lg font-medium hover:text-purple-400 transition">Árak</a>
              <a href="#contact" className="block text-lg font-medium hover:text-purple-400 transition">Kapcsolat</a>
              <button className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 px-8 py-4 rounded-full font-semibold">
                Kezdd el most
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
          <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/4 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 mb-8 px-6 py-3 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 backdrop-blur-xl border border-white/10 rounded-full">
            <Star className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-sm font-medium bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
              Most elérhető: GPT-5, Claude Opus 4, Gemini Ultra 2.0
            </span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            <span className="block bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              A jövő AI platformja
            </span>
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              már itt van
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-4xl mx-auto font-light leading-relaxed">
            Tapasztald meg a következő generációs AI technológiát. Egy platformon az összes vezető AI modell, 
            <span className="text-white font-medium"> bank-szintű biztonsággal</span> és 
            <span className="text-white font-medium"> villámgyors válaszidővel</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <button className="group relative overflow-hidden px-10 py-5 rounded-full text-lg font-bold shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 flex items-center justify-center">
                Próbáld ki ingyen <Sparkles className="ml-2 w-5 h-5" />
              </span>
            </button>
            <button className="relative overflow-hidden px-10 py-5 rounded-full text-lg font-bold backdrop-blur-xl border border-white/20 hover:border-white/40 transition-all group">
              <span className="flex items-center justify-center">
                Nézd meg működés közben <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="flex items-center space-x-3 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/10 transition-all">
                  <Icon className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium">{feature.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-block mb-6 px-6 py-2 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 backdrop-blur-xl border border-white/10 rounded-full">
              <span className="text-sm font-medium bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                💎 Prémium árazás
              </span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black mb-6">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Válaszd a te 
              </span>
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                csomagodat
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Rugalmas árazás minden igényre, startup-tól enterprise-ig
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg, idx) => {
              const Icon = pkg.icon;
              return (
                <div
                  key={idx}
                  className={`relative group rounded-3xl p-8 backdrop-blur-2xl transition-all duration-500 hover:scale-105 ${
                    pkg.highlight
                      ? 'bg-gradient-to-b from-white/10 to-white/5 border-2 border-transparent bg-clip-padding'
                      : 'bg-white/5 border border-white/10'
                  }`}
                  style={pkg.highlight ? {
                    backgroundImage: `linear-gradient(black, black), linear-gradient(135deg, #a855f7, #ec4899, #06b6d4)`,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box'
                  } : {}}
                >
                  {pkg.highlight && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-full text-sm font-bold shadow-2xl">
                      ⭐ Legjobb választás
                    </div>
                  )}
                  
                  <div className="mb-8">
                    <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${pkg.gradient} mb-6 shadow-2xl`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4">{pkg.name}</h3>
                    <div className="flex items-baseline mb-2">
                      <span className="text-5xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        {pkg.price}
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm">/{pkg.period}</span>
                  </div>

                  <ul className="space-y-4 mb-10">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-start group/item">
                        <div className={`p-1 rounded-full bg-gradient-to-br ${pkg.gradient} mr-3 flex-shrink-0 mt-0.5`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300 text-sm leading-relaxed group-hover/item:text-white transition">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 ${
                      pkg.highlight
                        ? `bg-gradient-to-r ${pkg.gradient} hover:shadow-2xl hover:scale-105`
                        : 'bg-white/10 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    Kezdés →
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-center mt-12 text-gray-500">
            Minden csomag tartalmaz <span className="text-white font-semibold">30 napos pénzvisszafizetési garanciát</span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  AI Nexus
                </span>
              </div>
              <p className="text-gray-500 leading-relaxed mb-6">
                A világ legfejlettebb AI platformja. Egyesítjük a legjobb technológiákat, 
                hogy te mindig egy lépéssel előrébb járj.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition cursor-pointer">
                  <span className="text-xs">𝕏</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition cursor-pointer">
                  <span className="text-xs">in</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition cursor-pointer">
                  <span className="text-xs">▶</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-white">Termék</h4>
              <ul className="space-y-3 text-gray-500">
                <li><a href="#" className="hover:text-white transition">Funkciók</a></li>
                <li><a href="#" className="hover:text-white transition">Árazás</a></li>
                <li><a href="#" className="hover:text-white transition">API</a></li>
                <li><a href="#" className="hover:text-white transition">Integráció</a></li>
                <li><a href="#" className="hover:text-white transition">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-white">Vállalat</h4>
              <ul className="space-y-3 text-gray-500">
                <li><a href="#" className="hover:text-white transition">Rólunk</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Karrier</a></li>
                <li><a href="#" className="hover:text-white transition">Press Kit</a></li>
                <li><a href="#" className="hover:text-white transition">Kapcsolat</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-white">Jogi</h4>
              <ul className="space-y-3 text-gray-500">
                <li><a href="#" className="hover:text-white transition">Adatvédelem</a></li>
                <li><a href="#" className="hover:text-white transition">Feltételek</a></li>
                <li><a href="#" className="hover:text-white transition">Cookie</a></li>
                <li><a href="#" className="hover:text-white transition">Compliance</a></li>
                <li><a href="#" className="hover:text-white transition">GDPR</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm mb-4 md:mb-0">
              © 2026 AI Nexus Technologies Inc. Minden jog fenntartva.
            </p>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span>🇪🇺 GDPR Compliant</span>
              <span>🔒 ISO 27001</span>
              <span>✓ SOC 2 Type II</span>
            </div>
          </div>
        </div>
      </footer>

      <style jsx="true">{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
export default App;