
const VIEW_MODES = [
  { id: 'clay', label: 'Clay', tip: 'Clay — semleges szürke agyag' },
  { id: 'uv', label: 'Base Color', tip: 'Base Color — textúra árnyék nélkül' },
  { id: 'normal', label: 'RGB', tip: 'RGB — textúra + árnyék' },
];

const BG_OPTIONS = [
  {
    id: 'default', label: 'Alap',
    render: () => (
      <div style={{
        width: 14, height: 14, borderRadius: 3,
        background: 'linear-gradient(45deg,#1e1e3a 25%,#111128 25%,#111128 50%,#1e1e3a 50%,#1e1e3a 75%,#111128 75%)',
        backgroundSize: '6px 6px',
      }} />
    ),
  },
  {
    id: 'black', label: 'Fekete',
    render: () => <div style={{ width: 14, height: 14, borderRadius: 3, background: '#000', border: '1px solid rgba(255,255,255,0.15)' }} />,
  },
  {
    id: 'darkgray', label: 'Sötétszürke',
    render: () => <div style={{ width: 14, height: 14, borderRadius: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.1)' }} />,
  },
  {
    id: 'white', label: 'Fehér',
    render: () => <div style={{ width: 14, height: 14, borderRadius: 3, background: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />,
  },
];

const EXAMPLE_PROMPTS = [
  'a rustic log cabin with a stone chimney and a wooden porch',
  'a futuristic sci-fi helmet with glowing visor',
  'a medieval iron sword with ornate handle',
  'a cute cartoon mushroom house with round door',
  'a vintage wooden treasure chest with brass fittings',
  'a sleek sports car with aerodynamic body',
];

// ── Style opciók — prefix kerül a prompt elejére ──────────────────────────────
const STYLE_OPTIONS = [
  { id: 'nostyle', label: 'No Style', emoji: '🎯', prefix: '', tip: 'Semleges — nem ad hozzá stílus prefixet' },
  { id: 'realistic', label: 'Realistic', emoji: '📷', prefix: 'Realistic PBR 3D character, ', tip: 'Realistic — physically based materials, natural proportions' },
  { id: 'stylized', label: 'Stylized', emoji: '🎨', prefix: 'Stylized 3D character, ', tip: 'Stylized — enyhén eltúlzott arányok, tiszta formák' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎪', prefix: 'Cartoon-style 3D character, ', tip: 'Cartoon — exaggerated proportions, smooth surfaces' },
  { id: 'pixelated', label: 'Pixelated', emoji: '🟫', prefix: 'Pixelated voxel-style 3D character, ', tip: 'Pixelated — blocky geometry, voxel structure' },
  { id: 'lowpoly', label: 'Low-poly', emoji: '🔷', prefix: 'Low-poly 3D character, ', tip: 'Low-poly — visible polygon edges, flat shading' },
];

const fmtDate = (d) => {
  if (!d) return '';
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleString('hu-HU', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

// ── randomSeed alapból FALSE ──────────────────────────────────────────────────
const defaultParams = () => ({
  slat_cfg_scale: 3.0,
  ss_cfg_scale: 7.5,
  slat_sampling_steps: 25,
  ss_sampling_steps: 25,
  seed: 0,
  randomSeed: false,
});

// ── Gyors presetek ────────────────────────────────────────────────────────────
const TRELLIS_PRESETS = [
  {
    label: 'Ultra',
    emoji: '⚡',
    tip: 'Ultra gyors — alacsony minőség, ~15 mp',
    slat_cfg: 2.5, ss_cfg: 6.0,
    slat_steps: 8, ss_steps: 8,
  },
  {
    label: 'Gyors',
    emoji: '🚀',
    tip: 'Gyors — közepes minőség, ~20 mp',
    slat_cfg: 3.0, ss_cfg: 7.5,
    slat_steps: 12, ss_steps: 12,
  },
  {
    label: 'Normál',
    emoji: '⚖️',
    tip: 'Normál — jó minőség, ~30 mp',
    slat_cfg: 3.0, ss_cfg: 7.5,
    slat_steps: 25, ss_steps: 25,
  },
  {
    label: 'Minőség',
    emoji: '✨',
    tip: 'Magas minőség — ~50 mp',
    slat_cfg: 3.5, ss_cfg: 8.0,
    slat_steps: 40, ss_steps: 40,
  },
  {
    label: 'Max',
    emoji: '💎',
    tip: 'Maximum minőség — ~70 mp',
    slat_cfg: 4.0, ss_cfg: 9.0,
    slat_steps: 50, ss_steps: 50,
  },
];

// ── Prompt enhancer system prompt ─────────────────────────────────────────────
const ENHANCE_SYSTEM = `You are a friendly but strict prompt enhancer for 3D generative AI.
Task: Take a short or simple user prompt and turn it into a compact, visually clear 3D prompt (1–2 lines) suitable for all audiences.

Rules:
- Preserve the original character's visual intent, age, physique, and iconic features, but do not include copyrighted or licensed names
- The character must always be in a neutral T-pose (arms extended horizontally)
- Include precise body proportions for athletic or muscular characters (e.g., defined arms, shoulders, chest)
- Ensure the model is visually colorful with clear color separation (avoid monochrome or single-color outputs)
- Add subtle material and texture hints (fabric weave, matte metal, soft skin shading, etc.)
- Focus only on the character: exclude environment, lighting, background, or mood entirely
- You may add small natural creative details that enhance recognizability
- Completely block NSFW, sexual, or explicit content
- Replace known character names with neutral descriptive terms if necessary
- Always output something, even if the prompt is very short or vague
- Output only the enhanced prompt
- Keep it compact and Trellis-compatible`;

const DECHANTER_SYSTEM = `You are a strict prompt simplifier for 3D generative AI.
Task: Simplify a user prompt to be compact, safe, and generation-friendly for all audiences.

Rules:
- Preserve the original character's visual intent, age, physique, and iconic features, but do not include copyrighted or licensed names
- The character must always be in a neutral T-pose (arms extended horizontally)
- Include precise body proportions for athletic or muscular characters
- Ensure the character has clear, readable colors (avoid fully monochrome or single-tone models)
- Keep essential keywords only: subject, T-pose, body type, visibility, and subtle material/texture hints
- Focus only on the character: exclude environment, lighting, background, or mood entirely
- Completely block NSFW, sexual, or explicit content
- Replace known character names with neutral descriptive terms if necessary
- Always output something, even if the prompt is very short or vague
- Output only the simplified prompt
- Keep it compact, safe, and Trellis-compatible`;

// ── Standalone GLB fetcher ────────────────────────────────────────────────────
async function fetchGlbAsBlob(modelUrl, getIdToken) {
  if (!modelUrl) return null;
  if (modelUrl.startsWith('data:')) return modelUrl;

  let fetchUrl = modelUrl;

  if (modelUrl.startsWith('/api/')) {
    fetchUrl = `http://localhost:3001${modelUrl}`;
  } else if (modelUrl.startsWith('https://s3.') || modelUrl.includes('backblazeb2.com')) {
    fetchUrl = `http://localhost:3001/api/trellis/proxy?url=${encodeURIComponent(modelUrl)}`;
  }

  const token = getIdToken ? await getIdToken() : '';
  const r = await fetch(fetchUrl, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!r.ok) throw new Error(`GLB letöltés sikertelen (${r.status})`);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

// ── Firestore history helpers ─────────────────────────────────────────────────
const TRELLIS_COLLECTION = 'trellis_history';

async function loadHistoryFromFirestore(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, TRELLIS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(i => i.status === 'succeeded' && i.model_url);
  } catch (e) {
    console.error('Firestore load hiba:', e.message, e.code);
    return [];
  }
}

async function saveHistoryToFirestore(userId, item) {
  if (!userId) return null;
  try {
    const docRef = await addDoc(collection(db, TRELLIS_COLLECTION), {
      ...item,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.warn('Firestore history save failed:', e.message);
    return null;
  }
}

async function deleteHistoryFromFirestore(userId) {
  if (!userId) return;
  try {
    const q = query(
      collection(db, TRELLIS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, TRELLIS_COLLECTION, d.id)));
    await Promise.all(deletePromises);
  } catch (e) {
    console.warn('Firestore history delete failed:', e.message);
  }
}

function stripStylePrefix(prompt, styleId) {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style?.prefix) return prompt;
  if (prompt.startsWith(style.prefix)) return prompt.slice(style.prefix.length);
  return prompt;
}

// ── Helper: apply style prefix to a raw prompt ───────────────────────────────
function applyStylePrefix(rawPrompt, styleId) {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style?.prefix) return rawPrompt;
  return style.prefix + rawPrompt;
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  radius: { sm: 6, md: 10, lg: 14, xl: 18 },
  font: { xs: 9, sm: 10, md: 11, base: 12, lg: 13 },
  gap: { xs: 3, sm: 5, md: 8, lg: 12 },
};

function SectionLabel({ icon, children, color, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      marginBottom: 8, padding: '0 1px',
    }}>
      {icon && React.cloneElement(icon, {
        style: { width: 10, height: 10, color, flexShrink: 0 }
      })}
      <span style={{
        color: '#6b7280', fontSize: 9, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: "'SF Mono', monospace",
      }}>
        {children}
      </span>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  );
}

function Pill({ children, color, active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 9, fontWeight: 700, padding: '2px 7px',
      borderRadius: 999,
      background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
      color: active ? color : '#4b5563',
      border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.07)'}`,
      letterSpacing: '0.02em',
    }}>
      {children}
    </span>
  );
}

