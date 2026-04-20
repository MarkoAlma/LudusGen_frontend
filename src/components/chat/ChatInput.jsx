import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, ArrowUp, Mic, Check, Square } from 'lucide-react';

export default function ChatInput({
  input, setInput, isTyping, handleSend, handleStop,
  attachedImage, setAttachedImage, textareaRef
}) {
  const fileInputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Reset height when input is cleared externally
  React.useEffect(() => {
    if (input === '' && textareaRef?.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, textareaRef]);

  const handleTextChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage({ dataUrl: ev.target.result, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendWithAnimation = () => {
    setJustSent(true);
    handleSend();
    setTimeout(() => setJustSent(false), 1500);
  };

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage({ dataUrl: ev.target.result, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const hasContent = input.trim() || attachedImage;

  return (
    <div
      className="relative rounded-[1.5rem] bg-[#0d0d12]/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.4)] transition-all duration-500 group/input focus-within:border-primary/30 focus-within:bg-[#0d0d12]/80 focus-within:shadow-[0_16px_50px_rgba(138,43,226,0.12)]"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#03000a]/80 backdrop-blur-xl rounded-[2.5rem] border-2 border-dashed border-primary/20"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(138,43,226,0.1)]">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ImagePlus className="w-8 h-8 text-primary" />
                </motion.div>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic leading-none mb-2">Kép feltöltése</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Húzd ide a képet</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-0 py-0 relative z-10">
        {/* Attachment Preview */}
        <AnimatePresence>
          {attachedImage && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="mb-4 inline-flex items-center gap-3 p-2.5 pr-4 rounded-[1.2rem] bg-white/[0.03] border border-white/10 shadow-2xl"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 shadow-inner">
                <img src={attachedImage.dataUrl} alt="upload" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-primary/5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[140px]">{attachedImage.name}</p>
                <p className="text-[8px] font-bold text-gray-600 uppercase mt-0.5 tracking-[0.2em]">Kép csatolva</p>
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-gray-600 hover:text-white transition-all duration-500 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forum-Matched Command Module */}
        <div
          onClick={(e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'svg' && !e.target.closest('button')) {
              textareaRef?.current?.focus();
            }
          }}
          className="flex items-center gap-3 px-4 py-3 relative cursor-text"
        >
          {/* Subtle Ambient Glow */}
          {focused && (
            <div className="absolute inset-0 rounded-[1.5rem] border border-primary/20 blur-md pointer-events-none opacity-30" />
          )}

          {/* Left actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-2.5 rounded-2xl hover:bg-white/5 text-gray-500 hover:text-primary transition-all duration-500 group/icon"
              title="Kép csatolása"
            >
              <ImagePlus className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover/icon:scale-110 transition-transform" />
            </button>
            <button className="p-2 sm:p-2.5 rounded-2xl hover:bg-white/5 text-gray-500 hover:text-white transition-all duration-500 group/icon" title="Hang bevitel">
              <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover/icon:scale-110 transition-transform" />
            </button>
          </div>

          <div className="w-px h-8 bg-white/5 shrink-0 hidden sm:block" />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
            accept="image/*"
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextChange}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Kérdezz bármit a LudusGen AI-tól..."
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder-zinc-500 py-2 px-2 text-[14.5px] font-medium resize-none scrollbar-hide leading-relaxed relative z-10"
          />

          {/* Send button */}
          <div className="shrink-0">
            <motion.button
              onClick={isTyping ? handleStop : (hasContent ? handleSendWithAnimation : undefined)}
              disabled={!hasContent && !isTyping}
              whileTap={(hasContent || isTyping) ? { scale: 0.92 } : {}}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-700 relative overflow-hidden group/send ${isTyping
                  ? 'bg-red-500/10 border border-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:bg-red-500/20 hover:border-red-500/40'
                  : hasContent
                    ? 'bg-primary text-white shadow-[0_10px_30px_rgba(138,43,226,0.3)] hover:shadow-[0_15px_40px_rgba(138,43,226,0.4)] hover:scale-105'
                    : 'bg-white/[0.04] text-gray-700 pointer-events-none'
                }`}
            >
              <AnimatePresence mode="wait">
                {justSent ? (
                  <motion.div
                    key="sent"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Check className="w-6 h-6 text-white" />
                  </motion.div>
                ) : isTyping ? (
                  <motion.div
                    key="stop"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center justify-center"
                  >
                    <Square className="w-5 h-5 fill-current" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <ArrowUp className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
