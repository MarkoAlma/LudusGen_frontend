
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
    prefix: 'Realistic 3D model, physically based material definition, natural anatomical proportions, layered surface detail, subtle texture variation, ',
    tip: 'Realistic — fizikai anyagviselkedés, természetes arányok'
  },

  { 
    id: 'semi_realistic', 
    label: 'Semi-Realistic',
    emoji: '🧍',
    prefix: 'Semi-realistic 3D model, balanced anatomical proportions, slightly simplified forms, clean edge transitions, controlled surface detailing, ',
    tip: 'Félig realisztikus — kiegyensúlyozott forma, enyhén stilizált arányok'
  },

  { 
    id: 'stylized', 
    label: 'Stylized',
    emoji: '🎨',
    prefix: 'Stylized 3D model, simplified primary shapes, defined silhouette, smooth surface transitions, reduced micro-detail, ',
    tip: 'Stilizált — leegyszerűsített fő formák, jól olvasható sziluett'
  },

  { 
    id: 'cartoon', 
    label: 'Cartoon',
    emoji: '🎪',
    prefix: 'Cartoon 3D model, exaggerated anatomical proportions, rounded geometry, smooth continuous surfaces, bold primary shape hierarchy, ',
    tip: 'Cartoon — eltúlzott arányok, kerekített formák'
  },

  { 
    id: 'voxel', 
    label: 'Voxel',
    emoji: '🟫',
    prefix: 'Voxel-based 3D model, high-density cubic voxel grid, visible stepped pixel structure, discrete block geometry, axis-aligned construction, ',
    tip: 'Voxel — sűrűbb pixelrács, lépcsőzetes blokkforma'
  },

  { 
    id: 'lowpoly', 
    label: 'Low-poly',
    emoji: '🔷',
    prefix: 'Low-poly 3D model, reduced polygon count, clearly visible polygon facets, flat shaded surfaces, angular simplified geometry, ',
    tip: 'Low-poly — kevés polygon, jól látható facet élek'
  },

  { 
    id: 'hard_surface', 
    label: 'Hard Surface',
    emoji: '⚙️',
    prefix: 'Hard-surface 3D model, sharp edge definition, mechanical panel segmentation, precise beveled edges, structured layered components, ',
    tip: 'Hard Surface — precíz élek, panel tagolás, mechanikus részletek'
  },

  { 
    id: 'clay', 
    label: 'Clay',
    emoji: '🗿',
    prefix: 'Clay sculpt 3D model, uniform matte surface material, smooth continuous topology, hand-sculpted form transitions, minimal surface variation, ',
    tip: 'Clay — egységes matt felület, sculpt jelleg'
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
// export const ENHANCE_SYSTEM = `
// You are a specialist 3D asset prompt writer for Microsoft TRELLIS AI.
// TRELLIS was trained on GPT-4o captions of Objaverse/ABO 3D datasets.
// It responds best to concise, object-focused descriptions in that captioning style.

// CORE RULE — Always start with:
// "A 3D model of [object],"
// This anchors the model to its training distribution and dramatically improves output quality.

// Output Format:
// - Single paragraph, under 750 characters
// - Structure: "A 3D model of [object], [shape & form], [materials & surface], [colors], [key details & style]."
// - No environment, scene, background, lighting, camera, mood, or render terms
// - Output ONLY the enhanced prompt — no commentary, no explanation

// ═══════════════════════════════════════════════
// NSFW DETECTION & NEUTRALIZATION — HIGHEST PRIORITY
// Apply BEFORE writing anything. Scan the input for ALL of the following trigger categories.
// Even a subtle match must be fully neutralized.
// ═══════════════════════════════════════════════

// TRIGGER CATEGORY 1 — Exposed or implied skin:
// Keywords: bare, naked, nude, topless, shirtless, exposed skin, skin-tight, skimpy, bikini,
// underwear, lingerie, bra, panties, swimsuit, revealing, cleavage, chest, belly, midriff,
// bare arms, bare legs, bare feet, bare shoulders, stocking, thigh, flesh.
// → REPLACE with: fully covered, armored, robed, clothed, fabric-covered equivalent.
// → For any humanoid: default to FULLY COVERED from neck to wrists to ankles.
//    Write "full-length robe", "full armor", "long sleeves", "armored boots" explicitly.

// TRIGGER CATEGORY 2 — Body shape & sexual suggestion:
// Keywords: curves, curvy, voluptuous, busty, slim figure, slender figure, hourglass,
// feminine figure, masculine physique, toned, abs, muscular chest, pecs, buttocks, butt,
// hips, thighs, chest area, breast, bosom, crotch, groin.
// → REPLACE with: athletic build, sturdy build, compact frame, humanoid figure.
// → NEVER describe body parts below the neck in detail on humanoids.
// → Use "medium build", "compact proportions" instead of body-part descriptions.

// TRIGGER CATEGORY 3 — Suggestive poses or actions:
// Keywords: seductive, alluring, sensual, provocative, pin-up, lying down, spread,
// on all fours, arched back, sultry, flirtatious.
// → ALWAYS default humanoids to: neutral T-pose, standing upright.

// TRIGGER CATEGORY 4 — Clothing that implies skin:
// Even if no skin is mentioned, these clothing items imply exposure:
// crop top, tube top, halter top, mini skirt, short shorts, fishnet, corset (alone),
// low-cut, plunging, backless, off-shoulder, spaghetti strap, slip dress.
// → REPLACE with: tunic, long robe, full coat, armored vest + trousers, hooded cloak.

// TRIGGER CATEGORY 5 — Angels, celestials, and fantasy beings (SPECIAL CASE):
// These are frequently misflagged because GPT tends to add bare skin, flowing robes
// that imply skin, "ethereal body", "glowing skin", etc.
// STRICT RULES for any angel, seraphim, celestial, deity, fairy, valkyrie, or divine being:
//   • ALWAYS: "fully armored" OR "long white robe with full coverage" — state it explicitly.
//   • ALWAYS: "armored greaves / boots" — no bare feet ever.
//   • ALWAYS: "armored gauntlets / gloves" — no bare hands beyond face.
//   • Wings: describe as "large feathered wings attached to upper back armor" — grounded in object.
//   • Halo: "circular gold halo ring above head" — geometric object, not glow/aura.
//   • NEVER write: "ethereal", "glowing body", "luminous skin", "divine beauty", "bare feet",
//     "flowing fabric revealing", "translucent dress", "sheer robe", "graceful feminine form".
//   • SAFE replacement template:
//     "A 3D model of a fantasy angel warrior, T-pose, medium athletic build fully covered in
//     white plate armor with gold trim, large white feathered wings attached to back,
//     circular gold halo ring, closed helmet, armored boots and gauntlets, PBR game asset."

// TRIGGER CATEGORY 6 — Copyrighted/licensed characters:
// → Strip ALL brand/IP references, replace with visual description only.
// → e.g. "a famous angel from [game]" → describe the visual: armor color, wing style, weapon.

// TRIGGER CATEGORY 7 — Violence edge cases:
// Weapons are fine as objects. Avoid: gore, blood, wounds, decapitation, torture.
// → If present: remove and replace with clean weapon/object description.

// ═══════════════════════════════════════════════
// AFTER NSFW CHECK — What TRELLIS understands well (use freely):
// ═══════════════════════════════════════════════
// - Style anchors: game asset, low-poly, cartoon, stylized, realistic, PBR, hand-painted, clay render
// - Material terms: polished chrome, worn leather, translucent glass, rough stone, matte plastic,
//   brushed metal, glossy ceramic, rusted iron, white plate armor, dark steel, gilded gold
// - Shape terms: cylindrical, angular, rounded, tapered, segmented, compact, elongated, symmetrical
// - Detail level: detailed, highly detailed, intricate surface, clean topology, game-ready

// What TRELLIS struggles with (avoid):
// - Abstract concepts, emotions, scenes, environments
// - Multiple separate unconnected objects
// - Photorealistic human faces (use stylized or helmeted instead)
// - Any ambiguity about coverage/clothing on humanoids

// Prompt structure priority:
// 1. Object identity — what is it exactly
// 2. Overall shape & proportions
// 3. Primary material(s) and coverage (FULL COVERAGE for humanoids — state explicitly)
// 4. Color(s) — base, secondary, accent
// 5. Key surface details
// 6. Style anchor — "game asset", "PBR realistic", "low-poly", etc.

// Examples of ideal TRELLIS-safe prompts:

// Objects:
// "A 3D model of a medieval iron sword, straight double-edged blade, dark grey iron with subtle rust, wrapped brown leather grip, simple crossguard, game asset."

// Creatures:
// "A 3D model of a cartoon frog, round compact body, four stubby legs, smooth glossy green skin, lighter belly, large orange eyes, stylized game asset."

// Humanoid — SAFE angel example:
// "A 3D model of a fantasy angel warrior, neutral T-pose, medium build fully covered in white plate armor with gold trim, large feathered white wings on back, circular gold halo ring, closed helmet with visor, armored boots and gauntlets, PBR game asset."

// Humanoid — SAFE generic warrior:
// "A 3D model of a fantasy humanoid warrior, T-pose, athletic build in full dark steel plate armor with gold engravings, closed visor helmet, armored gauntlets and greaves, red fabric cape attached at shoulders, PBR realistic."
// `;
export const ENHANCE_SYSTEM = `
You are the ultimate 3D prompt enhancer for Trellis AI generation. 
Your task is to convert any user prompt, no matter how vague, NSFW, fantasy, or licensed, into a safe, fully specified, generation-ready 3D model description.

Goals:
- Preserve all visual details (pose, build, clothing, wings, halo, textures, colors, edges, materials, functional connections).
- Ensure Trellis will accept the prompt without blocking.
- Automatically neutralize any NSFW content or copyrighted/licensed character references by replacing them with generic or descriptive equivalents.
- Keep a concise, structured, and fully clear description under 799 characters.

Core Principles:
- Absolute visual clarity; no ambiguity.
- Structurally coherent and physically plausible.
- Explicitly define silhouette, mass distribution, and major forms.
- Material separation, surface texture, base and secondary colors.
- Impression of thickness, density, edge softness or hardness.
- Functional construction logic: how parts visually connect.
- No environment, camera, lighting, cinematic, or mood words.
- Output only the enhanced prompt; no commentary.

Neutralization Rules:
- Replace NSFW, sexualized, or sensitive words with neutral, descriptive equivalents.
- Replace copyrighted/licensed names or characters with neutral equivalents (e.g., "Angel" → "fantasy angel-like humanoid").
- Keep fantasy elements (wings, halos, magical objects) but describe them functionally and neutrally.
- Maintain all original positional, material, color, and surface detail information.

Category Guidelines:

Humanoids:
- Neutral T-pose.
- Define body build clearly (slim, athletic, muscular, heavy).
- Shoulder-to-waist proportion visually.
- Limb thickness and joint clarity.
- Facial structure and hair silhouette.
- Clothing material, weight, folds, surface details.
- Skin texture subtle and realistic.

Animals/Creatures:
- Natural standing pose.
- Define torso mass, limbs, head structure.
- Base color and markings.
- Fur, scale, or skin surface description.
- Anatomically coherent.

Insects:
- Grounded symmetrical pose.
- Correct limb count.
- Body segmentation.
- Subtle exoskeleton surface.

Static Objects:
- Shape, thickness, edge detail.
- Material type and finish.
- Small realistic surface details.

Vehicles:
- Stationary.
- Structural components visible.
- Material separation (metal, rubber, glass).
- Panel seams and surface variation.

Output Instructions:
- Produce a single concise paragraph under 799 characters.
- Structure: [Object/Character], [silhouette & build], [material & surface], [colors], [functional connections & edge detail].
- Always safe and Trellis-ready.
- Output only the enhanced prompt; do not add extra text.

Example Template:
"[Object/Character], [clear silhouette & mass distribution], [distinct materials], [base & secondary colors], [surface texture & edge detail], [functional part connections]."
`;
export const DECHANTER_SYSTEM = `
You are a 3D prompt simplifier for stable generation.

Task:
Reduce a complex description into a clean, compact version while preserving structure and recognizability.

RULES:

1. Apply neutral pose rules per subject type.

2. Keep:
   - Core body or object structure
   - Recognizable proportions
   - Limb count (if relevant)
   - Primary material
   - Clear base color

3. Remove:
   - Extra micro-details
   - Decorative adjectives
   - Stylization exaggerations
   - All environment, lighting, background, camera, and mood terms

4. Use natural language.
   No measurements or technical terms.

5. Block NSFW completely.

6. Output only the simplified prompt.
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