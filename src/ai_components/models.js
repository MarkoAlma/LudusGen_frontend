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
                        apiModel: "openrouter/free",
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
                        id: "flux_schnell",
                        name: "Flux Schnell",
                        tier: "lite", tierLabel: "Gyors",
                        description: "Black Forest Labs — ultragyors",
                        badge: "~$0.003 / kép",
                        priceNote: "< 1 sec",
                        apiId: "fal-ai/flux/schnell",
                        provider: "fal",
                        color: "#fbbf24",
                        gradient: "from-yellow-400 to-amber-400",
                        panelType: "image",
                        outputNote: "1024×1024",
                        maxSteps: 4,
                    },
                    {
                        id: "flux_pro",
                        name: "Flux Pro 1.1",
                        tier: "pro", tierLabel: "Prémium",
                        description: "Black Forest Labs — prémium minőség",
                        badge: "~$0.04 / kép",
                        priceNote: "5–10 sec",
                        apiId: "fal-ai/flux-pro/v1.1",
                        provider: "fal",
                        color: "#f59e0b",
                        gradient: "from-amber-500 to-orange-500",
                        panelType: "image",
                        outputNote: "Up to 2048px",
                        maxSteps: 50,
                    },
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
                        id: "openai_tts",
                        name: "OpenAI TTS",
                        tier: "lite", tierLabel: "Gyors",
                        description: "Természetes hangszintézis",
                        badge: "$15 / 1M kar",
                        priceNote: "~1 sec",
                        apiModel: "tts-1",
                        provider: "openai",
                        color: "#34d399",
                        gradient: "from-emerald-400 to-green-400",
                        panelType: "audio",
                        audioType: "tts",
                        voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
                    },
                    {
                        id: "elevenlabs",
                        name: "ElevenLabs v3",
                        tier: "pro", tierLabel: "Prémium",
                        description: "Legvalósághűbb emberi hang",
                        badge: "$22 / 1M kar",
                        priceNote: "2–5 sec",
                        apiModel: "eleven_multilingual_v2",
                        provider: "elevenlabs",
                        color: "#10b981",
                        gradient: "from-green-500 to-teal-500",
                        panelType: "audio",
                        audioType: "tts",
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