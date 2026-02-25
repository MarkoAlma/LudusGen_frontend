// trellis/TrellisPanel.jsx — NVIDIA Trellis AI Text-to-3D Panel
import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from 'react';
import {
  Download, Loader2, AlertCircle, Trash2,
  RotateCcw, Camera, Move3d, Layers, Play, Square,
  Sparkles, Clock, ChevronRight, Sliders,
  Box, Type, Wand2, Zap,
} from 'lucide-react';

import ThreeViewer from '../meshy/viewer/ThreeViewer';
import { setCameraPreset } from '../meshy/viewer/threeHelpers';
import { IconBtn, Tooltip } from '../meshy/ui/Primitives';
import LightingControls from '../meshy/viewer/LightingControls';

// ── Firebase Firestore ────────────────────────────────────────────────────────
import { db } from '../../firebase/firebaseApp';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query,
  where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import ConfirmModal from './ConfirmModal';
import { getCachedThumbnail } from './Glbthumbnail';
import StylePicker from './StylePicker';
import PromptInput from './PromptInput';
import { BgColorPicker } from './BgColorPicker';
import { defaultParams } from './utils';
import { TRELLIS_PRESETS, VIEW_MODES } from './Constants';
import { Card, MiniSlider, NumInput, Pill, SectionLabel, ToggleRow } from './UIComponents';
import { EXAMPLE_PROMPTS, T, WireframeControl } from '.';

// ── Helper: strip style prefix from prompt ────────────────────────────────────




