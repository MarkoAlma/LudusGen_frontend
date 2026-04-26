import React, { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownUp,
  BadgeCheck,
  Box,
  ChevronDown,
  CheckCircle2,
  Coins,
  Download,
  Filter,
  Image as ImageIcon,
  Library,
  Loader2,
  Music,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  User,
  Wand2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, getDocs, limit as firestoreLimit, orderBy, query, where } from 'firebase/firestore';
import { API_BASE } from '../api/client';
import { MyUserContext } from '../context/MyUserProvider';
import { auth, db } from '../firebase/firebaseApp';
import Button from '../components/ui/Button';
import MarketplaceBg from '../assets/marketplace_bg.png';

const TYPE_TABS = [
  { id: 'all', label: 'Mind', icon: Sparkles },
  { id: 'image', label: 'Képek', icon: ImageIcon },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: '3d', label: '3D', icon: Box },
];

const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price low' },
  { id: 'price_desc', label: 'Price high' },
  { id: 'most_bought', label: 'Most bought' },
];

const OWNERSHIP_OPTIONS = [
  { id: 'all', label: 'Minden asset' },
  { id: 'not_owned', label: 'Még nincs meg' },
  { id: 'owned', label: 'Megvásárolva' },
];

const TRIPO_OPTIONS = [
  { id: 'all', label: 'Minden 3D' },
  { id: 'compatible', label: 'Tripo-kompatibilis' },
  { id: 'download_only', label: 'Csak letöltés' },
];

const MotionButton = motion.button;
const MotionDiv = motion.div;

function formatCredits(value) {
  return `${Number(value || 0).toLocaleString('hu-HU')} kredit`;
}

function getTypeMeta(type) {
  return TYPE_TABS.find((item) => item.id === type) || TYPE_TABS[0];
}

function resolveDate(asset) {
  if (asset?.createdAtMs) return new Date(asset.createdAtMs);
  if (asset?.createdAt?._seconds) return new Date(asset.createdAt._seconds * 1000);
  return null;
}

function buildQueryParams(filters) {
  const params = new URLSearchParams();
  if (filters.type !== 'all') params.set('type', filters.type);
  if (filters.search.trim()) params.set('q', filters.search.trim());
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.ownership !== 'all') params.set('ownership', filters.ownership);
  if (filters.type === '3d' && filters.tripo !== 'all') params.set('tripo', filters.tripo);
  return params.toString();
}

