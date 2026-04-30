export const TRIPO_IMAGE_INPUT_MODES = {
  PROMPT_ONLY: "prompt_only",
  PROMPT_AND_IMAGE: "prompt_and_image",
  IMAGE_ONLY: "image_only",
};

export const DEFAULT_TRIPO_GENERATE_IMAGE_MODEL = "flux.1_kontext_pro";

export const TRIPO_GENERATE_IMAGE_MODELS = [
  {
    value: "",
    label: "Auto (Flux Kontext Pro)",
    description: "Tripo default engine. Prompt plus optional image reference.",
    badge: "5 credits",
    cost: 5,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_AND_IMAGE,
    maxFiles: 4,
    disallowWebp: true,
  },
  {
    value: "flux.1_kontext_pro",
    label: "Flux Kontext Pro",
    description: "Prompt plus optional image reference. WebP input is not supported.",
    badge: "5 credits",
    cost: 5,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_AND_IMAGE,
    maxFiles: 4,
    disallowWebp: true,
  },
  {
    value: "flux.1_dev",
    label: "Flux Dev",
    description: "Prompt-only image generation.",
    badge: "5 credits",
    cost: 5,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_ONLY,
  },
  {
    value: "gpt_4o",
    label: "GPT-4o Image",
    description: "Prompt plus optional image reference.",
    badge: "5 credits",
    cost: 5,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_AND_IMAGE,
    maxFiles: 10,
  },
  {
    value: "gemini_2.5_flash_image_preview",
    label: "Gemini 2.5 Flash Image",
    description: "Nano Banana. Prompt plus optional image reference.",
    badge: "5 credits",
    cost: 5,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_AND_IMAGE,
    maxFiles: 10,
  },
  {
    value: "z_image",
    label: "Z Image",
    description: "Prompt-only image generation.",
    badge: "5 credits",
    cost: 5,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_ONLY,
  },
  {
    value: "gpt_image_1.5",
    label: "GPT Image 1.5",
    description: "Prompt plus optional image reference.",
    badge: "10 credits",
    cost: 10,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_AND_IMAGE,
    maxFiles: 10,
  },
  {
    value: "midjourney",
    label: "Midjourney",
    description: "Prompt-only image generation.",
    badge: "10 credits",
    cost: 10,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_ONLY,
  },
  {
    value: "gemini_3_pro_image_preview",
    label: "Gemini 3 Pro Image",
    description: "Nano Banana Pro. Prompt plus optional image reference.",
    badge: "10 credits",
    cost: 10,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_AND_IMAGE,
    maxFiles: 10,
  },
  {
    value: "gemini_3.1_flash_image_preview",
    label: "Gemini 3.1 Flash Image",
    description: "Nano Banana 2. Prompt plus optional image reference.",
    badge: "10 credits",
    cost: 10,
    inputMode: TRIPO_IMAGE_INPUT_MODES.PROMPT_AND_IMAGE,
    maxFiles: 10,
  },
];

export function getTripoGenerateImageModel(modelVersion = "") {
  return TRIPO_GENERATE_IMAGE_MODELS.find((model) => model.value === modelVersion)
    || TRIPO_GENERATE_IMAGE_MODELS[0];
}

export function getTripoGenerateImageInputPolicy(modelVersion = "") {
  const model = getTripoGenerateImageModel(modelVersion);
  const inputMode = model.inputMode || TRIPO_IMAGE_INPUT_MODES.PROMPT_AND_IMAGE;

  return {
    inputMode,
    prompt: inputMode !== TRIPO_IMAGE_INPUT_MODES.IMAGE_ONLY,
    image: inputMode !== TRIPO_IMAGE_INPUT_MODES.PROMPT_ONLY,
    requiresPrompt: inputMode !== TRIPO_IMAGE_INPUT_MODES.IMAGE_ONLY,
    requiresImage: inputMode === TRIPO_IMAGE_INPUT_MODES.IMAGE_ONLY,
    maxFiles: model.maxFiles ?? 0,
    disallowWebp: Boolean(model.disallowWebp),
  };
}

export function getTripoGenerateImageCost(modelVersion = "") {
  return getTripoGenerateImageModel(modelVersion).cost ?? 5;
}

export function normalizeTripoReferenceImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

export function limitTripoReferenceImages(value, maxFiles = 0) {
  const max = Math.max(0, Number(maxFiles) || 0);
  if (max <= 0) return [];
  return normalizeTripoReferenceImages(value).slice(0, max);
}

export function isTripoReferenceImageReady(value) {
  return Boolean(value?.tripoFile || value?.token);
}

export function isTripoReferenceImageWebp(value) {
  const type = String(value?.type || value?.tripoFile?.type || "").trim().toLowerCase();
  const mime = String(value?.file?.type || "").trim().toLowerCase();
  const name = String(value?.file?.name || "").trim().toLowerCase();
  return type === "webp" || mime === "image/webp" || name.endsWith(".webp");
}

export function filterTripoReferenceImagesForPolicy(value, policy = {}) {
  if (!policy.image) return [];
  const filtered = normalizeTripoReferenceImages(value).filter((item) => (
    !policy.disallowWebp || !isTripoReferenceImageWebp(item)
  ));
  return limitTripoReferenceImages(filtered, policy.maxFiles || filtered.length);
}
