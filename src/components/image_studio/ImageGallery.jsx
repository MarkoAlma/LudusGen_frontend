import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RefreshCw, 
  Clock, 
  Trash,
  Loader2,
  Inbox,
  ZoomIn,
  Copy,
  AlertTriangle,
  Info
} from 'lucide-react';
import { API_BASE } from '../../api/client';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

// ── Lightbox Modal ──────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % images.length);
      if (e.key === 'ArrowLeft') setCurrent((c) => (c - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  // Reset loading state when the current image index changes
  useEffect(() => {
    setImgLoading(true);
  }, [current]);

  const img = images[current];
  const [activePrompt, setActivePrompt] = useState(img.prompt);

  // Sync prompt only when loading is finished
  useEffect(() => {
    if (!imgLoading) {
      setActivePrompt(img.prompt);
    }
  }, [imgLoading, img.prompt]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="relative w-full h-full flex items-center justify-center p-4 md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex items-center justify-center"
          >
            {/* Low-res Thumbnail Placeholder */}
            {imgLoading && (
                <img
                    src={img.thumbUrl}
                    alt="placeholder"
                    className="max-w-[92vw] max-h-[92vh] object-contain rounded-2xl blur-xl opacity-30 absolute inset-0 m-auto"
                />
            )}

            {/* High-res Full Image */}
            <img
              src={img.fullUrl}
              alt={img.prompt}
              onLoad={() => setImgLoading(false)}
              className={`relative z-10 max-w-[92vw] max-h-[92vh] object-contain rounded-2xl shadow-2xl transition-all duration-700 ${imgLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            />
            
            {imgLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/10 backdrop-blur-[2px] rounded-2xl">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-violet-500/40 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] italic">Retrieving Asset</p>
                    <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest leading-none">High Fidelity Archive</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Info Overlay Top - Only show when NOT loading for cleaner look */}
        {!imgLoading && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 max-w-xl w-[90%] p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-center shadow-2xl pointer-events-none z-30"
            >
                <p className="text-white text-[10px] font-medium leading-relaxed uppercase tracking-[0.15em] italic opacity-80 line-clamp-2">
                    {activePrompt}
                </p>
            </motion.div>
        )}

        {/* Controls Overlay Bottom */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 rounded-[2rem] bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl z-40">
          {images.length > 1 && (
            <button
              onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = img.downloadUrl;
              a.download = `ludusgen_${img.id}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
            title="Download Full Image"
          >
            <Download className="w-5 h-5" />
          </button>

          {images.length > 1 && (
            <>
              <span className="text-white/40 text-[11px] font-black tracking-[0.3em]">
                {current + 1} / {images.length}
              </span>
              <button
                onClick={() => setCurrent((c) => (c + 1) % images.length)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </motion.div>

      <button
        className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>
    </motion.div>,
    document.body
  );
}

// ── Confirmation Modal ──────────────────────────────────────────────────────────
function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, isLoading }) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-md bg-[#0a0a14] border border-red-500/20 rounded-[2rem] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Icon */}
            <div className="pt-10 pb-6 flex flex-col items-center">
              <div className="w-20 h-20 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 group">
                <AlertTriangle className="w-10 h-10 animate-pulse group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-[0.2em]">{title}</h3>
            </div>

            {/* Content */}
            <div className="px-8 pb-10 text-center space-y-4">
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] leading-relaxed">
                {message}
              </p>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4 text-left">
                <Info className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-wider">
                  This action is permanent and cannot be reversed. All metadata and binary storage will be purged.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 grid grid-cols-2 gap-3 bg-white/[0.02] border-t border-white/5">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="py-4 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="py-4 rounded-2xl bg-red-500 text-[10px] font-black text-white uppercase tracking-[0.3em] hover:bg-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Purge'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function ImageGallery({ getIdToken, onUsePrompt }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, targetId: null });
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const fetchGallery = async () => {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/image-gallery`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setImages(data.images);
      }
    } catch (err) {
      console.error('Gallery fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchGallery();
  }, []);

  const handleDeleteStart = (e, id) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, type: 'single', targetId: id });
  };

  const handleDelete = async () => {
    const id = confirmModal.targetId;
    if (!id) return;

    setDeletingId(id);
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/image-gallery/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setImages(prev => prev.filter(img => img.id !== id));
        toast.success('Kép törölve');
        setConfirmModal({ isOpen: false, type: null, targetId: null });
      }
    } catch (err) {
      toast.error('Hiba a törlés során');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/image-gallery`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setImages([]);
        toast.success('Összes kép törölve');
        setConfirmModal({ isOpen: false, type: null, targetId: null });
      } else {
        toast.error(data.message || 'Bulk törlés sikertelen');
      }
    } catch (err) {
      toast.error('Hiba a törlés során');
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Initializing Archive</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12 text-center">
        <div className="w-20 h-20 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/10">
          <Inbox className="w-8 h-8" />
        </div>
        <div className="space-y-2">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.5em] italic">Archive Empty</h3>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest max-w-[200px] leading-relaxed">
                Start generating to populate your persistent vault
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto scrollbar-hide px-8 pb-40 pt-10 relative z-10">
      
      {/* Header Info */}
      <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Clock className="w-5 h-5" />
            </div>
            <div>
                <h2 className="text-lg font-black text-white italic uppercase tracking-[0.2em] leading-none">Vault History</h2>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1.5">{images.length} Persistent Assets</p>
            </div>
        </div>
        
        <button 
            onClick={() => setConfirmModal({ isOpen: true, type: 'all', targetId: null })}
            disabled={deletingAll}
            title="Delete All Assets"
            className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500/40 hover:text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
        >
            {deletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {images.map((img, idx) => (
          <motion.div
            key={img.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative aspect-square rounded-[1.8rem] overflow-hidden border border-white/5 bg-[#0d0d12] hover:border-white/20 transition-all duration-500 cursor-pointer"
            onClick={() => setLightboxIdx(idx)}
          >
            <img 
              src={img.thumbUrl} 
              alt={img.prompt} 
              className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
              loading="lazy"
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-5">
              <div className="flex justify-end gap-2">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onUsePrompt(img.prompt);
                        toast.success('Prompt betöltve');
                    }}
                    className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20"
                    title="Use Prompt"
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => handleDeleteStart(e, img.id)}
                    disabled={deletingId === img.id}
                    className="w-9 h-9 rounded-lg bg-red-500/20 backdrop-blur-md border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/40"
                    title="Delete Image"
                >
                    {deletingId === img.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] text-white/60 font-medium line-clamp-2 italic uppercase leading-relaxed tracking-wider">
                    {img.prompt}
                </p>
                <div className="flex items-center gap-2">
                   <div className="px-1.5 py-0.5 rounded bg-white/10 text-[7px] font-black text-white/40 uppercase tracking-widest">{img.modelId.split('/').pop()}</div>
                   <div className="px-1.5 py-0.5 rounded bg-white/10 text-[7px] font-black text-white/40 uppercase tracking-widest">{img.aspect_ratio}</div>
                </div>
              </div>
            </div>

            {/* View Overlay Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300">
                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500">
                    <ZoomIn className="w-5 h-5" />
                </div>
            </div>
          </motion.div>
        ))}
      </div>

      {lightboxIdx !== null && (
        <Lightbox 
          images={images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, targetId: null })}
        onConfirm={confirmModal.type === 'all' ? handleDeleteAll : handleDelete}
        title={confirmModal.type === 'all' ? "Purge Gallery" : "Delete Asset"}
        message={confirmModal.type === 'all' 
            ? `Are you absolutely sure you want to delete all ${images.length} persistent assets?` 
            : "Are you sure you want to delete this specific image from your vault?"}
        isLoading={deletingAll || deletingId !== null}
      />
    </div>
  );
}