async function getToken() {
  return auth.currentUser ? auth.currentUser.getIdToken() : '';
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'ludusgen_asset';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function AssetPreview({ asset, large = false }) {
  const TypeMeta = getTypeMeta(asset.type);
  const TypeIcon = TypeMeta.icon;
  const previewClass = large ? 'aspect-video w-full' : 'aspect-[4/3] w-full';

  if (asset.previewUrl && asset.type === 'image') {
    return (
      <div className={`${previewClass} overflow-hidden rounded-2xl border border-white/10 bg-white/5`}>
        <img
          src={asset.previewUrl}
          alt={asset.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
    );
  }

  return (
    <div className={`${previewClass} relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0a0612]`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(138,43,226,0.2),transparent_70%)]" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary blur-[60px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary blur-[60px] animate-pulse" />
      </div>
      
      {asset.type === 'audio' && (
        <div className="absolute inset-x-8 bottom-8 flex h-16 items-end justify-center gap-1.5">
          {Array.from({ length: 24 }, (_, index) => {
            const firstPeak = 12 + ((index * 17) % 24);
            const secondPeak = 8 + ((index * 11) % 16);
            const duration = 1.5 + (index % 5) * 0.16;

            return (
              <motion.span
                key={index}
                initial={{ height: 4 }}
                animate={{
                  height: [4, firstPeak, secondPeak, 4],
                }}
                transition={{
                  duration,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-1 rounded-full bg-secondary/40"
              />
            );
          })}
        </div>
      )}

      {asset.type === '3d' && (
         <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ rotateY: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="perspective-[1000px] transform-style-3d"
            >
               <Box className="h-20 w-20 text-white/20 stroke-[1px]" />
            </motion.div>
         </div>
      )}

      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white shadow-[0_0_40px_rgba(138,43,226,0.2)] backdrop-blur-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
        <TypeIcon className="h-10 w-10 text-primary" />
      </div>
    </div>
  );
}

function AssetCard({ asset, onOpen }) {
  const TypeIcon = getTypeMeta(asset.type).icon;
  const createdAt = resolveDate(asset);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <MotionButton
        type="button"
        onClick={() => onOpen(asset)}
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex w-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-2 text-left backdrop-blur-md transition-all duration-500 hover:border-primary/40 hover:bg-white/[0.05] hover:shadow-[0_20px_50px_rgba(138,43,226,0.15)]"
      >
        <AssetPreview asset={asset} />
        
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black italic tracking-tighter text-white">{asset.title}</h3>
              <p className="mt-0.5 truncate text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{asset.ownerName}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-primary backdrop-blur-md transition-colors group-hover:bg-primary group-hover:text-white">
              <TypeIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {asset.owned && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Megvásárolva
              </span>
            )}
            {asset.type === '3d' && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                asset.downloadOnly
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
              }`}>
                <Wand2 className="h-3 w-3" />
                {asset.downloadOnly ? 'Csak letöltés' : 'Tripo Compatible'}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex items-center gap-2">
               <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Coins className="h-4 w-4" />
               </div>
               <span className="text-sm font-black tracking-tight text-white">
                 {formatCredits(asset.priceCredits)}
               </span>
            </div>
            <span className="text-[10px] font-bold text-gray-500">
              {createdAt ? createdAt.toLocaleDateString('hu-HU') : `${asset.metrics?.purchaseCount || 0} vétel`}
            </span>
          </div>
        </div>
      </MotionButton>
    </motion.div>
  );
}
function MarketplaceSelect({ icon: Icon, value, onChange, options = [], label }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.id === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectOption = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 flex-col gap-2.5">
      <span id={`${listboxId}-label`} className="pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{label}</span>
      <div className="relative group">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-primary">
           {React.createElement(Icon, { className: 'h-4 w-4' })}
        </div>
        <MotionButton
          type="button"
          whileTap={{ scale: 0.97 }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${listboxId}-label ${listboxId}-value`}
          onClick={() => setOpen((current) => !current)}
          className={`h-13 w-full rounded-2xl border pl-11 pr-10 text-left text-xs font-bold text-white outline-none transition-all ${
            open
              ? 'border-primary/50 bg-white/[0.04] ring-4 ring-primary/10 shadow-[0_0_30px_rgba(138,43,226,0.14)]'
              : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
          }`}
        >
          <span id={`${listboxId}-value`} className="block truncate">
            {selectedOption?.label}
          </span>
        </MotionButton>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
           <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`} />
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#100c18]/95 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.65),0_0_30px_rgba(138,43,226,0.12)] backdrop-blur-2xl"
            >
              <div
                id={listboxId}
                role="listbox"
                aria-labelledby={`${listboxId}-label`}
                className="max-h-64 overflow-y-auto"
              >
                {options.map((option) => {
                  const isSelected = option.id === value;
                  return (
                    <MotionButton
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectOption(option.id)}
                      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-black transition-all ${
                        isSelected
                          ? 'bg-primary/20 text-white shadow-[inset_0_0_0_1px_rgba(138,43,226,0.32)]'
                          : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                    </MotionButton>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AssetDetailModal({ asset, isOpen, onClose, onPurchase, onDownload, busy, user }) {
  if (!asset) return null;
  const isOwner = user?.uid === asset.ownerId;
  const canDownload = asset.owned || isOwner;
  const buyDisabled = asset.owned || isOwner || busy;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
            onClick={onClose}
          />
          <MotionDiv
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-panel relative max-h-[95vh] w-full max-w-5xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
          >
            {/* Modal Header/Close */}
            <div className="absolute right-6 top-6 z-20">
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>

            <div className="grid h-full max-h-[95vh] lg:grid-cols-[1fr_400px]">
              {/* Left Side: Preview */}
              <div className="relative flex min-h-[400px] items-center justify-center bg-black/40 p-8 lg:min-h-0">
                <div className="absolute inset-0 overflow-hidden">
                   <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-primary/10 blur-[120px] animate-pulse" />
                   <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-secondary/10 blur-[120px] animate-pulse" />
                </div>
                <div className="relative z-10 w-full">
                   <AssetPreview asset={asset} large />
                </div>
              </div>

              {/* Right Side: Details */}
              <div className="flex flex-col border-l border-white/10 bg-[#0c0c0e]/80 p-8 pt-12 backdrop-blur-xl overflow-y-auto">
                <div className="mb-8">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Marketplace
                    </span>
                    {asset.owned && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        A könyvtáradban
                      </span>
                    )}
                  </div>
                  <h2 className="text-4xl font-black italic tracking-tighter text-white leading-tight">{asset.title}</h2>
                  <p className="mt-6 text-sm font-bold leading-relaxed text-gray-400">{asset.description || 'Nincs megadott leírás.'}</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Ár</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Coins className="h-5 w-5 text-primary" />
                        <p className="text-2xl font-black text-white">{formatCredits(asset.priceCredits)}</p>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Eladva</p>
                      <p className="mt-3 text-2xl font-black text-white">{asset.metrics?.purchaseCount || 0}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 shadow-inner">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Alkotó</p>
                        <p className="truncate text-lg font-black text-white">{asset.ownerName}</p>
                      </div>
                    </div>
                  </div>

                  {asset.type === '3d' && (
                    <div className={`rounded-3xl border p-5 ${
                      asset.downloadOnly
                        ? 'border-amber-400/20 bg-amber-400/5 text-amber-200'
                        : 'border-cyan-400/20 bg-cyan-400/5 text-cyan-200'
                    }`}>
                      <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest leading-relaxed">
                        <ShieldCheck className={`h-5 w-5 shrink-0 ${asset.downloadOnly ? 'text-amber-400' : 'text-cyan-400'}`} />
                        {asset.downloadOnly ? 'Csak letöltés (No Tripo)' : 'Tripo-Studio Ready Asset'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-10 flex flex-col gap-4">
                  <Button
                    onClick={() => onPurchase(asset)}
                    disabled={buyDisabled}
                    loading={busy && !asset.owned}
                    size="lg"
                    className="w-full text-base"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {isOwner ? 'Saját asset' : asset.owned ? 'Már megvan' : 'Azonnali vásárlás'}
                  </Button>
                  <Button
                    variant="subtle"
                    onClick={() => onDownload(asset)}
                    disabled={!canDownload || busy}
                    size="lg"
                    className="w-full"
                  >
                    <Download className="h-5 w-5" />
                    Letöltés
                  </Button>
                </div>
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
}

function PublishAssetModal({ isOpen, onClose, onPublished, user, openAuth }) {
  const [sourceMode, setSourceMode] = useState('upload');
  const [assetType, setAssetType] = useState('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCredits, setPriceCredits] = useState(20);
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const fileRef = useRef(null);

  const selectedHistory = historyItems.find((item) => item.id === selectedHistoryId);
  const canPublish = title.trim() && Number(priceCredits) >= 20 && rightsAccepted && (sourceMode === 'upload' ? file || uploadResult : selectedHistoryId);

  const reset = useCallback(() => {
    setSourceMode('upload');
    setAssetType('image');
    setTitle('');
    setDescription('');
    setPriceCredits(20);
    setTags('');
    setFile(null);
    setUploadResult(null);
    setHistoryItems([]);
    setSelectedHistoryId('');
    setRightsAccepted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setUploadResult(null);
    setFile(null);
  }, [assetType, isOpen]);

  const loadHistory = useCallback(async () => {
    if (!user) {
      openAuth();
      return;
    }
    setLoadingHistory(true);
    setHistoryItems([]);
    setSelectedHistoryId('');
    try {
      const token = await getToken();
      if (assetType === 'image') {
        const res = await fetch(`${API_BASE}/api/image-gallery`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Képek betöltése sikertelen');
        const items = (data.images || []).map((image) => ({
          id: image.id,
          collection: 'generated_images',
          title: image.prompt || `Kép ${image.id.slice(0, 6)}`,
          previewUrl: image.thumbUrl || image.fullUrl,
        }));
        setHistoryItems(items);
      } else if (assetType === 'audio') {
        const res = await fetch(`${API_BASE}/api/audio/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Audio betöltése sikertelen');
        const items = (data.items || []).map((audio) => ({
          id: audio.id,
          collection: 'audio_history',
          title: audio.title || audio.prompt || `Audio ${audio.id.slice(0, 6)}`,
          subtitle: audio.type || 'audio',
        }));
        setHistoryItems(items);
      } else {
        const historyQuery = query(
          collection(db, 'tripo_history'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          firestoreLimit(80),
        );
        const snap = await getDocs(historyQuery);
        const items = snap.docs
          .map((doc) => ({ id: doc.id, collection: 'tripo_history', ...doc.data() }))
          .filter((item) => item.model_url)
          .map((item) => ({
            id: item.id,
            collection: 'tripo_history',
            title: item.prompt || item.params?.filename || `3D ${item.id.slice(0, 6)}`,
            subtitle: item.mode || item.source || '3D',
            locked: item.marketplaceLocked,
          }));
        setHistoryItems(items);
      }
    } catch (err) {
      toast.error(err.message || 'History betöltése sikertelen');
    } finally {
      setLoadingHistory(false);
    }
  }, [assetType, openAuth, user]);

  useEffect(() => {
    if (isOpen && sourceMode === 'history') {
      loadHistory();
    }
  }, [isOpen, sourceMode, assetType, loadHistory]);

  const uploadFile = async () => {
    if (!file) throw new Error('Válassz fájlt');
    const token = await getToken();
    const form = new FormData();
    form.append('file', file);
    form.append('assetType', assetType);
    const res = await fetch(`${API_BASE}/api/marketplace/assets/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Feltöltés sikertelen');
    setUploadResult(data.upload);
    return data.upload;
  };

  const publish = async () => {
    if (!user) {
      openAuth();
      return;
    }
    if (!canPublish || busy) return;

    setBusy(true);
    try {
      const token = await getToken();
      const activeUpload = sourceMode === 'upload'
        ? (uploadResult || await uploadFile())
        : null;
      const body = {
        sourceMode,
        assetType,
        title: title.trim(),
        description: description.trim(),
        priceCredits: Number(priceCredits),
        tags,
        ...(sourceMode === 'upload'
          ? { upload: activeUpload }
          : {
              sourceCollection: selectedHistory.collection,
              sourceId: selectedHistory.id,
            }),
      };
      const res = await fetch(`${API_BASE}/api/marketplace/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Publikálás sikertelen');
      toast.success('Asset publikálva a marketplace-en');
      onPublished?.(data.asset);
      reset();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Publikálás sikertelen');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
          />
          <MotionDiv
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-panel relative max-h-[92vh] w-full max-w-5xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-6 md:px-10">
              <div className="flex items-center gap-5">
                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                    <UploadCloud className="h-6 w-6" />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-white">Új Asset Publikálása</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-1">Oszd meg alkotásaidat a közösséggel</p>
                 </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>

            <div className="grid h-[calc(92vh-100px)] lg:grid-cols-[450px_1fr]">
              {/* Left Column: Source Selection */}
              <div className="flex flex-col gap-8 border-r border-white/10 bg-black/20 p-8 md:p-10 overflow-y-auto">
                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                     <span className="pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Forrás típusa</span>
                     <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/40 p-1.5 border border-white/5">
                        {['upload', 'history'].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setSourceMode(mode)}
                            className={`relative h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              sourceMode === mode ? 'text-white' : 'text-gray-500 hover:text-white'
                            }`}
                          >
                            {sourceMode === mode && (
                               <motion.div layoutId="modeTab" className="absolute inset-0 rounded-xl bg-primary shadow-[0_0_15px_rgba(138,43,226,0.3)]" />
                            )}
                            <span className="relative z-10">{mode === 'upload' ? 'Feltöltés' : 'History'}</span>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="flex flex-col gap-3">
                     <span className="pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Asset kategória</span>
                     <div className="grid grid-cols-3 gap-2">
                        {TYPE_TABS.filter((tab) => tab.id !== 'all').map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setAssetType(tab.id)}
                            className={`flex flex-col items-center justify-center gap-3 h-24 rounded-2xl border transition-all ${
                              assetType === tab.id
                                ? 'border-primary/50 bg-primary/10 text-white shadow-[0_0_20px_rgba(138,43,226,0.1)]'
                                : 'border-white/5 bg-white/[0.02] text-gray-500 hover:text-white hover:bg-white/[0.05]'
                            }`}
                          >
                            <tab.icon className={`h-6 w-6 ${assetType === tab.id ? 'text-primary' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                          </button>
                        ))}
                     </div>
                  </div>

                  {sourceMode === 'upload' ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept={assetType === 'image' ? 'image/*' : assetType === 'audio' ? 'audio/*' : '.glb,.gltf,.fbx,.obj,.stl'}
                        onChange={(event) => {
                          setFile(event.target.files?.[0] || null);
                          setUploadResult(null);
                        }}
                      />
                      <motion.button
                        whileHover={{ borderColor: 'rgba(138,43,226,0.4)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex min-h-[180px] w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] text-center transition-all"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                           <UploadCloud className="h-7 w-7" />
                        </div>
                        <div>
                           <p className="text-sm font-black text-white">{file ? file.name : 'Fájl kiválasztása'}</p>
                           <p className="mt-1 text-[10px] font-bold text-gray-500">
                             {assetType === '3d' ? 'GLB, GLTF, FBX, OBJ, STL' : assetType === 'audio' ? 'MP3, WAV, OGG, FLAC' : 'PNG, JPG, WEBP, GIF'}
                           </p>
                        </div>
                      </motion.button>

                      {assetType === '3d' && uploadResult?.tripo && (
                        <div className={`rounded-2xl border p-4 text-xs font-bold leading-relaxed ${
                          uploadResult.tripo.compatible
                            ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                            : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                        }`}>
                          {uploadResult.tripo.compatible
                            ? 'Tripo kompatibilitás megerősítve. Az asset Studio-ready jelölést kap.'
                            : 'Az asset csak letöltésként lesz elérhető.'}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">History válogatás</span>
                        <button onClick={loadHistory} className="text-[10px] font-black uppercase text-primary hover:underline">Frissítés</button>
                      </div>
                      
                      <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {loadingHistory ? (
                          <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : historyItems.length === 0 ? (
                          <div className="rounded-2xl border border-white/5 bg-black/20 p-6 text-center">
                            <p className="text-xs font-bold text-gray-600">Nincs elérhető history elem.</p>
                          </div>
                        ) : historyItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedHistoryId(item.id);
                              if (!title.trim()) setTitle(item.title);
                            }}
                            className={`flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition-all ${
                              selectedHistoryId === item.id
                                ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(138,43,226,0.1)]'
                                : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                            }`}
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                              {item.previewUrl ? (
                                <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Library className="h-5 w-5 text-gray-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-white">{item.title}</p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">{item.subtitle || item.collection}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Right Column: Details Form */}
              <div className="flex flex-col gap-8 p-8 md:p-10 overflow-y-auto bg-black/10">
                <div className="grid gap-6">
                  <div className="flex flex-col gap-3">
                    <span className="pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Asset elnevezése</span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-bold text-white outline-none transition-all focus:border-primary/50 focus:bg-white/[0.01]"
                      placeholder="Pl. Cyberpunk Sci-Fi Hős..."
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Részletes leírás</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm font-bold leading-relaxed text-white outline-none transition-all focus:border-primary/50 focus:bg-white/[0.01]"
                      placeholder="Mondd el a közösségnek, mi teszi különlegessé ezt az assetet..."
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-3">
                      <span className="pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Értékesítési ár</span>
                      <div className="relative">
                         <Coins className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                         <input
                           type="number"
                           min="20"
                           step="1"
                           value={priceCredits}
                           onChange={(event) => setPriceCredits(event.target.value)}
                           className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-14 pr-5 text-sm font-black text-white outline-none transition-all focus:border-primary/50"
                         />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Tagek (vesszővel elválasztva)</span>
                      <input
                        value={tags}
                        onChange={(event) => setTags(event.target.value)}
                        className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-bold text-white outline-none transition-all focus:border-primary/50"
                        placeholder="fantasy, scifi, realistic..."
                      />
                    </div>
                  </div>

                  <label className="group flex cursor-pointer items-start gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]">
                    <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                       <input
                         type="checkbox"
                         checked={rightsAccepted}
                         onChange={(event) => setRightsAccepted(event.target.checked)}
                         className="peer h-full w-full cursor-pointer appearance-none rounded-lg border-2 border-white/20 bg-transparent transition-all checked:border-primary checked:bg-primary"
                       />
                       <CheckCircle2 className="pointer-events-none absolute h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                    </div>
                    <span className="text-xs font-bold leading-relaxed text-gray-400 group-hover:text-gray-300">
                      Kijelentem, hogy rendelkezem az asset publikálásához és értékesítéséhez szükséges összes joggal a LudusGen platformon.
                    </span>
                  </label>
                </div>

                <div className="mt-auto pt-6">
                  <Button 
                    onClick={publish} 
                    disabled={!canPublish || busy} 
                    loading={busy} 
                    size="lg"
                    className="w-full text-base shadow-[0_10px_30px_rgba(138,43,226,0.3)]"
                  >
                    <BadgeCheck className="h-5 w-5" />
                    Asset Publikálása Most
                  </Button>
                </div>
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function Marketplace() {
  const { user, setIsAuthOpen, refreshCredits, setShowCreditTopup } = useContext(MyUserContext);
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
    sort: 'featured',
    minPrice: '',
    maxPrice: '',
    ownership: 'all',
    tripo: 'all',
  });
  const [assets, setAssets] = useState([]);
  const [ownedAssetIds, setOwnedAssetIds] = useState(new Set());
  const [libraryItems, setLibraryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const sellerListings = useMemo(
    () => assets.filter((asset) => asset.ownerId === user?.uid),
    [assets, user?.uid],
  );

  const openAuth = useCallback(() => {
    setIsAuthOpen?.(true);
  }, [setIsAuthOpen]);

  const loadLibrary = useCallback(async () => {
    if (!user) {
      setOwnedAssetIds(new Set());
      setLibraryItems([]);
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/marketplace/me/library`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Könyvtár betöltése sikertelen');
      setOwnedAssetIds(new Set(data.ownedAssetIds || []));
      setLibraryItems(data.items || []);
    } catch (err) {
      console.warn('Marketplace library error:', err.message);
    }
  }, [user]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQueryParams(filters);
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/marketplace/assets${qs ? `?${qs}` : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Marketplace betöltése sikertelen');
      setAssets(data.assets || []);
      if (data.ownedAssetIds) setOwnedAssetIds(new Set(data.ownedAssetIds));
    } catch (err) {
      toast.error(err.message || 'Marketplace betöltése sikertelen');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAssets();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [loadAssets]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'type' && value !== '3d' ? { tripo: 'all' } : {}),
    }));
  };

  const hydrateOwned = (asset) => ({
    ...asset,
    owned: asset.owned || ownedAssetIds.has(asset.id),
  });

  const openDetail = async (asset) => {
    setSelectedAsset(hydrateOwned(asset));
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/marketplace/assets/${asset.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) setSelectedAsset(hydrateOwned(data.asset));
    } catch {
      // The list card already has enough data for the modal.
    }
  };

  const handlePurchase = async (asset) => {
    if (!user) {
      openAuth();
      return;
    }
    if (asset.owned || asset.ownerId === user.uid || actionBusy) return;

    setActionBusy(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/marketplace/assets/${asset.id}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 402) setShowCreditTopup?.(true);
        throw new Error(data.message || 'Vásárlás sikertelen');
      }
      toast.success(data.alreadyOwned ? 'Ez az asset már a könyvtáradban van' : 'Sikeres vásárlás');
      setOwnedAssetIds((prev) => new Set([...prev, asset.id]));
      setSelectedAsset((prev) => prev ? { ...prev, owned: true } : prev);
      await Promise.all([loadLibrary(), loadAssets(), refreshCredits?.()]);
    } catch (err) {
      toast.error(err.message || 'Vásárlás sikertelen');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDownload = async (asset) => {
    if (!user) {
      openAuth();
      return;
    }
    if (!(asset.owned || asset.ownerId === user.uid)) {
      toast.error('Előbb meg kell vásárolnod az assetet');
      return;
    }
    setActionBusy(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/marketplace/assets/${asset.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const payload = await res.json();
          message = payload.message || message;
              } catch {
                // Keep the original HTTP status message when the error body is not JSON.
              }
        throw new Error(message);
      }
      const blob = await res.blob();
      triggerBlobDownload(blob, asset.storage?.fileName || `${asset.title || 'asset'}.bin`);
    } catch (err) {
      toast.error(err.message || 'Letöltés sikertelen');
    } finally {
      setActionBusy(false);
    }
  };

  const handlePublished = (asset) => {
    setAssets((prev) => [asset, ...prev]);
    loadAssets();
  };

  return (
    <main className="min-h-screen bg-[#03000a] text-white">
      {/* Hero Section with Cinematic Background */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-48 md:pb-40">
        <div className="absolute inset-0 z-0">
           <img 
             src={MarketplaceBg} 
             alt="Background" 
             className="h-full w-full object-cover object-center opacity-60 mix-blend-lighten"
           />
           <div className="absolute inset-0 bg-gradient-to-b from-[#03000a] via-transparent to-[#03000a]" />
           <div className="absolute inset-0 bg-gradient-to-r from-[#03000a] via-transparent to-[#03000a]" />
           <div className="absolute inset-0 bg-[#03000a]/40" />
        </div>

        <div className="container relative z-10 mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl"
          >
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary/40 bg-primary/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary backdrop-blur-md">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Next-Gen Asset Marketplace
            </div>
            <h1 className="text-6xl font-black italic tracking-tighter text-white sm:text-7xl lg:text-8xl leading-[0.9]">
               ALAKÍTSD ÁT A <br/>
               <span className="text-gradient-primary">KÉPZELETET</span> VALÓSÁGGÁ.
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-bold leading-relaxed text-gray-300 md:text-xl">
               Fedezd fel a LudusGen közösség által készített prémium AI asseteket. 
               Képek, hangok és 3D modellek egyetlen professzionális platformon.
            </p>
            
            <div className="mt-12 flex flex-wrap gap-4">
               <Button 
                 onClick={() => (user ? setPublishOpen(true) : openAuth())} 
                 size="lg"
                 className="rounded-full px-10 shadow-[0_0_40px_rgba(138,43,226,0.4)]"
               >
                 <UploadCloud className="h-5 w-5" />
                 Asset feltöltése
               </Button>
               <div className="flex items-center gap-6 px-6">
                  <div className="text-center">
                     <p className="text-2xl font-black italic tracking-tighter text-white">{assets.length}+</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Asset</p>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                     <p className="text-2xl font-black italic tracking-tighter text-white">2.4k</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vásárlás</p>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-6 pb-32">
        {/* Floating Filters Panel */}
        <section className="sticky top-24 z-30">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          >
            <div className="flex flex-col gap-4 p-2 lg:flex-row lg:items-end">
               {/* Search */}
               <div className="flex-1">
                  <label className="relative block group">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-primary" />
                    <input
                      value={filters.search}
                      onChange={(event) => updateFilter('search', event.target.value)}
                      className="h-16 w-full rounded-[1.25rem] border border-white/5 bg-white/[0.03] pl-14 pr-6 text-sm font-bold text-white outline-none transition-all placeholder:text-gray-600 hover:bg-white/[0.05] focus:border-primary/50 focus:bg-white/[0.02] focus:ring-4 focus:ring-primary/5"
                      placeholder="Keress alkotások, tagek vagy stílusok között..."
                    />
                  </label>
               </div>

               {/* Tabs */}
               <div className="flex gap-2 rounded-2xl bg-black/40 p-1.5 border border-white/5">
                  {TYPE_TABS.map((tab) => (
                    <MotionButton
                      key={tab.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updateFilter('type', tab.id)}
                      className={`relative flex h-13 min-w-[100px] items-center justify-center gap-2.5 rounded-[1.15rem] px-5 text-xs font-black uppercase tracking-widest transition-all ${
                        filters.type === tab.id
                          ? 'text-white'
                          : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {filters.type === tab.id && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute inset-0 rounded-[1.15rem] bg-gradient-to-r from-primary to-primary-light shadow-[0_0_20px_rgba(138,43,226,0.3)]"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2.5">
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </span>
                    </MotionButton>
                  ))}
               </div>
            </div>

            {/* Advanced Filters Overlay (simplified row for premium look) */}
            <div className="grid gap-6 border-t border-white/5 p-4 md:grid-cols-2 lg:grid-cols-4">
              <MarketplaceSelect
                icon={ArrowDownUp}
                label="Rendezés"
                value={filters.sort}
                onChange={(value) => updateFilter('sort', value)}
                options={SORT_OPTIONS}
              />

              <MarketplaceSelect
                icon={Library}
                label="Tulajdon"
                value={filters.ownership}
                onChange={(value) => updateFilter('ownership', value)}
                options={OWNERSHIP_OPTIONS}
              />

              <MarketplaceSelect
                icon={Wand2}
                label="3D Kompatibilitás"
                value={filters.tripo}
                onChange={(value) => updateFilter('tripo', value)}
                options={TRIPO_OPTIONS}
              />

              <div className="flex items-end gap-3">
                 <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(event) => updateFilter('minPrice', event.target.value)}
                      className="h-13 rounded-2xl border border-white/5 bg-white/[0.03] px-4 text-xs font-bold text-white outline-none focus:border-primary/50"
                      placeholder="Min Ár"
                    />
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(event) => updateFilter('maxPrice', event.target.value)}
                      className="h-13 rounded-2xl border border-white/5 bg-white/[0.03] px-4 text-xs font-bold text-white outline-none focus:border-primary/50"
                      placeholder="Max Ár"
                    />
                 </div>
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={() => setFilters({ type: 'all', search: '', sort: 'featured', minPrice: '', maxPrice: '', ownership: 'all', tripo: 'all' })}
                   className="flex h-13 w-13 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                   title="Reset Filters"
                 >
                   <X className="h-5 w-5" />
                 </motion.button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Assets Grid */}
        <section className="min-h-[500px]">
          {loading ? (
            <div className="flex h-96 items-center justify-center rounded-[3rem] border border-white/5 bg-white/[0.02] backdrop-blur-md">
              <div className="flex flex-col items-center gap-4">
                 <Loader2 className="h-10 w-10 animate-spin text-primary" />
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Assetek betöltése...</p>
              </div>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex h-96 flex-col items-center justify-center gap-6 rounded-[3rem] border border-white/5 bg-white/[0.02] text-center backdrop-blur-md">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5">
                 <SlidersHorizontal className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-black italic tracking-tighter text-white">Nincs találat</p>
                <p className="mt-2 text-sm font-bold text-gray-500">Próbáld megváltoztatni a szűrési feltételeket.</p>
              </div>
              <Button variant="subtle" onClick={() => setFilters({ type: 'all', search: '', sort: 'featured', minPrice: '', maxPrice: '', ownership: 'all', tripo: 'all' })}>
                 Összes törlése
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {assets.map((asset) => (
                <AssetCard key={asset.id} asset={hydrateOwned(asset)} onOpen={openDetail} />
              ))}
            </div>
          )}
        </section>

        {/* Dashboard Sections */}
        {user && (
          <section className="grid gap-8 lg:grid-cols-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-8"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter text-white">Könyvtáram</h2>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-1">Összesen {libraryItems.length} megvásárolt asset</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                   <Library className="h-6 w-6" />
                </div>
              </div>
              
              <div className="space-y-3">
                {libraryItems.slice(0, 5).map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 6, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    type="button"
                    onClick={() => item.asset && openDetail(item.asset)}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-all"
                  >
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                          {item.asset?.previewUrl ? (
                             <img src={item.asset.previewUrl} className="h-full w-full object-cover" alt="" />
                          ) : (
                             <div className="flex h-full w-full items-center justify-center"><Box className="h-4 w-4 text-gray-600" /></div>
                          )}
                       </div>
                       <span className="truncate text-sm font-black text-white">{item.asset?.title || item.assetTitle}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-xs font-bold text-primary">{formatCredits(item.priceCredits)}</span>
                       <Download className="h-4 w-4 text-gray-600" />
                    </div>
                  </motion.button>
                ))}
                {libraryItems.length === 0 && (
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center">
                    <p className="text-sm font-bold text-gray-600">Még nincs megvásárolt asseted.</p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-8"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter text-white">Saját Listázások</h2>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-1">{sellerListings.length} publikált elem</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 text-secondary">
                   <UploadCloud className="h-6 w-6" />
                </div>
              </div>

              <div className="space-y-3">
                {sellerListings.slice(0, 5).map((asset) => (
                  <motion.button
                    key={asset.id}
                    whileHover={{ x: 6, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    type="button"
                    onClick={() => openDetail(asset)}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition-all"
                  >
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                          {asset.previewUrl ? (
                             <img src={asset.previewUrl} className="h-full w-full object-cover" alt="" />
                          ) : (
                             <div className="flex h-full w-full items-center justify-center"><Box className="h-4 w-4 text-gray-600" /></div>
                          )}
                       </div>
                       <span className="truncate text-sm font-black text-white">{asset.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          {asset.metrics?.purchaseCount || 0} eladás
                       </div>
                    </div>
                  </motion.button>
                ))}
                {sellerListings.length === 0 && (
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-8 text-center">
                    <p className="text-sm font-bold text-gray-600">Nincs saját listázásod.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </section>
        )}
      </div>

      <AssetDetailModal
        asset={selectedAsset}
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        onPurchase={handlePurchase}
        onDownload={handleDownload}
        busy={actionBusy}
        user={user}
      />

      <PublishAssetModal
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={handlePublished}
        user={user}
        openAuth={openAuth}
      />
    </main>
  );
}
