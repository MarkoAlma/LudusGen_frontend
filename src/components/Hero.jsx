import { Rocket } from "lucide-react";
import { Sparkles, ArrowRight, Star, Globe, Shield, Cpu } from "lucide-react";

const features = [
  { icon: Globe, title: "Globális AI Hálózat" },
  { icon: Shield, title: "Enterprise Biztonság" },
  { icon: Cpu, title: "AI Orchestration" },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center px-[4vw] sm:px-6 lg:px-8 pt-15 md:pt-0"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/3 w-[0.8vw] h-[0.8vw] sm:w-2 sm:h-2 bg-purple-400 rounded-full animate-ping" />
        <div
          className="absolute top-1/3 right-1/4 w-[0.8vw] h-[0.8vw] sm:w-2 sm:h-2 bg-cyan-400 rounded-full animate-ping"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-[0.8vw] h-[0.8vw] sm:w-2 sm:h-2 bg-pink-400 rounded-full animate-ping"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-[4vw] sm:px-4 text-center relative z-10 py-[6vh] sm:py-16">
        {/* Badge */}
        <div className="inline-flex items-center space-x-[1.5vw] sm:space-x-2 mb-[3vh] sm:mb-6 lg:mb-8 px-[4vw] sm:px-4 lg:px-6 py-[1.5vh] sm:py-2 lg:py-3 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 backdrop-blur-xl border border-white/10 rounded-full">
          <Star className="w-[4vw] h-[4vw] sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-yellow-400 animate-pulse" />
          <span className="text-[2.8vw] sm:text-xs lg:text-sm font-medium bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
            Most elérhető: GPT-5, Claude Opus 4, Gemini Ultra 2.0
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-[8vw] sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black mb-[3vh] sm:mb-6 lg:mb-8 leading-tight">
          <span className="block bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
            A jövő AI platformja
          </span>
          <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient mt-[1vh] sm:mt-2">
            már itt van
          </span>
        </h1>

        {/* Description */}
        <p className="text-[3.5vw] sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-400 mb-[4vh] sm:mb-8 lg:mb-12 max-w-4xl mx-auto font-light leading-relaxed px-[2vw] sm:px-4">
          Tapasztald meg a következő generációs AI technológiát. Egy
          platformon az összes vezető AI modell,
          <span className="text-white font-medium">
            {" "}
            bank-szintű biztonsággal
          </span>{" "}
          és
          <span className="text-white font-medium">
            {" "}
            villámgyors válaszidővel
          </span>
          .
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-[2vh] sm:gap-4 lg:gap-6 justify-center mb-[5vh] sm:mb-10 lg:mb-16 px-[2vw] sm:px-4">
          {/* Primary CTA */}
          <button className="group cursor-pointer relative overflow-hidden px-[6vw] sm:px-8 lg:px-12 py-[2.5vh] sm:py-4 lg:py-6 rounded-full text-[3.5vw] sm:text-base lg:text-xl font-black shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 animate-gradient-x" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x" />
            <div className="absolute inset-[-4px] bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 animate-spin-slow" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />
            </div>

            <span className="relative z-10 flex items-center justify-center uppercase tracking-wider">
              Próbáld ki ingyen
              <Sparkles className="ml-[2vw] sm:ml-2 lg:ml-3 w-[4vw] h-[4vw] sm:w-4 sm:h-4 lg:w-6 lg:h-6 animate-pulse" />
              <Rocket className="ml-[1.5vw] sm:ml-1.5 lg:ml-2 w-[4vw] h-[4vw] sm:w-4 sm:h-4 lg:w-6 lg:h-6 group-hover:translate-y-[-4px] transition-transform" />
            </span>

            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping-slow opacity-0 group-hover:opacity-30" />
          </button>

          {/* Secondary CTA */}
          <button className="group cursor-pointer relative overflow-hidden px-[6vw] sm:px-8 lg:px-12 py-[2.5vh] sm:py-4 lg:py-6 rounded-full text-[3.5vw] sm:text-base lg:text-xl font-black backdrop-blur-2xl border-2 border-white/30 hover:border-white/60 transition-all transform hover:scale-105 active:scale-95 duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-pink-600/0 to-cyan-600/0 group-hover:from-purple-600/20 group-hover:via-pink-600/20 group-hover:to-cyan-600/20 rounded-2xl blur-xl transition-all duration-300" />

            <span className="relative flex items-center justify-center">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:to-cyan-300 transition-all">
                Működés közben
              </span>
              <ArrowRight className="ml-[2vw] sm:ml-2 lg:ml-3 w-[4vw] h-[4vw] sm:w-4 sm:h-4 lg:w-6 lg:h-6 group-hover:translate-x-2 transition-transform text-white group-hover:text-cyan-400" />
            </span>
          </button>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-[2vw] sm:gap-3 lg:gap-4 px-[2vw] sm:px-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="flex items-center space-x-[2vw] sm:space-x-2 lg:space-x-3 px-[4vw] sm:px-4 lg:px-6 py-[1.5vh] sm:py-2 lg:py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white/10 transition-all cursor-pointer"
              >
                <Icon className="w-[4vw] h-[4vw] sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-purple-400" />
                <span className="text-[2.8vw] sm:text-xs lg:text-sm font-medium whitespace-nowrap">
                  {feature.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll Indicator – FIXED SIZE minden eszközön */}
      <div className="hidden sm:block absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">

        <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0; }
          50% { opacity: 0.3; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </section>
  );
}