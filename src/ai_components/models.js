// ═══════════════════════════════════════════════════════
// models.js — Központi modell definíciók
// ═══════════════════════════════════════════════════════

export const MODEL_GROUPS = [
    // ─── CHAT ────────────────────────────────────────────
    {
        id: "chat",
        label: "Chat",
        emoji: "💬",
        color: "#8b5cf6",
        defaultOpen: true,
        categories: [
            {
                id: "chat_anthropic",
                label: "Anthropic",
                models: [
                    {
                        id: "claude_sonnet",
                        name: "Claude Sonnet 4",
                        tier: "lite", tierLabel: "Gyors",
                        description: "Intelligens, gyors, olcsó",
                        badge: "$3 / 1M tok",
                        apiModel: "claude-sonnet-4-20250514",
                        provider: "anthropic",
                        color: "#f59e0b",
                        gradient: "from-amber-400 to-orange-400",
                        panelType: "chat",
                        defaultSystemPrompt: "You are a helpful, harmless, and honest assistant. Respond in the same language the user writes in.",
                    },
                    {
                        id: "claude_opus",
                        name: "Claude Opus 4",
                        tier: "pro", tierLabel: "Prémium",
                        description: "A legerősebb Anthropic modell",
                        badge: "$15 / 1M tok",
                        apiModel: "claude-opus-4-20250514",
                        provider: "anthropic",
                        color: "#f97316",
                        gradient: "from-orange-400 to-red-400",
                        panelType: "chat",
                        defaultSystemPrompt: "You are a helpful, harmless, and honest assistant. Respond in the same language the user writes in.",
                    },
                ],
            },
            {
                id: "chat_openai",
                label: "OpenAI",
                models: [
                    {
                        id: "gpt4o_mini",
                        name: "GPT-4o mini",
                        tier: "lite", tierLabel: "Gyors",
                        description: "Gyors, olcsó, megbízható",
                        badge: "$0.15 / 1M tok",
                        apiModel: "gpt-4o-mini",
                        provider: "openai",
                        color: "#10b981",
                        gradient: "from-emerald-400 to-teal-400",
                        panelType: "chat",
                        defaultSystemPrompt: "You are a helpful assistant. Respond in the same language the user writes in.",
                    },
                    {
                        id: "gpt4o",
                        name: "GPT-4o",
                        tier: "pro", tierLabel: "Prémium",
                        description: "Multimodális flagship modell",
                        badge: "$5 / 1M tok",
                        apiModel: "gpt-4o",
                        provider: "openai",
                        color: "#059669",
                        gradient: "from-teal-500 to-emerald-500",
                        panelType: "chat",
                        defaultSystemPrompt: "You are a helpful assistant. Respond in the same language the user writes in.",
                    },
                ],
            },
            
        ],
    },

    // ─── KÓD ─────────────────────────────────────────────
   {
        id: "code",
        label: "Kód",
        emoji: "💻",
        color: "#3b82f6",
        defaultOpen: false,
        categories: [

            {
                id: "code_models",
                label: null,
                models: [
                    {
                        id: "deepseek_code",
                        name: "DeepSeek Code Free",
                        tier: "lite",
                        tierLabel: "Ingyenes",
                        description: "Profi fejlesztőasszisztens DeepSeek ingyenes OpenRouter hozzáféréssel",
                        badge: "Free / napi limit",
                        apiModel: "arcee-ai/trinity-large-preview:free", //csere
                        provider: "openrouter",
                        color: "#6366f1",
                        gradient: "from-indigo-500 to-purple-500",
                        panelType: "chat",
                        defaultSystemPrompt: `You are an elite software engineer with deep expertise across all programming languages and paradigms.
                            - Produce production-ready, optimized code
                            - Apply SOLID principles and design patterns
                            - Include comprehensive error handling
                            - Write thorough technical explanations
                            - Review and suggest improvements proactively
                            - Respond in the same language the user writes in`
                    },
                    {
                        id: "gemini-3-flash",
                        name: "Gemini 3 Flash",
                        apiModel: "gemini-3-flash-preview",   // ← ezt küldi a backendnek
                        provider: "gemini",              // ← új provider
                        color: "#4285f4",
                        },
                    {
                        id: "gemini-2.5-pro",
                        name: "gemini-2.5-pro",
                        apiModel: "gemini-2.5-pro",   // ← ezt küldi a backendnek
                        provider: "gemini",              // ← új provider
                        color: "#4285f4",
                        },
                    { id: "groq-gpt120b", name: "GPT OSS 120B", apiModel: "openai/gpt-oss-120b", provider: "groq", color: "#10a37f" },
                    { id: "groq-qwen3", name: "Qwen3 32B", apiModel: "qwen/qwen3-32b", provider: "groq", color: "#9333ea" },
                    { id: "groq-llama70b", name: "Llama 3.3 70B", apiModel: "llama-3.3-70b-versatile", provider: "groq", color: "#f55036" },
                    { id: "cerebras-llama8b",   name: "Llama 3.1 8B (Cerebras)",      apiModel: "llama3.1-8b",                   provider: "cerebras", color: "#818cf8" },
                    { id: "cerebras-gpt120b",   name: "GPT OSS 120B (Cerebras)",       apiModel: "gpt-oss-120b",                  provider: "cerebras", color: "#6366f1" },
                    { id: "cerebras-qwen235b",  name: "Qwen 3 235B (Cerebras) (Nem jo)",        apiModel: "qwen-3-235b-a22b-instruct-2507", provider: "cerebras", color: "#8b5cf6" },
                    { id: "cerebras-zaiglm",    name: "Z.ai GLM 4.7 (Cerebras) (Nem jo)",       apiModel: "zai-glm-4.7",                   provider: "cerebras", color: "#a855f7" },
                    { id: "mistral-large",   name: "Mistral Large (Mistral)",    apiModel: "mistral-large-latest",    provider: "mistral", color: "#f97316" },
                    { id: "nvidia-glm5",   name: "Z.ai GLM 5 (NVIDIA)",    apiModel: "z-ai/glm5",    provider: "nvidia", color: "#16f921" },
                    { id: "nvidia-kimi",   name: "(img) Kimi 2.5 (NVIDIA)",    apiModel: "moonshotai/kimi-k2.5",    provider: "nvidia", color: "#16f921" , supportsVision: true },
                    { id: "qwen3.5-397b", name: "(img) Qwen 3.5 397B (NVIDIA)", apiModel: "qwen/qwen3.5-397b-a17b", provider: "nvidia", color: "#46f536", supportsVision: true },
                    { id: "qwen3-coder-480b", name: "Qwen 3 Coder 480B (NVIDIA)", apiModel: "qwen/qwen3-coder-480b-a35b-instruct", provider: "nvidia", color: "#16f921" },
                    { id: "mistralai-devstral-2-123b-instruct-2512", name: "DevStral 2 123B (coding) (NVIDIA)", apiModel: "mistralai/devstral-2-123b-instruct-2512", provider: "nvidia", color: "#16f921" },
                    { id: "deepseek-v3.2", name: "DeepSeek v3.2 (NVIDIA)", apiModel: "deepseek-ai/deepseek-v3.2", provider: "nvidia", color: "#16f921"},
                    { id: "google-gemma-3-27b-it", name: "(img) Gemma 3 27B IT (NVIDIA)", apiModel: "google/gemma-3-27b-it", provider: "nvidia", color: "#16f921", supportsVision: true  }, 

//                     {
//                         id: "deepseek_coder",
//                         name: "DeepSeek Coder V3",
//                         tier: "lite", tierLabel: "Gyors",
//                         description: "Specializált kód modell, ingyenes",
//                         badge: "Ingyenes",
//                         apiModel: "deepseek/deepseek-coder-v2-instruct",
//                         provider: "deepseek-chat",
//                         color: "#3b82f6",
//                         gradient: "from-blue-400 to-indigo-400",
//                         panelType: "chat",
//                         defaultSystemPrompt: `You are an expert programmer and software architect. 
// - Write clean, efficient, well-documented code
// - Follow best practices and design patterns
// - Explain your code clearly
// - Point out potential issues or improvements
// - Respond in the same language the user writes in`,
//                     },
                    {
                        id: "gpt4o_code",
                        name: "GPT-4o Code",
                        tier: "pro", tierLabel: "Prémium",
                        description: "Profi fejlesztőasszisztens",
                        badge: "$5 / 1M tok",
                        apiModel: "gpt-4o",
                        provider: "openai",
                        color: "#6366f1",
                        gradient: "from-indigo-500 to-purple-500",
                        panelType: "chat",
                        defaultSystemPrompt: `You are an elite software engineer with deep expertise across all programming languages and paradigms.
- Produce production-ready, optimized code
- Apply SOLID principles and design patterns
- Include comprehensive error handling
- Write thorough technical explanations
- Review and suggest improvements proactively
- Respond in the same language the user writes in`,
                    },
                ],
            },
        ],
    },

    // ─── KÉP ─────────────────────────────────────────────
    {
        id: "image",
        label: "Kép",
        emoji: "🖼️",
        color: "#f59e0b",
        defaultOpen: false,
        categories: [
            {
                id: "img_gen",
                label: null,
                models: [
                   
                    {
    id: "gemini-image",
    name: "Gemini Image Gen",
    apiModel: "gemini-2.5-flash-image",
    provider: "google-image",
    color: "#4285f4",
    badge: "Google",
    badgeDetail: "Gemini 2.5 Flash képgenerálás",
    description: "Google Gemini képgeneráló",
    tier: "pro",
    tierLabel: "Pro",
    panelType: "image",
  },
    {
    id: "cf-sdxl",
    name: "Stable Diffusion XL (Cloudflare)",
    apiModel: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    provider: "cloudflare",
    color: "#f6821f",
    badge: "Cloudflare",
    panelType: "image",
    tier: "free",
    tierLabel: "Free",
    description: "SDXL képgenerálás",
    },
    {
    id: "nvidia-sd3-medium",
    name: "Stable Diffusion 3 Medium (NVIDIA)",
    apiModel: "stabilityai/stable-diffusion-3-medium",
    provider: "nvidia-image",
    color: "#16f921",
    badge: "NVIDIA",
    panelType: "image",
},
    {
    id: "nvidia-flux-dev",
    name: "Flux 1 Dev (NVIDIA)",
    apiModel: "black-forest-labs/flux.1-dev",
    provider: "nvidia-image",
    color: "#16f921",
    badge: "NVIDIA",
    panelType: "image",
},
//     {
//     id: "nvidia-flux-kontext-dev",
//     name: "Flux 1 Kontext Dev (NVIDIA)",
//     apiModel: "black-forest-labs/flux.1-kontext-dev",
//     provider: "nvidia-image",
//     color: "#16f921",
//     badge: "NVIDIA",
//     panelType: "image",
// },


                ],
            },
            
        ],
    },

    // ─── HANG ─────────────────────────────────────────────
    {
        id: "audio",
        label: "Hang",
        emoji: "🎵",
        color: "#10b981",
        defaultOpen: false,
        categories: [
            {
                id: "tts",
                label: "Szöveg → Hang",
                models: [
                    {
    id: "nvidia_magpie_tts",
    name: "Magpie TTS",
    tier: "pro", tierLabel: "Multilingual",
    description: "NVIDIA Riva — expressív többnyelvű TTS",
    badge: "NVIDIA NIM",
    priceNote: "~1-2 sec",
    apiModel: "magpie-tts-multilingual",
    provider: "nvidia-riva",
    color: "#76b900",  // NVIDIA zöld
    gradient: "from-lime-500 to-green-600",
    panelType: "audio",
    audioType: "tts",
    voices: [
        { id: "Magpie-Multilingual.EN-US.Aria", label: "Aria (EN)", lang: "en-US" },
        { id: "Magpie-Multilingual.EN-US.Mia",  label: "Mia (EN)",  lang: "en-US" },
        { id: "Magpie-Multilingual.EN-US.James", label: "James (EN)", lang: "en-US" },
        { id: "Magpie-Multilingual.DE-DE.Karl",  label: "Karl (DE)", lang: "de-DE" },
        { id: "Magpie-Multilingual.ES-ES.Alba",  label: "Alba (ES)", lang: "es-ES" },
        { id: "Magpie-Multilingual.FR-FR.Lea",   label: "Lea (FR)",  lang: "fr-FR" },
        { id: "Magpie-Multilingual.ZH-CN.Mei",   label: "Mei (ZH)",  lang: "zh-CN" },
    ],
    emotions: ["Neutral", "Happy", "Sad", "Angry", "Fearful", "Disgust", "Surprised"],
    languages: [
        { code: "en-US", label: "English (US)" },
        { code: "de-DE", label: "German" },
        { code: "es-ES", label: "Spanish" },
        { code: "fr-FR", label: "French" },
        { code: "zh-CN", label: "Chinese" },
        { code: "ja-JP", label: "Japanese" },
    ],
},
                ],
            },
            {
                id: "music",
                label: "Szöveg → Zene",
                models: [
                    {
                        id: "musicgen",
                        name: "MusicGen Large",
                        tier: "lite", tierLabel: "Gyors",
                        description: "Meta — ingyenes zenegenerálás",
                        badge: "~$0.05 / gen",
                        priceNote: "~10 sec",
                        apiId: "fal-ai/musicgen/large",
                        provider: "fal",
                        color: "#6ee7b7",
                        gradient: "from-teal-400 to-cyan-400",
                        panelType: "audio",
                        audioType: "music",
                    },
                    {
                        id: "stable_audio",
                        name: "Stable Audio 2.0",
                        tier: "pro", tierLabel: "Prémium",
                        description: "Stability AI — HD zenei minőség",
                        badge: "~$0.15 / gen",
                        priceNote: "~20 sec",
                        apiId: "fal-ai/stable-audio",
                        provider: "fal",
                        color: "#059669",
                        gradient: "from-green-600 to-emerald-600",
                        panelType: "audio",
                        audioType: "music",
                    },
                    
                ],
            },
        ],
    },

    // ─── 3D ──────────────────────────────────────────────
    {
        id: "threed",
        label: "3D",
        emoji: "🧊",
        color: "#06b6d4",
        defaultOpen: false,
        categories: [
            {
                id: "img2d",
                label: "Kép → 3D",
                models: [
                    {
                        id: "triposr",
                        name: "TripoSR",
                        tier: "lite", tierLabel: "Gyors",
                        description: "Stability AI — villámgyors",
                        badge: "$0.07 / gen",
                        priceNote: "~0.5 sec",
                        apiId: "fal-ai/triposr",
                        provider: "fal",
                        color: "#38bdf8",
                        gradient: "from-sky-400 to-cyan-400",
                        inputType: "image",
                        outputNote: "GLB / OBJ",
                        panelType: "threed",
                    },
                    {
                        id: "trellis2",
                        name: "TRELLIS.2",
                        tier: "pro", tierLabel: "Prémium",
                        description: "Microsoft — PBR textúrás, profi",
                        badge: "$0.25–0.35",
                        priceNote: "3–60 sec",
                        apiId: "fal-ai/trellis-2",
                        provider: "fal",
                        color: "#06b6d4",
                        gradient: "from-cyan-500 to-indigo-500",
                        inputType: "image",
                        outputNote: "GLB (PBR)",
                        panelType: "threed",
                    },
                ],
            },
            {
                id: "txt2d",
                label: "Szöveg → 3D",
                models: [
                    {
                        id: "tripo_text",
                        name: "Tripo3D",
                        tier: "lite", tierLabel: "Gyors",
                        description: "Tripo AI — szövegből 3D",
                        badge: "~$0.30 / gen",
                        priceNote: "~10 sec",
                        apiId: "fal-ai/tripo3d/v2.5/text-to-3d",
                        provider: "fal",
                        color: "#a78bfa",
                        gradient: "from-violet-400 to-purple-400",
                        inputType: "text",
                        outputNote: "GLB / FBX",
                        panelType: "threed",
                    },
                    {
                        id: "meshy6",
                        name: "Meshy v6",
                        tier: "pro", tierLabel: "Prémium",
                        description: "Meshy AI — legjobb textúra",
                        badge: "~$0.75 / gen",
                        priceNote: "~30–60 sec",
                        apiId: "fal-ai/meshy/v6-preview/text-to-3d",
                        provider: "fal",
                        color: "#d946ef",
                        gradient: "from-purple-500 to-pink-500",
                        inputType: "text",
                        outputNote: "GLB (PBR+)",
                        panelType: "threed",
                    },
                ],
            },
        ],
    },
];

