import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit, Cpu } from 'lucide-react';

export default function SummaryIndicator({ isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="relative group mb-4 mx-auto"
        >
          {/* Futuristic Glow Layer */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-blue-600 rounded-2xl blur-md opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse" />
          
          <div className="relative flex items-center gap-4 px-6 py-3 bg-[#0d0d15]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            {/* Animated Icon Container */}
            <div className="relative flex items-center justify-center w-10 h-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-purple-400 opacity-40"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="z-10 text-purple-400"
              >
                <BrainCircuit size={24} />
              </motion.div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-wide text-white/90">
                  OPTIMIZING CONTEXT
                </span>
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                />
              </div>
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 whitespace-nowrap">
                  Archiving session history
                </span>
                <div className="flex gap-1 h-3 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 10, 4] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      className="w-0.5 bg-purple-400/30 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Sparkle details */}
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 text-purple-300/30"
            >
              <Sparkles size={12} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
