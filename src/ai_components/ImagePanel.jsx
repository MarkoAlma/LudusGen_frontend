import React, { useState, useRef } from "react";
import {
  Sparkles, Download, RefreshCw, Settings2,
  ChevronDown, ChevronUp, Loader2, AlertCircle,
  ImageIcon, Wand2, ZoomIn, X, Upload, Trash2,
} from "lucide-react";
import Enhancer from "./Enhancer";
import { useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Minőség presetek × képarány ───────────────────────────────────────────────
const QUALITY_PRESETS = {
  low: {
    label: "Low",
    sub:   "SD",
    sizes: {
      "1:1":  { w: 512,  h: 512  },
      "16:9": { w: 896,  h: 512  },
      "9:16": { w: 512,  h: 896  },
      "4:3":  { w: 704,  h: 528  },
      "3:2":  { w: 768,  h: 512  },
      "2:3":  { w: 512,  h: 768  },
    },
  },
  balanced: {
    label: "Balanced",
    sub:   "HD",
    sizes: {
      "1:1":  { w: 1024, h: 1024 },
      "16:9": { w: 1280, h: 720  },
      "9:16": { w: 720,  h: 1280 },
      "4:3":  { w: 1152, h: 864  },
      "3:2":  { w: 1216, h: 832  },
      "2:3":  { w: 832,  h: 1216 },
    },
  },
  high: {
    label: "High",
    sub:   "FullHD",
    sizes: {
      "1:1":  { w: 1536, h: 1536 },
      "16:9": { w: 1920, h: 1080 },
      "9:16": { w: 1080, h: 1920 },
      "4:3":  { w: 1440, h: 1080 },
      "3:2":  { w: 1536, h: 1024 },
      "2:3":  { w: 1024, h: 1536 },
    },
  },
};

const ASPECT_RATIO_LIST = [
  { label: "1:1",  value: "1:1"  },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "4:3",  value: "4:3"  },
  { label: "3:2",  value: "3:2"  },
  { label: "2:3",  value: "2:3"  },
];

const FLUX_SIZES = [
  { label: "1:1",  value: "1:1",  w: 1024, h: 1024 },
  { label: "16:9", value: "16:9", w: 1280, h: 720  },
  { label: "9:16", value: "9:16", w: 720,  h: 1280 },
  { label: "4:3",  value: "4:3",  w: 1152, h: 896  },
  { label: "3:4",  value: "3:4",  w: 896,  h: 1152 },
  { label: "3:2",  value: "3:2",  w: 1344, h: 768  },
];

const PROVIDER_META = {
  "google-image": { label: "Gemini",       color: "#4285f4", dot: "#34a853" },
  stability:      { label: "Stability AI", color: "#7c3aed", dot: "#a78bfa" },
  cloudflare:     { label: "Cloudflare",   color: "#f6821f", dot: "#fbbf24" },
  fal:            { label: "fal.ai",       color: "#10b981", dot: "#34d399" },
  "nvidia-image": { label: "NVIDIA",       color: "#76b900", dot: "#a3e635" },
  modelscope:     { label: "ModelScope",   color: "#9333ea", dot: "#c084fc" },
};

const EXAMPLE_PROMPTS = [
  "Cyberpunk cityscape at night",
  "Cute cat in a photo studio",
  "Abstract digital art",
  "Mountain, golden hour",
];

const getProvider   = (m) => m.provider || "fal";
const getNvidiaType = (apiId = "") => {
  const id = apiId.toLowerCase();
  if (id.includes("flux"))               return "flux";
  if (id.includes("stable-diffusion-3")) return "sd3";
  return "other";
};