// Flat lookup map
export const ALL_MODELS = MODEL_GROUPS.flatMap((g) =>
    g.categories.flatMap((c) => c.models)
);

export const getModel = (id) => ALL_MODELS.find((m) => m.id === id);

export const findModelGroup = (modelId) => {
    for (const group of MODEL_GROUPS) {
        for (const cat of group.categories) {
            if (cat.models.some((m) => m.id === modelId)) return group.id;
        }
    }
    return null;
};

export const findModelCat = (modelId) => {
    for (const group of MODEL_GROUPS) {
        for (const cat of group.categories) {
            if (cat.models.some((m) => m.id === modelId)) return cat.id;
        }
    }
    return null;
};

// Default presets per panel type
export const DEFAULT_PRESETS = {
    chat: [
        {
            id: "default_balanced",
            name: "⚖️ Kiegyensúlyozott",
            description: "Általános célra optimalizált",
            systemPrompt: "You are a helpful, harmless, and honest assistant. Respond in the same language the user writes in.",
            temperature: 0.7,
            maxTokens: 2048,
            topP: 0.9,
            isDefault: true,
        },
        {
            id: "default_creative",
            name: "🎨 Kreatív",
            description: "Kreativitás és változatosság",
            systemPrompt: "You are a creative and imaginative assistant. Think outside the box, use vivid language, and offer unexpected perspectives. Respond in the same language the user writes in.",
            temperature: 1.1,
            maxTokens: 3000,
            topP: 0.95,
            isDefault: true,
        },
        {
            id: "default_precise",
            name: "🎯 Precíz",
            description: "Tényszerű, pontos válaszok",
            systemPrompt: "You are a precise and factual assistant. Provide accurate, well-structured information. Cite your reasoning. Avoid speculation. Respond in the same language the user writes in.",
            temperature: 0.3,
            maxTokens: 2048,
            topP: 0.85,
            isDefault: true,
        },
        {
            id: "default_code",
            name: "💻 Kód asszisztens",
            description: "Fejlesztési feladatokhoz",
            systemPrompt: `You are an expert software engineer. 
- Write clean, production-ready code with comments
- Explain your solutions step by step
- Point out edge cases and potential bugs
- Suggest best practices and improvements
Respond in the same language the user writes in.`,
            temperature: 0.4,
            maxTokens: 4096,
            topP: 0.9,
            isDefault: true,
        },
        {
            id: "default_tutor",
            name: "📚 Tanár",
            description: "Tanításhoz, magyarázathoz",
            systemPrompt: "You are a patient and thorough teacher. Break down complex topics into simple, digestible parts. Use examples and analogies. Adapt to the student's level. Respond in the same language the user writes in.",
            temperature: 0.6,
            maxTokens: 3000,
            topP: 0.9,
            isDefault: true,
        },
        {
            id: "default_translate",
            name: "🌍 Fordító",
            description: "Fordítási feladatokhoz",
            systemPrompt: "You are a professional translator. Provide accurate, natural-sounding translations. Preserve tone, nuance, and cultural context. If multiple translations are possible, explain the differences.",
            temperature: 0.3,
            maxTokens: 2048,
            topP: 0.9,
            isDefault: true,
        },
    ],
    image: [
        {
            id: "img_photorealistic",
            name: "📷 Fotóreális",
            description: "Valósághű, részletes képek",
            positivePrefix: "photorealistic, 8k uhd, professional photography, sharp focus, detailed, ",
            negativePrompt: "cartoon, anime, painting, drawing, illustration, blurry, low quality, watermark",
            width: 1024, height: 1024,
            steps: 30, guidance: 7.5,
            isDefault: true,
        },
        {
            id: "img_anime",
            name: "🎌 Anime",
            description: "Japán anime stílus",
            positivePrefix: "anime style, high quality anime, detailed anime artwork, vibrant colors, ",
            negativePrompt: "realistic, photo, 3d render, low quality, blurry",
            width: 1024, height: 1024,
            steps: 25, guidance: 7.0,
            isDefault: true,
        },
        {
            id: "img_painting",
            name: "🖌️ Olajfestmény",
            description: "Klasszikus festmény hatás",
            positivePrefix: "oil painting, impressionist style, thick brushstrokes, canvas texture, artistic, ",
            negativePrompt: "photo, realistic, digital art, low quality",
            width: 1024, height: 1024,
            steps: 35, guidance: 8.0,
            isDefault: true,
        },
        {
            id: "img_cinematic",
            name: "🎬 Filmszerű",
            description: "Cinematikus, drámai hatás",
            positivePrefix: "cinematic shot, dramatic lighting, film grain, movie scene, professional cinematography, ",
            negativePrompt: "cartoon, anime, blurry, low quality, amateur",
            width: 1792, height: 1024,
            steps: 35, guidance: 7.5,
            isDefault: true,
        },
    ],
    audio: [
        {
            id: "audio_natural",
            name: "🗣️ Természetes",
            description: "Nyugodt, természetes hang",
            speed: 1.0, stability: 0.75, similarityBoost: 0.85,
            isDefault: true,
        },
        {
            id: "audio_dramatic",
            name: "🎭 Drámai",
            description: "Érzelmesebb, változatos előadás",
            speed: 0.95, stability: 0.4, similarityBoost: 0.9,
            isDefault: true,
        },
        {
            id: "music_cinematic",
            name: "🎬 Filmzene",
            description: "Epikus, orchestrális",
            genre: "cinematic orchestral",
            mood: "epic, dramatic",
            duration: 30,
            isDefault: true,
        },
        {
            id: "music_lofi",
            name: "☕ Lo-fi",
            description: "Relax, tanuláshoz",
            genre: "lo-fi hip hop",
            mood: "calm, chill, relaxing",
            duration: 45,
            isDefault: true,
        },
    ],
};