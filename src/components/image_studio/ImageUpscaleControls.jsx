import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, CheckCircle2, ImageIcon, Images, Info, Loader2, Maximize2, Plus, Upload, X, Zap } from 'lucide-react';
import { GalleryPickerModal } from './ImageControls';

const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const UPSCALE_COLOR = '#8b5cf6';

export default function ImageUpscaleControls({
  sourceImage,
  setSourceImage,
  isUpscaling,
  onUpscale,
  getIdToken,
  error,
}) {
  const fileInputRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [localError, setLocalError] = useState('');

  const color = UPSCALE_COLOR;

  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  const setPickedImage = (img) => {
    setSourceImage(img);
    setLocalError('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError('Maximum file size is 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPickedImage({
        dataUrl: ev.target.result,
        name: file.name || 'upscale-source.png',
        size: file.size,
        mimeType: file.type || 'image/png',
      });
    };
    reader.onerror = () => setLocalError('The image could not be loaded.');
    reader.readAsDataURL(file);
  };

  const handleGallerySelect = (imgs) => {
    const first = imgs?.[0];
    if (first) {
      setPickedImage({
        ...first,
        name: first.name || 'gallery-source.png',
      });
    }
  };

  const canUpscale = Boolean(sourceImage?.dataUrl) && !isUpscaling;

  return (
    <div className="flex flex-col h-full bg-[#0a0618]/30 backdrop-blur-[60px] relative border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="pt-4 border-b border-white/5 relative z-20 bg-white/[0.02] backdrop-blur-3xl">
        <div className="h-16 px-4 flex items-center">
          <div className="flex items-center gap-3 w-full pl-2 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/8">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] leading-none mb-0.5">
                Image upscale
              </p>
              <p className="text-[12px] font-black text-white truncate leading-none">
                RealESRGAN x4
              </p>
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.16em] px-2 py-1 rounded-md border border-violet-400/20 text-violet-300 bg-violet-500/10">
              x4
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 h-full relative z-10">
        <div className="px-6 space-y-6 pb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">
                Source image
              </label>
              <ImageIcon className="w-3.5 h-3.5 text-primary opacity-30" />
            </div>

            {sourceImage?.dataUrl ? (
              <div className="relative rounded-[1.6rem] overflow-hidden border border-white/8 bg-white/[0.02] shadow-2xl group">
                <img
                  src={sourceImage.dataUrl}
                  alt="Upscale source"
                  className="w-full max-h-72 object-contain bg-black/20"
                  draggable={false}
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase tracking-[0.22em] text-white/50">
                  Input
                </div>
                <button
                  type="button"
                  onClick={() => setSourceImage(null)}
                  disabled={isUpscaling}
                  className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-red-500/15 border border-red-400/20 text-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all disabled:opacity-20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={popoverRef}>
                <button
                  type="button"
                  onClick={() => setPopoverOpen((open) => !open)}
                  className="w-full min-h-48 rounded-[1.6rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-zinc-700 hover:border-primary/40 hover:text-primary transition-all bg-white/[0.01] group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.28em]">Add image</span>
                </button>

                <AnimatePresence>
                  {popoverOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 rounded-xl border border-white/10 bg-[#0d0d14]/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => { fileInputRef.current?.click(); setPopoverOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-all"
                      >
                        <Upload className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">From device</span>
                      </button>
                      <div className="h-px bg-white/5 mx-3" />
                      <button
                        type="button"
                        onClick={() => { setGalleryPickerOpen(true); setPopoverOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-all"
                      >
                        <Images className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">From gallery</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={ACCEPTED_IMAGE_TYPES}
              onChange={handleImageUpload}
            />

            <div className="flex items-start gap-3 rounded-2xl border border-violet-400/10 bg-violet-500/[0.035] px-4 py-3 text-violet-100/70">
              <Info className="w-4 h-4 mt-0.5 text-violet-300/70 flex-shrink-0" />
              <p className="text-[10px] font-bold leading-relaxed tracking-[0.08em] uppercase">
                Works best with sharp, good-quality images. Very small or blurry sources may upscale noise and artifacts too.
              </p>
            </div>
          </div>

          {(localError || error) && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-red-300">
              {localError || error}
            </div>
          )}
        </div>

        <div className="h-px bg-white/5 mx-6 mb-6" />

        <div className="px-6 space-y-6 pb-24">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Activity className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Upscale settings</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[8px] font-black uppercase tracking-[0.24em] text-zinc-700 mb-2">Scale</div>
              <div className="text-2xl font-black italic text-white">4x</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[8px] font-black uppercase tracking-[0.24em] text-zinc-700 mb-2">Engine</div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ESRGAN
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-3xl relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
        <button
          type="button"
          onClick={onUpscale}
          disabled={!canUpscale}
          className="w-full py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:grayscale shadow-2xl relative overflow-hidden group/btn"
          style={{
            backgroundColor: canUpscale ? color : '#ffffff',
            color: canUpscale ? '#ffffff' : '#000000',
            boxShadow: canUpscale ? `0 10px 30px ${color}30` : 'none',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          {isUpscaling ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Loader2 className="w-4 h-4" />
              </motion.div>
              <span>Upscaling...</span>
            </>
          ) : (
            <>
              <span>Upscale image</span> <Zap className="w-4 h-4 fill-current" />
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {galleryPickerOpen && (
          <GalleryPickerModal
            onClose={() => setGalleryPickerOpen(false)}
            onSelectMultiple={handleGallerySelect}
            getIdToken={getIdToken}
            slotsAvailable={1}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
