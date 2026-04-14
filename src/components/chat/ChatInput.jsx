import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, ArrowUp, Mic, Check } from 'lucide-react';

export default function ChatInput({
  input, setInput, isTyping, handleSend,
  attachedImage, setAttachedImage, textareaRef
}) {
  const fileInputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

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
      className="relative bg-transparent group/input"
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
          className={`flex items-end gap-3 p-4 pl-6 rounded-[1.5rem] border transition-all duration-700 relative backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${
            focused
              ? 'bg-white/[0.08] border-primary/40'
              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
          }`}
        >
          {/* Subtle Ambient Glow */}
          {focused && (
            <div className="absolute inset-0 rounded-[1.5rem] border border-primary/20 blur-md pointer-events-none opacity-30" />
          )}



          {/* Left actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 pb-1.5">
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

          <div className="w-px h-8 bg-white/5 self-center mb-1 hidden sm:block" />

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
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder-zinc-500 py-3.5 px-3 text-[14.5px] font-medium resize-none scrollbar-hide leading-relaxed relative z-10"
          />

          {/* Send button */}
          <div className="pb-1.5 pr-1.5 flex items-center gap-2">
            <motion.button
              onClick={handleSendWithAnimation}
              disabled={!hasContent || isTyping}
              whileTap={(hasContent && !isTyping) ? { scale: 0.95 } : {}}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-700 relative overflow-hidden group/send ${
                hasContent && !isTyping
                  ? 'bg-primary text-white shadow-[0_10px_30px_rgba(138,43,226,0.3)] hover:shadow-[0_15px_40px_rgba(138,43,226,0.4)] hover:scale-105'
                  : 'bg-white/[0.04] text-gray-700 pointer-events-none'
              }`}
            >
              {/* Forum-style shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/send:translate-x-full transition-transform duration-1000" />
              
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
                    key="typing"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white" />
                  </motion.div>
                ) : (
                  <ArrowUp className="w-6 h-6" />
                )}
              </AnimatePresence>
            </motion.button>

          </div>
        </div>

        {/* Footer hints — Station Log Labels */}
        <div className="hidden sm:flex items-center justify-center gap-8 mt-6">
          <div className="flex items-center gap-3 group/hint cursor-default">
             <kbd className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-500 font-mono text-[9px] group-hover/hint:text-zinc-400 group-hover/hint:border-white/20 transition-all duration-700 italic font-black tracking-widest">ENTER</kbd>
             <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em] group-hover/hint:text-zinc-400 transition-colors">Command_Submit</span>
          </div>
          <div className="flex items-center gap-3 group/hint cursor-default">
             <kbd className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-500 font-mono text-[9px] group-hover/hint:text-zinc-400 group-hover/hint:border-white/20 transition-all duration-700 italic font-black tracking-widest">SHIFT+ENTER</kbd>
             <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em] group-hover/hint:text-zinc-400 transition-colors">Vector_Return</span>
          </div>
        </div>

      </div>
    </div>
  );
}
