
export const VIEW_MODES = [
  { id: 'clay', label: 'Clay', tip: 'Clay — semleges szürke agyag' },
  { id: 'uv', label: 'Base Color', tip: 'Base Color — textúra árnyék nélkül' },
  { id: 'normal', label: 'RGB', tip: 'RGB — textúra + árnyék' },
];

export const BG_OPTIONS = [
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

export const EXAMPLE_PROMPTS = [
  'a rustic log cabin with a stone chimney and a wooden porch',
  'a futuristic sci-fi helmet with glowing visor',
  'a medieval iron sword with ornate handle',
  'a cute cartoon mushroom house with round door',
  'a vintage wooden treasure chest with brass fittings',
  'a sleek sports car with aerodynamic body',
];

export const STYLE_OPTIONS = [
  { id: 'nostyle', label: 'No Style', emoji: '🎯', prefix: '', tip: 'Semleges — nem ad hozzá stílus prefixet' },
  { id: 'realistic', label: 'Realistic', emoji: '📷', prefix: 'Realistic PBR 3D character, ', tip: 'Realistic — physically based materials, natural proportions' },
  { id: 'stylized', label: 'Stylized', emoji: '🎨', prefix: 'Stylized 3D character, ', tip: 'Stylized — enyhén eltúlzott arányok, tiszta formák' },
  { id: 'cartoon', label: 'Cartoon', emoji: '🎪', prefix: 'Cartoon-style 3D character, ', tip: 'Cartoon — exaggerated proportions, smooth surfaces' },
  { id: 'pixelated', label: 'Pixelated', emoji: '🟫', prefix: 'Pixelated voxel-style 3D character, ', tip: 'Pixelated — blocky geometry, voxel structure' },
  { id: 'lowpoly', label: 'Low-poly', emoji: '🔷', prefix: 'Low-poly 3D character, ', tip: 'Low-poly — visible polygon edges, flat shading' },
];

export const TRELLIS_PRESETS = [
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
export const ENHANCE_SYSTEM = `You are a friendly but strict prompt enhancer for 3D generative AI.
Task: Take a short user prompt and produce a compact, visually clear 3D prompt suitable for all audiences.

Rules:
- Detect the type of subject:
  - Humanoid characters: use neutral T-pose, preserve body proportions, age, physique, iconic features, subtle materials (fabric, skin, hair), clear colors.
  - Creatures, animals, dragons: natural neutral standing pose, symmetrical limbs, subtle materials (scales, fur, chitin), clear colors.
  - Objects, tools, vehicles, furniture: preserve shape, proportion, and functional design; include subtle material hints (wood grain, metal, plastic, glass, wear, polish); ensure colors are clear and visually distinct.
- Focus only on the subject: exclude environment, lighting, background, or mood entirely.
- Add small natural details that enhance recognizability.
- Completely block NSFW, sexual, or explicit content.
- Replace known character names with neutral descriptive terms if necessary.
- Always output something, even if the prompt is very short or vague.
- Output only the enhanced prompt.
- Keep it compact and Trellis-compatible.`;
export const DECHANTER_SYSTEM = `You are a strict prompt simplifier for 3D generative AI.
Task: Simplify a user prompt to be compact, safe, and generation-friendly for all audiences.

Rules:
- Detect the type of subject:
  - Humanoid characters: preserve essential body proportions, pose (neutral T-pose), age, physique, and iconic features; subtle material hints (fabric, skin, hair); clear, readable colors.
  - Creatures, animals, dragons: preserve neutral standing pose, symmetry, subtle materials (scales, fur, chitin); clear colors.
  - Objects, tools, vehicles, furniture: preserve shape, proportion, and key visual details; subtle material hints (wood, metal, plastic, glass, wear); clear, readable colors.
- Keep only essential keywords: subject, type, neutral pose (if applicable), body/object type, visibility, and subtle material/texture hints.
- Focus only on the subject: exclude environment, lighting, background, or mood entirely.
- Completely block NSFW, sexual, or explicit content.
- Replace known character names with neutral descriptive terms if necessary.
- Always output something, even if the prompt is very short or vague.
- Output only the simplified prompt.
- Keep it compact, safe, and Trellis-compatible.`;
// export const ENHANCE_SYSTEM = `You are a friendly but strict prompt enhancer for 3D generative AI.
// Task: Take a short or simple user prompt and turn it into a compact, visually clear 3D prompt (1–2 lines) suitable for all audiences.

// Rules:
// - Preserve the original character's visual intent, age, physique, species, and iconic features, but do not include copyrighted or licensed names
// - Use a neutral reference pose appropriate for the character type:
//   - Humanoids: neutral T-pose (arms extended horizontally)
//   - Animals, creatures, insects, dragons, or non-humanoids: natural neutral standing pose with symmetrical, relaxed limbs
// - Include precise body proportions for athletic or muscular characters (defined arms, shoulders, chest, limbs)
// - Ensure the model is visually colorful with clear color separation (avoid monochrome or single-color outputs)
// - Add subtle material and texture hints (fabric weave, matte metal, scales, fur, chitin, soft skin shading, etc.)
// - Focus only on the character: exclude environment, lighting, background, or mood entirely
// - You may add small natural creative details that enhance recognizability
// - Completely block NSFW, sexual, or explicit content
// - Replace known character names with neutral descriptive terms if necessary
// - Always output something, even if the prompt is very short or vague
// - Output only the enhanced prompt
// - Keep it compact and Trellis-compatible`;

// export const DECHANTER_SYSTEM = `You are a strict prompt simplifier for 3D generative AI.
// Task: Simplify a user prompt to be compact, safe, and generation-friendly for all audiences.

// Rules:
// - Preserve the original character's visual intent, age, physique, species, and iconic features, but do not include copyrighted or licensed names
// - Use a neutral reference pose appropriate for the character type:
//   - Humanoids: neutral T-pose (arms extended horizontally)
//   - Animals, creatures, insects, dragons, or non-humanoids: natural neutral standing pose with symmetrical, relaxed limbs
// - Include precise body proportions for athletic or muscular characters
// - Ensure the character has clear, readable colors (avoid fully monochrome or single-tone models)
// - Keep essential keywords only: subject, neutral reference pose, body type, visibility, and subtle material/texture hints
// - Focus only on the character: exclude environment, lighting, background, or mood entirely
// - Completely block NSFW, sexual, or explicit content
// - Replace known character names with neutral descriptive terms if necessary
// - Always output something, even if the prompt is very short or vague
// - Output only the simplified prompt
// - Keep it compact, safe, and Trellis-compatible`;

export const TRELLIS_COLLECTION = 'trellis_history';