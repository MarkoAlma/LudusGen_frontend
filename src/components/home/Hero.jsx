import React from 'react';
import { motion } from 'framer-motion';
import Container from '../ui/Container';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import FloatingCore from '../ui/FloatingCore';
import HeroRender from '../../assets/hero_cinematic_render_1775575904860.png';

export default function Hero() {
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section className="relative pt-32 pb-32 md:pt-40 md:pb-48 overflow-hidden">
      {/* Cinematic Background Render Layer */}
       <div className="absolute inset-0 z-0 pointer-events-none opacity-40 transform scale-110">
          <img src={HeroRender} alt="bg" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#03000a]/30 to-[#03000a]" />
       </div>

      <Container>
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Left: Content */}
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="flex-1 text-center lg:text-left"
          >
            <motion.div variants={itemVariants} className="mb-8 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em]">
               <Sparkles className="w-4 h-4" /> Next-Gen AI Laboratory
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="text-5xl md:text-7xl lg:text-8xl font-black text-white italic tracking-tighter leading-[0.9] mb-10"
            >
              Alkoss. <br />
              <span className="text-primary italic">Smarter.</span> <br />
              Fejlessz.
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg md:text-xl text-gray-500 mb-12 max-w-xl font-bold leading-relaxed"
            >
              A LudusGen az egyetlen integrált AI ökoszisztéma, amely egyesíti a szöveg, kép, hang és 3D generálást professzionális környezetben.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
              <button className="px-10 py-5 rounded-[2rem] bg-primary text-white font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(138,43,226,0.3)] flex items-center justify-center gap-3 group">
                Access Hub <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-10 py-5 rounded-[2rem] bg-white/5 border border-white/10 text-white font-bold text-lg backdrop-blur-md transition-all hover:bg-white/10 flex items-center justify-center gap-3">
                <Play className="w-4 h-4 fill-primary text-primary" /> Watch Reel
              </button>
            </motion.div>
          </motion.div>

          {/* Right: The WOW 3D Object (Standalone) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="flex-1 w-full max-w-[500px] lg:max-w-none aspect-square relative"
          >
            {/* Soft Glow Under the 3D object */}
            <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full scale-75 animate-pulse" />
            <div className="w-full h-full relative z-10 transition-transform duration-700 hover:scale-105 active:scale-95">
               <FloatingCore size={1.2} />
            </div>
            
            {/* Tech Decoration */}
            <div className="absolute -top-10 -right-10 hidden xl:block p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
               <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">Neural Engine</p>
               <div className="flex gap-1">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="w-1 h-4 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: `${i*100}ms` }} />)}
               </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
