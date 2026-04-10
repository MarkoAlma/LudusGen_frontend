import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, User, Bot } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────── */
/*  Code Block                                                        */
/* ──────────────────────────────────────────────────────────────────── */
const CodeBlock = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-6 rounded-2xl overflow-hidden border border-white/5 bg-[#050508] shadow-2xl group/code">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />
          </div>
          {lang && (
            <div className="flex items-center gap-3">
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">{lang}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-500"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code Content */}
      <div className="p-4 md:p-5 overflow-x-auto relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[80px] pointer-events-none" />
        <pre className="text-[13px] font-mono leading-relaxed text-gray-300 [scrollbar-width:none] relative z-10">
          <code className="block">{code}</code>
        </pre>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Markdown-lite renderer                                            */
/* ──────────────────────────────────────────────────────────────────── */
const renderContent = (text) => {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
      return <CodeBlock key={i} lang={match?.[1]} code={match?.[2]} />;
    }

    const rendered = part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={j} className="text-white font-black italic tracking-tight">{seg.slice(2, -2)}</strong>;
      }
      return seg;
    });

    return (
      <p key={i} className="whitespace-pre-wrap mb-4 last:mb-0 leading-relaxed text-[14px] text-gray-400 font-bold text-left">
        {rendered}
      </p>
    );
  });
};

/* ──────────────────────────────────────────────────────────────────── */
/*  MessageItem                                                       */
/* ──────────────────────────────────────────────────────────────────── */
export default function MessageItem({ message, themeColor }) {
  const isAi = message.role === 'assistant';
  const [copiedInline, setCopiedInline] = useState(false);

  const timestamp = useMemo(() => {
    if (message.timestamp) {
      const d = new Date(message.timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.timestamp]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`flex relative group/msg mb-8 w-full ${
        isAi ? 'flex-row items-start justify-start' : 'flex-row-reverse items-start justify-start'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0 mt-1">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-lg transition-all duration-700 group-hover/msg:scale-105 overflow-hidden ${isAi ? 'bg-white/[0.03]' : 'bg-white/5'
            }`}
          style={{
            borderColor: isAi ? `${themeColor}40` : 'rgba(255,255,255,0.15)',
            color: isAi ? themeColor : '#fff'
          }}
        >
          {isAi ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </motion.div>
        <div
          className="absolute -inset-4 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-1000 blur-2xl pointer-events-none z-0"
          style={{ background: `radial-gradient(circle at center, ${isAi ? themeColor : '#fff'}25 0%, transparent 70%)` }}
        />
      </div>

      {/* Content column — each side max 47.5% of screen */}
      <div className={`flex flex-col min-w-0 max-w-[47.5%] ${isAi ? 'items-start ml-4' : 'items-end mr-4'}`}>
        {/* Meta: Name + Timestamp */}
        <div className={`flex items-center gap-3 mb-2 ${isAi ? '' : 'flex-row-reverse'}`}>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
            {isAi ? 'Ludus Gen' : 'Te'}
          </span>
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">{timestamp}</span>
        </div>

        {/* Bubble + Copy stacked in flex-col, zero gap */}
        <div className="flex flex-col w-full">

          {/* Message Bubble */}
          <div
            className={`relative px-6 py-5 md:px-8 md:py-6 border transition-all duration-700 shadow-[0_20px_60px_rgba(0,0,0,0.6)] group-hover/msg:border-white/20 overflow-hidden ${isAi
                ? 'bg-white/[0.04] border-white/10 rounded-2xl rounded-tl-none rounded-br-none'
                : 'bg-white/[0.02] border-white/5 rounded-2xl rounded-tr-none'
              }`}
          >
            {/* Cinematic border beam (top) */}
            <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent transition-opacity duration-1000 ${isAi ? 'opacity-60 group-hover/msg:opacity-100' : 'opacity-20 group-hover/msg:opacity-60'}`} />

            {/* Dynamic light leak (AI only) */}
            {isAi && (
              <div className="absolute top-0 left-[-20%] w-[50%] h-full bg-gradient-to-r from-primary/5 to-transparent blur-3xl pointer-events-none opacity-0 group-hover/msg:opacity-100 transition-opacity duration-1000" />
            )}

            {/* Background glow (AI only) */}
            {isAi && (
              <div
                className="absolute inset-0 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-1000 pointer-events-none z-0"
                style={{ background: `radial-gradient(circle at center, ${themeColor}10 0%, transparent 70%)` }}
              />
            )}

            {/* AI scanlines sync */}
            {isAi && (
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover/msg:opacity-100 transition-opacity duration-500 z-20" />
            )}

            {/* Image Attachment */}
            {message.attachedImagePreview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-2xl overflow-hidden border border-white/10 group/img relative"
              >
                <img src={message.attachedImagePreview} alt="attachment" className="w-full h-auto max-h-[400px] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
              </motion.div>
            )}

            {/* Text Content */}
            <div className="relative z-10">
              {renderContent(message.content)}
            </div>

            {/* Thinking State */}
            {message.isStreaming && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                <div className="flex gap-1.5 items-end h-4">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 16, 4], opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1 rounded-full"
                      style={{ backgroundColor: themeColor }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 italic">Válasz generálása...</span>
              </div>
            )}
          </div>

          {/* Copy button — directly below bubble, right-aligned, seamlessly attached */}
          {isAi && !message.isStreaming && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setCopiedInline(true);
                setTimeout(() => setCopiedInline(false), 2000);
              }}
              className="self-end relative h-8 flex items-center group/copybtn mt-[-1px]"
            >
              {/* Trapezoid background with clipped blur to avoid rectangular artifacts */}
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                {/* Backdrop Blur Layer — Clipped to match the trapezoid precisely */}
                <div 
                  className="absolute inset-0"
                  style={{ 
                    backdropFilter: 'blur(12px)', 
                    background: 'rgba(255, 255, 255, 0.03)',
                    clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 15% 100%)',
                    borderRadius: '0 0 12px 0' 
                  }}
                />
                {/* SVG Border Layer - Top edge removed to merge with bubble boarder */}
                <svg
                  className="absolute inset-0 w-full h-full overflow-visible"
                  viewBox="0 0 100 32"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 100 0 L 100 32 L 15 32 L 0 0"
                    fill="rgba(255, 255, 255, 0.05)"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    className="transition-all duration-300 group-hover/copybtn:stroke-white/20"
                  />
                </svg>
              </div>


              {/* Content */}
              <motion.div 
                layout
                className="relative pl-6 pr-4 py-1 flex items-center gap-1.5 text-gray-500 group-hover/copybtn:text-white transition-colors duration-200"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {copiedInline ? (
                    <motion.div 
                      key="check" 
                      layout
                      initial={{ scale: 0.8, opacity: 0, x: -5 }} 
                      animate={{ scale: 1, opacity: 1, x: 0 }} 
                      exit={{ scale: 0.8, opacity: 0, x: 5 }}
                      transition={{ type: "spring", damping: 25, stiffness: 350 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
                        Copied
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="copy" 
                      layout
                      initial={{ scale: 0.8, opacity: 0, x: -5 }} 
                      animate={{ scale: 1, opacity: 1, x: 0 }} 
                      exit={{ scale: 0.8, opacity: 0, x: 5 }}
                      transition={{ type: "spring", damping: 25, stiffness: 350 }}
                      className="flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                        Copy
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

            </button>
          )}

        </div>
      </div>
    </motion.div>
  );
}
