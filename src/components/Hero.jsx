import { Sparkles, ArrowRight, Star, Globe, Shield, Cpu } from 'lucide-react';

const features = [
  { icon: Globe, title: 'Globális AI Hálózat' },
  { icon: Shield, title: 'Enterprise Biztonság' },
  { icon: Cpu, title: 'AI Orchestration' }
];

export default function Hero() {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center">
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

      
    </section>
  );
}
