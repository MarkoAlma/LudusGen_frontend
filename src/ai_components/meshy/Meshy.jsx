// Trellis2Panel.jsx — Main panel (refactored, modular)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload, RotateCcw, Download, Layers, Box, Loader2, AlertCircle,
  Trash2, RefreshCw, Sparkles, Move3d, Clock, Wand2,
  Camera, Play, Square, ChevronRight, PersonStanding, Settings, Paintbrush2,
} from 'lucide-react';

// ── Sub-modules ────────────────────────────────────────────────────────────
import ThreeViewer from './viewer/ThreeViewer';
import LightingControls from './viewer/LightingControls';
import { setCameraPreset } from './viewer/threeHelpers';
import DownloadModal from './modals/DownloadModal';
import EditTextureModal from './modals/EditTextureModal';
import RemeshModal from './modals/RemeshModal';
import AnimateModal from './modals/AnimateModal';
import { Tooltip ,IconBtn } from './ui/primitives';
import { Toggle, SegControl, Select, MeshyRow, NumStepper, Collapsible, HistoryCard  } from './ui/Controls';


// ── Constants ──────────────────────────────────────────────────────────────
const PROMPT_MAX = 600;
const LS_KEY = 'meshy_panel_history_v1';
const POLL_MS = 2500;
const API_BASE = '/api/meshy';

// ── localStorage helpers ───────────────────────────────────────────────────
const loadHistory = () => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveHistory = (h) => { try { localStorage.setItem(LS_KEY, JSON.stringify(h.slice(0, 40))); } catch {} };
const fileToDataURI = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
const fmtDate = (d) => new Date(d).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Default generation params ───────────────────────────────────────────────
const defaultParams = () => ({
  ai_model: 'latest', model_type: 'standard', topology: 'triangle',
  target_polycount: 100000, should_remesh: false, symmetry_mode: 'auto',
  pose_mode: '', multiview: false, should_texture: true,
  num_generations: 1, enable_pbr: true, texture_prompt: '', license: 'cc',
});