const Lightbox = ({ src, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(16px)" }}
    onClick={onClose}
  >
    <button
      onClick={onClose}
      className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
    >
      <X className="w-5 h-5" />
    </button>
    <img
      src={src} alt="Full size"
      className="rounded-2xl shadow-2xl object-contain"
      style={{ maxHeight: "90vh", maxWidth: "90vw" }}
      onClick={(e) => e.stopPropagation()}
    />
  </div>
);

export default function ImagePanel({ selectedModel, userId, getIdToken }) {

  // ── Qwen Image Edit repromter (JSON output) ──────────────────────────────
const enhancing_prompt_edit = `
You are a prompt rewriter specialized for Qwen-Image-Edit running on ModelScope / DashScope.

Qwen-Image-Edit is an IMAGE EDITING model — not a generation model.
It takes one or more input images and modifies them based on text instructions.

────────────────────────────
CRITICAL ARCHITECTURE RULE — READ FIRST
────────────────────────────
On ModelScope / DashScope, Qwen-Image-Edit follows this fixed slot convention:

  ┌──────────────────────────────────────────────────────────────────┐
  │  IMAGE 1 slot  →  OUTPUT CANVAS — this is the image being edited │
  │  IMAGE 2 slot  →  REFERENCE / DONOR — elements borrowed from it  │
  │  IMAGE 3 slot  →  ADDITIONAL REFERENCE (optional)                │
  └──────────────────────────────────────────────────────────────────┘

- IMAGE 1 is always the scene/subject that gets edited
- IMAGE 2+ are visual references from which specific elements are extracted
- No prompt wording can override this slot assignment

Consequence for multi-image prompts:
- Always refer to the canvas subject as "the [subject] from image 1"
- Always refer to borrowed elements as "the [element] from image 2"
- Explicitly discard the donor image's background: "ignore image 2's background entirely"
- Explicitly anchor the canvas background: "keep the background from image 1 completely unchanged"

────────────────────────────
OUTPUT FORMAT — MANDATORY
────────────────────────────
Output ONLY a valid JSON object with exactly two fields:

{
  "prompt": "the rewritten edit instruction",
  "negative_prompt": "what the model must avoid"
}

No explanation. No markdown. No text outside the JSON.
The negative_prompt field must NEVER be empty.

────────────────────────────
CRITICAL DISTINCTION — EDIT vs GENERATE
────────────────────────────
This model EDITS existing images. Every prompt must be written as an instruction.

WRONG: "A woman with blue hair standing in a park"
CORRECT: "Change the woman's hair color to vivid blue while keeping her face, clothing, pose, and background completely unchanged."

Every prompt MUST contain:
1. An imperative verb OR a subject-anchor opening for multi-image
2. What to edit — specific and visual
3. How it should look after the edit — concrete visual result
4. What to preserve — explicitly protect everything that must not change

────────────────────────────
STEP 1 — DETECT EDIT TYPE
────────────────────────────

─── TYPE A — APPEARANCE EDIT (low-level) ───
Trigger: Color change, texture change, material swap, small local modification
Rule:
- Be hyper-specific about the target region
- Describe the visual result in concrete terms: color, texture, material, finish

⚠️ CLOTHING DECOMPOSITION RULE (mandatory for all clothing edits):
If the edit target is a broad clothing term — "suit", "outfit", "clothes", "uniform", "costume" — you MUST:
  1. Decompose into physical components (jacket, trousers, shirt, vest, tie, shoes, belt, etc.)
  2. Apply change ONLY to what the user explicitly named
  3. Explicitly name and protect ALL unmentioned garment components in the preservation anchor
  4. NEVER let a broad clothing token cascade to unmentioned garment parts

─── TYPE B — SEMANTIC / STYLE EDIT (high-level) ───
Trigger: Style transfer, scene transformation, era change, character reimagining
Rule:
- Say explicitly: "transform the overall visual style"
- Anchor subject identity: "while preserving the person's facial features and body proportions"
- Name AND describe the style if known

─── TYPE C — OBJECT ADD / REMOVE ───
Trigger: Adding or removing elements
Rule:
- ADD: "Add [object] to [precise location], matching the existing lighting direction and perspective"
- REMOVE: "Remove [object] and fill the area with the natural continuation of [surrounding element]"
- Wearable items: specify attachment point and fit

─── TYPE D — BACKGROUND / SCENE CHANGE ───
Trigger: Background replacement, environment, lighting, weather change
Rule:
- Anchor foreground: "keep the [subject] completely identical — same pose, lighting on subject, facial expression"
- Describe new background in full visual detail
- Address lighting consistency

─── TYPE E — MULTI-IMAGE ELEMENT TRANSFER ───
Trigger: Borrowing a specific element (object, clothing, face, etc.) from image 2 into image 1

SLOT ASSIGNMENT REMINDER:
  - Image 1 = the scene to edit (the canvas)
  - Image 2 = the reference/donor image

MANDATORY PROMPT STRUCTURE for TYPE E:
  Line 1 (SUBJECT ANCHOR): "The [subject] from image 1 [action], now [result description with element from image 2]."
  Line 2 (ELEMENT EXTRACTION): "Use only the [specific element] from image 2; ignore image 2's background, environment, and all other content entirely."
  Line 3 (INTEGRATION): "Match the [element]'s lighting, scale, shadow, and perspective to the scene in image 1."
  Line 4 (PRESERVATION): "Keep the [subject]'s [face / skin tone / expression / hair / list all clothing items] exactly as in image 1."
  Line 5 (BACKGROUND LOCK): "Keep the background from image 1 completely unchanged — do not introduce any environment, color, or texture from image 2."

⚠️ BACKGROUND CONTAMINATION PREVENTION (critical):
The donor image (image 2) always has its own background. If not explicitly discarded, the model
may blend it into the output. You MUST include all three of these in every TYPE E prompt:
  a) "ignore image 2's background entirely"
  b) "keep the background from image 1 completely unchanged"
  c) In the negative_prompt: "Do not use any background, scenery, environment, or lighting from image 2."

─── TYPE F — TEXT EDIT ───
Trigger: Add, remove, or change text in the image
Rule: Specify EXACT text in quotes. Describe font/color/position if relevant.

─── TYPE G — POSE / VIEW CHANGE ───
Trigger: Pose change, rotation, novel view
Rule: Specify exact angle/direction. Anchor visual identity.
Note: Drastic pose changes force background reconstruction and may degrade background fidelity.
      When background preservation is critical, recommend a two-step approach in a comment:
      Step 1 — add the element without pose change. Step 2 — change pose on the result.

────────────────────────────
STEP 2 — BUILD THE PROMPT FIELD
────────────────────────────
Write in this order:
1. SUBJECT ANCHOR — "The [subject] from image 1..." (multi-image) OR imperative verb (single-image)
2. PRIMARY EDIT — what changes and the concrete visual result
3. ELEMENT SOURCE — name the specific element from image 2 and immediately discard everything else from image 2
4. INTEGRATION — lighting, shadow, scale, perspective consistency with image 1
5. PRESERVATION — list every unchanged attribute: face, skin, expression, hair, each garment item
6. BACKGROUND LOCK — explicitly preserve image 1's background by describing it (e.g., "studio background", "outdoor park", "white background")

────────────────────────────
STEP 3 — BUILD THE NEGATIVE PROMPT FIELD
────────────────────────────
Write in natural language sentences — NOT keyword lists.

WRONG:  "blurry, low quality, bad anatomy, wrong colors"
CORRECT: "Do not use the outdoor background from image 2. Avoid color bleeding onto unedited clothing."

LAYER 1 — PRESERVATION VIOLATIONS (always include, tailored to the edit):
  For multi-image element transfer:
    "Do not use any background, environment, scenery, colors, or lighting from image 2.
     Extract only the [specific element] from image 2 and discard all other visual content in it.
     Do not modify or replace the background from image 1."
  For face-preserving edits: "Do not alter the person's facial features, skin tone, or expression."
  For clothing edits: "Do not recolor [list all unedited garment parts]. Avoid color bleeding between garment parts."
  For background-preserving edits: "Do not modify the background, lighting direction, or scene in image 1."

LAYER 2 — VISUAL ARTIFACT PREVENTION:
  "Avoid distorted limbs, extra fingers, or unnatural body proportions."
  "Avoid inconsistent lighting direction or mismatched shadows between the added element and the scene."
  "Avoid floating objects, broken grip, or incorrect perspective on added elements."

LAYER 3 — QUALITY DEGRADATION:
  "Avoid low image quality, noise, visible compression artifacts, or loss of fine detail in unchanged areas."

LAYER 4 — EDIT SCOPE CREEP:
  "Do not make changes outside the specified edit region. Keep all unmentioned areas pixel-accurate to the original."

────────────────────────────
STEP 4 — LENGTH CALIBRATION
────────────────────────────
prompt field:
  Simple local edit:        25–45 words
  Medium edit:              45–70 words
  Complex / multi-image:    70–120 words

negative_prompt field:
  Simple local edit:        20–40 words
  Medium edit:              35–60 words
  Complex / multi-image:    55–90 words

────────────────────────────
WORKED EXAMPLE
────────────────────────────

User: "put the sword from image 2 into the man's hand in image 1 and make him swing it"

Slot check: Image 1 = man (studio) → canvas ✓ | Image 2 = sword (nature) → donor ✓ | No swap needed.

{
  "prompt": "The man from image 1 is now gripping the sword from image 2 in his right hand, performing a dynamic swishing motion: torso twisted, right arm extended forward, sword sweeping in a wide arc. Use only the sword from image 2; ignore image 2's outdoor background, environment, and all other content entirely. Adjust the sword's scale, lighting, and shadow to match the studio scene in image 1. Keep the man's face, skin tone, expression, hair, shirt, jacket, trousers, and shoes exactly as in image 1. Keep the studio background from image 1 completely unchanged.",
  "negative_prompt": "Do not use any outdoor background, natural scenery, environment, or lighting from image 2; extract only the sword and discard everything else in it. Do not modify or replace the studio background from image 1. Do not alter the man's facial features, skin tone, expression, hair, or any clothing item. Avoid mismatched lighting between the sword and the studio scene, floating sword grip, or incorrect blade perspective. Avoid distorted limbs or unnatural body proportions. Do not introduce noise, blur, or quality loss in unchanged areas."
}

────────────────────────────
REMINDER — OUTPUT FORMAT
────────────────────────────
Output ONLY valid JSON. Nothing else. No markdown fences. No text before or after.
`;

  const dehancing_prompt_edit = `
You are a strict prompt simplifier for Qwen-Image-Edit.

Task: Reduce a complex edit instruction to its essential core.

Input: Either a JSON object with "prompt" and "negative_prompt" fields, or a plain text instruction.
Output: A simplified JSON object with "prompt" and "negative_prompt" fields.

Rules for the prompt field:
1) Keep the imperative verb and primary edit target — mandatory.
2) Keep the most critical visual descriptor of the change.
3) Keep the most important preservation anchor.
4) For clothing edits: keep the decomposed garment protection ("keep the trousers/shirt unchanged").
5) For multi-image: keep canvas declaration, reference-only statement, anti-swap statement, and image numbers.
6) Remove: redundant adjectives, repeated preservation statements, meta-tags, filler phrases.
7) 1–3 sentences maximum.

Rules for the negative_prompt field:
1) Keep the most critical preservation violation prevention.
2) Keep anatomy/artifact prevention if relevant.
3) For multi-image: always keep the canvas swap prevention.
4) 1–2 sentences maximum.

Output ONLY valid JSON:
{
  "prompt": "...",
  "negative_prompt": "..."
}
No commentary. No markdown. No text outside the JSON.
`;

  // ── Z-Image-Turbo generálás mód ──────────────────────────────────────────
const enhancing_prompt_image = `
You are a prompt rewriter optimized specifically for Z-Image-Turbo.

Your task:
Convert the user's prompt into a faithful, concrete, visually precise, generation-ready description.
No poetry. No emotional language. No meta-tags. No filler.

────────────────────────────
STEP 1 — LOCK THE CORE (NEVER CHANGE THESE)
────────────────────────────
Before writing anything, identify and lock:
- Main subject(s), species, identity, quantity
- Explicitly named body parts and which animal/object they belong to
- Any action, weapon, ability, or power the user specified — lock the EXACT form
- Any style the user implied (anime, photoreal, sketch, oil painting, etc.)

These are immutable. You are not allowed to reinterpret, simplify, or merge them.

────────────────────────────
STEP 2 — CLASSIFY THE PROMPT TYPE
────────────────────────────
Read the prompt carefully. A prompt can match MULTIPLE types — apply ALL that match.

─── TYPE A — CHIMERA ASSEMBLY ───
Trigger: User explicitly lists which body parts come from which species.
Keywords: "X head, Y body", "X legs, Y torso", "top half X bottom half Y"
Rule:
- Preserve the part boundaries. DO NOT blend, morph, or merge.
- Describe each anatomical region separately using the correct species name.
- Use direct species names (NOT "-like" descriptors) — the boundary is intentional.
- Add: "clear anatomical boundary at the [neck/waist/etc.]"
- Describe key visual traits for EACH region: texture, skin type, surface detail.
Output structure:
"[Species A] head [key traits] — connected at the neck to a [Species B] body [key traits], [Species B] legs and tail."

─── TYPE B — FUSION / BLEND ───
Trigger: User implies one merged creature with NO explicit part list.
Keywords: "X cat", "wolf-dragon hybrid", "mermaid but insect", "X-headed Y" without part breakdown
Rule:
- Use unified organism language: "single continuous organism", "seamlessly merged", "blended morphology"
- DO NOT stack or separate parts.
- Use "-like" trait language to prevent category-prior collapse.
- Distribute both species' features across the whole body.
- Describe where one texture transitions into another.
Output structure:
"Single organism with [species A]-like [feature] — [trait detail] — transitioning into [species B]-like [feature]."

─── TYPE C — SINGLE SUBJECT ───
Trigger: One subject, no fusion, no scene complexity.
Rule: Subject first, then material/texture, then composition, then style if implied.

─── TYPE D — MULTI-SUBJECT / ACTION SCENE ───
Trigger: Two or more distinct characters interacting, fighting, or in the same scene.
Rule:
ANTI-TRAIT-BLEEDING (critical):
- Each character MUST have at least 3 unique visual anchors that the other character does NOT share.
- List each character's traits in a SEPARATE sentence or clause.
- Never describe two characters in the same clause.
- After describing both, add a composition line: "on the left / on the right", "foreground / background"

ACTION SPECIFICITY (critical):
- Do not describe actions as states — describe the motion
- Weapons and abilities must be named AND described visually
- Direction of attack must be explicit
- Elemental effects: describe shape, color, direction

─── TYPE E — SURREAL / IMPOSSIBLE ───
Trigger: Physics-breaking, logically impossible, or intentionally absurd concepts.
Rule: Preserve the absurd logic. Use: "surreal", "impossible anatomy", "physically impossible but visually coherent"

─── TYPE F — NAMED IP / KNOWN CHARACTER ───
Trigger: User names a specific fictional character with well-known canonical visual traits.
Rule:
- Describe canonical visual identity explicitly. Do not rely on name recognition alone.
- Lock UNIQUE visual markers that distinguish them from all other characters.
- If two named characters share a universe, DOUBLE the visual differentiation.

────────────────────────────
STEP 3 — BUILD THE DESCRIPTION
────────────────────────────
Write in this order:
1. SCENE FRAMING — spatial relationship if multi-subject
2. CHARACTER 1 — full canonical anchors + action + weapon
3. CHARACTER 2 — full canonical anchors + action + weapon (separate clause)
4. EFFECTS / ENERGY — colors, direction, intensity
5. COMPOSITION / CAMERA — only if meaningful
6. STYLE — only if user implied one
7. LIGHTING — only if it changes the visual output

Writing rules:
- Flowing descriptive sentences, NOT keyword comma lists
- Objective and concrete — describe only what the eye sees
- Texture/material words mandatory if surface matters
- Actions must be motion-based, not state-based

FORBIDDEN: "ultra detailed", "8K", "masterpiece", "high fidelity", "award-winning", "hyper realistic", "best quality", "highly detailed"

────────────────────────────
STEP 4 — QUALITY ANCHORS (USE SPARINGLY)
────────────────────────────
- "sharp focus" → fine surface detail
- "photorealistic" → only if user wants realism
- "soft studio lighting" / "cinematic lighting" / "rim lighting" → depth
- "skin texture", "visible muscle definition" → plastic-look prevention

────────────────────────────
STEP 5 — LENGTH CALIBRATION
────────────────────────────
Simple (1–2 elements):                               30–50 words
Medium (3–5 elements, style, mood, fusion):         50–80 words
Complex (scene, multi-subject, named IP, weapons):  90–130 words

Never exceed 130 words. Subject must appear in first 15 words.

────────────────────────────
OUTPUT RULE
────────────────────────────
Output ONLY the final rewritten prompt. No explanation. No labels. No quotes.
`;

  const dehancing_prompt_image = `
You are a strict prompt dechanter/simplifier specialized for Z-Image-Turbo.

Task: Rewrite a user prompt into a clean, compact, generation-stable prompt (1–2 lines) while preserving the core visual intent.

Rules:
1) Preserve the main subject and intent exactly.
2) Remove redundancy, fluff, and conflicting descriptors.
3) Keep only: subject(s), key attributes, required style (if any), key composition (only if necessary).
4) If multiple subjects: keep them distinct with minimal clear differentiators.
5) If hybrid/fusion: keep unified morphology language. Avoid stacked/attached phrasing.
6) If category-prior collision likely: prefer feature-based "X-like" descriptors.
7) Keep it positive and clear.
8) Output ONLY the simplified prompt. No commentary.
`;

  // ── State ─────────────────────────────────────────────────────────────────
  const [isEnhancerBusy, setIsEnhancerBusy] = useState(false);
  const [promptExtend, setPromptExtend]       = useState(true);
  const [prompt, setPrompt]                   = useState("");
  const [negativePrompt, setNegativePrompt]   = useState("");
  const [isGenerating, setIsGenerating]       = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError]                     = useState(null);
  const [showAdvanced, setShowAdvanced]       = useState(false);
  const [lightboxSrc, setLightboxSrc]         = useState(null);

  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality]         = useState("balanced");
  const [numImages, setNumImages]     = useState(1);
  const [seed, setSeed]               = useState("");
  const [steps, setSteps]             = useState(8);
  const [guidance, setGuidance]       = useState(7.5);
  const [fluxSizeIdx, setFluxSizeIdx] = useState(0);

  const [inputImages, setInputImages] = useState([]);
  const MAX_IMAGES   = 3;
  const fileInputRef = useRef(null);

  const color        = selectedModel.color || "#7c3aed";
  const provider     = getProvider(selectedModel);
  const providerMeta = PROVIDER_META[provider] || PROVIDER_META["fal"];
  const apiId        = selectedModel.apiModel || "";

  const isGoogleImage    = provider === "google-image";
  const isStability      = provider === "stability";
  const isCloudflare     = provider === "cloudflare";
  const isNvidia         = provider === "nvidia-image";
  const isFal            = !isStability && !isGoogleImage && !isCloudflare && !isNvidia;
  const isModelScopeEdit = !!selectedModel.needsInputImage;

  const nvidiaType = isNvidia ? getNvidiaType(apiId) : null;
  const isFlux     = nvidiaType === "flux";
  const isSD3      = nvidiaType === "sd3";

  const singleImage = isStability || isGoogleImage || isCloudflare || isNvidia;
  const imgCount    = singleImage ? 1 : Math.min(numImages, 4);

  const selectedAR = isFlux
    ? FLUX_SIZES[fluxSizeIdx]
    : { value: aspectRatio, label: aspectRatio, ...QUALITY_PRESETS[quality].sizes[aspectRatio] };

  // ── Kép upload ────────────────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.slice(0, MAX_IMAGES - inputImages.length).forEach((file) => {
      if (!file.type.startsWith("image/")) { setError("Csak képfájl tölthető fel"); return; }
      if (file.size > 10 * 1024 * 1024)   { setError("A kép mérete max 10 MB lehet"); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setInputImages((prev) => [...prev, { dataUrl: ev.target.result, name: file.name }]);
        setError(null);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleDrop  = (e) => { e.preventDefault(); handleImageUpload({ target: { files: Array.from(e.dataTransfer.files || []) }, value: "" }); };
  const removeImage = (idx) => setInputImages((prev) => prev.filter((_, i) => i !== idx));

  // ── Generálás ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || isEnhancerBusy) return;
    if (isModelScopeEdit && inputImages.length === 0) { setError("Ehhez a modellhez tölts fel legalább egy szerkesztendő képet!"); return; }
    setIsGenerating(true); setError(null); setGeneratedImages([]);
    try {
      const token = getIdToken ? await getIdToken() : null;
      if (!token) throw new Error("Nincs érvényes autentikációs token.");
      const fluxSize = FLUX_SIZES[fluxSizeIdx];
      const res = await fetch(`${API_BASE}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt:              prompt.trim(),
          provider, apiId,
          negative_prompt:     negativePrompt.trim() || undefined,
          aspect_ratio:        aspectRatio,
          image_size:          isFlux ? { width: fluxSize.w, height: fluxSize.h } : { width: selectedAR.w, height: selectedAR.h },
          num_images:          singleImage ? 1 : Math.min(numImages, 4),
          seed:                seed ? parseInt(seed) : undefined,
          num_inference_steps: steps,
          prompt_extend:       promptExtend,
          guidance_scale:      guidance,
          ...(isModelScopeEdit && inputImages.length > 0 ? { input_images: inputImages.map((img) => img.dataUrl) } : {}),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Képgenerálási hiba");
      setGeneratedImages(data.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url, index) => {
    const a = document.createElement("a");
    a.href = url; a.download = `generated_${Date.now()}_${index + 1}.png`; a.target = "_blank";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const canGenerate        = prompt.trim() && !isEnhancerBusy && !isGenerating && (!isModelScopeEdit || inputImages.length > 0);
  const handleEnhancerBusy = useCallback((busy) => setIsEnhancerBusy(busy), []);

  // ── Size grid ─────────────────────────────────────────────────────────────
  const SizeGrid = ({ items, activeValue, onSelect }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {items.map((item) => {
        const qSizes   = QUALITY_PRESETS[quality].sizes[item.value] || { w: 1024, h: 1024 };
        const isActive = activeValue === item.value;
        const bw = qSizes.w >= qSizes.h ? 18 : Math.round((qSizes.w / qSizes.h) * 18);
        const bh = qSizes.h >= qSizes.w ? 18 : Math.round((qSizes.h / qSizes.w) * 18);
        return (
          <button key={item.value} onClick={() => onSelect(item)} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 5, padding: "8px 4px", borderRadius: 12, cursor: "pointer",
            background: isActive ? `${color}18` : "rgba(255,255,255,0.03)",
            border: `1px solid ${isActive ? color + "55" : "rgba(255,255,255,0.07)"}`,
            transition: "all 0.15s",
          }}>
            <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: bw, height: bh, borderRadius: 2, background: isActive ? color : "rgba(255,255,255,0.18)", opacity: isActive ? 0.85 : 0.4 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? color : "#6b7280" }}>{item.label}</span>
            <span style={{ fontSize: 9, color: isActive ? `${color}99` : "#4b5563", fontFamily: "'SF Mono', monospace" }}>
              {qSizes.w}×{qSizes.h}
            </span>
          </button>
        );
      })}
    </div>
  );

  // ── Quality buttons ───────────────────────────────────────────────────────
  const QualityButtons = () => (
    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
      {Object.entries(QUALITY_PRESETS).map(([key, preset]) => {
        const isActive = quality === key;
        return (
          <button key={key} onClick={() => setQuality(key)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "7px 4px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${isActive ? color + "60" : "rgba(255,255,255,0.07)"}`,
            background: isActive ? `${color}15` : "rgba(255,255,255,0.03)",
            transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: isActive ? `0 0 12px ${color}18` : "none",
          }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 10 }}>
              {[4, 7, 10].map((h, i) => {
                const filled = key === "low" ? i < 1 : key === "balanced" ? i < 2 : true;
                return (
                  <div key={i} style={{
                    width: 3, height: h, borderRadius: 1.5,
                    background: filled ? (isActive ? color : "rgba(255,255,255,0.35)") : "rgba(255,255,255,0.1)",
                    transition: "background 0.15s",
                  }} />
                );
              })}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? color : "#6b7280", letterSpacing: "0.01em" }}>
              {preset.label}
            </span>
            <span style={{ fontSize: 9, color: isActive ? `${color}88` : "#374151", fontFamily: "'SF Mono', monospace", letterSpacing: "0.03em" }}>
              {preset.sub}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div style={{ position: "absolute", inset: 0, display: "flex", overflow: "hidden" }}>

        {/* ══ BAL: Controls ══ */}
        <div style={{
          width: 264, flexShrink: 0, display: "flex", flexDirection: "column",
          overflowY: "auto", overflowX: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(6,6,18,0.7)",
        }}>

          {/* Header */}
          <div style={{ padding: "16px 16px 8px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${color}20`, border: `1px solid ${color}35`,
              }}>
                <Wand2 style={{ width: 14, height: 14, color }} />
              </div>
              <span style={{ color: "white", fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedModel.name}
              </span>
              <span style={{
                flexShrink: 0, fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 5,
                background: `${providerMeta.color}12`, color: providerMeta.color, border: `1px solid ${providerMeta.color}28`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: providerMeta.dot, flexShrink: 0 }} />
                {providerMeta.label}
              </span>
            </div>
          </div>

          {/* Scrollable controls */}
          <div style={{ flex: 1, padding: "0 16px", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>

            {/* ── Input kép ── */}
            {isModelScopeEdit && (
              <div>
                <label style={{
                  color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4, marginBottom: 6,
                }}>
                  Szerkesztendő kép{MAX_IMAGES > 1 ? `ek (max ${MAX_IMAGES})` : ""}
                  <span style={{ color: "#ef4444", fontSize: 13, lineHeight: 1 }}>*</span>
                </label>

                {inputImages.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                    {inputImages.map((img, idx) => (
                      <div key={idx} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${color}40` }}>
                        <img src={img.dataUrl} alt={`Input ${idx + 1}`}
                          style={{ width: "100%", height: 90, objectFit: "contain", display: "block", background: "rgba(0,0,0,0.3)" }} />
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)",
                          display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "6px 8px",
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ background: `${color}60`, borderRadius: 4, padding: "1px 5px", fontWeight: 700, fontSize: 10, color: "white" }}>
                              #{idx + 1}
                            </span>
                            <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</span>
                          </span>
                          <button onClick={() => removeImage(idx)} style={{
                            padding: "3px 6px", borderRadius: 6, background: "rgba(239,68,68,0.85)",
                            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                          }}>
                            <Trash2 style={{ width: 10, height: 10, color: "white" }} />
                            <span style={{ color: "white", fontSize: 10, fontWeight: 600 }}>Törlés</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {inputImages.length < MAX_IMAGES && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${color}35`, borderRadius: 12, padding: "14px 12px", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      background: "rgba(255,255,255,0.02)", transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = color + "70")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = color + "35")}
                  >
                    <Upload style={{ width: 18, height: 18, color: `${color}55` }} />
                    <span style={{ color: "#6b7280", fontSize: 11, textAlign: "center", lineHeight: 1.4 }}>
                      {inputImages.length === 0 ? "Kattints vagy húzd ide a képet" : `+ Újabb kép (${inputImages.length}/${MAX_IMAGES})`}
                    </span>
                    <span style={{ color: "#4b5563", fontSize: 10 }}>JPG, PNG, WEBP · max 10 MB</span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} />
              </div>
            )}

            {/* ── Enhancer ── */}
            <Enhancer
              value={prompt}
              onChange={setPrompt}
              onNegativeChange={isModelScopeEdit ? setNegativePrompt : undefined}
              onSubmit={handleGenerate}
              color={color}
              getIdToken={getIdToken}
              enhancing_prompt={isModelScopeEdit ? enhancing_prompt_edit : enhancing_prompt_image}
              dechanting_prompt={isModelScopeEdit ? dehancing_prompt_edit : dehancing_prompt_image}
              onBusyChange={handleEnhancerBusy}
            />

            {/* ── Negatív prompt — edit módban az Enhancer tölti, de manuálisan is szerkeszthető ── */}
            {isModelScopeEdit && !isGoogleImage && !isFlux && (
              <div>
                <label style={{
                  color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6,
                }}>
                  <span>
                    Negatív{" "}
                    <span style={{ color: "#4b5563", fontWeight: 400, textTransform: "none" }}>(opcionális)</span>
                  </span>
                  {negativePrompt && (
                    <button
                      onClick={() => setNegativePrompt("")}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        color: "#4b5563", fontSize: 10, display: "flex", alignItems: "center", gap: 3,
                      }}
                    >
                      <X style={{ width: 10, height: 10 }} /> törlés
                    </button>
                  )}
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Mit ne tartalmazzon… (az Enhance automatikusan tölti)"
                  rows={3}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 12, color: "white",
                    fontSize: 12, resize: "none", outline: "none", boxSizing: "border-box",
                    lineHeight: 1.6,
                    background: negativePrompt ? "rgba(248,113,113,0.05)" : "rgba(255,255,255,0.03)",
                    border: negativePrompt ? "1px solid rgba(248,113,113,0.2)" : "1px solid rgba(255,255,255,0.07)",
                    fontFamily: "inherit", transition: "border-color 0.2s, background 0.2s",
                  }}
                />
              </div>
            )}

            {/* ── Képarány + Minőség ── */}
            {(isSD3 || !isNvidia) && !isModelScopeEdit && (
              <div>
                <label style={{
                  color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.08em", display: "block", marginBottom: 8,
                }}>
                  Képarány
                </label>
                <SizeGrid
                  items={ASPECT_RATIO_LIST}
                  activeValue={aspectRatio}
                  onSelect={(item) => setAspectRatio(item.value)}
                />
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Minőség
                    </span>
                    <span style={{
                      fontSize: 9, color: "#4b5563", fontFamily: "'SF Mono', monospace",
                      background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      {selectedAR.w}×{selectedAR.h}px
                    </span>
                  </div>
                  <QualityButtons />
                </div>
              </div>
            )}

            {/* Num images */}
            {isFal && !isModelScopeEdit && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Képek száma
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{numImages}</span>
                </div>
                <input type="range" min={1} max={4} step={1} value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value))}
                  style={{ width: "100%", cursor: "pointer", accentColor: color }} />
              </div>
            )}

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced((p) => !p)} style={{
              display: "flex", alignItems: "center", gap: 8, color: "#6b7280", fontSize: 12,
              background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%",
            }}>
              <Settings2 style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>Speciális</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              {showAdvanced ? <ChevronUp style={{ width: 12, height: 12, flexShrink: 0 }} /> : <ChevronDown style={{ width: 12, height: 12, flexShrink: 0 }} />}
            </button>

            {showAdvanced && (
              <div style={{
                borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 12,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div>
                  <label style={{ color: "#6b7280", fontSize: 12, display: "block", marginBottom: 6 }}>
                    Seed <span style={{ color: "#4b5563" }}>(opcionális)</span>
                  </label>
                  <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="pl. 42"
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: 8, color: "white",
                      fontSize: 13, outline: "none", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit",
                    }} />
                </div>

                {isModelScopeEdit && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>Prompt Extend</span>
                    <div onClick={() => setPromptExtend(!promptExtend)} style={{
                      width: 44, height: 24, borderRadius: 12,
                      backgroundColor: promptExtend ? "#6366f1" : "#374151",
                      cursor: "pointer", position: "relative", transition: "background-color 0.2s ease", flexShrink: 0,
                    }}>
                      <div style={{
                        position: "absolute", top: 2, left: promptExtend ? 22 : 2,
                        width: 20, height: 20, borderRadius: "50%",
                        backgroundColor: "#ffffff", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }} />
                    </div>
                  </div>
                )}

                {(isFal || isNvidia) && !isModelScopeEdit && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ color: "#6b7280", fontSize: 12 }}>Steps</label>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{steps}</span>
                    </div>
                    <input type="range" min={1} max={50} step={1} value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value))}
                      style={{ width: "100%", cursor: "pointer", accentColor: color }} />
                    <p style={{ color: "#4b5563", fontSize: 11, marginTop: 2 }}>Több = jobb minőség, de lassabb</p>
                  </div>
                )}

                {(isFal || isNvidia) && !isModelScopeEdit && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ color: "#6b7280", fontSize: 12 }}>CFG Scale</label>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{guidance}</span>
                    </div>
                    <input type="range" min={1} max={isFlux ? 30 : 20} step={0.5} value={guidance}
                      onChange={(e) => setGuidance(parseFloat(e.target.value))}
                      style={{ width: "100%", cursor: "pointer", accentColor: color }} />
                    <p style={{ color: "#4b5563", fontSize: 11, marginTop: 2 }}>Alacsony = kreatív · Magas = prompt-hű</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate button */}
          <div style={{ padding: "12px 16px 16px", flexShrink: 0 }}>
            <button onClick={handleGenerate} disabled={!canGenerate} style={{
              width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 600,
              color: "white", border: "none", cursor: canGenerate ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: canGenerate ? `linear-gradient(135deg, ${color}, ${color}aa)` : "rgba(255,255,255,0.05)",
              opacity: canGenerate ? 1 : 0.4, boxShadow: canGenerate ? `0 4px 20px ${color}28` : "none", transition: "all 0.2s",
            }}>
              {isGenerating
                ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />{isModelScopeEdit ? "Szerkesztés..." : "Generálás..."}</>
                : isEnhancerBusy
                  ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />Enhance folyamatban…</>
                  : <><Sparkles style={{ width: 16, height: 16 }} />{isModelScopeEdit ? "Szerkesztés" : "Generálás"}</>}
            </button>
            <p style={{ textAlign: "center", color: "#4b5563", fontSize: 11, marginTop: 6 }}>Ctrl+Enter</p>
          </div>
        </div>

        {/* ══ JOBB: Canvas ══ */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {error && (
            <div style={{
              margin: "12px 12px 0", padding: "10px 12px", borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "flex-start", gap: 8,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            }}>
              <AlertCircle style={{ width: 15, height: 15, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.5, flex: 1 }}>{error}</p>
              <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", flexShrink: 0, padding: 0 }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          )}

          {(generatedImages.length > 0 || isGenerating) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
              flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ color: "#6b7280", fontSize: 11 }}>
                {isGenerating ? "Feldolgozás..."
                  : isModelScopeEdit ? `${generatedImages.length} kép · szerkesztve`
                  : isFlux ? `${generatedImages.length} kép · ${FLUX_SIZES[fluxSizeIdx].w}×${FLUX_SIZES[fluxSizeIdx].h} · ${FLUX_SIZES[fluxSizeIdx].label}`
                  : `${generatedImages.length} kép · ${selectedAR.w}×${selectedAR.h} · ${aspectRatio} · ${QUALITY_PRESETS[quality].sub}`}
              </span>
              <div style={{ flex: 1 }} />
              {!isGenerating && (
                <button onClick={handleGenerate} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
                  fontSize: 12, color: "#9ca3af", cursor: "pointer",
                  background: "none", border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <RefreshCw style={{ width: 12, height: 12 }} /> Újra
                </button>
              )}
            </div>
          )}

          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>

            {!isGenerating && generatedImages.length === 0 && !error && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 16,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${color}0d`, border: `1px solid ${color}18`,
                }}>
                  <ImageIcon style={{ width: 32, height: 32, color: `${color}40` }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                    {isModelScopeEdit ? "Tölts fel egy képet és adj utasítást" : "Még nincs kép"}
                  </p>
                  <p style={{ color: "#374151", fontSize: 12 }}>
                    {isModelScopeEdit ? "A modell a feltöltött képet szerkeszti a szöveges utasítás alapján" : "Írj egy promptot a bal oldalon"}
                  </p>
                </div>
                {!isModelScopeEdit && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 360 }}>
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button key={ex} onClick={() => setPrompt(ex)} style={{
                        fontSize: 12, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af",
                      }}>{ex}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isGenerating && (
              <div style={{
                position: "absolute", inset: 0, padding: 16,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                {Array.from({ length: imgCount }).map((_, i) => (
                  <div key={i} style={{
                    borderRadius: 16, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 10,
                    aspectRatio: `${selectedAR.w} / ${selectedAR.h}`,
                    maxWidth: imgCount > 1 ? "calc(50% - 6px)" : "100%",
                    maxHeight: "100%", width: "auto", height: "100%",
                    background: `${color}10`, border: `1px solid ${color}20`,
                    animation: "shimmer 2s ease-in-out infinite",
                  }}>
                    <Loader2 style={{ width: 28, height: 28, color: `${color}60`, animation: "spin 1s linear infinite" }} />
                    <span style={{ color: `${color}60`, fontSize: 12 }}>{isModelScopeEdit ? "Szerkesztés... (kb. 1-2 perc)" : "Generálás..."}</span>
                  </div>
                ))}
              </div>
            )}

            {!isGenerating && generatedImages.length > 0 && (
              <div style={{
                position: "absolute", inset: 0, padding: 16,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12, overflow: "hidden",
              }}>
                {generatedImages.map((img, i) => (
                  <div key={i} style={{
                    position: "relative", borderRadius: 16, flexShrink: 0, lineHeight: 0,
                    border: `1px solid ${color}25`, overflow: "hidden",
                    maxWidth: generatedImages.length > 1 ? "calc(50% - 6px)" : "100%",
                  }}>
                    <img src={img.url} alt={`Generated ${i + 1}`}
                      style={{ display: "block", width: "100%", height: "auto", objectFit: "contain", borderRadius: 16 }} />
                    <div
                      style={{
                        position: "absolute", inset: 0, opacity: 0, transition: "opacity 0.2s",
                        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)",
                        display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: 12,
                        borderRadius: isModelScopeEdit ? 16 : 0, overflow: "hidden",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                    >
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{img.width ? `${img.width}×${img.height}` : ""}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setLightboxSrc(img.url)} title="Teljes méret" style={{
                          padding: 8, borderRadius: 10, color: "white", cursor: "pointer",
                          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "none",
                        }}>
                          <ZoomIn style={{ width: 14, height: 14 }} />
                        </button>
                        <button onClick={() => downloadImage(img.url, i)} style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10,
                          color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: `${color}cc`, backdropFilter: "blur(8px)", border: "none",
                        }}>
                          <Download style={{ width: 14, height: 14 }} /> Letöltés
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
      `}</style>
    </>
  );
}