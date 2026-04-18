import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, PanelLeftClose, PanelLeftOpen, Sparkles, Layers, Box, Pencil } from 'lucide-react';
import ImageControls from './ImageControls';
import ImageWorkspace from './ImageWorkspace';
import ImageStudioBG from '../../assets/image_studio_v2.png';
import BackgroundFilters from '../chat/BackgroundFilters';
import StudioLayout from '../shared/StudioLayout';
import { useSidebarState } from '../../hooks/useSidebarState';
import { ALL_MODELS } from '../../ai_components/models';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ENHANCING_PROMPT_EDIT = `
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
No prompt wording can override this slot assignment
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
IMPORTANT: USING VISUAL CONTEXT FROM VISION AI
────────────────────────────
When the user message contains a "VISUAL CONTEXT" section (provided by Gemma 3 27B IT vision analysis),
use this information to:
1. Reference specific visual details from the images (exact clothing items, colors, background elements)
2. Build more precise preservation anchors based on what is actually in the images
3. Correctly identify which image is the canvas (Image 1) and which is the donor (Image 2+)
4. Use the lighting description to write accurate integration instructions
Do NOT reference or quote the visual context section in the output JSON. Only use it to write better prompts.
────────────────────────────
REMINDER — OUTPUT FORMAT
────────────────────────────
Output ONLY valid JSON. Nothing else. No markdown fences. No text before or after.
`;

const ENHANCING_PROMPT_IMAGE = `
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

const DEHANCING_PROMPT_EDIT = `
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