function Card({ children, style: extStyle, glow, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: T.radius.lg,
      overflow: 'hidden',
      boxShadow: glow ? `0 0 0 1px ${color}20, inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      ...extStyle,
    }}>
      {children}
    </div>
  );
}

function MiniSlider({ label, value, min, max, step, onChange, color, display }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          color: '#4b5563', fontSize: 9, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          fontFamily: "'SF Mono', monospace",
        }}>{label}</span>
        <span style={{ color, fontSize: 10, fontWeight: 800, fontFamily: "'SF Mono', monospace" }}>{display ?? value}</span>
      </div>
      <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          width: `${Math.min(100, pct)}%`, pointerEvents: 'none',
          boxShadow: `0 0 6px ${color}60`,
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange, min, max, color, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div>
          <span style={{ color: '#4b5563', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'SF Mono', monospace" }}>{label}</span>
          {hint && <span style={{ color: '#374151', fontSize: 9, display: 'block', marginTop: 1 }}>{hint}</span>}
        </div>
        <input
          type="number" min={min} max={max} value={value}
          onChange={e => {
            const v = Number(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          style={{
            width: 80, padding: '4px 9px', borderRadius: T.radius.sm,
            fontSize: 11, fontWeight: 700, color,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${color}25`,
            outline: 'none', textAlign: 'right', fontFamily: "'SF Mono', monospace",
            transition: 'border-color 0.2s',
          }}
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, margin: '0 0 1px' }}>{label}</p>
        {hint && <p style={{ color: '#374151', fontSize: 9, margin: 0 }}>{hint}</p>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        position: 'relative', width: 36, height: 20, borderRadius: 10,
        cursor: 'pointer', border: 'none',
        background: value ? color : 'rgba(255,255,255,0.08)',
        transition: 'background 0.2s', flexShrink: 0,
        boxShadow: value ? `0 0 10px ${color}50` : 'none',
      }}>
        <span style={{
          position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s', left: value ? 18 : 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </button>
    </div>
  );
}