import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, User, Bot } from 'lucide-react';
import { getModel } from '../../ai_components/models';
import { stripAssistantThinking } from '../../utils/assistantContent';

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
    <div className="relative my-6 rounded-2xl border border-white/5 bg-[#0a0a0f] shadow-2xl group/code">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/5 shadow-lg rounded-t-2xl">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />
          </div>
          {lang && (
            <div className="flex items-center gap-3">
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">{lang}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-500"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 whitespace-nowrap">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code Content */}
      <div className="p-4 md:p-5 overflow-auto max-h-[600px] relative">
        <pre className="text-[13px] font-mono leading-relaxed text-white relative z-10">
          <code className="block">{code}</code>
        </pre>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Markdown-lite renderer                                            */
/* ──────────────────────────────────────────────────────────────────── */
const getMessageText = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part?.type === 'text')
      .map((part) => part.text || '')
      .join('\n')
      .trim();
  }
  return content == null ? '' : String(content);
};

const getMessageImagePreview = (content) => {
  if (!Array.isArray(content)) return null;
  const imagePart = content.find((part) => part?.type === 'image_url');
  const imageUrl = typeof imagePart?.image_url === 'string'
    ? imagePart.image_url
    : imagePart?.image_url?.url;
  return typeof imageUrl === 'string' ? imageUrl : null;
};

const renderContent = (content) => {
  const text = getMessageText(content);
  if (!text) return null;

  // Split by ``` to handle both closed and open (streaming) code blocks
  const sections = text.split("```");
  const elements = [];

  for (let i = 0; i < sections.length; i++) {
    const isCode = i % 2 === 1;
    const content = sections[i];

    if (isCode) {
      // It's a code block (even if the closing ``` hasn't arrived yet)
      let lang = "";
      let code = content;

      // Extract language from first line if possible
      const firstNewline = content.indexOf("\n");
      if (firstNewline !== -1) {
        lang = content.substring(0, firstNewline).trim();
        code = content.substring(firstNewline + 1);
      } else if (content.length > 0 && i < sections.length - 1) {
        // If we have a following section, then this section is definitely the lang + code
        // Or if no newline, maybe it's just the lang? Let's check.
        lang = content.trim();
        code = "";
      }

      elements.push(<CodeBlock key={`code-${i}`} lang={lang} code={code} />);
    } else {
      // It's regular text
      if (!content.trim() && i > 0 && i < sections.length - 1) continue;

      const rendered = content.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return (
            <strong key={j} className="text-white font-bold">
              {seg.slice(2, -2)}
            </strong>
          );
        }
        return seg;
      });

      elements.push(
        <p
          key={`text-${i}`}
          className="whitespace-pre-wrap mb-4 last:mb-0 leading-relaxed text-[14px] text-white text-left"
        >
          {rendered}
        </p>
      );
    }
  }

  return elements;
};

/* ──────────────────────────────────────────────────────────────────── */
/*  MessageItem                                                       */
/* ──────────────────────────────────────────────────────────────────── */
export default function MessageItem({ message, themeColor }) {
  const isAi = message.role === 'assistant';

  // Resolve the model that generated this message (or fall back to current themeColor)
  const msgModel = isAi && (message.modelId || message.model) ? getModel(message.modelId || message.model) : null;
  const messageColor = msgModel?.color || themeColor;
  const [copiedInline, setCopiedInline] = useState(false);
  const rawMessageText = getMessageText(message.content);
  const messageText = isAi ? stripAssistantThinking(rawMessageText) : rawMessageText;
  const imagePreview = message.attachedImagePreview || getMessageImagePreview(message.content);

  const timestamp = useMemo(() => {
    let date = null;
    if (message.timestamp) {
      if (typeof message.timestamp === 'object' && message.timestamp.seconds !== undefined) {
        date = new Date(message.timestamp.seconds * 1000);
      } else if (typeof message.timestamp === 'string') {
        date = new Date(message.timestamp);
      } else if (typeof message.timestamp === 'number') {
        date = new Date(message.timestamp);
      }
    }
    if (!date || isNaN(date.getTime()) && message.createdAt) {
      date = new Date(message.createdAt);
    }
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    const now = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffMs / 604800000);

    // Today: show time
    if (diffDays === 0) return timeStr;
    // Yesterday
    if (diffDays === 1) return 'yesterday';
    // This week
    if (diffDays < 7) return `${diffDays} days ago`;
    // This month (weeks)
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    // Months
    const diffMonths = Math.floor(diffMs / 2592000000);
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    // Years
    const diffYears = Math.floor(diffMs / 31536000000);
    if (diffYears === 1) return '1 year ago';
    return `${diffYears} years ago`;
  }, [message.timestamp, message.createdAt]);

  return (
    <div className={`flex mb-8 w-full ${isAi ? 'flex-row items-start justify-start' : 'flex-row-reverse items-start justify-start'
      }`}>
      {/* Avatar */}
      <div className="relative shrink-0 mt-1">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-lg overflow-hidden ${isAi ? 'bg-white/[0.03]' : 'bg-white/5'}`}
          style={{
            borderColor: isAi ? `${messageColor}40` : 'rgba(255,255,255,0.15)',
            color: isAi ? messageColor : '#fff'
          }}
        >
          {isAi ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>
      </div>

      {/* Content column */}
      <div className={`flex flex-col min-w-0 max-w-[80%] sm:max-w-[47.5%] ${isAi ? 'items-start ml-3 sm:ml-4' : 'items-end mr-3 sm:mr-4'}`}>
        {/* Meta: Name + Timestamp */}
        <div className={`flex items-center gap-3 mb-2 ${isAi ? '' : 'flex-row-reverse'}`}>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">
            {isAi ? (msgModel?.name || 'AI') : 'You'}
          </span>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{timestamp}</span>
        </div>

        {/* Bubble */}
        <div className="flex flex-col w-full">
          <div
            className={`relative px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 border shadow-lg ${isAi
              ? 'bg-white/[0.06] border-white/10 rounded-2xl rounded-tl-none rounded-br-none'
              : 'bg-white/[0.04] border-white/8 rounded-2xl rounded-tr-none'
              }`}
          >
            {/* Image Attachment */}
            {imagePreview && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="attachment" className="w-full h-auto max-h-[400px] object-cover" />
              </div>
            )}

            {/* Text Content */}
            <div className="relative z-10">
              {renderContent(messageText)}
            </div>

            {/* Thinking State */}
            {message.isStreaming && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="flex gap-1.5 items-end h-4">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 16, 4], opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1 rounded-full"
                      style={{ backgroundColor: messageColor }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 italic">Generating response...</span>
              </div>
            )}
          </div>

          {/* Copy button */}
          {isAi && !message.isStreaming && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(messageText);
                setCopiedInline(true);
                setTimeout(() => setCopiedInline(false), 2000);
              }}
              className="self-end relative h-8 flex items-center mt-[-1px]"
            >
              <div className="relative pl-6 pr-4 py-1 flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors duration-200">
                <AnimatePresence mode="popLayout" initial={false}>
                  {copiedInline ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Copied</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Copy</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
