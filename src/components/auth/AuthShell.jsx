import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export default function AuthShell({ children, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Cinematic Animated Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-[20px]"
        >
          {/* Subtle background glow hints */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative z-10 my-3 sm:my-4 w-full max-w-[1000px] min-h-[650px] flex rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-[0_0_80px_rgba(138,43,226,0.15)] bg-[#03000a]/80"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all pointer-events-auto"
          >
            <X size={20} />
          </button>

          {/* Left Side Branding */}
          <div className="hidden md:flex flex-1 relative flex-col bg-black/40 overflow-hidden border-r border-white/5">
             {/* Neon Geometric Overlay */}
             <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-blue-600/10 opacity-60" />
             <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(138,43,226,0.15),transparent_50%)]" />
             <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

             <div className="p-12 relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-auto">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(138,43,226,0.2)]">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xl font-black text-white italic tracking-widest uppercase text-glow">LudusGen</span>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-4xl font-black text-white leading-tight mb-6 tracking-tight">
                    ENTER THE <br /> <span className="text-gradient-primary">NEURAL GRID</span>
                  </h3>
                  <p className="text-lg text-gray-400 font-medium leading-relaxed max-w-sm">
                    Authenticate to access top-tier AI models, generate cinematic assets, and join the most advanced creator network.
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest mt-auto">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                   System Online
                </div>
             </div>
          </div>

          {/* Right Side Form Wrapper */}
          <div className="flex-1 min-w-0 p-5 sm:p-7 md:p-10 flex flex-col relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            <div className="relative z-10 w-full max-w-[400px] mx-auto my-auto py-2">
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
