import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Sparkles, PenTool, Code2, Globe, Lightbulb } from 'lucide-react';
import MessageItem from './MessageItem';

const SUGGESTION_CHIPS = [
  { icon: PenTool, text: 'Írj egy rövid történetet egy idős utazóról', color: '#a78bfa' },
  { icon: Code2, text: 'Magyarázd el a React hookokat egyszerűen', color: '#60a5fa' },
  { icon: Globe, text: 'Mi a különbség a REST és GraphQL között?', color: '#34d399' },
  { icon: Lightbulb, text: 'Adj ötletet egy startuphoz AI témában', color: '#fbbf24' },
];

export default function MessageList({ messages, loadingHistory, selectedModel, onSuggestionClick }) {
  const themeColor = selectedModel?.color || "#8b5cf6";
  const isEmpty = !loadingHistory && messages.length === 0;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };


  return (
    <div className="flex flex-col space-y-4 w-full items-center">
      {/* Loading spinner */}
      {loadingHistory && (
        <div className="flex items-center justify-center p-16">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${themeColor}30`, borderTopColor: 'transparent' }}
            />
            <span className="text-[10px] text-gray-600">Történet betöltése...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center min-h-[400px] py-10 sm:py-20 gap-6 sm:gap-8">
          {/* Icon with glow */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center border border-white/10 bg-white/[0.03] backdrop-blur-sm"
              style={{ color: `${themeColor}60` }}
            >
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="absolute inset-0 rounded-3xl blur-2xl opacity-20 scale-125 pointer-events-none"
              style={{ backgroundColor: themeColor }}
            />
          </motion.div>

          {/* Welcome text */}
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-center"
          >
            <h3 className="text-2xl font-black text-white italic tracking-tighter mb-2">Üdvözöljük!</h3>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed font-bold">
              Indítson egy beszélgetést az AI asszisztenssel. Írjon egy üzenetet lent, vagy válasszon egy témát.
            </p>
          </motion.div>

          {/* Status badge */}
          <motion.div
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: themeColor }} />
            <span className="text-xs text-gray-400 font-bold">{selectedModel?.name || 'AI'} készen áll</span>
          </motion.div>

          {/* Suggestion chips */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex flex-wrap justify-center gap-3 max-w-xl px-4"
          >
            {SUGGESTION_CHIPS.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <motion.button
                  key={i}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSuggestionClick?.(chip.text)}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group/chip"
                >
                  <Icon className="w-4 h-4 text-gray-600 group-hover/chip:text-gray-400 transition-colors" />
                  <span className="text-[11px] sm:text-[12px] text-gray-500 group-hover/chip:text-gray-300 transition-colors break-words font-bold">
                    {chip.text}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Messages */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col w-full"
      >
        {messages.map((msg, idx) => (
          <motion.div key={msg.id || idx} variants={itemVariants}>
            <MessageItem
              message={msg}
              themeColor={themeColor}
            />
          </motion.div>
        ))}
      </motion.div>


      {/* Scroll anchor */}
      <div className="h-4" />
    </div>
  );
}
