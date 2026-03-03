// trellis/TripoPanel.jsx — Tripo Studio pixel-perfect redesign
import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from "react";
import {
  Download, Loader2, AlertCircle, Trash2, RotateCcw,
  Camera, Move3d, Layers, Play, Square, Clock,
  ChevronRight, ChevronLeft, Box, Zap, ChevronDown,
  ChevronUp, Check, X, Upload, Info, Sparkles,
  Grid3x3, Scissors, Cpu, PaintBucket, ZoomIn, Boxes,
  PersonStanding, Search, Music2, Plus, Pause, Globe,
  Lock, HelpCircle, Image, Pencil, Wand2, Circle,
  ArrowUpCircle,
} from "lucide-react";

import ThreeViewer         from "../meshy/viewer/ThreeViewer";
import { setCameraPreset } from "../meshy/viewer/threeHelpers";
import { IconBtn, Tooltip } from "../meshy/ui/Primitives";
import LightingControls    from "../meshy/viewer/LightingControls";
import {
  VIEW_MODES, SectionLabel, WireframeControl, BgColorPicker, HistoryCard,
} from "../trellis/.";
import ConfirmModal  from "../trellis/ConfirmModal";
import DownloadModal from "../trellis/DownloadModal";
import { saveHistoryToFirestore, loadHistoryPageFromFirestore } from "../trellis/utils";
import { ANIMATION_LIBRARY, ANIM_CATEGORIES, getAnimById } from "./animationlibrary";

const PAGE_SIZE = 10;
const BASE_URL  = import.meta.env.VITE_API_URL || "http://localhost:3001";
const POLL_MS   = 2500;
const POLL_MAX  = 120;

const MODEL_VERSIONS = [
  { id: "v2.5-20250123",  label: "v3.1 – Best Quality", badge: "new", warn: "Expect longer wait times" },
  { id: "v2.0-20240919",  label: "v2.5 – Balanced",     badge: null,  warn: null },
  { id: "turbo-v1.0",     label: "Turbo – Fast",         badge: null,  warn: null },
];

const ANIM_MODEL_VERSIONS = [
  { id: "v2.5-animals",  label: "v2.5 – Good for Animals", icon: "🐾" },
  { id: "v2.0-human",    label: "v2.0 – Humanoid",         icon: "🚶" },
];

const TEXTURE_QUALITY = [
  { id: "standard", label: "Standard" },
  { id: "detailed", label: "Detailed" },
  { id: "hd",       label: "HD" },
];

// Nav items — Edit/Upscale/PBR are now top-level nav modes
const NAV = [
  { id: "generate",        label: "Model",   icon: Sparkles,       sub: false },
  { id: "segment",         label: "Segment", icon: Scissors,       sub: true  },
  { id: "retopo",          label: "Retopo",  icon: Grid3x3,        sub: false },
  { id: "texture",         label: "Texture", icon: PaintBucket,    sub: true  },
  { id: "texture_edit",    label: "Edit",    icon: Wand2,          sub: false },
  { id: "texture_upscale", label: "Upscale", icon: ArrowUpCircle,  sub: false },
  { id: "texture_pbr",     label: "PBR",     icon: Circle,         sub: false },
  { id: "animate",         label: "Animate", icon: PersonStanding, sub: false },
];

const SEGMENT_SUBS  = [
  { id: "segment",    label: "Segment"    },
  { id: "fill_parts", label: "Fill Parts" },
];

// Texture input tabs (inside the bordered box)
const TEX_INPUT_TABS = [
  { id: "image",  icon: Image,   tip: "Image"      },
  { id: "multi",  icon: Cpu,     tip: "Multi-view" },
  { id: "text",   icon: Pencil,  tip: "Text"       },
];

const GEN_TABS = [
  { id: "image", icon: Image,   tip: "Image to 3D" },
  { id: "multi", icon: Boxes,   tip: "Multi-view"  },
  { id: "sketch",icon: Grid3x3, tip: "Sketch"      },
  { id: "text",  icon: Pencil,  tip: "Text to 3D"  },
];