// ── Style Picker komponens ────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ════════════════════════════════════════════════════════════════════════════
export default function TrellisPanel({ selectedModel, getIdToken, userId }) {
  const color = selectedModel?.color || '#a78bfa';

  const [prompt, setPrompt] = useState('');
  const [genStatus, setGenStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [modelUrl, setModelUrl] = useState(null);
  const [params, setParams] = useState(defaultParams());

  // ── Stílus kiválasztó ─────────────────────────────────────────────────────
  const [selectedStyle, setSelectedStyle] = useState('nostyle');

  // Stílus váltásakor NEM módosítjuk a promptot – a stílus prefix-et
  // csak a Trellisnek küldött végleges prompthoz fűzzük hozzá
  const handleStyleSelect = useCallback((styleId) => {
    setSelectedStyle(styleId);
  }, []);

  // Prompt enhancer / dechanter
  const [enhancing, setEnhancing] = useState(false);
  const [dechantig, setDechantig] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const [viewMode, setViewMode] = useState('clay');
  const [lightMode, setLightMode] = useState('studio');
  const [showGrid, setShowGrid] = useState(true);
  const [autoSpin, setAutoSpin] = useState(true);
  const [bgColor, setBgColor] = useState('default');
  const [wireframeOverlay, setWireframeOverlay] = useState(false);
  const [wireOpacity, setWireOpacity] = useState(0.22);
  const [wireColor, setWireColor] = useState('#ffffff');
  const wireHexColor = parseInt(wireColor.replace('#', ''), 16);

  const [lightStrength, setLightStrength] = useState(1.0);
  const [lightRotation, setLightRotation] = useState(0);
  const [lightAutoRotate, setLightAutoRotate] = useState(false);
  const [lightAutoRotateSpeed, setLightAutoRotateSpeed] = useState(0.5);
  const [dramaticColor, setDramaticColor] = useState('#4400ff');
  const [gridColor1, setGridColor1] = useState('#1e1e3a');
  const [gridColor2, setGridColor2] = useState('#111128');

  const [rightOpen, setRightOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [histSearch, setHistSearch] = useState('');

  const sceneRef = useRef(null);
  const abortRef = useRef(null);
  const timeoutRef = useRef(null);
  const prevModelUrlRef = useRef(null);
  // Modal state-ek
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Egyedi item törlése

  // ── Firestore history betöltése ───────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setHistoryLoading(true);

    (async () => {
      try {
        const items = await loadHistoryFromFirestore(userId);
        if (cancelled) return;
        setHistory(items);

        if (items.length > 0) {
          const latest = items[0];
          setActiveItem(latest);
          setGenStatus('succeeded');
          if (latest.model_url) {
            try {
              const blobUrl = await fetchGlbAsBlob(latest.model_url, getIdToken);
              if (!cancelled) {
                setModelUrl(blobUrl);
                prevModelUrlRef.current = blobUrl;
              }
            } catch (err) {
              console.warn('GLB auto-load hiba:', err.message);
              if (!cancelled) {
                setModelUrl(latest.model_url);
                prevModelUrlRef.current = latest.model_url;
              }
            }
          }
        }
      } catch (err) {
        console.error('History betöltési hiba:', err);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const authHeaders = useCallback(async () => {
    const token = getIdToken ? await getIdToken() : '';
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  // ── Prompt Enhancer ───────────────────────────────────────────────────────
  // A stílus prefix NÉLKÜL küldjük az AI-nak, és visszakapás után sem adjuk hozzá
  // (a prefix csak a Trellisnek küldött végleges promptban szerepel)
  const handleEnhance = useCallback(async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const headers = await authHeaders();
      // Stílus prefix eltávolítása az AI-nak küldött promptból
      const cleanPrompt = stripStylePrefix(prompt.trim(), selectedStyle);
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-oss-120b',
          provider: 'cerebras',
          messages: [
            { role: 'system', content: ENHANCE_SYSTEM },
            { role: 'user', content: cleanPrompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const raw = trimmed.slice(6);
          if (raw === '[DONE]') continue;
          try { accumulated += JSON.parse(raw).delta || ''; } catch { }
        }
      }

      // Visszakapott enhanced prompt prefix nélkül kerül a state-be
      if (accumulated.trim()) {
        setPrompt(accumulated.trim());
      }
    } catch (err) {
      console.error('Enhance hiba:', err);
    } finally {
      setEnhancing(false);
    }
  }, [prompt, enhancing, authHeaders, selectedStyle]);

  // ── Prompt Dechanter ─────────────────────────────────────────────────────
  // Szintén stílus prefix nélkül küldjük és tároljuk
  const handleDechance = useCallback(async () => {
    if (!prompt.trim() || dechantig) return;
    setDechantig(true);
    try {
      const headers = await authHeaders();
      // Stílus prefix eltávolítása az AI-nak küldött promptból
      const cleanPrompt = stripStylePrefix(prompt.trim(), selectedStyle);
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-oss-120b',
          provider: 'cerebras',
          messages: [
            { role: 'system', content: DECHANTER_SYSTEM },
            { role: 'user', content: cleanPrompt },
          ],
          temperature: 0.4,
          max_tokens: 300,
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const raw = trimmed.slice(6);
          if (raw === '[DONE]') continue;
          try { accumulated += JSON.parse(raw).delta || ''; } catch { }
        }
      }

      // Visszakapott simplified prompt prefix nélkül kerül a state-be
      if (accumulated.trim()) {
        setPrompt(accumulated.trim());
        setTimedOut(false);
      }
    } catch (err) {
      console.error('Dechance hiba:', err);
    } finally {
      setDechantig(false);
    }
  }, [prompt, dechantig, authHeaders, selectedStyle]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (genStatus === 'pending' || !prompt.trim() || prompt.length > 1000) return;
    setErrorMsg('');
    prevModelUrlRef.current = modelUrl;
    setModelUrl(null);
    setGenStatus('pending');

    const controller = new AbortController();
    abortRef.current = controller;
    setTimedOut(false);

    timeoutRef.current = setTimeout(() => {
      controller.abort();
      setTimedOut(true);
    }, 70_000);

    try {
      const headers = await authHeaders();
      const resolvedSeed = params.randomSeed
        ? Math.floor(Math.random() * 2_147_483_647)
        : Math.max(0, Math.floor(Number(params.seed) || 0));

      // Stílus prefix hozzáadása csak a Trellisnek küldött prompthoz
      const trellisPrompt = applyStylePrefix(prompt.trim(), selectedStyle);

      const res = await fetch('http://localhost:3001/api/trellis', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          prompt: trellisPrompt,
          slat_cfg_scale: params.slat_cfg_scale,
          ss_cfg_scale: params.ss_cfg_scale,
          slat_sampling_steps: params.slat_sampling_steps,
          ss_sampling_steps: params.ss_sampling_steps,
          seed: resolvedSeed,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setModelUrl(prevModelUrlRef.current);
        setGenStatus(prevModelUrlRef.current ? 'succeeded' : 'failed');
        setErrorMsg(data.message ?? 'Trellis generálás sikertelen');
        return;
      }

      const glbUrl = data.glb_url ?? data.model_url ?? null;
      const blobUrl = await fetchGlbAsBlob(glbUrl, getIdToken);
      setModelUrl(blobUrl);
      prevModelUrlRef.current = blobUrl;
      setGenStatus('succeeded');

      const itemData = {
        prompt: prompt.trim(),
        status: 'succeeded',
        model_url: glbUrl,
        params: {
          slat_cfg_scale: params.slat_cfg_scale,
          ss_cfg_scale: params.ss_cfg_scale,
          slat_sampling_steps: params.slat_sampling_steps,
          ss_sampling_steps: params.ss_sampling_steps,
          seed: resolvedSeed,
          randomSeed: params.randomSeed,
        },
        style: selectedStyle,
        ts: Date.now(),
      };

      const docId = await saveHistoryToFirestore(userId, itemData);
      const newItem = {
        id: docId ?? `local_${Date.now()}`,
        ...itemData,
        createdAt: { toDate: () => new Date() },
      };

      setHistory(h => [newItem, ...h]);
      setActiveItem(newItem);

    } catch (err) {
      if (err.name === 'AbortError') {
        setModelUrl(prevModelUrlRef.current);
        setGenStatus(prevModelUrlRef.current ? 'succeeded' : 'idle');
        setErrorMsg('');
      } else {
        setModelUrl(prevModelUrlRef.current);
        setGenStatus(prevModelUrlRef.current ? 'succeeded' : 'failed');
        setErrorMsg(err.message ?? 'Hálózati hiba');
      }
    } finally {
      abortRef.current = null;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [genStatus, prompt, params, authHeaders, userId, getIdToken, modelUrl, selectedStyle]);

  const handleStop = useCallback(() => {
    setTimedOut(false);
    abortRef.current?.abort();
  }, []);

  const handleDeleteItem = useCallback(async (item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  }, []);

  const confirmDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`http://localhost:3001/api/trellis/history/${itemToDelete.id}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();

      if (data.success) {
        setHistory(h => h.filter(i => i.id !== itemToDelete.id));

        if (activeItem?.id === itemToDelete.id) {
          setActiveItem(null);
          setModelUrl(null);
          setGenStatus('idle');
        }

        console.log('✅ Modell törölve:', itemToDelete.id);
      } else {
        alert('Törlés sikertelen: ' + data.message);
      }
    } catch (err) {
      console.error('Törlés hiba:', err);
      alert('Hálózati hiba a törlés során: ' + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, authHeaders, activeItem]);
  const setParam = useCallback((k, v) => setParams(p => ({ ...p, [k]: v })), []);
  const handleSelectHistory = useCallback(async (item) => {
    setActiveItem(item);
    setGenStatus(item.status);
    // Stílus visszaállítása az előzményből (prompt változatlan marad)
    if (item.style) setSelectedStyle(item.style);
    if (item.model_url) {
      try {
        const blobUrl = await fetchGlbAsBlob(item.model_url, getIdToken);
        setModelUrl(blobUrl);
        prevModelUrlRef.current = blobUrl;
      } catch {
        setModelUrl(item.model_url);
        prevModelUrlRef.current = item.model_url;
      }
    }
  }, [getIdToken]);

  const handleReusePrompt = useCallback((p) => {
    setPrompt(p);
    setErrorMsg('');
  }, []);

  const handleDownload = useCallback(() => {
    if (!modelUrl) return;
    const a = document.createElement('a');
    a.href = modelUrl;
    a.download = `trellis_${Date.now()}.glb`;
    a.click();
  }, [modelUrl]);

  const handleDownloadItem = useCallback(async (item) => {
    try {
      const blobUrl = await fetchGlbAsBlob(item.model_url, getIdToken);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `trellis_${item.id ?? Date.now()}.glb`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (err) {
      console.error('GLB letöltés sikertelen:', err);
      alert('GLB letöltés sikertelen: ' + err.message);
    }
  }, [getIdToken]);

  const camPreset = useCallback((preset) => {
    if (sceneRef.current) {
      setCameraPreset(sceneRef.current, preset);
      const spin = preset === 'reset';
      setAutoSpin(spin);
      sceneRef.current.autoSpin = spin;
    }
  }, []);

  const toggleAutoSpin = useCallback(() => setAutoSpin(v => !v), []);

  const activePresetLabel = useMemo(() => {
    const p = TRELLIS_PRESETS.find(
      pr => pr.slat_steps === params.slat_sampling_steps && pr.ss_steps === params.ss_sampling_steps
    );
    return p?.label ?? null;
  }, [params.slat_sampling_steps, params.ss_sampling_steps]);

  const isRunning = genStatus === 'pending';
  const canGen = !isRunning && !!prompt.trim() && prompt.length <= 1000;

  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase();
    return q ? history.filter(i => (i.prompt || '').toLowerCase().includes(q)) : history;
  }, [history, histSearch]);

  const handleClearHistory = useCallback(() => {
    setClearAllModalOpen(true);
  }, []);

  const confirmClearAll = useCallback(async () => {
    setIsDeleting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('http://localhost:3001/api/trellis/history', {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();

      if (data.success) {
        setHistory([]);
        setActiveItem(null);
        setModelUrl(null);
        setGenStatus('idle');
        console.log('✅ Összes előzmény törölve:', data.deletedCount);
      } else {
        alert('Törlés sikertelen: ' + data.message);
      }
    } catch (err) {
      console.error('Összes törlés hiba:', err);
      alert('Hálózati hiba: ' + err.message);
    } finally {
      setIsDeleting(false);
      setClearAllModalOpen(false);
    }
  }, [authHeaders]);

  const PRESET_TIME = { 'Ultra': '~10–15 mp', 'Gyors': '~18–22 mp', 'Normál': '~28–35 mp', 'Minőség': '~45–55 mp', 'Max': '~60–70 mp' };

  return (
    <>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        .animate-spin    { animation: spin 1s linear infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes trellisPulse {
          0%, 100% { box-shadow: 0 4px 24px ${color}50; }
          50%       { box-shadow: 0 4px 32px ${color}80, 0 0 0 3px ${color}15; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
      `}</style>

      <div style={{
        display: 'flex', height: '100%', overflow: 'hidden',
        fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
        background: '#060610',
      }}>

        {/* ═══════════════════════════════════════════════════════
            LEFT PANEL — Prompt + Settings
        ═══════════════════════════════════════════════════════ */}
        <aside style={{
          width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column',
          overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(6,6,18,0.8)',
          scrollbarWidth: 'thin',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 14px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.01)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: `${color}18`, border: `1px solid ${color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 16px ${color}20`,
            }}>
              <Sparkles style={{ width: 14, height: 14, color }} />
            </div>
            <div>
              <p style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                NVIDIA Trellis
              </p>
              <p style={{ color: '#2d3748', fontSize: 9, margin: 0, fontFamily: "'SF Mono', monospace" }}>
                microsoft/trellis · text→3D
              </p>
            </div>
          </div>

          <div style={{ padding: '14px 12px 0', flex: 1 }}>

            {/* ── Stílus picker ──────────────────────────────────────────── */}
            <StylePicker
              selected={selectedStyle}
              onSelect={handleStyleSelect}
              color={color}
              disabled={isRunning}
            />

            <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '4px 0 14px' }} />

            <SectionLabel icon={<Type />} color={color}>Prompt</SectionLabel>

            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleGenerate}
              onEnhance={handleEnhance}
              enhancing={enhancing}
              onDechance={handleDechance}
              dechantig={dechantig}
              color={color}
              disabled={isRunning}
            />

            {/* ── Példák ──────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 14 }}>
              <p style={{
                color: '#2d3748', fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                margin: '0 0 6px', fontFamily: "'SF Mono', monospace",
              }}>
                Példák
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {EXAMPLE_PROMPTS.map(ex => (
                  <button key={ex} onClick={() => {
                    setPrompt(ex);
                    setErrorMsg('');
                  }} disabled={isRunning}
                    style={{
                      width: '100%', padding: '5px 9px', borderRadius: T.radius.sm, textAlign: 'left',
                      fontSize: 9, color: '#374151', cursor: isRunning ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.12s', opacity: isRunning ? 0.4 : 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      lineHeight: 1.5,
                    }}
                    onMouseEnter={e => { if (!isRunning) { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = `${color}25`; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                  >
                    <span style={{ color: `${color}60`, marginRight: 5 }}>↗</span>{ex}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Timeout warning ─────────────────────────────────────────── */}
            {timedOut && (
              <Card style={{ marginBottom: 12 }}>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Clock style={{ width: 11, height: 11, color: '#fb923c', flexShrink: 0 }} />
                    <p style={{ color: '#fdba74', fontSize: 10, fontWeight: 700, margin: 0 }}>
                      Időtúllépés (1:10)
                    </p>
                  </div>
                  <p style={{ color: '#7a4a2a', fontSize: 9, margin: '0 0 8px', lineHeight: 1.6 }}>
                    Csökkentsd a Steps értékét, vagy egyszerűsítsd a promptot.
                  </p>
                  <button onClick={handleDechance} disabled={dechantig} style={{
                    width: '100%', padding: '6px 0', borderRadius: T.radius.sm, fontSize: 10, fontWeight: 700,
                    cursor: dechantig ? 'not-allowed' : 'pointer', border: 'none',
                    background: 'rgba(251,146,60,0.15)',
                    color: '#fb923c', outline: '1px solid rgba(251,146,60,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}>
                    {dechantig
                      ? <><Loader2 style={{ width: 10, height: 10 }} className="animate-spin" /> Egyszerűsítés…</>
                      : <><Zap style={{ width: 10, height: 10 }} /> Prompt egyszerűsítése</>
                    }
                  </button>
                </div>
              </Card>
            )}

            {/* ── Error ───────────────────────────────────────────────────── */}
            {!timedOut && errorMsg && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px',
                borderRadius: T.radius.md, background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12,
              }}>
                <AlertCircle style={{ width: 12, height: 12, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#fca5a5', fontSize: 10, margin: 0, lineHeight: 1.5 }}>{errorMsg}</p>
              </div>
            )}

            {/* ── Trellis Beállítások ─────────────────────────────────────── */}
            <Card style={{ marginBottom: 14 }}>
              <button onClick={() => setSettingsOpen(v => !v)} style={{
                width: '100%', padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'none', border: 'none', cursor: 'pointer',
              }}>
                <Sliders style={{ width: 11, height: 11, color: `${color}80` }} />
                <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: '-0.01em' }}>
                  Generálás beállítások
                </span>
                {activePresetLabel && (
                  <Pill color={color} active>
                    {TRELLIS_PRESETS.find(p => p.label === activePresetLabel)?.emoji} {activePresetLabel}
                  </Pill>
                )}
                <span style={{
                  marginLeft: 'auto', fontSize: 9, color: '#2d3748', transition: 'transform 0.25s',
                  display: 'inline-block', transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▾</span>
              </button>

              {settingsOpen && (
                <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {/* Presets */}
                  <div style={{ marginBottom: 16, paddingTop: 12 }}>
                    <p style={{ color: '#2d3748', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', fontFamily: "'SF Mono', monospace" }}>
                      Gyors preset
                    </p>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {TRELLIS_PRESETS.map(p => {
                        const isActive = params.slat_sampling_steps === p.slat_steps
                          && params.ss_sampling_steps === p.ss_steps;
                        return (
                          <Tooltip key={p.label} text={p.tip} side="top">
                            <button
                              onClick={() => {
                                setParam('slat_cfg_scale', p.slat_cfg);
                                setParam('ss_cfg_scale', p.ss_cfg);
                                setParam('slat_sampling_steps', p.slat_steps);
                                setParam('ss_sampling_steps', p.ss_steps);
                              }}
                              style={{
                                flex: '1 1 0', padding: '6px 2px', borderRadius: T.radius.sm,
                                fontSize: 9, fontWeight: 700,
                                border: 'none', cursor: 'pointer',
                                background: isActive ? `${color}1e` : 'rgba(255,255,255,0.025)',
                                color: isActive ? color : '#4b5563',
                                outline: isActive ? `1px solid ${color}45` : '1px solid rgba(255,255,255,0.06)',
                                transition: 'all 0.15s',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: 2,
                                boxShadow: isActive ? `0 0 10px ${color}15` : 'none',
                              }}
                            >
                              <span style={{ fontSize: 12, lineHeight: 1 }}>{p.emoji}</span>
                              <span style={{ fontSize: 8.5, letterSpacing: '0.01em' }}>{p.label}</span>
                              <span style={{ fontSize: 8, opacity: 0.5, fontFamily: "'SF Mono', monospace" }}>{p.slat_steps}s</span>
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                    {activePresetLabel && (
                      <p style={{ color: '#2d3748', fontSize: 9, margin: '7px 0 0', textAlign: 'center', fontFamily: "'SF Mono', monospace" }}>
                        est. <span style={{ color, fontWeight: 700 }}>{PRESET_TIME[activePresetLabel]}</span>
                      </p>
                    )}
                  </div>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 0 14px' }} />

                  <MiniSlider label="SLAT CFG Scale" value={params.slat_cfg_scale} min={1} max={10} step={0.1}
                    onChange={v => setParam('slat_cfg_scale', v)} color={color} display={params.slat_cfg_scale.toFixed(1)} />
                  <MiniSlider label="SS CFG Scale" value={params.ss_cfg_scale} min={1} max={10} step={0.1}
                    onChange={v => setParam('ss_cfg_scale', v)} color={color} display={params.ss_cfg_scale.toFixed(1)} />
                  <MiniSlider label="SLAT Sampling Steps" value={params.slat_sampling_steps} min={4} max={50} step={1}
                    onChange={v => setParam('slat_sampling_steps', v)} color={color} display={`${params.slat_sampling_steps}`} />
                  <MiniSlider label="SS Sampling Steps" value={params.ss_sampling_steps} min={4} max={50} step={1}
                    onChange={v => setParam('ss_sampling_steps', v)} color={color} display={`${params.ss_sampling_steps}`} />

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '4px 0 14px' }} />

                  <ToggleRow
                    label="Véletlenszerű seed"
                    hint="Minden generálás egyedi eredményt ad"
                    value={params.randomSeed}
                    onChange={v => setParam('randomSeed', v)}
                    color={color}
                  />
                  {!params.randomSeed && (
                    <NumInput
                      label="Seed"
                      hint="0 – 2 147 483 647"
                      value={params.seed}
                      min={0}
                      max={2147483647}
                      onChange={v => setParam('seed', v)}
                      color={color}
                    />
                  )}

                  {params.randomSeed && activeItem?.params?.seed !== undefined && (
                    <div style={{
                      marginBottom: 10, padding: '5px 9px', borderRadius: T.radius.sm,
                      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ color: '#2d3748', fontSize: 9 }}>Utolsó seed</span>
                      <span style={{ color: '#4b5563', fontSize: 10, fontWeight: 700, fontFamily: "'SF Mono', monospace" }}>
                        {activeItem.params.seed}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* ── Generate Button area ─────────────────────────────────────── */}
          <div style={{
            padding: '12px 12px 14px', flexShrink: 0,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(6,6,18,0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#2d3748', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'SF Mono', monospace" }}>
                <Clock style={{ width: 9, height: 9 }} />
                {activePresetLabel ? PRESET_TIME[activePresetLabel] : '~30 mp'}
              </span>
              <span style={{ color: '#1f2937', fontSize: 9, fontFamily: "'SF Mono', monospace" }}>microsoft/trellis</span>
            </div>
            {isRunning ? (
              <button onClick={handleStop} style={{
                width: '100%', padding: '12px 0', borderRadius: T.radius.md,
                fontSize: 12, fontWeight: 700, color: '#fca5a5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: 'rgba(239,68,68,0.12)',
                outline: '1px solid rgba(239,68,68,0.3)',
                letterSpacing: '-0.01em',
              }}>
                <Square style={{ width: 12, height: 12 }} /> Leállítás
              </button>
            ) : (
              <Tooltip
                text={!canGen
                  ? (!prompt.trim() ? 'Írj be egy promptot' : prompt.length > 1000 ? 'Prompt túl hosszú' : '')
                  : 'Trellis 3D generálás indítása'}
                side="top"
              >
                <button onClick={handleGenerate} disabled={!canGen} style={{
                  width: '100%', padding: '12px 0', borderRadius: T.radius.md,
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  cursor: canGen ? 'pointer' : 'not-allowed', border: 'none',
                  background: canGen
                    ? `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`
                    : 'rgba(255,255,255,0.04)',
                  opacity: !canGen ? 0.35 : 1,
                  transition: 'all 0.2s',
                  animation: canGen ? 'trellisPulse 2.5s ease-in-out infinite' : 'none',
                  letterSpacing: '-0.01em',
                }}>
                  <Sparkles style={{ width: 14, height: 14 }} /> Trellis Generate
                </button>
              </Tooltip>
            )}
            {modelUrl && (
              <button onClick={handleDownload} style={{
                marginTop: 6, width: '100%', padding: '7px 0', borderRadius: T.radius.sm,
                fontSize: 10, fontWeight: 600, color: '#4b5563',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.025)', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              >
                <Download style={{ width: 11, height: 11 }} /> GLB letöltése
              </button>
            )}
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════
            CENTER — 3D VIEWER
        ═══════════════════════════════════════════════════════ */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Top toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 12px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: 'rgba(6,6,18,0.95)',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#2d3748', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'SF Mono', monospace", marginRight: 3 }}>NÉZET</span>
              {VIEW_MODES.map(v => (
                <Tooltip key={v.id} text={v.tip} side="bottom">
                  <button onClick={() => setViewMode(v.id)} style={{
                    padding: '3px 9px', borderRadius: T.radius.sm, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: viewMode === v.id ? `${color}1e` : 'rgba(255,255,255,0.03)',
                    color: viewMode === v.id ? color : '#4b5563',
                    outline: viewMode === v.id ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)',
                  }}>{v.label}</button>
                </Tooltip>
              ))}
              {modelUrl && (
                <WireframeControl
                  active={wireframeOverlay}
                  onToggle={() => setWireframeOverlay(v => !v)}
                  opacity={wireOpacity}
                  onOpacityChange={setWireOpacity}
                  color={wireColor}
                  onColorChange={setWireColor}
                  accentColor={color}
                />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <BgColorPicker value={bgColor} onChange={setBgColor} />
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />
              <span style={{ color: '#2d3748', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'SF Mono', monospace" }}>FÉNY</span>
              <LightingControls
                viewMode={viewMode}
                lightMode={lightMode} setLightMode={setLightMode}
                lightStrength={lightStrength} setLightStrength={setLightStrength}
                lightRotation={lightRotation} setLightRotation={setLightRotation}
                lightAutoRotate={lightAutoRotate} setLightAutoRotate={setLightAutoRotate}
                lightAutoRotateSpeed={lightAutoRotateSpeed} setLightAutoRotateSpeed={setLightAutoRotateSpeed}
                dramaticColor={dramaticColor} setDramaticColor={setDramaticColor}
                gridColor1={gridColor1} setGridColor1={setGridColor1}
                gridColor2={gridColor2} setGridColor2={setGridColor2}
                color={color}
              />
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />
              <IconBtn
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" />
                </svg>}
                tip={showGrid ? 'Rács elrejtése' : 'Rács megjelenítése'}
                active={showGrid} color={color}
                onClick={() => setShowGrid(v => !v)}
              />
              <IconBtn
                icon={<ChevronRight />}
                tip={rightOpen ? 'Előzmények bezárása' : 'Előzmények megnyitása'}
                active={rightOpen} color={color}
                onClick={() => setRightOpen(v => !v)}
              />
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
              fontSize: 9, color: '#1a1a2e',
              display: 'flex', alignItems: 'center', gap: 10,
              pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
              fontFamily: "'SF Mono', monospace",
            }}>
              <RotateCcw style={{ width: 9, height: 9 }} />
              Húzd = forgat · Shift+drag = model · Jobb = pan · Scroll = zoom
            </div>

            <ThreeViewer
              color={color} viewMode={viewMode} lightMode={lightMode}
              showGrid={showGrid} modelUrl={modelUrl}
              lightStrength={lightStrength} lightRotation={lightRotation}
              lightAutoRotate={lightAutoRotate} lightAutoRotateSpeed={lightAutoRotateSpeed}
              dramaticColor={dramaticColor}
              wireframeOverlay={wireframeOverlay} wireOpacity={wireOpacity} wireHexColor={wireHexColor}
              autoSpin={autoSpin} bgColor={bgColor}
              gridColor1={gridColor1} gridColor2={gridColor2}
              onSpinStop={() => setAutoSpin(false)}
              onReady={s => { sceneRef.current = s; }}
            />

            {/* History loading overlay */}
            {historyLoading && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 20,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(6,6,16,0.7)', backdropFilter: 'blur(8px)',
                pointerEvents: 'none',
              }}>
                <Loader2 style={{ width: 22, height: 22, color, marginBottom: 10 }} className="animate-spin" />
                <p style={{ color: '#374151', fontSize: 11, margin: 0 }}>Előzmények betöltése…</p>
              </div>
            )}

            {/* Running overlay */}
            {isRunning && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 20,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(4,4,14,0.88)', backdropFilter: 'blur(12px)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 20, marginBottom: 20,
                  background: `${color}12`, border: `1px solid ${color}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 40px ${color}25, inset 0 1px 0 ${color}30`,
                }}>
                  <Box style={{ width: 28, height: 28, color }} />
                </div>
                <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 15, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Trellis generál…
                </p>
                {selectedStyle !== 'nostyle' && (
                  <p style={{ color: `${color}cc`, fontSize: 10, fontWeight: 600, margin: '0 0 5px' }}>
                    {STYLE_OPTIONS.find(s => s.id === selectedStyle)?.emoji}{' '}
                    {STYLE_OPTIONS.find(s => s.id === selectedStyle)?.label} stílus
                  </p>
                )}
                <p style={{
                  color: '#374151', fontSize: 10, margin: '0 0 5px',
                  maxWidth: 280, textAlign: 'center', lineHeight: 1.6,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  fontStyle: 'italic',
                }}>
                  „{prompt}"
                </p>
                <p style={{ color: '#2d3748', fontSize: 10, margin: '0 0 22px', fontFamily: "'SF Mono', monospace" }}>
                  {activePresetLabel ? PRESET_TIME[activePresetLabel] : '~30 mp'}
                </p>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: color, opacity: 0.25,
                      animation: `pulse 1.4s ease-in-out ${i * 0.18}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isRunning && !modelUrl && !historyLoading && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 22, marginBottom: 18,
                  background: `${color}06`, border: `1px solid ${color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Box style={{ width: 30, height: 30, color: `${color}30` }} />
                </div>
                <p style={{ color: '#1f2937', fontSize: 13, fontWeight: 600, margin: '0 0 5px', letterSpacing: '-0.01em' }}>
                  {prompt.trim() ? 'Kattints a Trellis Generate gombra' : 'Írj be egy promptot'}
                </p>
                <p style={{ color: '#1a1a30', fontSize: 10 }}>
                  Szövegből 3D model — NVIDIA Trellis AI
                </p>
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 12px', flexShrink: 0,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            background: 'rgba(6,6,18,0.95)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#2d3748', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'SF Mono', monospace", marginRight: 3 }}>KAMERA</span>
              <IconBtn icon={<RotateCcw />} tip="Kamera visszaállítása" onClick={() => camPreset('reset')} />
              <IconBtn icon={<Camera />} tip="Elölnézet" onClick={() => camPreset('front')} />
              <IconBtn icon={<Move3d />} tip="Oldalnézet" onClick={() => camPreset('side')} />
              <IconBtn icon={<Layers />} tip="Felülnézet" onClick={() => camPreset('top')} />
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />
              <Tooltip text={autoSpin ? 'Auto-spin leállítása' : 'Auto-spin indítása'} side="top">
                <button onClick={toggleAutoSpin} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px',
                  borderRadius: T.radius.sm, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: autoSpin ? `${color}1e` : 'rgba(255,255,255,0.03)',
                  color: autoSpin ? color : '#4b5563',
                  outline: autoSpin ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.15s',
                }}>
                  {autoSpin ? <Square style={{ width: 9, height: 9 }} /> : <Play style={{ width: 9, height: 9 }} />}
                  Auto-spin
                </button>
              </Tooltip>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeItem?.params && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  padding: '3px 10px', borderRadius: T.radius.sm,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {[
                    { k: 'SLAT', v: activeItem.params.slat_cfg_scale?.toFixed?.(1) ?? activeItem.params.slat_cfg_scale },
                    { k: 'SS', v: activeItem.params.ss_cfg_scale?.toFixed?.(1) ?? activeItem.params.ss_cfg_scale },
                    { k: 'Steps', v: activeItem.params.slat_sampling_steps },
                    { k: 'Seed', v: activeItem.params.seed },
                  ].map(({ k, v }) => (
                    <span key={k} style={{ fontSize: 9, color: '#2d3748', display: 'flex', gap: 3, fontFamily: "'SF Mono', monospace" }}>
                      <span style={{ color: '#1f2937' }}>{k}:</span>
                      <span style={{ color: '#374151', fontWeight: 700 }}>{v}</span>
                    </span>
                  ))}
                </div>
              )}
              {modelUrl && (
                <button onClick={handleDownload} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: T.radius.sm, fontSize: 10, fontWeight: 700, color: '#fff',
                  background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: `0 2px 10px ${color}40`,
                  letterSpacing: '-0.01em',
                }}>
                  <Download style={{ width: 11, height: 11 }} /> GLB letöltése
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ═══════════════════════════════════════════════════════
            RIGHT PANEL — History
        ═══════════════════════════════════════════════════════ */}
        {rightOpen && (
          <aside style={{
            width: 216, flexShrink: 0, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(6,6,18,0.8)',
          }}>
            <div style={{ padding: '12px 10px 9px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9,
              }}>
                <Clock style={{ width: 11, height: 11, color: `${color}80` }} />
                <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, letterSpacing: '-0.01em' }}>
                  Előzmények
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                  padding: '1px 7px', borderRadius: 999,
                  background: `${color}12`, color: `${color}aa`,
                  border: `1px solid ${color}20`,
                  fontFamily: "'SF Mono', monospace",
                }}>{history.length}</span>
              </div>
              <input
                placeholder="Keresés…"
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
                style={{
                  width: '100%', padding: '5px 9px', borderRadius: T.radius.sm,
                  fontSize: 10, color: '#9ca3af',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = `${color}35`; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              />
            </div>

            <div style={{
              flex: 1, overflowY: 'auto', padding: '8px 8px',
              display: 'flex', flexDirection: 'column', gap: 5, scrollbarWidth: 'thin',
            }}>
              {historyLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <Loader2 style={{ width: 15, height: 15, color: '#2d3748' }} className="animate-spin" />
                </div>
              )}
              {!historyLoading && filteredHistory.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: 140, textAlign: 'center', gap: 8,
                }}>
                  <Box style={{ width: 22, height: 22, color: '#1a1a2e' }} />
                  <p style={{ color: '#1f2937', fontSize: 10 }}>
                    {histSearch ? 'Nincs találat' : 'Még nincs mentett modell'}
                  </p>
                </div>
              )}
              {filteredHistory.map(item => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  isActive={activeItem?.id === item.id}
                  onSelect={handleSelectHistory}
                  onReuse={handleReusePrompt}
                  onDownload={handleDownloadItem}
                  onDelete={handleDeleteItem}
                  color={color}
                />
              ))}
            </div>

            {history.length > 0 && (
              <div style={{ padding: '7px 8px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                <button
                  onClick={handleClearHistory}
                  style={{
                    width: '100%', padding: '5px', borderRadius: T.radius.sm,
                    fontSize: 9, fontWeight: 600, color: '#2d3748',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)'; e.currentTarget.style.background = 'rgba(248,113,113,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#2d3748'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <Trash2 style={{ width: 9, height: 9 }} /> Előzmények törlése
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
      {/* Egyedi törlés modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setItemToDelete(null);
          }
        }}
        onConfirm={confirmDeleteItem}
        title="Modell törlése"
        message={`Biztosan törölni szeretnéd ezt a modellt? "${itemToDelete?.prompt?.slice(0, 60)}${itemToDelete?.prompt?.length > 60 ? '...' : ''}" Ez a művelet nem vonható vissza.`}
        confirmText="Törlés"
        confirmColor="#ef4444"
        isDeleting={isDeleting}
      />

      {/* Összes törlés modal */}
      <ConfirmModal
        isOpen={clearAllModalOpen}
        onClose={() => {
          if (!isDeleting) setClearAllModalOpen(false);
        }}
        onConfirm={confirmClearAll}
        title="Összes előzmény törlése"
        message={`Biztosan törölni szeretnéd mind a ${history.length} mentett modellt? Ez a művelet nem vonható vissza, és minden model véglegesen törlődik a felhőből is.`}
        confirmText="Összes törlése"
        confirmColor="#dc2626"
        isDeleting={isDeleting}
      />
    </>
  );
}