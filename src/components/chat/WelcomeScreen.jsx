import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Sparkles, PenTool, Code2, Globe, Lightbulb } from 'lucide-react';

const SUGGESTION_CHIPS = [
  { icon: PenTool, text: 'Írj egy rövid történetet egy idős utazóról', color: '#a78bfa' },
  { icon: Code2, text: 'Magyarázd el a React hookokat egyszerűen', color: '#60a5fa' },
  { icon: Globe, text: 'Mi a különbség a REST és GraphQL között?', color: '#34d399' },
  { icon: Lightbulb, text: 'Adj ötletet egy startuphoz AI témában', color: '#fbbf24' },
];

export default function WelcomeScreen({ themeColor, selectedModel, onSuggestionClick }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center w-full h-full z-10 overflow-hidden pointer-events-none">
      {/* Top Spacer area (Header Mask height) */}
      <div className="h-32 sm:h-40 w-full flex-shrink-0" />

      {/* Visual Workspace - Centered Content */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 sm:p-8 pointer-events-auto min-h-0">
        <div className="w-full max-w-2xl flex flex-col items-center gap-4 sm:gap-6 lg:gap-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center border border-white/10 bg-white/[0.03] backdrop-blur-sm"
              style={{ color: `${themeColor}60` }}
            >
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-20 scale-125 pointer-events-none"
              style={{ backgroundColor: themeColor }}
            />
          </motion.div>

          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-center px-4"
          >
            <h3 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter mb-2">Üdvözöljük!</h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm leading-relaxed font-bold mx-auto opacity-80">
              Indítson egy beszélgetést az AI asszisztenssel. Írjon egy üzenetet lent, vagy válasszon egy témát.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: themeColor }} />
            <span className="text-[10px] sm:text-xs text-gray-400 font-bold">{selectedModel?.name || 'AI'} készen áll</span>
          </motion.div>

          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col items-center gap-2.5 w-full max-w-[420px] px-4"
          >
            {SUGGESTION_CHIPS.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <motion.button
                  key={i}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ y: -1, scale: 1.01, backgroundColor: 'rgba(255,255,255,0.04)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSuggestionClick?.(chip.text)}
                  className="w-full flex items-center justify-start px-5 py-3 rounded-2xl border border-white/[0.04] bg-white/[0.015] transition-all duration-300 group/chip overflow-hidden relative shadow-sm"
                >
                  <Icon className="w-4 h-4 text-gray-500 group-hover/chip:text-white transition-colors flex-shrink-0" />
                  <span className="text-[12px] sm:text-[13px] text-gray-400 group-hover/chip:text-gray-100 transition-colors font-semibold ml-4 line-clamp-1">
                    {chip.text}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Bottom Spacer area (Input field height estimation) */}
      <div className="h-40 sm:h-52 w-full flex-shrink-0" />
    </div>
  );
}
