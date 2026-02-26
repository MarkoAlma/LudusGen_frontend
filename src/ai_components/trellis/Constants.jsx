
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
  { 
    id: 'nostyle', 
    label: 'No Style', 
    emoji: '🎯', 
    prefix: '', 
    tip: 'Semleges — nem ad hozzá stílus prefixet' 
  },

  { 
    id: 'realistic', 
    label: 'Realistic', 
    emoji: '📷', 
    prefix: 'Realistic PBR 3D model, physically based materials, natural proportions, subtle surface detail, ', 
    tip: 'Realistic — PBR anyagok, természetes arányok, finom textúra' 
  },

  { 
    id: 'semi_realistic', 
    label: 'Semi-Realistic', 
    emoji: '🧍', 
    prefix: 'Semi-realistic 3D model, slightly stylized proportions, clean topology, soft material definition, ', 
    tip: 'Félig realisztikus — tiszta forma, enyhén stilizált arányok' 
  },

  { 
    id: 'stylized', 
    label: 'Stylized', 
    emoji: '🎨', 
    prefix: 'Stylized 3D model, simplified shapes, clean silhouette, smooth materials, balanced proportions, ', 
    tip: 'Stilizált — tiszta formák, jól olvasható sziluett' 
  },

  { 
    id: 'cartoon', 
    label: 'Cartoon', 
    emoji: '🎪', 
    prefix: 'Cartoon-style 3D model, exaggerated proportions, smooth surfaces, bold readable shapes, ', 
    tip: 'Cartoon — eltúlzott arányok, sima felületek' 
  },

  { 
    id: 'voxel', 
    label: 'Voxel', 
    emoji: '🟫', 
    prefix: 'Voxel-style 3D model, block-based geometry, cubic structure, sharp edges, ', 
    tip: 'Voxel — kockás, blokk alapú geometria' 
  },

  { 
    id: 'lowpoly', 
    label: 'Low-poly', 
    emoji: '🔷', 
    prefix: 'Low-poly 3D model, visible polygon facets, flat shading, simplified geometry, ', 
    tip: 'Low-poly — kevés polygon, sík árnyalás' 
  },

  { 
    id: 'hard_surface', 
    label: 'Hard Surface', 
    emoji: '⚙️', 
    prefix: 'Hard-surface 3D model, precise edges, mechanical detailing, clean panel lines, structured geometry, ', 
    tip: 'Hard Surface — mechanikus, éles élek, panel részletek' 
  },

  { 
    id: 'clay', 
    label: 'Clay Render', 
    emoji: '🗿', 
    prefix: 'Clay-style 3D model, matte surface, uniform material, smooth sculpted form, ', 
    tip: 'Clay — egyszínű matt forma, sculpt jellegű' 
  }
];
export const TRELLIS_PRESETS = [
  {
    label: 'Ultra gyors',
    emoji: '⚡',
    tip: 'Ultra gyors — alacsony minőség, ~15 mp',
    slat_cfg: 4.0, ss_cfg: 4.0,
    slat_steps: 20, ss_steps: 20,
  },
  {
    label: 'Gyors',
    emoji: '🚀',
    tip: 'Gyors — közepes minőség, ~20 mp',
    slat_cfg: 5.0, ss_cfg: 4.0,
    slat_steps: 20, ss_steps: 25,
  },
  {
    label: 'Normál',
    emoji: '⚖️',
    tip: 'Normál — jó minőség, ~30 mp',
    slat_cfg: 6.0, ss_cfg: 5.0,
    slat_steps: 30, ss_steps: 25,
  },
  {
    label: 'Minőség',
    emoji: '✨',
    tip: 'Magas minőség — ~50 mp',
    slat_cfg: 7.5, ss_cfg: 5.0,
    slat_steps: 25, ss_steps: 18,
  },
  {
    label: 'Max',
    emoji: '💎',
    tip: 'Maximum minőség — ~70 mp',
    slat_cfg: 7.6, ss_cfg: 5.5,
    slat_steps: 25, ss_steps: 24,
  },
];
export const ENHANCE_SYSTEM = `You are a friendly but strict prompt enhancer for 3D generative AI.
Task: Take a short user prompt and produce a compact, visually clear 3D prompt suitable for all audiences.

Rules:

1. Detect subject category precisely:

- Humanoid characters:
  Use neutral T-pose. Preserve body proportions, age, physique, and iconic features.
  Add subtle material hints (fabric, skin texture, hair strands).
  Clear, readable colors.

- Quadruped animals:
  Use natural neutral standing pose, weight evenly distributed on four legs.
  Preserve anatomical proportions.
  Subtle fur/skin details. Clear colors.

- Insects / spiders / arthropods:
  Use natural grounded pose with symmetrical leg spread.
  Preserve correct limb count and segmentation.
  Subtle exoskeleton texture, fine surface details.

- Serpents / worms:
  Relaxed natural resting curve.
  Preserve body length and thickness.
  Subtle scale or skin texture.

- Birds:
  Neutral standing posture with folded wings.
  Preserve wing proportion and beak shape.

- Static objects (fruit, tools, weapons, furniture, props):
  No pose language.
  Preserve shape, scale, and functional structure.
  Add subtle material hints (wood grain, brushed metal, matte plastic, glass transparency, surface wear).

- Vehicles:
  Stationary default position.
  Preserve proportions, wheel count, structure.
  Subtle surface materials (metal panels, rubber tires, glass).

2. Focus only on the subject.
   Exclude environment, lighting, background, scene composition, and mood entirely.

3. Add small natural details that improve recognizability,
   but do not over-describe.

4. Completely block NSFW, sexual, or explicit content.

5. Replace copyrighted or known character names
   with neutral descriptive equivalents.

6. Always output something even if the prompt is vague.

7. Output only the enhanced prompt.

8. Keep it compact and Trellis-compatible.
`;
export const DECHANTER_SYSTEM = `You are a strict prompt simplifier for 3D generative AI.
Task: Simplify a user prompt to be compact, safe, and generation-friendly.

Rules:

1. Detect subject type correctly:

- Humanoid → neutral T-pose.
- Quadruped → natural standing on four legs.
- Insect / spider → grounded symmetrical leg spread.
- Serpent → relaxed resting curve.
- Bird → neutral standing with folded wings.
- Static object → no pose wording.
- Vehicle → stationary default position.

2. Keep only essential information:
   subject type,
   body/object structure,
   limb count (if relevant),
   neutral posture (only if biologically meaningful),
   subtle material hints,
   clear color.

3. Remove:
   environment,
   lighting,
   background,
   mood,
   camera terms,
   unnecessary adjectives.

4. Block NSFW or explicit content completely.

5. Replace known characters with neutral descriptive terms.

6. Always output something.

7. Output only the simplified prompt.

8. Keep it compact, safe, and Trellis-friendly.
`;
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