const MODE_COST = {
  generate: 40, segment: 40, fill_parts: 40, retopo: 10,
  texture: 35, texture_edit: 35, texture_upscale: 35, texture_pbr: 35,
  animate: 20,
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:none } }
  .anim-spin { animation: spin 1s linear infinite; }
  .fade-up   { animation: fadeUp 0.18s ease forwards; }
  .tp-scroll { scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.06) transparent; }
  .tp-scroll::-webkit-scrollbar { width:3px; }
  .tp-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px; }

  .tp-nav-btn { display:flex;flex-direction:column;align-items:center;gap:5px;width:100%;padding:10px 0;background:none;border:none;cursor:pointer;position:relative;transition:all 0.14s; }
  .tp-nav-btn .ico { width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;transition:all 0.14s; }
  .tp-nav-btn:hover .ico { background:rgba(255,255,255,0.06); }
  .tp-nav-btn.active .ico { background:rgba(108,99,255,0.18); }
  .tp-nav-btn .lbl { font-size:10px;font-weight:600;letter-spacing:0.01em;transition:color 0.14s; }
  .tp-nav-btn.active .lbl { color:#a5a0ff; }
  .tp-nav-btn:not(.active) .lbl { color:#2d2d48; }
  .tp-nav-btn:not(.active):hover .lbl { color:#5a5a7a; }
  .tp-nav-btn.active::before { content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:24px;background:linear-gradient(180deg,#8b5cf6,#6c63ff);border-radius:0 3px 3px 0; }

  .tp-switch { width:36px;height:20px;border-radius:10px;position:relative;transition:background 0.2s;flex-shrink:0;cursor:pointer; }
  .tp-switch::after { content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.4); }
  .tp-switch.on::after { transform:translateX(16px); }

  .tp-input { width:100%;padding:8px 11px;border-radius:9px;font-size:12px;color:#e4e4f0;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);outline:none;font-family:inherit;transition:border-color 0.14s;box-sizing:border-box; }
  .tp-input:focus { border-color:rgba(108,99,255,0.5); }
  .tp-input::placeholder { color:#22223a; }

  .tp-ta { width:100%;padding:10px 12px;border-radius:10px;font-size:12px;color:#e4e4f0;background:transparent;border:none;outline:none;font-family:inherit;resize:none;line-height:1.6;box-sizing:border-box; }
  .tp-ta::placeholder { color:#3a3a5a; }

  .tp-drop:hover { border-color:rgba(108,99,255,0.4) !important; }
  .tp-sub-tab { padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;border:none;transition:all 0.13s;font-family:inherit; }
  .tp-sub-tab.on { background:rgba(108,99,255,0.2);color:#a5a0ff; }
  .tp-sub-tab:not(.on) { background:transparent;color:#2d2d48; }
  .tp-sub-tab:not(.on):hover { color:#5a5a7a;background:rgba(255,255,255,0.04); }

  .tp-inp-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.13s;font-family:inherit; }

  .tp-qual-btn { flex:1;padding:9px 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all 0.14s;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit; }

  .tp-gen-btn { width:100%;padding:14px 0;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.01em;transition:all 0.2s;font-family:inherit; }
  .tp-gen-btn.go { background:linear-gradient(135deg,#f5c518,#e6a400);color:#0a0800;box-shadow:0 4px 24px rgba(245,197,24,0.3); }
  .tp-gen-btn.go:hover { box-shadow:0 6px 32px rgba(245,197,24,0.42);transform:translateY(-1px); }
  .tp-gen-btn.no { background:rgba(255,255,255,0.05);color:#2d2d48;cursor:not-allowed; }

  .tp-model-card { padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.13s;margin-bottom:5px; }
  .tp-model-card.sel { background:rgba(108,99,255,0.08);border-color:rgba(108,99,255,0.3); }
  .tp-model-card:hover:not(.sel) { background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.13); }

  .tp-handle { width:4px;flex-shrink:0;cursor:col-resize;position:relative;z-index:10; }
  .tp-handle::after { content:'';position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:1px;background:rgba(255,255,255,0.04);transition:all 0.14s; }
  .tp-handle:hover::after { background:rgba(255,255,255,0.14);width:2px; }
  .tp-hbtn { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:28px;border-radius:99px;border:1px solid rgba(255,255,255,0.09);background:#0c0c18;display:flex;align-items:center;justify-content:center;opacity:0;cursor:pointer;transition:opacity 0.14s; }
  .tp-handle:hover .tp-hbtn { opacity:1; }

  .checker { background-color:#131326;background-image:linear-gradient(45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,0.025) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,0.025) 75%);background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0; }

  .anim-card { border-radius:10px;overflow:hidden;cursor:pointer;transition:all 0.13s; }
  .anim-card:hover { border-color:rgba(255,255,255,0.22) !important; transform:scale(1.02); }
  .anim-card:hover .anim-ov { opacity:1 !important; }

  .sec-row { display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:10px 0;user-select:none; }
  .sec-row span { transition:color 0.13s; }
  .sec-row:hover span { color:#8a8aaa !important; }

  .tp-topo-btn { flex:1;padding:8px 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all 0.14s;font-family:inherit; }
  .tp-topo-btn.sel { background:rgba(108,99,255,0.2);color:#a5a0ff;outline:1.5px solid rgba(108,99,255,0.4); }
  .tp-topo-btn:not(.sel) { background:rgba(255,255,255,0.04);color:#3d3d5a;outline:1.5px solid rgba(255,255,255,0.07); }
  .tp-topo-btn:not(.sel):hover { background:rgba(255,255,255,0.07);color:#6a6a8a; }

  .tex-input-box { border:1.5px solid rgba(108,99,255,0.35);border-radius:12px;overflow:hidden;background:rgba(108,99,255,0.04);margin-bottom:14px; }
  .tex-tab-bar { display:flex;background:rgba(255,255,255,0.04);padding:4px;gap:3px; }
  .tex-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.14s;font-family:inherit; }
  .tex-tab.on { background:rgba(255,255,255,0.14);box-shadow:0 1px 4px rgba(0,0,0,0.3); }

  .mv-grid { display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px; }
  .mv-cell { border-radius:8px;aspect-ratio:1/1;border:1.5px dashed rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:border-color 0.13s; }
  .mv-cell:hover { border-color:rgba(108,99,255,0.4); }

  .magic-mode-tab { flex:1;padding:8px 0;border:none;cursor:pointer;font-size:12px;font-weight:600;border-radius:8px;transition:all 0.14s;font-family:inherit; }
  .magic-mode-tab.on { background:#fff;color:#0a0a1a;box-shadow:0 1px 6px rgba(0,0,0,0.3); }
  .magic-mode-tab:not(.on) { background:transparent;color:#5a5a7a; }

  .anim-model-dd { width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);cursor:pointer;display:flex;align-items:center;gap:8px;transition:border-color 0.13s; }
  .anim-model-dd:hover { border-color:rgba(108,99,255,0.4); }

  .auto-rig-btn { width:100%;padding:12px 0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;transition:all 0.2s; }
  .auto-rig-btn.ready { background:rgba(255,255,255,0.08);color:#c8c8e0; }
  .auto-rig-btn.ready:hover { background:rgba(255,255,255,0.12); }
  .auto-rig-btn.disabled { background:rgba(255,255,255,0.04);color:#1e1e38;cursor:not-allowed; }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function CoinIcon({ size = 15 }) {
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:"linear-gradient(135deg,#f5c518,#e09900)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
      <Zap style={{ width:size*0.56,height:size*0.56,color:"#0a0800" }} />
    </div>
  );
}

function Toggle({ label, value, onChange, hint=false, premium=false }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",cursor:"pointer" }} onClick={()=>onChange(!value)}>
      <div style={{ display:"flex",alignItems:"center",gap:7 }}>
        {premium && <CoinIcon />}
        <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>{label}</span>
        {hint && <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }} />}
      </div>
      <div className={`tp-switch${value?" on":""}`} style={{ background:value?"#4c8ef7":"rgba(255,255,255,0.12)" }} />
    </div>
  );
}

function Collapsible({ label, children, open: controlledOpen, border=true, extra }) {
  const [open, setOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  return (
    <div>
      <div className="sec-row" onClick={()=>setOpen(v=>!v)}
        style={{ borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom: border&&isOpen ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
        <span style={{ color:"#4a4a68",fontSize:13,fontWeight:500 }}>{label}</span>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {extra}
          {isOpen ? <ChevronUp style={{ width:14,height:14,color:"#2d2d48" }}/> : <ChevronDown style={{ width:14,height:14,color:"#2d2d48" }}/>}
        </div>
      </div>
      {isOpen && <div style={{ padding:"10px 0 2px",animation:"fadeUp 0.15s ease" }}>{children}</div>}
    </div>
  );
}

function TID({ value, onChange, placeholder, history, color }) {
  const [open, setOpen] = useState(false);
  const f = history?.filter(i=>i.taskId||i.id)??[];
  return (
    <div style={{ position:"relative" }}>
      <div style={{ display:"flex",gap:4 }}>
        <input className="tp-input" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"task_id…"}/>
        {f.length>0 && <button onClick={()=>setOpen(v=>!v)} style={{ width:34,flexShrink:0,borderRadius:9,border:"1px solid rgba(255,255,255,0.09)",background:open?"rgba(108,99,255,0.12)":"rgba(255,255,255,0.04)",color:open?"#a5a0ff":"#2d2d48",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><ChevronDown style={{ width:11,height:11 }}/></button>}
      </div>
      {open && f.length>0 && (
        <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:80,background:"#0f0f1e",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,maxHeight:160,overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.6)" }} className="tp-scroll">
          {f.map(item=>(
            <div key={item.id} onClick={()=>{onChange(item.taskId??item.id);setOpen(false);}}
              style={{ padding:"7px 11px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <p style={{ color:"#c8c8e0",fontSize:11,fontWeight:600,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.prompt?.slice(0,50)||item.id}</p>
              <p style={{ color:"#1e1e38",fontSize:9,margin:"2px 0 0",fontFamily:"monospace" }}>{item.taskId??item.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PBar({ value }) {
  return (
    <div style={{ width:"100%",height:3,borderRadius:99,background:"rgba(255,255,255,0.07)" }}>
      <div style={{ width:`${value}%`,height:"100%",background:"linear-gradient(90deg,#6c63ff99,#6c63ff)",borderRadius:99,transition:"width 0.4s ease" }}/>
    </div>
  );
}

// Texture input box — image/multi/text tabs in bordered box
function TexInputBox({ tab, setTab, texPrompt, setTexPrompt, imgFile, imgPrev, imgToken, imgUploading, handleImg, fileRef, multiImages, setMultiImages }) {
  const VIEW_SLOTS = ["Front","Left","Right","Back"];
  return (
    <div className="tex-input-box">
      {/* Tab bar */}
      <div className="tex-tab-bar">
        {TEX_INPUT_TABS.map(t=>(
          <button key={t.id} className={`tex-tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}
            style={{ color:tab===t.id?"#e8e8f4":"#2d2d48" }}>
            <t.icon style={{ width:15,height:15 }}/>
          </button>
        ))}
      </div>

      {/* Single image upload */}
      {tab==="image" && (
        <div className="tp-drop checker" onClick={()=>!imgUploading&&fileRef.current?.click()}
          onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleImg(f);}}
          style={{ width:"100%",aspectRatio:"1/1",cursor:imgUploading?"wait":"pointer",position:"relative",display:"flex",alignItems:"center",justifyContent:"center" }}>
          {imgPrev ? (
            <>
              <img src={imgPrev} alt="preview" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
              {imgUploading && <div style={{ position:"absolute",inset:0,background:"rgba(9,9,18,0.75)",display:"flex",alignItems:"center",justifyContent:"center" }}><Loader2 style={{ width:24,height:24,color:"#6c63ff" }} className="anim-spin"/></div>}
              {imgToken && <div style={{ position:"absolute",bottom:8,right:8,width:22,height:22,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center" }}><Check style={{ width:12,height:12,color:"#fff" }}/></div>}
              <button onClick={e=>{e.stopPropagation();/* clear */}} style={{ position:"absolute",top:8,right:8,width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,0.65)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff" }}><X style={{ width:11,height:11 }}/></button>
            </>
          ) : (
            <div style={{ textAlign:"center",pointerEvents:"none",padding:20 }}>
              <div style={{ width:42,height:42,borderRadius:12,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 9px" }}>
                <Image style={{ width:18,height:18,color:"#2d2d48" }}/>
              </div>
              <p style={{ color:"#c8c8e0",fontSize:13,fontWeight:600,margin:"0 0 4px" }}>Upload</p>
              <p style={{ color:"#2d2d48",fontSize:10,margin:0 }}>JPG, PNG, WEBP  Size ≤ 20MB</p>
            </div>
          )}
        </div>
      )}

      {/* Multi-view 2x2 */}
      {tab==="multi" && (
        <div className="mv-grid">
          {VIEW_SLOTS.map((slot,i)=>{
            const prev = multiImages?.[i]?.preview;
            return (
              <div key={slot} className="mv-cell checker"
                onClick={()=>{const inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.onchange=e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{const next=[...(multiImages||[])];next[i]={file:f,preview:ev.target.result};setMultiImages(next);};r.readAsDataURL(f);}};inp.click();}}>
                {prev ? (
                  <img src={prev} alt={slot} style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:6 }}/>
                ) : (
                  <>
                    <PersonStanding style={{ width:20,height:20,color:"#2d2d48" }}/>
                    <span style={{ color:"#2d2d48",fontSize:10,fontWeight:500 }}>{slot}</span>
                    <span style={{ color:"#1a1a30",fontSize:9 }}>JPG,PNG,WEBP, Size≤20MB</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Text prompt */}
      {tab==="text" && (
        <div style={{ position:"relative",padding:"4px 0 0" }}>
          <textarea className="tp-ta" value={texPrompt} onChange={e=>setTexPrompt(e.target.value.slice(0,1000))}
            placeholder="Describe the texture you want to generate on this model" rows={7}
            style={{ minHeight:160 }}/>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 12px 10px" }}>
            <button style={{ width:26,height:26,borderRadius:8,background:"rgba(255,255,255,0.06)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Zap style={{ width:13,height:13,color:"#f5c518" }}/>
            </button>
            <span style={{ color:"#2d2d48",fontSize:10,fontFamily:"monospace" }}>{texPrompt.length}/1000</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Texture Style selector row
function TextureStyleSelector() {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
        <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>Create Your Own Texture Style</span>
        <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }}/>
      </div>
      <button style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",cursor:"pointer",fontFamily:"inherit" }}>
        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
          <div style={{ width:28,height:28,borderRadius:7,background:"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#4a4a68",fontSize:9,fontWeight:700 }}>N/A</span>
          </div>
          <span style={{ color:"#8a8aaa",fontSize:13,fontWeight:500 }}>None</span>
        </div>
        <ChevronRight style={{ width:14,height:14,color:"#2d2d48" }}/>
      </button>
    </div>
  );
}

// Magic Brush panel (texture_edit)
function MagicBrushPanel({ brushPrompt, setBrushPrompt, creativity, setCreativity, brushMode, setBrushMode, brushColor, setBrushColor }) {
  const handleHex = (e) => {
    const hex = e.target.value.replace(/[^0-9a-fA-F]/g,"").slice(0,6);
    setBrushColor("#"+hex);
  };
  return (
    <div>
      {/* Mode tabs */}
      <div style={{ display:"flex",gap:3,padding:"3px",background:"rgba(255,255,255,0.06)",borderRadius:11,marginBottom:16 }}>
        {["Gen Mode","Paint Mode"].map(m=>(
          <button key={m} className={`magic-mode-tab${brushMode===m?" on":""}`} onClick={()=>setBrushMode(m)}>
            {m}
          </button>
        ))}
      </div>

      {brushMode==="Gen Mode" && (
        <>
          <div style={{ borderRadius:12,border:"1px solid rgba(255,255,255,0.09)",background:"rgba(255,255,255,0.03)",marginBottom:16,overflow:"hidden" }}>
            <textarea className="tp-ta" value={brushPrompt} onChange={e=>setBrushPrompt(e.target.value.slice(0,1000))}
              placeholder="Describe the new texture from the current view" rows={7}
              style={{ minHeight:140,padding:"12px 12px 4px" }}/>
            <div style={{ display:"flex",justifyContent:"flex-end",padding:"0 12px 10px" }}>
              <span style={{ color:"#2d2d48",fontSize:10,fontFamily:"monospace" }}>{brushPrompt.length}/1000</span>
            </div>
          </div>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:10 }}>
              <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>Creativity Strength</span>
              <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }}/>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <input type="range" min={0} max={1} step={0.01} value={creativity} onChange={e=>setCreativity(Number(e.target.value))}
                style={{ flex:1,accentColor:"#6c63ff" }}/>
              <div style={{ width:52,padding:"5px 8px",borderRadius:8,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.05)",textAlign:"center" }}>
                <span style={{ color:"#c8c8e0",fontSize:12,fontFamily:"monospace" }}>{creativity.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {brushMode==="Paint Mode" && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {/* Color gradient picker */}
          <div style={{ borderRadius:12,overflow:"hidden",background:`linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${brushColor})`,height:180,cursor:"crosshair",position:"relative" }}>
            <div style={{ position:"absolute",inset:0,background:`linear-gradient(to right, #fff, ${brushColor})` }}/>
            <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom, transparent, #000)" }}/>
          </div>
          {/* Hue slider */}
          <div style={{ height:14,borderRadius:7,background:"linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",cursor:"pointer",position:"relative" }}>
            <div style={{ position:"absolute",top:-2,left:`${(parseInt(brushColor.slice(1),16)%360/360*100)||0}%`,width:18,height:18,borderRadius:"50%",background:"#fff",border:"2px solid rgba(0,0,0,0.3)",transform:"translateX(-50%)",boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }}/>
          </div>
          {/* Opacity row */}
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:brushColor,border:"2px solid rgba(255,255,255,0.15)",flexShrink:0 }}/>
            <input value={brushColor.replace("#","").toUpperCase()} onChange={handleHex}
              style={{ flex:1,padding:"7px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.06)",color:"#e4e4f0",fontSize:12,fontFamily:"monospace",outline:"none",textAlign:"center" }}/>
          </div>
        </div>
      )}
    </div>
  );
}

// Topology + Polycount shared control
function TopoControls({ quad, setQuad, smartLowPoly, setSmartLowPoly, polycount, setPolycount }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>Topology</span>
          <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }}/>
        </div>
      </div>
      <div style={{ display:"flex",gap:6,marginBottom:10 }}>
        <button className={`tp-topo-btn${quad?" sel":""}`} onClick={()=>setQuad(true)}>Quad</button>
        <button className={`tp-topo-btn${!quad?" sel":""}`} onClick={()=>setQuad(false)}>Triangle</button>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",cursor:"pointer" }} onClick={()=>setSmartLowPoly(v=>!v)}>
        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
          <CoinIcon/>
          <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>Smart Low Poly</span>
          <span style={{ background:"linear-gradient(135deg,#c026d3,#a21caf)",color:"#fff",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:4 }}>v2</span>
          <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }}/>
        </div>
        <div className={`tp-switch${smartLowPoly?" on":""}`} style={{ background:smartLowPoly?"#4c8ef7":"rgba(255,255,255,0.12)" }}/>
      </div>
      <div style={{ marginTop:4 }}>
        <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>Polygon Count</span>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:8 }}>
          <input type="range" min={0} max={200000} step={1000} value={polycount}
            onChange={e=>setPolycount(Number(e.target.value))}
            style={{ flex:1,accentColor:"#6c63ff" }}/>
          <button onClick={()=>setPolycount(0)}
            style={{ padding:"4px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",border:"1px solid rgba(255,255,255,0.12)",background:polycount===0?"rgba(108,99,255,0.15)":"rgba(255,255,255,0.05)",color:polycount===0?"#a5a0ff":"#8a8aaa",fontFamily:"inherit",flexShrink:0 }}>
            Auto
          </button>
        </div>
      </div>
    </div>
  );
}

function AnimCard({ anim, isSelected, onSelect }) {
  const [err, setErr] = useState(false);
  return (
    <div className="anim-card" onClick={onSelect}
      style={{ border:`1px solid ${isSelected?"rgba(108,99,255,0.5)":"rgba(255,255,255,0.07)"}`, background:isSelected?"rgba(108,99,255,0.08)":"#111122" }}>
      <div style={{ aspectRatio:"1/1",display:"flex",alignItems:"center",justifyContent:"center",background:"#111122",position:"relative",overflow:"hidden" }}>
        {!err
          ? <img src={anim.gif} alt={anim.label} onError={()=>setErr(true)} style={{ width:"100%",height:"100%",objectFit:"contain" }}/>
          : <PersonStanding style={{ width:28,height:28,color:"#2a2a44" }}/>}
        {isSelected && <div style={{ position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:"#6c63ff",display:"flex",alignItems:"center",justifyContent:"center" }}><Check style={{ width:9,height:9,color:"#fff" }}/></div>}
      </div>
      <div style={{ padding:"5px 7px 6px",background:"#0d0d1a" }}>
        <span style={{ color:"#9090b8",fontSize:9,fontWeight:600,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{anim.label}</span>
      </div>
    </div>
  );
}

const LBL9 = { color:"#3a3a58",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 6px",fontFamily:"monospace",display:"block" };

// ════════════════════════════════════════════════════════════════════════════
export default function TripoPanel({ selectedModel, getIdToken, userId }) {
  const color = selectedModel?.color || "#6c63ff";

  const [mode,       setMode]       = useState("generate");
  const [segSub,     setSegSub]     = useState("segment");
  const [genTab,     setGenTab]     = useState("image");
  const [texInputTab,setTexInputTab]= useState("image");
  const [modelExp,   setModelExp]   = useState(false);
  const [modelVer,   setModelVer]   = useState("v2.5-20250123");

  // Generate
  const [prompt,     setPrompt]     = useState("");
  const [negPrompt,  setNegPrompt]  = useState("");
  const [texOn,      setTexOn]      = useState(true);
  const [pbrOn,      setPbrOn]      = useState(false);
  const [tex4K,      setTex4K]      = useState(true);
  const [texQ,       setTexQ]       = useState("detailed");
  const [faceLimit,  setFaceLimit]  = useState(0);
  const [inParts,    setInParts]    = useState(false);
  const [privacy,    setPrivacy]    = useState("public");
  const [meshQ,      setMeshQ]      = useState("standard");
  const [makeBetter, setMakeBetter] = useState(true);
  const [imgFile,    setImgFile]    = useState(null);
  const [imgPrev,    setImgPrev]    = useState(null);
  const [imgToken,   setImgToken]   = useState(null);
  const [imgUploading,setImgUploading]=useState(false);

  // Shared topology
  const [quadMesh,     setQuadMesh]     = useState(true);
  const [smartLowPoly, setSmartLowPoly] = useState(false);
  const [polycount,    setPolycount]    = useState(0);

  // Segment/fill
  const [segId,      setSegId]      = useState("");
  const [fillId,     setFillId]     = useState("");

  // Retopo
  const [retopoId,   setRetopoId]   = useState("");

  // Texture
  const [texPrompt,  setTexPrompt]  = useState("");
  const [texNeg,     setTexNeg]     = useState("");
  const [texQ2,      setTexQ2]      = useState("detailed");
  const [texId,      setTexId]      = useState("");
  const [multiImages,setMultiImages]= useState([]);

  // Texture Edit — Magic Brush
  const [brushMode,    setBrushMode]    = useState("Gen Mode");
  const [brushPrompt,  setBrushPrompt]  = useState("");
  const [creativity,   setCreativity]   = useState(0.6);
  const [brushColor,   setBrushColor]   = useState("#ffffff");
  const [editId,       setEditId]       = useState("");

  // Upscale
  const [upId,       setUpId]       = useState("");

  // PBR
  const [pbrId,      setPbrId]      = useState("");

  // Animate
  const [animId,      setAnimId]      = useState("");
  const [animModelVer,setAnimModelVer]= useState("v2.5-animals");
  const [animModelDD, setAnimModelDD] = useState(false);
  const [animSearch,  setAnimSearch]  = useState("");
  const [animCat,     setAnimCat]     = useState("all");
  const [selAnim,     setSelAnim]     = useState(null);
  const [rigStep,     setRigStep]     = useState("idle"); // idle | rigging | rigged
  const [riggedId,    setRiggedId]    = useState(null);

  // Gen state
  const [genStatus, setGenStatus] = useState("idle");
  const [progress,  setProgress]  = useState(0);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [modelUrl,  setModelUrl]  = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  // Viewer
  const [viewMode,   setViewMode]  = useState("clay");
  const [lightMode,  setLightMode] = useState("studio");
  const [showGrid,   setShowGrid]  = useState(true);
  const [autoSpin,   setAutoSpin]  = useState(true);
  const [bgColor,    setBgColor]   = useState("default");
  const [wireOv,     setWireOv]    = useState(false);
  const [wireOp,     setWireOp]    = useState(0.22);
  const [wireC,      setWireC]     = useState("#ffffff");
  const [lStr,       setLStr]      = useState(1.0);
  const [lRot,       setLRot]      = useState(0);
  const [lAutoR,     setLAutoR]    = useState(false);
  const [lAutoS,     setLAutoS]    = useState(0.5);
  const [dramC,      setDramC]     = useState("#4400ff");
  const [gc1,        setGc1]       = useState("#1e1e3a");
  const [gc2,        setGc2]       = useState("#111128");
  const [dlOpen,     setDlOpen]    = useState(false);
  const [dlItem,     setDlItem]    = useState(null);

  // Layout
  const [leftOpen,  setLeftOpen]  = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftW,     setLeftW]     = useState(302);
  const [rightW,    setRightW]    = useState(220);

  // History
  const [history,   setHistory]   = useState([]);
  const [histLoad,  setHistLoad]  = useState(false);
  const [moreLoad,  setMoreLoad]  = useState(false);
  const [hasMore,   setHasMore]   = useState(false);
  const [histQ,     setHistQ]     = useState("");
  const [activeH,   setActiveH]   = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [delModal,  setDelModal]  = useState(false);
  const [clrModal,  setClrModal]  = useState(false);
  const [toDel,     setToDel]     = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  const histInit  = useRef(false);
  const lastDocR  = useRef(null);
  const histAbort = useRef(null);
  const sceneRef  = useRef(null);
  const pollAb    = useRef(null);
  const prevUrl   = useRef(null);
  const dragRef   = useRef(null);
  const fileRef   = useRef(null);

  const wireHex   = useMemo(()=>parseInt(wireC.replace("#",""),16),[wireC]);
  const isRunning = genStatus==="pending";
  const activeTaskId = activeH?.taskId ?? activeH?.id ?? "";

  const filtAnims = useMemo(()=>ANIMATION_LIBRARY.filter(a=>{
    const mc=animCat==="all"||a.category===animCat;
    const ms=!animSearch||a.label.toLowerCase().includes(animSearch.toLowerCase());
    return mc&&ms;
  }),[animSearch,animCat]);

  const canGen = useMemo(()=>{
    if(isRunning) return false;
    switch(mode){
      case "generate":        return genTab==="text"?!!prompt.trim():!!imgToken;
      case "segment":         return !!(segId.trim()||activeTaskId);
      case "fill_parts":      return !!(fillId.trim()||activeTaskId);
      case "retopo":          return !!(retopoId.trim()||activeTaskId);
      case "texture":         return texInputTab==="text"?!!texPrompt.trim():texInputTab==="image"?!!imgToken:multiImages.length>0;
      case "texture_edit":    return !!editId.trim();
      case "texture_upscale": return !!upId.trim();
      case "texture_pbr":     return !!pbrId.trim();
      case "animate":         return !!selAnim && rigStep==="rigged";
      default: return false;
    }
  },[isRunning,mode,genTab,prompt,imgToken,segId,fillId,retopoId,activeTaskId,texInputTab,texPrompt,multiImages,editId,upId,pbrId,selAnim,rigStep]);

  const effMode = mode; // modes are now flat

  const filtHist = useMemo(()=>{
    const q=histQ.toLowerCase();
    return q?history.filter(i=>(i.prompt||"").toLowerCase().includes(q)):history;
  },[history,histQ]);

  const authH = useCallback(async()=>{
    const t=getIdToken?await getIdToken():"";
    return {"Content-Type":"application/json",Authorization:`Bearer ${t}`};
  },[getIdToken]);

  const startDrag = useCallback((side)=>(e)=>{
    e.preventDefault();
    dragRef.current={side,startX:e.clientX,startW:side==="left"?leftW:rightW};
    const mv=(ev)=>{ if(!dragRef.current)return; const {side:s,startX,startW}=dragRef.current,dx=ev.clientX-startX; if(s==="left")setLeftW(Math.max(260,Math.min(400,startW+dx))); else setRightW(Math.max(180,Math.min(320,startW-dx))); };
    const up=()=>{ dragRef.current=null;document.removeEventListener("mousemove",mv);document.removeEventListener("mouseup",up); };
    document.addEventListener("mousemove",mv); document.addEventListener("mouseup",up);
  },[leftW,rightW]);

  const handleImg = useCallback(async(file)=>{
    if(!file)return;
    setImgFile(file);setImgToken(null);setErrorMsg("");
    const r=new FileReader();r.onload=e=>setImgPrev(e.target.result);r.readAsDataURL(file);
    setImgUploading(true);
    try {
      const t=getIdToken?await getIdToken():"",form=new FormData();form.append("file",file);
      const res=await fetch(`${BASE_URL}/api/tripo/upload`,{method:"POST",headers:{Authorization:`Bearer ${t}`},body:form});
      const d=await res.json();if(!d.success)throw new Error(d.message);setImgToken(d.imageToken);
    } catch(e){setErrorMsg("Upload failed: "+e.message);setImgFile(null);setImgPrev(null);}
    finally{setImgUploading(false);}
  },[getIdToken]);

  const pollTask = useCallback(async(taskId,pt,headers,onSuccess)=>{
    let n=0;
    while(n<POLL_MAX){
      if(pt.cancelled)return;
      await new Promise(r=>setTimeout(r,POLL_MS));
      if(pt.cancelled)return;n++;
      const res=await fetch(`${BASE_URL}/api/tripo/task/${taskId}`,{headers});
      const d=await res.json();if(!d.success)throw new Error(d.message??"Poll error");
      setProgress(d.progress??0);
      if(d.status==="success"){await onSuccess(d);return;}
      if(d.status==="failed"||d.status==="cancelled")throw new Error(`Task ${d.status}`);
    }
    throw new Error("Timeout");
  },[]);

  const fetchProxy = useCallback(async(rawUrl)=>{
    const t=await getIdToken();
    const res=await fetch(`${BASE_URL}/api/tripo/model-proxy?url=${encodeURIComponent(rawUrl)}`,{headers:{Authorization:`Bearer ${t}`}});
    if(!res.ok)throw new Error(`Model load: ${res.status}`);
    return URL.createObjectURL(await res.blob());
  },[getIdToken]);

  const saveHist = useCallback(async(taskId,rawUrl,extra={})=>{
    const item={prompt:prompt.trim()||extra.label||effMode,status:"succeeded",model_url:rawUrl,source:"tripo",mode:effMode,taskId,params:{model_version:modelVer,mode:effMode,...extra},ts:Date.now()};
    const {docId}=await saveHistoryToFirestore(userId,item);
    const ni={id:docId??`tripo_${Date.now()}`,...item,createdAt:{toDate:()=>new Date()}};
    setHistory(h=>[ni,...h]);setActiveH(ni);histInit.current=true;return ni;
  },[userId,prompt,effMode,modelVer]);

  const handleGen = useCallback(async()=>{
    if(!canGen)return;
    setErrorMsg("");setProgress(0);setStatusMsg("");
    prevUrl.current=modelUrl;setModelUrl(null);setGenStatus("pending");
    if(pollAb.current)pollAb.current.cancelled=true;
    const pt={cancelled:false};pollAb.current=pt;
    const srcId=activeTaskId;
    const animSlug=selAnim?getAnimById(selAnim)?.slug:null;
    try {
      const headers=await authH();
      let body;
      switch(mode){
        case "generate": body=genTab==="text"?{type:"text_to_model",prompt:prompt.trim(),model_version:modelVer,negative_prompt:negPrompt.trim()||undefined,texture:texOn,pbr:pbrOn,texture_quality:texQ,...(faceLimit>0&&{face_limit:faceLimit}),generate_parts:inParts||undefined}:{type:"image_to_model",image_token:imgToken,model_version:modelVer,texture:texOn,pbr:pbrOn,texture_quality:texQ,...(makeBetter&&{refine_image:true}),...(faceLimit>0&&{face_limit:faceLimit})}; break;
        case "segment":  body={type:"mesh_segmentation",original_model_task_id:(segId.trim()||srcId)};break;
        case "fill_parts":body={type:"fill_parts",original_model_task_id:(fillId.trim()||srcId)};break;
        case "retopo":   body={type:"smart_lowpoly",original_model_task_id:(retopoId.trim()||srcId),target_face_num:polycount>0?polycount:undefined,quad:quadMesh};break;
        case "texture":  body={type:"texture",original_model_task_id:texId.trim()||srcId,texture_quality:texQ2,prompt:texPrompt.trim()||undefined,negative_prompt:texNeg.trim()||undefined};break;
        case "texture_edit":body={type:"texture_edit",original_model_task_id:editId.trim(),prompt:brushPrompt.trim()||undefined};break;
        case "texture_upscale":body={type:"texture_upscale",original_model_task_id:upId.trim()};break;
        case "texture_pbr":body={type:"pbr",original_model_task_id:pbrId.trim()};break;
        case "animate":  body={type:"animate_retarget",original_model_task_id:riggedId,animation:animSlug,out_format:"glb"};break;
        default:return;
      }
      setStatusMsg("Starting…");
      const tr=await fetch(`${BASE_URL}/api/tripo/task`,{method:"POST",headers,body:JSON.stringify(body)});
      const td=await tr.json();if(!td.success)throw new Error(td.message??"Task failed");
      setStatusMsg("Generating…");
      await pollTask(td.taskId,pt,headers,async d=>{
        if(pt.cancelled)return;
        const rawUrl=d.modelUrl;if(!rawUrl)throw new Error("No model URL");
        const blob=await fetchProxy(rawUrl);if(pt.cancelled)return;
        setModelUrl(blob);prevUrl.current=blob;setGenStatus("succeeded");setProgress(100);setStatusMsg("");
        await saveHist(td.taskId,rawUrl,{prompt:prompt.trim()});
      });
    } catch(e){
      if(pt.cancelled)return;
      setModelUrl(prevUrl.current);setGenStatus(prevUrl.current?"succeeded":"failed");
      setErrorMsg(e.message??"Network error");setStatusMsg("");
    }
  },[canGen,mode,genTab,prompt,negPrompt,modelVer,texOn,pbrOn,texQ,faceLimit,inParts,imgToken,makeBetter,segId,fillId,retopoId,polycount,quadMesh,texId,texPrompt,texNeg,texQ2,editId,brushPrompt,upId,pbrId,riggedId,selAnim,authH,modelUrl,pollTask,fetchProxy,saveHist,activeTaskId]);

  const handleAutoRig = useCallback(async()=>{
    if(!activeTaskId&&!animId)return;
    setErrorMsg("");setRigStep("rigging");
    if(pollAb.current)pollAb.current.cancelled=true;
    const pt={cancelled:false};pollAb.current=pt;
    const srcId=animId.trim()||activeTaskId;
    try{
      const headers=await authH();
      setStatusMsg("Checking animatability…");
      const cr=await fetch(`${BASE_URL}/api/tripo/task`,{method:"POST",headers,body:JSON.stringify({type:"animate_prerigcheck",original_model_task_id:srcId})});
      const cd=await cr.json();if(!cd.success)throw new Error(cd.message);
      let animatable=false;
      await pollTask(cd.taskId,pt,headers,async d=>{animatable=d.rigCheckResult??d.rawOutput?.is_animatable??false;});
      if(pt.cancelled)return;
      if(!animatable){setRigStep("idle");setErrorMsg("Model is not animatable (not humanoid)");setStatusMsg("");return;}
      setStatusMsg("Rigging…");
      const rr=await fetch(`${BASE_URL}/api/tripo/task`,{method:"POST",headers,body:JSON.stringify({type:"animate_rig",original_model_task_id:srcId,out_format:"glb"})});
      const rd=await rr.json();if(!rd.success)throw new Error(rd.message);
      await pollTask(rd.taskId,pt,headers,async d=>{
        if(pt.cancelled)return;
        const blob=d.modelUrl?await fetchProxy(d.modelUrl):null;
        if(pt.cancelled)return;
        if(blob){setModelUrl(blob);prevUrl.current=blob;}
        setRiggedId(rd.taskId);setRigStep("rigged");setStatusMsg("");setGenStatus("succeeded");
      });
    }catch(e){if(pt.cancelled)return;setRigStep("idle");setErrorMsg(e.message);setStatusMsg("");}
  },[activeTaskId,animId,authH,pollTask,fetchProxy]);

  const handleStop = useCallback(()=>{
    if(pollAb.current)pollAb.current.cancelled=true;
    setModelUrl(prevUrl.current);setGenStatus(prevUrl.current?"succeeded":"idle");
    setErrorMsg("");setStatusMsg("");
  },[prevUrl]);

  const loadFirst = useCallback(async()=>{
    if(!userId||histInit.current)return;
    histInit.current=true;setHistLoad(true);
    try{
      const{items,lastDoc}=await loadHistoryPageFromFirestore(userId,{limit:PAGE_SIZE,startAfter:null});
      const it=items.filter(i=>i.source==="tripo");
      lastDocR.current=lastDoc;setHasMore(it.length===PAGE_SIZE);setHistory(it);
      if(it.length>0){
        const l=it[0];setActiveH(l);setGenStatus("succeeded");
        if(l.model_url){try{const b=await fetchProxy(l.model_url);setModelUrl(b);prevUrl.current=b;}catch{setModelUrl(l.model_url);prevUrl.current=l.model_url;}}
      }
    }catch(e){console.error(e);}finally{setHistLoad(false);}
  },[userId,fetchProxy]);

  useEffect(()=>{if(rightOpen&&!histInit.current&&userId)loadFirst();},[rightOpen,userId,loadFirst]);

  const loadMore = useCallback(async()=>{
    if(!userId||moreLoad||!hasMore||!lastDocR.current)return;
    setMoreLoad(true);
    try{
      const{items,lastDoc}=await loadHistoryPageFromFirestore(userId,{limit:PAGE_SIZE,startAfter:lastDocR.current});
      const it=items.filter(i=>i.source==="tripo");
      lastDocR.current=lastDoc;setHasMore(it.length===PAGE_SIZE);setHistory(p=>[...p,...it]);
    }catch(e){console.error(e);}finally{setMoreLoad(false);}
  },[userId,moreLoad,hasMore]);

  const selHist = useCallback(async(item)=>{
    if(histAbort.current)histAbort.current.cancelled=true;
    const t={cancelled:false};histAbort.current=t;
    setLoadingId(item.id);setActiveH(item);setGenStatus(item.status);
    if(item.model_url){
      try{const b=await fetchProxy(item.model_url);if(!t.cancelled){setModelUrl(b);prevUrl.current=b;}}
      catch{if(!t.cancelled){setModelUrl(item.model_url);prevUrl.current=item.model_url;}}
    }
    if(!t.cancelled)setLoadingId(null);
  },[fetchProxy]);

  const reuse = useCallback((item)=>{
    if(item?.prompt)setPrompt(item.prompt);
    if(item?.taskId){setSegId(item.taskId);setFillId(item.taskId);setRetopoId(item.taskId);setTexId(item.taskId);setUpId(item.taskId);setPbrId(item.taskId);setAnimId(item.taskId);setEditId(item.taskId);}
    setErrorMsg("");
  },[]);

  const confirmDel = useCallback(async()=>{
    if(!toDel)return;setDeleting(true);
    try{
      const headers=await authH();
      const res=await fetch(`${BASE_URL}/api/trellis/history/${toDel.id}`,{method:"DELETE",headers});
      const d=await res.json();
      if(d.success){const dId=toDel.id,wasA=activeH?.id===dId;setHistory(prev=>{const next=prev.filter(i=>i.id!==dId);if(wasA){if(next.length===0){setActiveH(null);setModelUrl(null);prevUrl.current=null;setGenStatus("idle");}else{const idx=prev.findIndex(i=>i.id===dId);setTimeout(()=>selHist(next[Math.max(0,idx-1)]),0);}}return next;});}
    }catch(e){alert(e.message);}finally{setDeleting(false);setDelModal(false);setToDel(null);}
  },[toDel,authH,activeH,selHist]);

  const confirmClr = useCallback(async()=>{
    setDeleting(true);
    try{
      const headers=await authH();
      const res=await fetch(`${BASE_URL}/api/trellis/history`,{method:"DELETE",headers});
      const d=await res.json();
      if(d.success){setHistory([]);setActiveH(null);setModelUrl(null);prevUrl.current=null;setGenStatus("idle");histInit.current=false;lastDocR.current=null;setHasMore(false);}
    }catch(e){alert(e.message);}finally{setDeleting(false);setClrModal(false);}
  },[authH]);

  const camP = useCallback(p=>{if(sceneRef.current){setCameraPreset(sceneRef.current,p);setAutoSpin(p==="reset");sceneRef.current.autoSpin=p==="reset";}},[]);

  const genLabel = useMemo(()=>({
    generate:"Generate Model",segment:"Start Segmenting",fill_parts:"Part Completion",
    retopo:"Retopology",texture:"Generate Texture",texture_edit:"Apply Magic Brush",
    texture_upscale:"Upscale Texture",texture_pbr:"Generate PBR",animate:"Apply Animation",
  })[mode]??"Generate",[mode]);

  const modeTitle = useMemo(()=>({
    generate:"Generate Model",segment:"Segmentation",fill_parts:"Fill Parts",
    retopo:"Retopology",texture:"3D Model Texture Generator",texture_edit:"Magic Brush",
    texture_upscale:"Texture Upscale",texture_pbr:"PBR Material",animate:"3D Rigging & Animation",
  })[mode]??mode,[mode]);

  const genCost = MODE_COST[mode] ?? 35;
  const animModelInfo = ANIM_MODEL_VERSIONS.find(v=>v.id===animModelVer);

  // ════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex",height:"100%",overflow:"hidden",fontFamily:"'DM Sans',-apple-system,sans-serif",background:"#09090f" }}>

        {/* ═══ ICON NAV ═══ */}
        <div style={{ width:58,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",background:"#0b0b17",borderRight:"1px solid rgba(255,255,255,0.06)",paddingTop:8,overflowY:"auto" }} className="tp-scroll">
          {NAV.map(n=>(
            <button key={n.id} className={`tp-nav-btn${mode===n.id?" active":""}`} onClick={()=>{setMode(n.id);setErrorMsg("");}}>
              <div className="ico"><n.icon style={{ width:17,height:17,color:mode===n.id?"#a5a0ff":"#2d2d48" }}/></div>
              <span className="lbl">{n.label}</span>
              {n.sub && <ChevronDown style={{ width:8,height:8,color:mode===n.id?"#4a4a68":"#1a1a30",marginTop:-2 }}/>}
            </button>
          ))}
        </div>

        {/* ═══ LEFT PANEL ═══ */}
        <div style={{ width:leftOpen?leftW:0,minWidth:0,flexShrink:0,overflow:"hidden",transition:"width 0.22s cubic-bezier(0.4,0,0.2,1)",display:"flex",flexDirection:"column",background:"#0c0c18",borderRight:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width:leftW,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden" }}>

            {/* Header */}
            <div style={{ padding:"14px 16px 10px",borderBottom:"1px solid rgba(255,255,255,0.055)",flexShrink:0 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:mode==="segment"?10:0 }}>
                {mode==="generate"     && <Sparkles      style={{ width:14,height:14,color:"#6c63ff" }}/>}
                {mode==="segment"      && <Scissors      style={{ width:14,height:14,color:"#6c63ff" }}/>}
                {mode==="fill_parts"   && <Boxes         style={{ width:14,height:14,color:"#6c63ff" }}/>}
                {mode==="retopo"       && <Grid3x3       style={{ width:14,height:14,color:"#6c63ff" }}/>}
                {mode==="texture"      && <Grid3x3       style={{ width:14,height:14,color:"#6c63ff" }}/>}
                {mode==="texture_edit" && <Wand2         style={{ width:14,height:14,color:"#6c63ff" }}/>}
                {mode==="texture_upscale"&&<ArrowUpCircle style={{ width:14,height:14,color:"#6c63ff" }}/>}
                {mode==="texture_pbr"  && <Circle        style={{ width:14,height:14,color:"#6c63ff" }}/>}
                {mode==="animate"      && <PersonStanding style={{ width:14,height:14,color:"#6c63ff" }}/>}
                <span style={{ color:"#e8e8f4",fontSize:14,fontWeight:700 }}>{modeTitle}</span>
              </div>
              {mode==="segment" && (
                <div style={{ display:"flex",gap:3 }}>
                  {SEGMENT_SUBS.map(t=>(
                    <button key={t.id} className={`tp-sub-tab${segSub===t.id?" on":""}`} onClick={()=>setSegSub(t.id)}>{t.label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ flex:1,overflowY:"auto",minHeight:0 }} className="tp-scroll">
              <div style={{ padding:"14px 16px" }}>

                {/* ── GENERATE ── */}
                {mode==="generate" && <>
                  <div style={{ display:"flex",gap:3,padding:"3px",background:"rgba(255,255,255,0.04)",borderRadius:11,marginBottom:14 }}>
                    {GEN_TABS.map(t=>(
                      <button key={t.id} className="tp-inp-tab" onClick={()=>setGenTab(t.id)}
                        style={{ background:genTab===t.id?"rgba(255,255,255,0.1)":"transparent",color:genTab===t.id?"#e8e8f4":"#2d2d48" }}>
                        <t.icon style={{ width:15,height:15 }}/>
                      </button>
                    ))}
                  </div>
                  {genTab!=="text" ? (
                    <div className="tp-drop checker" onClick={()=>!imgUploading&&fileRef.current?.click()}
                      onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleImg(f);}}
                      style={{ width:"100%",aspectRatio:"1/1",borderRadius:12,border:"1.5px dashed rgba(255,255,255,0.1)",cursor:imgUploading?"wait":"pointer",overflow:"hidden",marginBottom:14,position:"relative",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {imgPrev ? (<>
                        <img src={imgPrev} alt="preview" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                        {imgUploading && <div style={{ position:"absolute",inset:0,background:"rgba(9,9,18,0.75)",display:"flex",alignItems:"center",justifyContent:"center" }}><Loader2 style={{ width:24,height:24,color:"#6c63ff" }} className="anim-spin"/></div>}
                        {imgToken && <div style={{ position:"absolute",bottom:8,right:8,width:22,height:22,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center" }}><Check style={{ width:12,height:12,color:"#fff" }}/></div>}
                        <button onClick={e=>{e.stopPropagation();setImgFile(null);setImgPrev(null);setImgToken(null);}} style={{ position:"absolute",top:8,right:8,width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,0.65)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff" }}><X style={{ width:11,height:11 }}/></button>
                      </>) : (
                        <div style={{ textAlign:"center",pointerEvents:"none" }}>
                          <div style={{ width:42,height:42,borderRadius:12,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 9px" }}><Upload style={{ width:18,height:18,color:"#2d2d48" }}/></div>
                          <p style={{ color:"#c8c8e0",fontSize:13,fontWeight:600,margin:"0 0 4px" }}>Upload</p>
                          <p style={{ color:"#2d2d48",fontSize:10,margin:0 }}>JPG, PNG, WEBP  Size ≤ 20MB</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea className="tp-ta" value={prompt} onChange={e=>{setPrompt(e.target.value);setErrorMsg("");}}
                      onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&canGen)handleGen();}}
                      placeholder="Describe a 3D object… (Ctrl+Enter)" disabled={isRunning} rows={5}
                      style={{ marginBottom:14,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,padding:"10px 12px" }}/>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0];if(f)handleImg(f);}}/>
                  {genTab!=="text" && <Toggle label="Make Image Better" value={makeBetter} onChange={setMakeBetter} hint/>}
                  <div style={{ margin:"14px 0 8px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>Mesh Quality</span>
                    <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }}/>
                  </div>
                  <div style={{ display:"flex",gap:6,marginBottom:2 }}>
                    {[{id:"ultra",label:"Ultra",prem:true},{id:"standard",label:"Standard",prem:false}].map(q=>(
                      <button key={q.id} className="tp-qual-btn" onClick={()=>setMeshQ(q.id)}
                        style={{ background:meshQ===q.id?"rgba(108,99,255,0.2)":"rgba(255,255,255,0.05)",color:meshQ===q.id?"#a5a0ff":"#3d3d5a",outline:meshQ===q.id?"1.5px solid rgba(108,99,255,0.4)":"1.5px solid rgba(255,255,255,0.07)" }}>
                        {q.prem&&<CoinIcon size={14}/>}{q.label}
                      </button>
                    ))}
                  </div>
                  <Toggle label="Generate in Parts" value={inParts} onChange={setInParts} hint premium/>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                      <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>Privacy</span>
                      <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }}/>
                    </div>
                    <button onClick={()=>setPrivacy(v=>v==="public"?"private":"public")}
                      style={{ display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",cursor:"pointer",color:"#8a8aaa",fontSize:12,fontWeight:500,fontFamily:"inherit" }}>
                      {privacy==="public"?<Globe style={{ width:12,height:12 }}/>:<Lock style={{ width:12,height:12 }}/>}
                      {privacy==="public"?"Public":"Private"}
                      <ChevronDown style={{ width:10,height:10 }}/>
                    </button>
                  </div>
                  <Toggle label="Texture" value={texOn} onChange={setTexOn}/>
                  <Collapsible label="Texture Settings">
                    <div style={{ display:"flex",flexDirection:"column" }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",cursor:"pointer",opacity:texOn?1:0.4 }} onClick={()=>texOn&&setTex4K(v=>!v)}>
                        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                          <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>4K Texture</span>
                          <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }}/>
                        </div>
                        <div className={`tp-switch${tex4K&&texOn?" on":""}`} style={{ background:tex4K&&texOn?"#4c8ef7":"rgba(255,255,255,0.12)" }}/>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",cursor:"pointer",opacity:texOn?1:0.4 }} onClick={()=>texOn&&setPbrOn(v=>!v)}>
                        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                          <span style={{ color:"#c8c8e0",fontSize:13,fontWeight:500 }}>PBR</span>
                          <HelpCircle style={{ width:13,height:13,color:"#1e1e3a" }}/>
                        </div>
                        <div className={`tp-switch${pbrOn&&texOn?" on":""}`} style={{ background:pbrOn&&texOn?"#4c8ef7":"rgba(255,255,255,0.12)" }}/>
                      </div>
                    </div>
                  </Collapsible>
                  <Collapsible label="Topology Settings" border={false}
                    extra={<span style={{ color:"#f5a623",fontSize:10,fontWeight:600,textDecoration:"underline" }}>Upgrade to unlock</span>}>
                    <TopoControls quad={quadMesh} setQuad={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} polycount={polycount} setPolycount={setPolycount}/>
                  </Collapsible>
                  <div style={{ marginTop:14 }}>
                    <span style={{ color:"#4a4a68",fontSize:12,fontWeight:600,display:"block",marginBottom:8 }}>AI Model</span>
                    {MODEL_VERSIONS.map((v,i)=>((!modelExp&&i>0)?null:(
                      <div key={v.id} className={`tp-model-card${modelVer===v.id?" sel":""}`}
                        onClick={()=>{setModelVer(v.id);setModelExp(false);}}
                        style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                        <div>
                          <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                            <span style={{ color:"#e8e8f4",fontSize:12,fontWeight:600 }}>{v.label}</span>
                            {v.badge&&<span style={{ background:"linear-gradient(135deg,#8b5cf6,#6c63ff)",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:5 }}>NEW</span>}
                          </div>
                          {v.warn&&<p style={{ color:"#f5a623",fontSize:10,margin:"2px 0 0" }}>{v.warn}</p>}
                        </div>
                        {i===0&&<button onClick={e=>{e.stopPropagation();setModelExp(v=>!v);}} style={{ background:"none",border:"none",cursor:"pointer",color:"#2d2d48",padding:2 }}>
                          {modelExp?<ChevronUp style={{ width:14,height:14 }}/>:<ChevronDown style={{ width:14,height:14 }}/>}
                        </button>}
                      </div>
                    )))}
                  </div>
                </>}

                {/* ── SEGMENT ── */}
                {mode==="segment" && segSub==="segment" && (
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"8px 0" }}>
                    <p style={{ color:"#c8c8e0",fontSize:13,fontWeight:500,lineHeight:1.6,margin:"0 0 20px" }}>
                      Select a model<br/>
                      from the <span style={{ color:"#f5a623" }}>Assets</span> Panel on the<br/>
                      right for <span style={{ color:"#a5a0ff" }}>Segmentation</span>
                    </p>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:24,opacity:0.7 }}>
                      <div style={{ width:90,height:90,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center" }}><Scissors style={{ width:28,height:28,color:"#3a3a58" }}/></div>
                      <div style={{ width:20,height:20,borderRadius:"50%",background:"rgba(108,99,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><ChevronRight style={{ width:11,height:11,color:"#6c63ff" }}/></div>
                      <div style={{ width:90,height:90,borderRadius:10,background:"rgba(108,99,255,0.06)",border:"1px solid rgba(108,99,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}><Grid3x3 style={{ width:28,height:28,color:"#6c63ff",opacity:0.5 }}/></div>
                    </div>
                    <div style={{ width:"100%",marginBottom:10 }}>
                      <p style={{ color:"#3a3a58",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 10px",fontFamily:"monospace" }}>Unavailable for</p>
                      <div style={{ display:"flex",gap:8 }}>
                        {[{label:"Quad models",icon:Grid3x3},{label:"Rigged models",icon:PersonStanding}].map(item=>(
                          <div key={item.label} style={{ flex:1,borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",padding:"10px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,position:"relative" }}>
                            <div style={{ width:28,height:28,borderRadius:"50%",background:"rgba(239,68,68,0.15)",border:"1.5px solid rgba(239,68,68,0.4)",display:"flex",alignItems:"center",justifyContent:"center",position:"absolute",top:-10,right:6 }}><X style={{ width:11,height:11,color:"#ef4444" }}/></div>
                            <item.icon style={{ width:30,height:30,color:"#2d2d48",marginTop:8 }}/>
                            <span style={{ color:"#3a3a58",fontSize:10,fontWeight:500 }}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {activeTaskId && (
                      <div style={{ width:"100%",padding:"8px 10px",borderRadius:9,background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.25)",marginTop:8,textAlign:"left" }}>
                        <p style={{ color:"#a5a0ff",fontSize:11,fontWeight:600,margin:0 }}>Selected model</p>
                        <p style={{ color:"#2d2d48",fontSize:9,margin:"2px 0 0",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{activeTaskId}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── FILL PARTS ── */}
                {mode==="segment" && segSub==="fill_parts" && (
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"8px 0" }}>
                    <p style={{ color:"#c8c8e0",fontSize:13,fontWeight:500,lineHeight:1.6,margin:"0 0 20px" }}>
                      Select a model<br/>
                      from the <span style={{ color:"#f5a623" }}>Assets</span> Panel on<br/>
                      the right for <span style={{ color:"#a5a0ff" }}>Part Completion</span>
                    </p>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:24,opacity:0.7 }}>
                      <div style={{ width:90,height:90,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center" }}><Boxes style={{ width:28,height:28,color:"#3a3a58" }}/></div>
                      <div style={{ width:20,height:20,borderRadius:"50%",background:"rgba(108,99,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><ChevronRight style={{ width:11,height:11,color:"#6c63ff" }}/></div>
                      <div style={{ width:90,height:90,borderRadius:10,background:"rgba(108,99,255,0.06)",border:"1px solid rgba(108,99,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}><Box style={{ width:28,height:28,color:"#6c63ff",opacity:0.5 }}/></div>
                    </div>
                    {activeTaskId && (
                      <div style={{ width:"100%",padding:"8px 10px",borderRadius:9,background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.25)",marginBottom:10,textAlign:"left" }}>
                        <p style={{ color:"#a5a0ff",fontSize:11,fontWeight:600,margin:0 }}>Selected model</p>
                        <p style={{ color:"#2d2d48",fontSize:9,margin:"2px 0 0",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{activeTaskId}</p>
                      </div>
                    )}
                    <button style={{ display:"flex",alignItems:"center",gap:5,marginTop:8,background:"none",border:"none",cursor:"pointer",color:"#3a3a58",fontSize:11,fontFamily:"inherit" }}
                      onMouseEnter={e=>e.currentTarget.style.color="#8a8aaa"}
                      onMouseLeave={e=>e.currentTarget.style.color="#3a3a58"}>
                      <HelpCircle style={{ width:12,height:12 }}/> How it works
                    </button>
                  </div>
                )}

                {/* ── RETOPO ── */}
                {mode==="retopo" && (
                  <>
                    {activeTaskId && (
                      <div style={{ padding:"8px 10px",borderRadius:9,background:"rgba(108,99,255,0.08)",border:"1px solid rgba(108,99,255,0.25)",marginBottom:14 }}>
                        <p style={{ color:"#a5a0ff",fontSize:11,fontWeight:600,margin:0 }}>Selected model</p>
                        <p style={{ color:"#2d2d48",fontSize:9,margin:"2px 0 0",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{activeTaskId}</p>
                      </div>
                    )}
                    <TopoControls quad={quadMesh} setQuad={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} polycount={polycount} setPolycount={setPolycount}/>
                  </>
                )}

                {/* ── TEXTURE ── */}
                {mode==="texture" && (
                  <>
                    <TexInputBox
                      tab={texInputTab} setTab={setTexInputTab}
                      texPrompt={texPrompt} setTexPrompt={setTexPrompt}
                      imgFile={imgFile} imgPrev={imgPrev} imgToken={imgToken}
                      imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef}
                      multiImages={multiImages} setMultiImages={setMultiImages}
                    />
                    {(texInputTab==="image"||texInputTab==="text") && <TextureStyleSelector/>}
                    <Toggle label="4K Texture" value={tex4K} onChange={setTex4K} hint/>
                  </>
                )}

                {/* ── TEXTURE EDIT — Magic Brush ── */}
                {mode==="texture_edit" && (
                  <MagicBrushPanel
                    brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt}
                    creativity={creativity} setCreativity={setCreativity}
                    brushMode={brushMode} setBrushMode={setBrushMode}
                    brushColor={brushColor} setBrushColor={setBrushColor}
                  />
                )}

                {/* ── TEXTURE UPSCALE ── */}
                {mode==="texture_upscale" && (
                  <>
                    <div style={{ padding:"8px 10px",borderRadius:9,background:"rgba(245,197,24,0.06)",border:"1px solid rgba(245,197,24,0.14)",display:"flex",gap:7,marginBottom:14 }}>
                      <Info style={{ width:12,height:12,color:"#f5c518",flexShrink:0,marginTop:1 }}/>
                      <p style={{ color:"#fcd34d",fontSize:11,margin:0,lineHeight:1.6 }}>Increases texture resolution using AI super-resolution.</p>
                    </div>
                    <span style={LBL9}>Source Task ID</span>
                    <TID value={upId} onChange={setUpId} placeholder="Tripo task_id…" history={history} color={color}/>
                  </>
                )}

                {/* ── TEXTURE PBR ── */}
                {mode==="texture_pbr" && (
                  <>
                    <div style={{ padding:"8px 10px",borderRadius:9,background:"rgba(245,197,24,0.06)",border:"1px solid rgba(245,197,24,0.14)",display:"flex",gap:7,marginBottom:14 }}>
                      <Info style={{ width:12,height:12,color:"#f5c518",flexShrink:0,marginTop:1 }}/>
                      <p style={{ color:"#fcd34d",fontSize:11,margin:0,lineHeight:1.6 }}>Generates PBR maps: albedo, normal, roughness, metallic.</p>
                    </div>
                    <span style={LBL9}>Source Task ID</span>
                    <TID value={pbrId} onChange={setPbrId} placeholder="Tripo task_id…" history={history} color={color}/>
                  </>
                )}

                {/* ── ANIMATE ── */}
                {mode==="animate" && (
                  <>
                    {/* AI Model selector */}
                    <div style={{ marginBottom:12 }}>
                      <span style={{ color:"#8a8aaa",fontSize:12,fontWeight:600,display:"block",marginBottom:7 }}>AI Model</span>
                      <div style={{ position:"relative" }}>
                        <button className="anim-model-dd" onClick={()=>setAnimModelDD(v=>!v)}>
                          <div style={{ width:32,height:32,borderRadius:8,background:"rgba(108,99,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                            <PersonStanding style={{ width:16,height:16,color:"#a5a0ff" }}/>
                          </div>
                          <span style={{ color:"#e8e8f4",fontSize:12,fontWeight:600,flex:1,textAlign:"left" }}>{animModelInfo?.label}</span>
                          <ChevronDown style={{ width:14,height:14,color:"#2d2d48",transform:animModelDD?"rotate(180deg)":"none",transition:"transform 0.14s" }}/>
                        </button>
                        {animModelDD && (
                          <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:80,background:"#0f0f1e",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,overflow:"hidden",boxShadow:"0 12px 40px rgba(0,0,0,0.6)" }}>
                            {ANIM_MODEL_VERSIONS.map(v=>(
                              <button key={v.id} onClick={()=>{setAnimModelVer(v.id);setAnimModelDD(false);}}
                                style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:animModelVer===v.id?"rgba(108,99,255,0.1)":"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",borderBottom:"1px solid rgba(255,255,255,0.04)" }}
                                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
                                onMouseLeave={e=>e.currentTarget.style.background=animModelVer===v.id?"rgba(108,99,255,0.1)":"transparent"}>
                                <span style={{ fontSize:14 }}>{v.icon}</span>
                                <span style={{ color:"#c8c8e0",fontSize:12 }}>{v.label}</span>
                                {animModelVer===v.id&&<Check style={{ width:12,height:12,color:"#a5a0ff",marginLeft:"auto" }}/>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Auto Rig button */}
                    <button className={`auto-rig-btn${(activeTaskId||animId)&&rigStep!=="rigging"?" ready":" disabled"}`}
                      onClick={handleAutoRig} disabled={(!activeTaskId&&!animId)||rigStep==="rigging"}
                      style={{ marginBottom:16 }}>
                      {rigStep==="rigging"
                        ? <><Loader2 style={{ width:14,height:14 }} className="anim-spin"/>Rigging…</>
                        : <><CoinIcon size={16}/>Auto Rig<span style={{ color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:400,marginLeft:2 }}>20</span></>}
                    </button>

                    {rigStep==="rigged" && (
                      <div style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:9,background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.2)",marginBottom:12 }}>
                        <Check style={{ width:11,height:11,color:"#22c55e",flexShrink:0 }}/>
                        <span style={{ fontSize:11,color:"#86efac" }}>Rigged — select an animation below</span>
                      </div>
                    )}

                    {/* Search */}
                    <div style={{ position:"relative",marginBottom:8 }}>
                      <Search style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#2d2d48" }}/>
                      <input value={animSearch} onChange={e=>setAnimSearch(e.target.value)} placeholder="Search"
                        className="tp-input" style={{ paddingLeft:28,fontSize:11 }}/>
                    </div>

                    {/* Category tabs */}
                    <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:10 }}>
                      {["all","basic","interactive",...ANIM_CATEGORIES.filter(c=>!["all","basic","interactive"].includes(c))].slice(0,5).map(c=>(
                        <button key={c} onClick={()=>setAnimCat(c)}
                          style={{ padding:"3px 10px",borderRadius:999,fontSize:10,fontWeight:600,cursor:"pointer",border:"none",textTransform:"capitalize",background:animCat===c?"rgba(108,99,255,0.22)":"rgba(255,255,255,0.06)",color:animCat===c?"#a5a0ff":"#5a5a7a",outline:animCat===c?"1px solid rgba(108,99,255,0.4)":"1px solid transparent",fontFamily:"inherit" }}>
                          {c==="all"?"All":c.charAt(0).toUpperCase()+c.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Animation grid */}
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                      {filtAnims.map(a=>(
                        <AnimCard key={a.id} anim={a} isSelected={selAnim===a.id} onSelect={()=>setSelAnim(selAnim===a.id?null:a.id)}/>
                      ))}
                      {filtAnims.length===0 && <p style={{ gridColumn:"span 2",color:"#1e1e38",fontSize:11,textAlign:"center",margin:"16px 0" }}>No results</p>}
                    </div>
                  </>
                )}

                {errorMsg && (
                  <div style={{ display:"flex",alignItems:"flex-start",gap:8,padding:"9px 12px",borderRadius:10,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",marginTop:12 }}>
                    <AlertCircle style={{ width:13,height:13,color:"#f87171",flexShrink:0,marginTop:1 }}/>
                    <p style={{ color:"#fca5a5",fontSize:11,margin:0,lineHeight:1.55 }}>{errorMsg}</p>
                  </div>
                )}
                <div style={{ height:12 }}/>
              </div>
            </div>

            {/* Gen button */}
            <div style={{ padding:"12px 16px 16px",borderTop:"1px solid rgba(255,255,255,0.055)",flexShrink:0 }}>
              {isRunning ? (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <PBar value={progress}/>
                  {statusMsg&&<p style={{ color:"#3a3a58",fontSize:10,margin:0,textAlign:"center",fontFamily:"monospace" }}>{statusMsg}</p>}
                  <button onClick={handleStop} style={{ width:"100%",padding:"12px 0",borderRadius:11,fontSize:13,fontWeight:600,color:"#fca5a5",display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",border:"none",background:"rgba(239,68,68,0.09)",outline:"1.5px solid rgba(239,68,68,0.2)",fontFamily:"inherit" }}>
                    <Square style={{ width:12,height:12 }}/> Stop
                  </button>
                </div>
              ) : (
                <>
                  <button className={`tp-gen-btn${canGen?" go":" no"}`} onClick={handleGen} disabled={!canGen}>
                    {genLabel}
                    {canGen && <div style={{ display:"flex",alignItems:"center",gap:5,marginLeft:4,paddingLeft:8,borderLeft:"1px solid rgba(0,0,0,0.2)" }}>
                      <CoinIcon size={16}/><span style={{ fontSize:14,fontWeight:800 }}>{genCost}</span>
                    </div>}
                  </button>
                  {modelUrl&&!isRunning&&(
                    <button onClick={()=>{setDlItem(null);setDlOpen(true);}}
                      style={{ width:"100%",marginTop:7,padding:"9px 0",borderRadius:9,fontSize:11,fontWeight:600,color:"#4a4a68",display:"flex",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer",border:"1.5px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",fontFamily:"inherit",transition:"all 0.14s" }}
                      onMouseEnter={e=>{e.currentTarget.style.color="#8a8aaa";e.currentTarget.style.borderColor="rgba(255,255,255,0.14)";}}
                      onMouseLeave={e=>{e.currentTarget.style.color="#4a4a68";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";}}>
                      <Download style={{ width:11,height:11 }}/> Download
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Left handle */}
        <div className="tp-handle" onMouseDown={startDrag("left")}>
          <div className="tp-hbtn" onMouseDown={e=>e.stopPropagation()} onClick={()=>setLeftOpen(v=>!v)}>
            {leftOpen?<ChevronLeft style={{ width:9,height:9,color:"#5a5a7a" }}/>:<ChevronRight style={{ width:9,height:9,color:"#5a5a7a" }}/>}
          </div>
        </div>

        {/* ═══ CENTER ═══ */}
        <main style={{ flex:1,minWidth:0,display:"flex",flexDirection:"column",background:"#09090f",position:"relative" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",height:40,flexShrink:0,borderBottom:"1px solid rgba(255,255,255,0.055)",background:"rgba(9,9,18,0.98)",gap:12,overflowX:"auto" }}>
            <div style={{ display:"flex",alignItems:"center",gap:4,flexShrink:0 }}>
              {!leftOpen&&<button onClick={()=>setLeftOpen(true)} style={{ width:24,height:24,borderRadius:6,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.05)",color:"#2d2d48",marginRight:4 }}><ChevronRight style={{ width:11,height:11 }}/></button>}
              <span style={{ color:"#1a1a30",fontSize:9,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",fontFamily:"monospace",marginRight:3 }}>View</span>
              {VIEW_MODES.map(v=>(
                <Tooltip key={v.id} text={v.tip} side="bottom">
                  <button onClick={()=>setViewMode(v.id)} style={{ padding:"3px 9px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",border:"none",background:viewMode===v.id?"rgba(108,99,255,0.18)":"rgba(255,255,255,0.03)",color:viewMode===v.id?"#a5a0ff":"#2d2d48",outline:viewMode===v.id?"1px solid rgba(108,99,255,0.38)":"1px solid rgba(255,255,255,0.06)",whiteSpace:"nowrap",flexShrink:0 }}>{v.label}</button>
                </Tooltip>
              ))}
              {modelUrl&&<WireframeControl active={wireOv} onToggle={()=>setWireOv(v=>!v)} opacity={wireOp} onOpacityChange={setWireOp} color={wireC} onColorChange={setWireC} accentColor={color}/>}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:5,flexShrink:0 }}>
              <BgColorPicker value={bgColor} onChange={setBgColor}/>
              <div style={{ width:1,height:14,background:"rgba(255,255,255,0.06)" }}/>
              <LightingControls viewMode={viewMode} lightMode={lightMode} setLightMode={setLightMode} lightStrength={lStr} setLightStrength={setLStr} lightRotation={lRot} setLightRotation={setLRot} lightAutoRotate={lAutoR} setLightAutoRotate={setLAutoR} lightAutoRotateSpeed={lAutoS} setLightAutoRotateSpeed={setLAutoS} dramaticColor={dramC} setDramaticColor={setDramC} gridColor1={gc1} setGridColor1={setGc1} gridColor2={gc2} setGridColor2={setGc2} color={color}/>
              <div style={{ width:1,height:14,background:"rgba(255,255,255,0.06)" }}/>
              <IconBtn icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z"/></svg>} tip="Grid" active={showGrid} color={color} onClick={()=>setShowGrid(v=>!v)}/>
              {!rightOpen&&<button onClick={()=>setRightOpen(true)} style={{ width:24,height:24,borderRadius:6,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.04)",color:"#2d2d48" }}><ChevronLeft style={{ width:11,height:11 }}/></button>}
            </div>
          </div>

          <div style={{ flex:1,position:"relative",overflow:"hidden" }}>
            <ThreeViewer color={color} viewMode={viewMode} lightMode={lightMode} showGrid={showGrid} modelUrl={modelUrl} lightStrength={lStr} lightRotation={lRot} lightAutoRotate={lAutoR} lightAutoRotateSpeed={lAutoS} dramaticColor={dramC} wireframeOverlay={wireOv} wireOpacity={wireOp} wireHexColor={wireHex} autoSpin={autoSpin} bgColor={bgColor} gridColor1={gc1} gridColor2={gc2} onSpinStop={()=>setAutoSpin(false)} onReady={s=>{sceneRef.current=s;}}/>
            {(histLoad||(loadingId&&!isRunning))&&(
              <div style={{ position:"absolute",inset:0,zIndex:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(9,9,18,0.72)",backdropFilter:"blur(12px)" }}>
                <Loader2 style={{ width:22,height:22,color:"#6c63ff",marginBottom:10 }} className="anim-spin"/>
                <p style={{ color:"#22223a",fontSize:10,margin:0,fontFamily:"monospace" }}>{histLoad?"Loading history…":"Loading model…"}</p>
              </div>
            )}
            {isRunning&&(
              <div style={{ position:"absolute",inset:0,zIndex:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(4,4,14,0.9)",backdropFilter:"blur(18px)",pointerEvents:"none" }}>
                <div style={{ width:72,height:72,borderRadius:20,marginBottom:22,background:"rgba(108,99,255,0.1)",border:"1.5px solid rgba(108,99,255,0.22)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 40px rgba(108,99,255,0.16)" }}>
                  <Sparkles style={{ width:28,height:28,color:"#8b7fff" }}/>
                </div>
                <p style={{ color:"#e8e8f4",fontWeight:700,fontSize:15,margin:"0 0 6px" }}>{genLabel}…</p>
                {statusMsg&&<p style={{ color:"#2d2d48",fontSize:11,margin:"0 0 14px",fontFamily:"monospace" }}>{statusMsg}</p>}
                <div style={{ width:220 }}><PBar value={progress}/></div>
                <p style={{ color:"#1a1a30",fontSize:10,margin:"8px 0 0",fontFamily:"monospace" }}>{progress}%</p>
              </div>
            )}
            {!isRunning&&!modelUrl&&!histLoad&&!loadingId&&(
              <div style={{ position:"absolute",inset:0,zIndex:5,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none" }}>
                <div style={{ width:72,height:72,borderRadius:20,marginBottom:18,background:"rgba(108,99,255,0.04)",border:"1px solid rgba(108,99,255,0.09)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Box style={{ width:30,height:30,color:"rgba(108,99,255,0.18)" }}/>
                </div>
                <p style={{ color:"#14142a",fontSize:13,fontWeight:600,margin:"0 0 4px" }}>Tripo3D Studio</p>
                <p style={{ color:"#0e0e22",fontSize:10,fontFamily:"monospace" }}>{genLabel}</p>
              </div>
            )}
          </div>

          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",height:40,flexShrink:0,borderTop:"1px solid rgba(255,255,255,0.055)",background:"rgba(9,9,18,0.98)",overflowX:"auto",gap:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:4,flexShrink:0 }}>
              <span style={{ color:"#1a1a30",fontSize:9,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",fontFamily:"monospace",marginRight:2 }}>Camera</span>
              <IconBtn icon={<RotateCcw/>} tip="Reset"  onClick={()=>camP("reset")}/>
              <IconBtn icon={<Camera/>}   tip="Front"  onClick={()=>camP("front")}/>
              <IconBtn icon={<Move3d/>}   tip="Side"   onClick={()=>camP("side")} />
              <IconBtn icon={<Layers/>}   tip="Top"    onClick={()=>camP("top")}  />
              <div style={{ width:1,height:14,background:"rgba(255,255,255,0.06)",margin:"0 4px" }}/>
              <button onClick={()=>setAutoSpin(v=>!v)}
                style={{ display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",border:"none",background:autoSpin?"rgba(108,99,255,0.18)":"rgba(255,255,255,0.03)",color:autoSpin?"#a5a0ff":"#2d2d48",outline:autoSpin?"1px solid rgba(108,99,255,0.38)":"1px solid rgba(255,255,255,0.06)",fontFamily:"inherit" }}>
                {autoSpin?<Square style={{ width:9,height:9 }}/>:<Play style={{ width:9,height:9 }}/>} Auto-spin
              </button>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
              {modelUrl&&(
                <button onClick={()=>{setDlItem(null);setDlOpen(true);}}
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6c63ff,#8b7fff)",border:"none",cursor:"pointer",boxShadow:"0 2px 14px rgba(108,99,255,0.35)",fontFamily:"inherit" }}>
                  <Download style={{ width:11,height:11 }}/> Download
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Right handle */}
        <div className="tp-handle" onMouseDown={startDrag("right")}>
          <div className="tp-hbtn" onMouseDown={e=>e.stopPropagation()} onClick={()=>setRightOpen(v=>!v)}>
            {rightOpen?<ChevronRight style={{ width:9,height:9,color:"#5a5a7a" }}/>:<ChevronLeft style={{ width:9,height:9,color:"#5a5a7a" }}/>}
          </div>
        </div>

        {/* ═══ RIGHT — History ═══ */}
        <div style={{ width:rightOpen?rightW:0,minWidth:0,flexShrink:0,overflow:"hidden",transition:"width 0.22s cubic-bezier(0.4,0,0.2,1)",display:"flex",flexDirection:"column",background:"#0c0c18",borderLeft:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width:rightW,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden" }}>
            <div style={{ padding:"12px 12px 10px",borderBottom:"1px solid rgba(255,255,255,0.055)",flexShrink:0 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:9 }}>
                <Clock style={{ width:11,height:11,color:"#2d2d48" }}/>
                <span style={{ color:"#5a5a7a",fontSize:12,fontWeight:700 }}>History</span>
                <span style={{ marginLeft:"auto",fontSize:9,fontWeight:700,padding:"1px 7px",borderRadius:99,background:"rgba(108,99,255,0.1)",color:"rgba(108,99,255,0.6)",border:"1px solid rgba(108,99,255,0.14)",fontFamily:"monospace" }}>{history.length}{hasMore?"+ ":""}</span>
              </div>
              <input placeholder="Search…" value={histQ} onChange={e=>setHistQ(e.target.value)} className="tp-input" style={{ fontSize:11 }}
                onFocus={e=>e.target.style.borderColor="rgba(108,99,255,0.45)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.09)"}/>
            </div>
            <div style={{ flex:1,overflowY:"auto",padding:"6px 8px",display:"flex",flexDirection:"column",gap:4 }} className="tp-scroll">
              {histLoad&&<div style={{ display:"flex",justifyContent:"center",padding:20 }}><Loader2 style={{ width:14,height:14,color:"#1e1e38" }} className="anim-spin"/></div>}
              {!histLoad&&filtHist.length===0&&(
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:130,gap:8 }}>
                  <Box style={{ width:20,height:20,color:"#111128" }}/>
                  <p style={{ color:"#14142a",fontSize:10,margin:0 }}>{histQ?"No results":"No saved models yet"}</p>
                </div>
              )}
              {filtHist.map((item,idx)=>(
                <div key={item.id} style={{ animationDelay:`${Math.min(idx,4)*0.04}s` }} className="fade-up">
                  <HistoryCard item={item} isActive={activeH?.id===item.id} isLoading={loadingId===item.id} disabled={loadingId!==null} onSelect={selHist} onReuse={reuse} onDownload={async(i)=>{try{const b=await fetchProxy(i.model_url);setDlItem({blobUrl:b,item:i});setDlOpen(true);}catch(e){alert(e.message);}}} onDelete={i=>{setToDel(i);setDelModal(true);}} color={color} getIdToken={getIdToken}/>
                </div>
              ))}
              {!histQ&&hasMore&&(
                <button onClick={loadMore} disabled={moreLoad}
                  style={{ width:"100%",padding:"8px 0",borderRadius:8,fontSize:9,fontWeight:600,color:moreLoad?"#1e1e38":"#2d2d48",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",cursor:moreLoad?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:"monospace" }}>
                  {moreLoad?<><Loader2 style={{ width:9,height:9 }} className="anim-spin"/>Loading…</>:<><ChevronDown style={{ width:9,height:9 }}/>Load more</>}
                </button>
              )}
              {!histQ&&!hasMore&&history.length>0&&<p style={{ textAlign:"center",fontSize:8,color:"#0e0e22",fontFamily:"monospace",padding:"6px 0" }}>— {history.length} models —</p>}
            </div>
            {history.length>0&&(
              <div style={{ padding:"6px 8px",borderTop:"1px solid rgba(255,255,255,0.04)",flexShrink:0 }}>
                <button onClick={()=>setClrModal(true)}
                  style={{ width:"100%",padding:"6px 0",borderRadius:7,fontSize:9,fontWeight:600,color:"#1e1e38",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:"inherit",transition:"all 0.13s" }}
                  onMouseEnter={e=>{e.currentTarget.style.color="#f87171";e.currentTarget.style.borderColor="rgba(248,113,113,0.2)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="#1e1e38";e.currentTarget.style.borderColor="rgba(255,255,255,0.05)";}}>
                  <Trash2 style={{ width:9,height:9 }}/> Clear history
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={delModal} onClose={()=>{if(!deleting){setDelModal(false);setToDel(null);}}} onConfirm={confirmDel} title="Delete model" message={`Delete "${toDel?.prompt?.slice(0,60)}…"?`} confirmText="Delete" confirmColor="#ef4444" isDeleting={deleting}/>
      <ConfirmModal isOpen={clrModal} onClose={()=>{if(!deleting)setClrModal(false);}} onConfirm={confirmClr} title="Clear history" message={`Delete all ${history.length} Tripo models?`} confirmText="Clear all" confirmColor="#dc2626" isDeleting={deleting}/>
      <DownloadModal isOpen={dlOpen} onClose={()=>{setDlOpen(false);setDlItem(null);}} glbBlobUrl={dlItem?dlItem.blobUrl:modelUrl} scene={sceneRef.current?.scene??sceneRef.current} filename={dlItem?(dlItem.item?.prompt?.slice(0,30)??`tripo_${Date.now()}`):(activeH?.prompt?.slice(0,30)??`tripo_${Date.now()}`)} color={color}/>
    </>
  );
}