const DEHANCING_PROMPT_IMAGE = `
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

const GEMMA_VISION_PROMPT = `You are a precise visual analyst for an AI image editing pipeline.
Analyze the uploaded image(s) and provide a detailed, structured description of each one.
For EACH image, describe:
1. SUBJECTS: Who or what is in the image — species/type, physical traits (hair color/style, skin tone, eyes, build), every visible clothing item listed individually (jacket, shirt, trousers, shoes, accessories, etc.), pose, expression, position in frame
2. BACKGROUND: Environment, setting, colors, textures, depth, any objects in the background
3. LIGHTING: Direction (left/right/top/front/back), quality (soft/hard/diffuse/natural), color temperature (warm/cool/neutral)
4. NOTABLE ELEMENTS: Specific objects, accessories, props, spatial relationships between elements
5. VISUAL STYLE: Photograph/illustration/3D render/painting, color grading, artistic style if applicable
Format your response EXACTLY as:
IMAGE 1:
[detailed structured description]
IMAGE 2:
[detailed structured description]
(continue for each uploaded image)
Be specific, visual, and objective. No interpretation or creative additions. Describe only what is visually present. This description will be used by another AI model to write precise image editing instructions.`;

const QUALITY_PRESETS = {
  low: {
    label: "Low",
    sub: "SD",
    sizes: {
      "1:1": { w: 512, h: 512 },
      "16:9": { w: 896, h: 512 },
      "9:16": { w: 512, h: 896 },
      "4:3": { w: 704, h: 528 },
      "3:2": { w: 768, h: 512 },
      "2:3": { w: 512, h: 768 },
    },
  },
  balanced: {
    label: "Balanced",
    sub: "HD",
    sizes: {
      "1:1": { w: 1024, h: 1024 },
      "16:9": { w: 1280, h: 720 },
      "9:16": { w: 720, h: 1280 },
      "4:3": { w: 1152, h: 864 },
      "3:2": { w: 1216, h: 832 },
      "2:3": { w: 832, h: 1216 },
    },
  },
  high: {
    label: "High",
    sub: "FullHD",
    sizes: {
      "1:1": { w: 1536, h: 1536 },
      "16:9": { w: 1920, h: 1080 },
      "9:16": { w: 1080, h: 1920 },
      "4:3": { w: 1440, h: 1080 },
      "3:2": { w: 1536, h: 1024 },
      "2:3": { w: 1024, h: 1536 },
    },
  },
};

const ASPECT_RATIO_LIST = [
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "4:3", value: "4:3" },
  { label: "3:2", value: "3:2" },
  { label: "2:3", value: "2:3" },
];

const FLUX_SIZES = [
  { label: "1:1", value: "1:1", w: 1024, h: 1024 },
  { label: "16:9", value: "16:9", w: 1280, h: 720 },
  { label: "9:16", value: "9:16", w: 720, h: 1280 },
  { label: "4:3", value: "4:3", w: 1152, h: 896 },
  { label: "3:4", value: "3:4", w: 896, h: 1152 },
  { label: "3:2", value: "3:2", w: 1344, h: 768 },
];

const PROVIDER_META = {
  "google-image": { label: "Gemini", color: "#4285f4", dot: "#34a853" },
  stability: { label: "Stability AI", color: "#7c3aed", dot: "#a78bfa" },
  cloudflare: { label: "Cloudflare", color: "#f6821f", dot: "#fbbf24" },
  fal: { label: "fal.ai", color: "#10b981", dot: "#34d399" },
  "nvidia-image": { label: "NVIDIA", color: "#76b900", dot: "#a3e635" },
  modelscope: { label: "ModelScope", color: "#9333ea", dot: "#c084fc" },
};

const getProvider = (m) => m.provider || "fal";
const getNvidiaType = (apiId = "") => {
  const id = apiId.toLowerCase();
  if (id.includes("flux")) return "flux";
  if (id.includes("stable-diffusion-3")) return "sd3";
  return "other";
};

export default function ImageGenerator({ selectedModel, onModelChange, userId, getIdToken, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState(null);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatus, setGenStatus] = useState('');
  const [genElapsed, setGenElapsed] = useState(0);
  const [inputImages, setInputImages] = useState([]);
  const [isEnhancerBusy, setIsEnhancerBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("balanced");
  const [numImages, setNumImages] = useState(1);
  const [seed, setSeed] = useState("");
  const [steps, setSteps] = useState(35);
  const [guidance, setGuidance] = useState(3);
  const [promptExtend, setPromptExtend] = useState(true);
  const [fluxSizeIdx, setFluxSizeIdx] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [leftOpen, setLeftOpen] = useState(true);
  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [offsets, setOffsets] = useState({ left: 320, right: 0 });

  
  // Master Sidebar Sync
  useEffect(() => {
    setLeftOpen(isGlobalOpen);
  }, [isGlobalOpen]);
  const themeColor = selectedModel?.color || "#7c3aed";

  const provider = getProvider(selectedModel);
  const apiId = selectedModel.apiModel || "";
  const isGoogleImage = provider === "google-image";
  const isStability = provider === "stability";
  const isCloudflare = provider === "cloudflare";
  const isNvidia = provider === "nvidia-image";
  const isFal = !isStability && !isGoogleImage && !isCloudflare && !isNvidia;
  const isModelScopeEdit = !!selectedModel.needsInputImage;
  const nvidiaType = isNvidia ? getNvidiaType(apiId) : null;
  const isFlux = nvidiaType === "flux";
  const isSD3 = nvidiaType === "sd3";
  const singleImage = isStability || isGoogleImage || isCloudflare || isNvidia;

  // ── Edit-mód állapot mentése/visszaállítása modellváltáskor ──────────────
  const savedEditState = useRef({ negativePrompt: "", promptExtend: true });
  const prevIsEditRef = useRef(isModelScopeEdit);
  const isFirstRender = useRef(true);

  const negativePromptRef = useRef(negativePrompt);
  const promptExtendRef = useRef(promptExtend);
  useEffect(() => { negativePromptRef.current = negativePrompt; }, [negativePrompt]);
  useEffect(() => { promptExtendRef.current = promptExtend; }, [promptExtend]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const wasEdit = prevIsEditRef.current;

    if (wasEdit && !isModelScopeEdit) {
      savedEditState.current = {
        negativePrompt: negativePromptRef.current,
        promptExtend: promptExtendRef.current,
      };
      setNegativePrompt("");
      setPromptExtend(false);
    } else if (!wasEdit && isModelScopeEdit) {
      setNegativePrompt(savedEditState.current.negativePrompt);
      setPromptExtend(savedEditState.current.promptExtend);
    }
    prevIsEditRef.current = isModelScopeEdit;
  }, [isModelScopeEdit]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || isEnhancerBusy) return;
    if (selectedModel.needsInputImage && inputImages.length === 0) {
      setError("Ehhez a modellhez tölts fel legalább egy szerkesztendő képet!");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenProgress(0);
    setGenStatus('');
    setGenElapsed(0);

    try {
      const token = await getIdToken();
      const fluxSize = FLUX_SIZES[fluxSizeIdx];
      const selectedAR = isFlux
        ? FLUX_SIZES[fluxSizeIdx]
        : { value: aspectRatio, ...QUALITY_PRESETS[quality].sizes[aspectRatio] };

      const res = await fetch(`${API_BASE}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider,
          apiId,
          negative_prompt: negativePrompt.trim() || undefined,
          aspect_ratio: aspectRatio,
          image_size: isFlux
            ? { width: fluxSize.w, height: fluxSize.h }
            : { width: selectedAR.w, height: selectedAR.h },
          num_images: singleImage ? 1 : Math.min(numImages, 4),
          seed: seed ? parseInt(seed) : undefined,
          num_inference_steps: steps,
          prompt_extend: promptExtend,
          guidance_scale: guidance,
          ...(selectedModel.needsInputImage && inputImages.length > 0 ? { input_images: inputImages.map(img => img.dataUrl) } : {}),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }
          if (event.type === 'status') {
            setGenProgress(event.progress ?? 0);
            setGenStatus(event.status ?? '');
            setGenElapsed(event.elapsed ?? 0);
          } else if (event.type === 'done') {
            const images = (event.images || []).map(img =>
              typeof img === 'string' ? img : (img.url || img.b64_json || img.image_url)
            ).filter(Boolean);
            setGeneratedImages(images);
            setGenProgress(100);
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Hiba történt');
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setGenStatus('');
      setGenProgress(0);
      setGenElapsed(0);
    }
  };

  return (
    <StudioLayout
      leftOpen={leftOpen}
      setLeftOpen={toggleGlobalSidebar}
      leftSecondaryOpen={leftSecondaryOpen}
      setLeftSecondaryOpen={setLeftSecondaryOpen}
      rightOpen={rightOpen}
      setRightOpen={setRightOpen}
      leftWidth={320}
      leftSecondaryWidth={392}
      onOffsetChange={setOffsets}
      leftSidebar={globalSidebar}
      leftSecondarySidebar={
        <div className="h-full flex flex-row overflow-hidden bg-[#060410]/60 backdrop-blur-3xl border-r border-white/5">
          {/* Tool Strip (72px) */}
          {/* Tool Strip (72px) — 2 mód gomb */}
          <div className="w-[72px] h-full flex flex-col items-center pt-6 space-y-3 border-r border-white/5 bg-[#030308]">
            {[
              {
                id: 'generate',
                label: 'GENERATE',
                icon: <Sparkles className="w-5 h-5" />,
                isActive: !selectedModel.needsInputImage,
                onClick: () => {
                  const first = ALL_MODELS.find(m => m.panelType === 'image' && !m.needsInputImage);
                  if (first) onModelChange?.(first);
                },
              },
              {
                id: 'edit',
                label: 'EDIT',
                icon: <Pencil className="w-5 h-5" />,
                isActive: !!selectedModel.needsInputImage,
                onClick: () => {
                  const first = ALL_MODELS.find(m => m.panelType === 'image' && m.needsInputImage);
                  if (first) onModelChange?.(first);
                },
              },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={tool.onClick}
                title={tool.label}
                className="group flex flex-col items-center gap-1.5 transition-all duration-300 border-none bg-transparent cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border ${
                    tool.isActive
                      ? 'bg-white/5 border-white/10 shadow-xl'
                      : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5'
                  }`}
                  style={tool.isActive ? { borderColor: `${themeColor}40`, color: themeColor } : { color: '#52525b' }}
                >
                  {tool.icon}
                </div>
                <span className={`text-[8px] font-black tracking-[0.2em] transition-all duration-500 ${
                  tool.isActive ? 'text-white' : 'text-zinc-700 group-hover:text-zinc-500'
                }`}>
                  {tool.label}
                </span>
              </button>
            ))}
            <div className="flex-1" />
          </div>

          <div className="flex-1 h-full overflow-hidden">
            <ImageControls
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              prompt={prompt} setPrompt={setPrompt}
              negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
              aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
              quality={quality} setQuality={setQuality}
              numImages={numImages} setNumImages={setNumImages}
              seed={seed} setSeed={setSeed}
              steps={steps} setSteps={setSteps}
              guidance={guidance} setGuidance={setGuidance}
              promptExtend={promptExtend} setPromptExtend={setPromptExtend}
              inputImages={inputImages} setInputImages={setInputImages}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              fluxSizeIdx={fluxSizeIdx}
              setFluxSizeIdx={setFluxSizeIdx}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              isEnhancerBusy={isEnhancerBusy}
              setIsEnhancerBusy={setIsEnhancerBusy}
              enhancingPrompt={selectedModel.needsInputImage ? ENHANCING_PROMPT_EDIT : ENHANCING_PROMPT_IMAGE}
              dehancingPrompt={selectedModel.needsInputImage ? DEHANCING_PROMPT_EDIT : DEHANCING_PROMPT_IMAGE}
              gemmaVisionPrompt={GEMMA_VISION_PROMPT}
              ASPECT_RATIO_LIST={ASPECT_RATIO_LIST}
              QUALITY_PRESETS={QUALITY_PRESETS}
              FLUX_SIZES={FLUX_SIZES}
              getIdToken={getIdToken}
            />
          </div>
        </div>
      }
    >
      <div className="h-full w-full relative overflow-hidden flex flex-col">
        <BackgroundFilters />

        {/* Cinematic Background Layer — Enhanced High-Fidelity Look */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Base Image with Liquid Wave Distortion & Ken Burns Effect */}
          <div className="absolute inset-0 liquid-wave opacity-60 scale-110 animate-[ken-burns_60s_infinite_alternate_ease-in-out]">
            <img src={ImageStudioBG} alt="bg" className="w-full h-full object-cover saturate-[1.2] brightness-[0.8]" />
          </div>

          {/* Adaptive Aurora Glow Mesh */}
          <div className="absolute inset-0 opacity-40 mix-blend-screen">
            <div
              className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-[aurora-flow_25s_infinite_alternate_ease-in-out]"
              style={{ background: `${themeColor}20` }}
            />
            <div
              className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[140px] animate-[aurora-flow_30s_infinite_alternate_reverse_ease-in-out]"
              style={{ background: `${themeColor}15` }}
            />
          </div>

          {/* Animated Film Grain / Noise Overlay */}
          <div
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none grain-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />

          {/* Deep Vignettes & Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#03000a]/80 via-transparent to-[#03000a]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#03000a]/60 via-transparent to-[#03000a]/60" />
          <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black via-black/20 to-transparent opacity-90" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
        </div>

        <div className="flex-1 relative z-10 overflow-hidden">
          <ImageWorkspace
            isGenerating={isGenerating}
            images={generatedImages}
            error={error}
            selectedModel={selectedModel}
            genProgress={genProgress}
            genStatus={genStatus}
            genElapsed={genElapsed}
          />
        </div>
      </div>
    </StudioLayout>
  );
}
