import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Search, Trash2, Box, ChevronRight, ChevronLeft,
  Clock, Download, Loader2, ChevronDown, Sparkles, Info
} from 'lucide-react';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from '../../firebase/firebaseApp';
import HistoryCard from '../../ai_components/trellis/HistoryCard';
import { getItemTs } from '../../ai_components/trellis/utils';
import { Tooltip } from '../../ai_components/meshy/ui/Primitives';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TABS = [
  { id: 'tripo', label: 'Tripo3D' },
  { id: 'trellis', label: 'Trellis' },
  { id: 'upload', label: 'Feltöltések' }
];

export default function Shared3DHistory({
  userId,
  getIdToken,
  color = "#a78bfa",
  onSelect,
  onReuse,
  onDownload,
  activeItemId,
  loadingId,
  refreshTrigger = 0
}) {
  const [activeTab, setActiveTab] = useState('tripo');
  const [histQ, setHistQ] = useState("");
  const [history, setHistory] = useState([]);
  const [histLoad, setHistLoad] = useState(false);
  const [moreLoad, setMoreLoad] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);

  const lastDocR = useRef(null);
  const histInit = useRef(false);
  const assetFileRef = useRef(null);

  const fetchItems = async (isLoadMore = false) => {
    if (!userId) return;
    if (!isLoadMore) {
      setHistLoad(true);
      lastDocR.current = null;
      setHasMore(false);
    } else {
      setMoreLoad(true);
    }

    try {
      const constraints = [
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      ];
      if (isLoadMore && lastDocR.current) {
        constraints.push(startAfter(lastDocR.current));
      }

      const q = query(collection(db, 'trellis_history'), ...constraints);
      const snap = await getDocs(q);

      const now = Date.now();
      const items = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => {
          const ts = getItemTs(item);
          return ts === 0 || (now - ts) < HISTORY_TTL_MS;
        });

      const newLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

      if (!isLoadMore) {
        setHistory(items);
      } else {
        setHistory(prev => {
          // avoid duplicates just in case
          const existingIds = new Set(prev.map(i => i.id));
          return [...prev, ...items.filter(i => !existingIds.has(i.id))];
        });
      }

      lastDocR.current = newLastDoc;
      // We assume there are more if we got a full page
      setHasMore(snap.docs.length === PAGE_SIZE);

    } catch (e) {
      console.error("[Shared3DHistory] fetch error:", e);
    } finally {
      if (!isLoadMore) setHistLoad(false);
      else setMoreLoad(false);
    }
  };

  useEffect(() => {
    fetchItems(false);
  }, [userId, refreshTrigger]);

  const loadMore = useCallback(() => {
    if (!hasMore || moreLoad) return;
    fetchItems(true);
  }, [hasMore, moreLoad]);

  const handleAssetUpload = useCallback(async (file) => {
    if (!file) return;
    setAssetUploading(true);
    try {
      const t = getIdToken ? await getIdToken() : "";
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(BASE_URL + "/api/tripo/assets/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + t },
        body: form,
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      toast.success(`Sikeres feltöltés: ${d.filename}`);
      fetchItems(false); // Reload history immediately
      setActiveTab('upload');
    } catch (e) {
      toast.error(`Nem sikerült feltölteni a fájlt: ${e.message}`);
    } finally {
      setAssetUploading(false);
    }
  }, [getIdToken]);

  const handleDeleteLocally = async (item) => {
    if (!window.confirm(`Biztosan törlöd: "${item.prompt?.slice(0, 30) || 'Modell'}"?`)) return;
    try {
      const t = getIdToken ? await getIdToken() : "";
      // Mindig tripo controllerhez megy a törlés route, ami a trellis_history collectiont használja!
      const res = await fetch(BASE_URL + "/api/tripo/history/" + item.id, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + t }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setHistory(prev => prev.filter(i => i.id !== item.id));
      toast.success("Modell törölve.");
    } catch (e) {
      toast.error("Törlés sikertelen: " + e.message);
    }
  };

  const filtHist = useMemo(() => {
    return history.filter(item => {
      // Szöveges keresés filter
      if (histQ && !(item.prompt || "").toLowerCase().includes(histQ.toLowerCase())) return false;

      // Tab filter
      const itemSrc = item.source || "trellis";
      if (activeTab === 'tripo') return itemSrc === 'tripo';
      if (activeTab === 'trellis') return itemSrc === 'trellis';
      if (activeTab === 'upload') return itemSrc === 'upload';
      return false;
    });
  }, [history, histQ, activeTab]);

  return (
    <div className="flex flex-col h-full w-full bg-white/[0.01]">
      <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <History className="w-4 h-4 opacity-50" style={{ color: color }} />
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontStyle: "italic" }}>Archive</span>
          <Tooltip text="A modelleket generálás után 1 hétig tároljuk. A letöltő gomb segítségével exportálhatod a modellt tartós tárolásra." side="bottom">
            <button style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center" }}>
              <Info className="w-4 h-4 hover:text-white transition-colors" />
            </button>
          </Tooltip>
        </div>

        {/* Fülek (Tabs) */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 10 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 10, fontWeight: 900,
                cursor: "pointer", border: "none", transition: "all 0.15s", fontFamily: "inherit",
                background: activeTab === tab.id ? `linear-gradient(to bottom, rgba(${color === '#a78bfa' ? '167,139,250' : '108,99,255'}, 0.25), rgba(${color === '#a78bfa' ? '167,139,250' : '108,99,255'}, 0.1))` : "transparent",
                color: activeTab === tab.id ? color : "#64748b",
                outline: activeTab === tab.id ? `1px solid ${color}60` : "none"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            placeholder="Keresés..."
            value={histQ}
            onChange={e => setHistQ(e.target.value)}
            className="tp-input"
            style={{ fontSize: 11, paddingRight: 32, height: 40, borderRadius: 12, border: "1px solid var(--border)", width: "100%", background: "var(--bg-raised)", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {activeTab === 'upload' && (
          <>
            <input
              ref={assetFileRef}
              type="file"
              accept=".glb,.fbx,.obj"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleAssetUpload(e.target.files[0]); e.target.value = ""; }}
            />
            <button
              onClick={() => assetFileRef.current?.click()}
              disabled={assetUploading}
              style={{
                width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 10,
                fontSize: 10, fontWeight: 800, color: assetUploading ? "#475569" : "#94a3b8",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                cursor: assetUploading ? "not-allowed" : "pointer",
                border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)",
                fontFamily: "inherit", transition: "all 0.14s",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}
              onMouseEnter={e => { if (!assetUploading) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; } }}
              onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              {assetUploading ? (
                <><Loader2 style={{ width: 11, height: 11 }} className="anim-spin" /> Feltöltés folyamatban…</>
              ) : (
                <><Download style={{ width: 11, height: 11 }} /> Fájl kiválasztása (.glb,.fbx,.obj)</>
              )}
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px", display: "flex", flexDirection: "column", gap: 6 }} className="tp-scroll border-t border-white/5">
        {histLoad && <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Loader2 style={{ width: 24, height: 24, color }} className="anim-spin" /></div>}

        {!histLoad && filtHist.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12, opacity: 0.3 }}>
            <Box style={{ width: 32, height: 32, color: "#fff" }} />
            <p style={{ color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>
              {histQ ? "Nincs találat" : activeTab === 'upload' ? "Nincs feltöltött modelld" : "Üres archívum"}
            </p>
          </div>
        )}

        {filtHist.map((item, idx) => (
          <div key={item.id} style={{ animationDelay: (Math.min(idx, 6) * 0.04) + "s" }} className="fade-up">
            <HistoryCard
              item={item}
              isActive={activeItemId === item.id}
              isLoading={loadingId === item.id}
              disabled={loadingId !== null}
              onSelect={onSelect}
              onReuse={onReuse}
              onDownload={onDownload}
              onDelete={handleDeleteLocally}
              color={color}
              getIdToken={getIdToken}
            />
          </div>
        ))}

        {!histQ && hasMore && filtHist.length > 0 && (
          <button
            onClick={loadMore}
            disabled={moreLoad}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 10, fontWeight: 900,
              color: "#94a3b8", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)",
              cursor: moreLoad ? "not-allowed" : "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 7, textTransform: "uppercase", letterSpacing: "0.05em",
              marginTop: 6
            }}
          >
            {moreLoad ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 style={{ width: 12, height: 12 }} className="anim-spin" />
                <span>Betöltés…</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ChevronDown style={{ width: 12, height: 12 }} />
                <span>Továbbiak</span>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
