import { Rocket, ArrowRight, Play } from "lucide-react";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen pt-32 pb-20 px-6 sm:px-12 flex flex-col justify-center items-center overflow-hidden"
    >
      <div className="max-w-[1000px] w-full mx-auto relative z-10 flex flex-col items-center text-center">
        
        {/* Glowy Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 glass-panel shadow-[0_0_20px_rgba(138,43,226,0.3)] mb-8">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-body text-xs font-semibold tracking-wide text-white uppercase">Platform V2.0 Élőben</span>
          <div className="h-3 w-[1px] bg-white/20 mx-1" />
          <span className="font-body text-xs font-medium text-text-dim cursor-pointer hover:text-white transition-colors flex items-center">
            Nézd meg a frissítéseket <ArrowRight className="w-3 h-3 ml-1" />
          </span>
        </div>

        {/* Elegant Gradient Heading */}
        <h1 className="text-5xl sm:text-7xl font-heading font-extrabold tracking-tight mb-8 leading-[1.1]">
          A jövő AI <br />
          <span className="text-gradient-primary">PLATFORMJA</span> <br />
          már itt van
        </h1>

        {/* Muted Subtext */}
        <p className="font-body text-lg sm:text-xl text-text-dim mb-12 max-w-2xl leading-relaxed text-balance">
          Tapasztald meg a következő generációs AI technológiát. Egy platformon az összes vezető AI modell, <span className="text-white font-medium">bank-szintű biztonsággal</span> és <span className="text-white font-medium">villámgyors válaszidővel</span>.
        </p>

        {/* Smooth Glass CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto mt-2">
          {/* Primary Button */}
          <button className="group relative px-8 py-4 rounded-full font-body font-semibold text-white overflow-hidden shadow-[0_0_30px_rgba(138,43,226,0.4)]">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary transition-transform duration-500 group-hover:scale-105" />
            <span className="relative z-10 flex items-center justify-center">
              Próbáld ki ingyen
              <Rocket className="ml-2 w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          {/* Secondary Button */}
          <button className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full font-body font-medium text-white glass-panel border border-white/10 hover:bg-white/10 transition-all duration-300">
            <Play className="w-5 h-5 text-text-dim group-hover:text-white transition-colors" />
            Működés közben
          </button>
        </div>

        {/* Floating Abstract Element below hero */}
        <div className="mt-20 relative w-full max-w-5xl h-[400px] glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
           <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
           <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
           {/* Mockup Dashboard Header */}
           <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2">
             <div className="w-3 h-3 rounded-full bg-red-400"></div>
             <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
             <div className="w-3 h-3 rounded-full bg-green-400"></div>
           </div>
           {/* Mockup body */}
           <div className="p-8 flex items-center justify-center h-[calc(100%-3rem)]">
              <div className="text-text-dim flex flex-col items-center opacity-50">
                <span className="text-5xl mb-4">✨</span>
                <p className="font-body">Interactive Dashboard Preview</p>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
}