// ── UV layer config ─────────────────────────────────────────────────────────
const UV_LAYER_LABELS = {
  base_color: 'Base Color', roughness: 'Roughness',
  metallic: 'Metallic', normal: 'Normal', emissive: 'Emissive',
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ══════════════════════════════════════════════════════════════════════════
export default function Trellis2Panel({ selectedModel, getIdToken }) {
  const color = selectedModel?.color || '#06b6d4';

  // ── Input & generation state ─────────────────────────────────────────────
  const [inputMode, setInputMode] = useState('text');
  const [prompt, setPrompt] = useState('');
  const [modelName, setModelName] = useState('');
  const [params, setParams] = useState(defaultParams);
  const [poseEnabled, setPoseEnabled] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [taskId, setTaskId] = useState(null);
  const [taskType, setTaskType] = useState('text-to-3d');
  const [genStatus, setGenStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [modelUrl, setModelUrl] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [previewTaskId, setPreviewTaskId] = useState(null);
  const [refining, setRefining] = useState(false);

  // ── Viewer state ─────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState('solid');
  const [lightMode, setLightMode] = useState('studio');
  const [showGrid, setShowGrid] = useState(true);
  const [autoSpin, setAutoSpin] = useState(true);
  const [uvLayer, setUvLayer] = useState('base_color');

  // ── NEW: Lighting advanced state ─────────────────────────────────────────
  const [lightStrength, setLightStrength] = useState(1.0);
  const [lightRotation, setLightRotation] = useState(0);
  const [lightAutoRotate, setLightAutoRotate] = useState(false);
  const [lightAutoRotateSpeed, setLightAutoRotateSpeed] = useState(0.5);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [rightOpen, setRightOpen] = useState(true);
  const [showDownload, setShowDownload] = useState(false);
  const [showEditTexture, setShowEditTexture] = useState(false);
  const [showRemesh, setShowRemesh] = useState(false);
  const [showAnimate, setShowAnimate] = useState(false);

  // ── History ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState(() => loadHistory());
  const [activeItem, setActiveItem] = useState(() => loadHistory()[0] ?? null);
  const [histSearch, setHistSearch] = useState('');
  useEffect(() => { saveHistory(history); }, [history]);

  const sceneRef = useRef(null);
  const pollTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const setParam = useCallback((k, v) => setParams((p) => ({ ...p, [k]: v })), []);

  const handleImageFile = useCallback((file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleImageFile(e.dataTransfer?.files[0] ?? e.target?.files?.[0]);
  }, [handleImageFile]);

  const authHeaders = useCallback(async () => {
    const token = getIdToken ? await getIdToken() : '';
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  // ── Polling ───────────────────────────────────────────────────────────────
  const startPolling = useCallback((id, type) => {
    clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/task/${type}/${id}`, { headers });
        const data = await res.json();
        if (!data.success) return;
        setProgress(data.progress ?? 0);
        setGenStatus(data.status?.toLowerCase() ?? 'pending');
        if (data.status === 'SUCCEEDED') {
          clearInterval(pollTimerRef.current);
          setProgress(100);
          const glbUrl = data.model_urls?.glb ?? data.model_urls?.obj ?? null;
          setModelUrl(glbUrl);
          setThumbnail(data.thumbnail_url ?? null);
          setPreviewTaskId(id);
          const item = {
            id: `m_${id}`, task_id: id, task_type: type,
            prompt: inputMode === 'text' ? prompt : imageFile?.name ?? 'Kép alapú',
            status: 'succeeded', thumbnail: data.thumbnail_url ?? null,
            model_urls: data.model_urls ?? {}, ts: Date.now(),
          };
          setHistory((h) => [item, ...h]);
          setActiveItem(item);
        } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
          clearInterval(pollTimerRef.current);
          setErrorMsg(data.task_error?.message ?? 'Generálás sikertelen');
        }
      } catch (err) { console.error('Poll error:', err); }
    }, POLL_MS);
  }, [authHeaders, inputMode, prompt, imageFile]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (genStatus === 'pending' || genStatus === 'in_progress') return;
    if (inputMode === 'text' && !prompt.trim()) return;
    if (inputMode === 'image' && !imageFile) return;
    setErrorMsg(''); setModelUrl(null); setPreviewTaskId(null); setProgress(0); setGenStatus('pending');
    try {
      const headers = await authHeaders();
      let res, data;
      if (inputMode === 'text') {
        res = await fetch(`${API_BASE}/text-to-3d`, { method: 'POST', headers, body: JSON.stringify({ prompt: prompt.trim(), ...params }) });
        data = await res.json(); setTaskType('text-to-3d');
      } else {
        const imageDataURI = await fileToDataURI(imageFile);
        res = await fetch(`${API_BASE}/image-to-3d`, { method: 'POST', headers, body: JSON.stringify({ image_url: imageDataURI, model_type: params.model_type, ai_model: params.ai_model, topology: params.topology, target_polycount: params.target_polycount, symmetry_mode: params.symmetry_mode, should_remesh: params.should_remesh, should_texture: params.should_texture, enable_pbr: params.enable_pbr, pose_mode: params.pose_mode, ...(params.texture_prompt ? { texture_prompt: params.texture_prompt } : {}) }) });
        data = await res.json(); setTaskType('image-to-3d');
      }
      if (!data.success) { setGenStatus('failed'); setErrorMsg(data.message ?? 'Hiba'); return; }
      setTaskId(data.task_id);
      startPolling(data.task_id, inputMode === 'text' ? 'text-to-3d' : 'image-to-3d');
    } catch (err) { setGenStatus('failed'); setErrorMsg(err.message ?? 'Hálózati hiba'); }
  }, [genStatus, inputMode, prompt, imageFile, params, authHeaders, startPolling]);

  // ── Refine ────────────────────────────────────────────────────────────────
  const handleRefine = useCallback(async () => {
    if (!previewTaskId || refining) return;
    setRefining(true); setGenStatus('pending'); setProgress(0); setErrorMsg('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/refine`, { method: 'POST', headers, body: JSON.stringify({ preview_task_id: previewTaskId, enable_pbr: params.enable_pbr, texture_prompt: params.texture_prompt }) });
      const data = await res.json();
      if (!data.success) { setGenStatus('failed'); setErrorMsg(data.message); setRefining(false); return; }
      setTaskId(data.task_id); startPolling(data.task_id, 'text-to-3d');
    } catch (err) { setGenStatus('failed'); setErrorMsg(err.message); setRefining(false); }
  }, [previewTaskId, refining, params, authHeaders, startPolling]);

  useEffect(() => () => clearInterval(pollTimerRef.current), []);

  const handleSelectHistory = useCallback((item) => {
    setActiveItem(item);
    if (item.model_urls?.glb) setModelUrl(item.model_urls.glb);
    else if (item.model_urls?.obj) setModelUrl(item.model_urls.obj);
    setGenStatus(item.status);
    setThumbnail(item.thumbnail ?? null);
  }, []);

  const camPreset = useCallback((preset) => {
    if (sceneRef.current) {
      setCameraPreset(sceneRef.current, preset);
      const spin = preset === 'reset';
      setAutoSpin(spin);
      sceneRef.current.autoSpin = spin;
    }
  }, []);

  const toggleAutoSpin = useCallback(() => {
    setAutoSpin((v) => { const next = !v; if (sceneRef.current) sceneRef.current.autoSpin = next; return next; });
  }, []);

  const charPct = prompt.length / PROMPT_MAX;
  const charColor = charPct > 0.9 ? '#f87171' : charPct > 0.72 ? '#fbbf24' : '#4b5563';
  const isRunning = genStatus === 'pending' || genStatus === 'in_progress';
  const canGen = !isRunning && (inputMode === 'text' ? prompt.trim().length > 0 : !!imageFile);

  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase();
    return q ? history.filter((i) => i.prompt.toLowerCase().includes(q)) : history;
  }, [history, histSearch]);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .animate-pulse { animation: pulse 2s ease-in-out infinite; }
      `}</style>

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: "'SF Pro Display',-apple-system,system-ui,sans-serif" }}>

        {/* ════ LEFT PANEL ════ */}
        <aside style={{
          width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto',
          borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,20,0.5)', scrollbarWidth: 'thin',
        }}>
          <div style={{ padding: '10px 10px 0' }}>
            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {[
                { id: 'image', emoji: '🖼️', tip: 'Kép → 3D' },
                { id: 'batch', emoji: '📦', tip: 'Batch (hamarosan)', disabled: true },
                { id: 'text', emoji: '💬', tip: 'Szöveg → 3D' },
              ].map((tab) => (
                <Tooltip key={tab.id} text={tab.tip} side="bottom">
                  <button onClick={() => !tab.disabled && setInputMode(tab.id)} style={{
                    width: 44, height: 36, borderRadius: 10, fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: tab.disabled ? 'not-allowed' : 'pointer', border: 'none', transition: 'all 0.15s',
                    background: inputMode === tab.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                    outline: inputMode === tab.id ? `2px solid ${color}60` : '1px solid rgba(255,255,255,0.08)',
                    opacity: tab.disabled ? 0.35 : 1,
                  }}>{tab.emoji}</button>
                </Tooltip>
              ))}
            </div>

            {/* Image input */}
            {inputMode === 'image' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600 }}>Image</span>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  style={{
                    height: 120, borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: dragOver ? `${color}18` : imagePreview ? 'transparent' : 'rgba(255,255,255,0.03)',
                    border: `1.5px dashed ${dragOver ? color : imagePreview ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
                    overflow: 'hidden', transition: 'all 0.2s', marginBottom: 10,
                  }}
                >
                  {imagePreview ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                      <Tooltip text="Kép eltávolítása" side="bottom">
                        <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} style={{
                          position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.72)', border: 'none', cursor: 'pointer',
                        }}>
                          <Trash2 style={{ width: 11, height: 11, color: '#f87171' }} />
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <>
                      <Upload style={{ width: 22, height: 22, color: '#4b5563', marginBottom: 6 }} />
                      <p style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', margin: '0 0 2px' }}>Click / Drag & Drop / Paste</p>
                      <p style={{ color: '#374151', fontSize: 9, textAlign: 'center', margin: 0 }}>PNG, JPG, WEBP — Max 20MB</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleDrop} />
              </>
            ) : (
              /* Text prompt */
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600 }}>Prompt</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Tooltip text="Prompt javítása" side="bottom">
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 2, display: 'flex' }}>
                        <Wand2 style={{ width: 11, height: 11 }} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  <textarea value={prompt} maxLength={PROMPT_MAX} onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX))}
                    placeholder="Describe the object to generate…" rows={5}
                    style={{
                      width: '100%', resize: 'none', borderRadius: 10, fontSize: 11, color: '#e5e7eb',
                      lineHeight: 1.55, padding: '10px 10px 22px',
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${prompt ? color + '40' : 'rgba(255,255,255,0.08)'}`,
                      outline: 'none', scrollbarWidth: 'thin', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = `${color}65`; }}
                    onBlur={(e) => { e.target.style.borderColor = prompt ? `${color}40` : 'rgba(255,255,255,0.08)'; }}
                  />
                  <span style={{ position: 'absolute', bottom: 7, right: 9, color: charColor, fontSize: 10 }}>{prompt.length}/{PROMPT_MAX}</span>
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <div style={{ padding: '2px 10px 6px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {errorMsg && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 9px', borderRadius: 9,
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 8,
              }}>
                <AlertCircle style={{ width: 12, height: 12, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#fca5a5', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{errorMsg}</p>
              </div>
            )}

            {inputMode === 'image' && (
              <MeshyRow label="Name" tip="Opcionális modell név">
                <input value={modelName} onChange={(e) => setModelName(e.target.value)}
                  placeholder="Give your generation a name"
                  style={{
                    width: '100%', padding: '6px 10px', borderRadius: 9, fontSize: 11, color: '#e5e7eb',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }} />
              </MeshyRow>
            )}

            <MeshyRow label="Model Type" tip="Standard: részletes · Low Poly: stílusos">
              <SegControl value={params.model_type}
                options={[{ value: 'standard', label: 'Standard' }, { value: 'lowpoly', label: 'Low Poly (Beta)' }]}
                onChange={(v) => setParam('model_type', v)} color={color} />
            </MeshyRow>

            <MeshyRow label="AI Model" tip="Meshy AI modell verzió">
              <Select value={params.ai_model} onChange={(v) => setParam('ai_model', v)}
                options={[{ value: 'latest', label: 'Meshy 6' }, { value: 'meshy-5', label: 'Meshy 5' }]} />
            </MeshyRow>

            {inputMode === 'text' && (
              <MeshyRow label="Pose 👑" tip="Karakter póz">
                <SegControl value={params.pose_mode || 'none'}
                  options={[{ value: 'none', label: 'None' }, { value: 'a-pose', label: 'A-Pose' }, { value: 't-pose', label: 'T-Pose' }]}
                  onChange={(v) => setParam('pose_mode', v === 'none' ? '' : v)} color={color} />
              </MeshyRow>
            )}

            {inputMode === 'text' && (
              <MeshyRow label="Number of Generations" tip="Hány modell variáns (1–4)">
                <NumStepper value={params.num_generations} onChange={(v) => setParam('num_generations', v)} min={1} max={4} />
              </MeshyRow>
            )}

            <MeshyRow label="License" tip="CC BY 4.0: nyílt · Private: prémium">
              <SegControl value={params.license}
                options={[{ value: 'cc', label: 'CC BY 4.0' }, { value: 'private', label: 'Private 👑' }]}
                onChange={(v) => setParam('license', v)} color={color} />
            </MeshyRow>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />

            <Collapsible title="Speciális beállítások" color={color}>
              <Select label="Topológia" value={params.topology} onChange={(v) => setParam('topology', v)}
                options={[{ value: 'triangle', label: '▲ Háromszög' }, { value: 'quad', label: '□ Négyzet (quad)' }]} />
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Poligon cél</p>
                  <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 800 }}>{(params.target_polycount / 1000).toFixed(0)}K</span>
                </div>
                <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2, background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${((params.target_polycount - 100) / 299900) * 100}%`, pointerEvents: 'none' }} />
                  <input type="range" min={100} max={300000} step={5000} value={params.target_polycount}
                    onChange={(e) => setParam('target_polycount', Number(e.target.value))}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
                </div>
              </div>
              <Toggle label="Remesh" hint="Mesh topológia optimalizálás" value={params.should_remesh} onChange={(v) => setParam('should_remesh', v)} color={color} />
              <Toggle label="PBR térképek" hint="Metallic, Roughness, Normal" value={params.enable_pbr} onChange={(v) => setParam('enable_pbr', v)} color={color} />
              <div>
                <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Textúra prompt</p>
                <textarea value={params.texture_prompt} maxLength={600} onChange={(e) => setParam('texture_prompt', e.target.value.slice(0, 600))}
                  placeholder="Pl. dark fantasy armor, worn leather…" rows={2}
                  style={{
                    width: '100%', resize: 'none', borderRadius: 8, fontSize: 10, color: '#e5e7eb',
                    lineHeight: 1.5, padding: '6px 8px', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }} />
              </div>
            </Collapsible>
          </div>

          {/* Generate footer */}
          <div style={{ padding: '10px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {isRunning && (
              <div style={{ marginBottom: 8, borderRadius: 3, overflow: 'hidden', height: 3, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${progress}%`, transition: 'width 0.5s ease' }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ color: '#6b7280', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock style={{ width: 11, height: 11 }} /> 1 min
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14 }}>🟡</span>
                <span style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700 }}>20</span>
              </span>
            </div>
            <Tooltip text={!canGen ? (inputMode === 'text' ? 'Adj meg egy promptot' : 'Tölts fel egy képet') : 'Generálás'} side="top">
              <button onClick={handleGenerate} disabled={!canGen} style={{
                width: '100%', padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                cursor: canGen ? 'pointer' : 'not-allowed', border: 'none',
                background: isRunning ? 'rgba(255,255,255,0.07)' : canGen ? 'linear-gradient(90deg,#a3e635,#65a30d)' : 'rgba(255,255,255,0.06)',
                boxShadow: canGen && !isRunning ? '0 4px 20px rgba(132,204,22,0.35)' : 'none',
                opacity: !canGen ? 0.4 : 1, transition: 'all 0.2s',
              }}>
                {isRunning
                  ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Generálás… {progress}%</>
                  : <><Sparkles style={{ width: 15, height: 15 }} /> Generate</>}
              </button>
            </Tooltip>
            {previewTaskId && inputMode === 'text' && genStatus === 'succeeded' && (
              <Tooltip text="PBR textúra refine fázis" side="top">
                <button onClick={handleRefine} disabled={refining} style={{
                  marginTop: 6, width: '100%', padding: '8px 0', borderRadius: 11, fontSize: 11, fontWeight: 700,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  cursor: refining ? 'not-allowed' : 'pointer', border: 'none',
                  background: refining ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${color},#8b5cf6)`,
                  opacity: refining ? 0.5 : 1,
                }}>
                  {refining
                    ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Refine…</>
                    : <><RefreshCw style={{ width: 12, height: 12 }} /> Refine (PBR Textúra)</>}
                </button>
              </Tooltip>
            )}
          </div>
        </aside>

        {/* ════ CENTER — 3D VIEWER ════ */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Top toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 14px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,8,20,0.3)',
          }}>
            {/* View mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 4 }}>NÉZET</span>
              {[
                { id: 'solid', label: 'Solid' }, { id: 'wireframe', label: 'Wire' },
                { id: 'clay', label: 'Clay' }, { id: 'normal', label: 'Normal' }, { id: 'uv', label: 'UV' },
              ].map((v) => (
                <Tooltip key={v.id} text={v.label} side="bottom">
                  <button onClick={() => setViewMode(v.id)} style={{
                    padding: '3px 8px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    border: 'none', transition: 'all 0.15s',
                    background: viewMode === v.id ? `${color}28` : 'rgba(255,255,255,0.04)',
                    color: viewMode === v.id ? color : '#6b7280',
                    outline: viewMode === v.id ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                  }}>{v.label}</button>
                </Tooltip>
              ))}
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* UV layers (when in UV mode) */}
              {viewMode === 'uv' && (
                <>
                  <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 2 }}>LAYER</span>
                  {Object.entries(UV_LAYER_LABELS).map(([layer, lbl]) => (
                    <Tooltip key={layer} text={lbl} side="bottom">
                      <button onClick={() => setUvLayer(layer)} style={{
                        padding: '3px 7px', borderRadius: 7, fontSize: 9, fontWeight: 700, cursor: 'pointer',
                        border: 'none', transition: 'all 0.15s',
                        background: uvLayer === layer ? `${color}28` : 'rgba(255,255,255,0.04)',
                        color: uvLayer === layer ? color : '#6b7280',
                        outline: uvLayer === layer ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                      }}>{lbl.split(' ')[0]}</button>
                    </Tooltip>
                  ))}
                  <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
                </>
              )}

              {/* ── NEW: Lighting Controls with strength/rotation/auto-rotate ── */}
              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 2 }}>FÉNY</span>
              <LightingControls
                lightMode={lightMode} setLightMode={setLightMode}
                lightStrength={lightStrength} setLightStrength={setLightStrength}
                lightRotation={lightRotation} setLightRotation={setLightRotation}
                lightAutoRotate={lightAutoRotate} setLightAutoRotate={setLightAutoRotate}
                lightAutoRotateSpeed={lightAutoRotateSpeed} setLightAutoRotateSpeed={setLightAutoRotateSpeed}
                color={color}
              />

              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
              <IconBtn icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" /></svg>} tip={showGrid ? 'Rács elrejtése' : 'Rács megjelenítése'} active={showGrid} color={color} onClick={() => setShowGrid((v) => !v)} />
              <IconBtn icon={<ChevronRight />} tip={rightOpen ? 'Előzmények bezárása' : 'Előzmények megnyitása'} active={rightOpen} color={color} onClick={() => setRightOpen((v) => !v)} />
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8,
              pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
            }}>
              <RotateCcw style={{ width: 10, height: 10 }} /> Húzd = forgat · Shift+drag = pan · Scroll = zoom
            </div>

            <ThreeViewer
              color={color} viewMode={viewMode} lightMode={lightMode}
              showGrid={showGrid} modelUrl={modelUrl}
              lightStrength={lightStrength}
              lightRotation={lightRotation}
              lightAutoRotate={lightAutoRotate}
              lightAutoRotateSpeed={lightAutoRotateSpeed}
              onReady={(s) => { sceneRef.current = s; s.autoSpin = autoSpin; }}
            />

            {isRunning && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(6,6,18,0.8)', backdropFilter: 'blur(8px)', pointerEvents: 'none',
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 20, marginBottom: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${color}18`, border: `1px solid ${color}45`,
                }}>
                  <Box style={{ width: 28, height: 28, color }} className="animate-pulse" />
                </div>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>3D modell generálása…</p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 16px' }}>
                  {genStatus === 'pending' ? 'Feldolgozás sorban áll…' : `Meshy AI dolgozik… ${progress}%`}
                </p>
                <div style={{ width: 192, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${progress}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 14px', flexShrink: 0,
            borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,8,20,0.3)',
          }}>
            {/* Camera controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 3 }}>KAMERA</span>
              <IconBtn icon={<RotateCcw />} tip="Kamera visszaállítása" onClick={() => camPreset('reset')} />
              <IconBtn icon={<Camera />} tip="Elölnézet" onClick={() => camPreset('front')} />
              <IconBtn icon={<Move3d />} tip="Oldalnézet" onClick={() => camPreset('side')} />
              <IconBtn icon={<Layers />} tip="Felülnézet" onClick={() => camPreset('top')} />
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 3px' }} />
              <Tooltip text={autoSpin ? 'Auto-spin leállítása' : 'Auto-spin indítása'} side="top">
                <button onClick={toggleAutoSpin} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 7,
                  fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: autoSpin ? `${color}28` : 'rgba(255,255,255,0.04)',
                  color: autoSpin ? color : '#6b7280',
                  outline: autoSpin ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                }}>
                  {autoSpin ? <Square style={{ width: 9, height: 9 }} /> : <Play style={{ width: 9, height: 9 }} />}
                  Auto-spin
                </button>
              </Tooltip>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[
                { label: 'Remesh', icon: <Settings style={{ width: 11, height: 11 }} />, onClick: () => setShowRemesh(true) },
                { label: 'Edit Texture', icon: <Paintbrush2 style={{ width: 11, height: 11 }} />, onClick: () => setShowEditTexture(true) },
                { label: 'Animate', icon: <PersonStanding style={{ width: 11, height: 11 }} />, onClick: () => setShowAnimate(true) },
              ].map((btn) => (
                <button key={btn.label} onClick={btn.onClick} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 10,
                  fontSize: 11, fontWeight: 700, color: '#d1d5db',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                >
                  {btn.icon} {btn.label}
                </button>
              ))}

              <Tooltip text="Letöltési beállítások" side="top">
                <button onClick={() => setShowDownload(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 10,
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: `linear-gradient(90deg,${color}cc,${color})`,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: `0 3px 12px ${color}44`,
                }}>
                  <Download style={{ width: 11, height: 11 }} /> Download
                </button>
              </Tooltip>
            </div>
          </div>
        </main>

        {/* ════ RIGHT PANEL — History ════ */}
        {rightOpen && (
          <aside style={{
            width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,20,0.5)',
          }}>
            <div style={{ padding: '12px 10px 8px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock style={{ width: 12, height: 12, color }} /> Előzmények
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: `${color}18`, color }}>{history.length}</span>
              </p>
              <input placeholder="Keresés…" value={histSearch} onChange={(e) => setHistSearch(e.target.value)}
                style={{
                  width: '100%', padding: '5px 9px', borderRadius: 8, fontSize: 11, color: '#e5e7eb',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
                onFocus={(e) => { e.target.style.borderColor = `${color}55`; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'thin' }}>
              {filteredHistory.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, textAlign: 'center' }}>
                  <Box style={{ width: 26, height: 26, color: '#1f2937', marginBottom: 8 }} />
                  <p style={{ color: '#2d3748', fontSize: 11 }}>{histSearch ? 'Nincs találat' : 'Még nincs generálás'}</p>
                </div>
              )}
              {filteredHistory.map((item) => (
                <HistoryCard key={item.id} item={item} isActive={activeItem?.id === item.id}
                  onSelect={handleSelectHistory} color={color} />
              ))}
            </div>

            {history.length > 0 && (
              <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <Tooltip text="Összes előzmény törlése" side="top">
                  <button onClick={() => {
                    if (window.confirm('Törlöd az összes előzményt?')) { setHistory([]); setActiveItem(null); }
                  }} style={{
                    width: '100%', padding: 5, borderRadius: 8, fontSize: 10, fontWeight: 600,
                    color: '#4b5563', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.28)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >
                    <Trash2 style={{ width: 10, height: 10 }} /> Előzmények törlése
                  </button>
                </Tooltip>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ════ MODALS ════ */}
      {showDownload && <DownloadModal onClose={() => setShowDownload(false)} activeItem={activeItem} color={color} />}
      {showEditTexture && <EditTextureModal onClose={() => setShowEditTexture(false)} color={color} uvLayer={uvLayer} setUvLayer={setUvLayer} />}
      {showRemesh && <RemeshModal onClose={() => setShowRemesh(false)} color={color} params={params} setParam={setParam} />}
      {showAnimate && <AnimateModal onClose={() => setShowAnimate(false)} color={color} modelUrl={modelUrl} />}
    </>
  );
}