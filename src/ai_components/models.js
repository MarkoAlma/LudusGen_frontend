// ═══════════════════════════════════════════════════════
// models.js — Központi modell definíciók
// ═══════════════════════════════════════════════════════

const DEAPI_QWEN3_TTS_LANGUAGES = [
    { id: "English", label: "English" },
    { id: "Chinese", label: "Chinese" },
    { id: "Japanese", label: "Japanese" },
    { id: "Korean", label: "Korean" },
    { id: "German", label: "German" },
    { id: "French", label: "French" },
    { id: "Russian", label: "Russian" },
    { id: "Portuguese", label: "Portuguese" },
    { id: "Spanish", label: "Spanish" },
    { id: "Italian", label: "Italian" },
];

const DEAPI_QWEN3_TTS_VOICES = [
    { id: "Vivian", label: "Vivian" },
    { id: "Serena", label: "Serena" },
    { id: "Uncle_Fu", label: "Uncle Fu" },
    { id: "Dylan", label: "Dylan" },
    { id: "Eric", label: "Eric" },
    { id: "Ryan", label: "Ryan" },
    { id: "Aiden", label: "Aiden" },
    { id: "Ono_Anna", label: "Ono Anna" },
    { id: "Sohee", label: "Sohee" },
];

const DEAPI_KOKORO_LANGUAGES = [
    { id: "en-us", label: "English US" },
    { id: "en-gb", label: "English GB" },
    { id: "es", label: "Spanish" },
    { id: "fr-fr", label: "French" },
    { id: "hi", label: "Hindi" },
    { id: "it", label: "Italian" },
    { id: "pt-br", label: "Portuguese BR" },
];

const DEAPI_KOKORO_VOICES = [
    { id: "af_alloy", label: "Alloy" },
    { id: "af_aoede", label: "Aoede" },
    { id: "af_bella", label: "Bella" },
    { id: "af_heart", label: "Heart" },
    { id: "af_jessica", label: "Jessica" },
    { id: "af_kore", label: "Kore" },
    { id: "af_nicole", label: "Nicole" },
    { id: "af_nova", label: "Nova" },
    { id: "af_river", label: "River" },
    { id: "af_sarah", label: "Sarah" },
    { id: "af_sky", label: "Sky" },
    { id: "am_adam", label: "Adam" },
    { id: "am_echo", label: "Echo" },
    { id: "am_eric", label: "Eric" },
    { id: "am_fenrir", label: "Fenrir" },
    { id: "am_liam", label: "Liam" },
    { id: "am_michael", label: "Michael" },
    { id: "am_onyx", label: "Onyx" },
    { id: "am_puck", label: "Puck" },
    { id: "am_santa", label: "Santa" },
];

const DEAPI_CHATTERBOX_LANGUAGES = [
    { id: "ar", label: "Arabic" },
    { id: "da", label: "Danish" },
    { id: "de", label: "German" },
    { id: "el", label: "Greek" },
    { id: "en", label: "English" },
    { id: "es", label: "Spanish" },
    { id: "fi", label: "Finnish" },
    { id: "fr", label: "French" },
    { id: "he", label: "Hebrew" },
    { id: "hi", label: "Hindi" },
    { id: "it", label: "Italian" },
    { id: "ja", label: "Japanese" },
    { id: "ko", label: "Korean" },
    { id: "ms", label: "Malay" },
    { id: "nl", label: "Dutch" },
    { id: "no", label: "Norwegian" },
    { id: "pl", label: "Polish" },
    { id: "pt", label: "Portuguese" },
    { id: "ru", label: "Russian" },
    { id: "sv", label: "Swedish" },
    { id: "sw", label: "Swahili" },
    { id: "tr", label: "Turkish" },
    { id: "zh", label: "Chinese" },
];

export const MODEL_GROUPS = [


    // ─── KÓD ─────────────────────────────────────────────
    {
        id: "code",
        label: "Code",
        emoji: "💻",
        color: "#3b82f6",
        defaultOpen: false,
        categories: [
            {
                id: "code_models",
                label: null,
                models: [
                    {
                        id: "trinity-large",
                        name: "Trinity Large",
                        tier: "lite", tierLabel: "Free",
                        description: "Professional developer assistant with free Trinity access through OpenRouter",
                        badge: "Free / daily limit",
                        apiModel: "arcee-ai/trinity-large-preview:free",
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
                        tier: "lite", tierLabel: "Fast",
                        description: "Cross-modal, ultra-fast Google model",
                        badge: "Free Tier",
                        apiModel: "gemini-3-flash-preview",
                        provider: "gemini",
                        color: "#4285f4",
                        gradient: "from-blue-500 to-red-500",
                        panelType: "chat",
                        defaultSystemPrompt: "You are a helpful AI assistant powered by Google Gemini. Respond in the same language the user writes in.",
                    },
                    {
                        id: "gemini-2.5-pro",
                        name: "Gemini 2.5 Pro",
                        tier: "pro", tierLabel: "Premium",
                        description: "Google's most intelligent model",
                        badge: "Advanced",
                        apiModel: "gemini-2.5-pro",
                        provider: "gemini",
                        color: "#4285f4",
                        gradient: "from-blue-600 to-indigo-600",
                        panelType: "chat",
                        defaultSystemPrompt: "You are a helpful AI assistant powered by Google Gemini. Respond in the same language the user writes in.",
                    },
                    { id: "groq-gpt120b", name: "GPT OSS 120B", apiModel: "openai/gpt-oss-120b", provider: "groq", color: "#10a37f", gradient: "from-teal-400 to-emerald-500", panelType: "chat" },
                    { id: "groq-qwen3", name: "Qwen3 32B", apiModel: "qwen/qwen3-32b", provider: "groq", color: "#9333ea", gradient: "from-purple-400 to-indigo-500", panelType: "chat" },
                    { id: "groq-llama70b", name: "Llama 3.3 70B", apiModel: "llama-3.3-70b-versatile", provider: "groq", color: "#f55036", gradient: "from-orange-500 to-red-600", panelType: "chat" },
                    { id: "cerebras-llama8b", name: "Llama 3.1 8B (Cerebras)", apiModel: "llama3.1-8b", provider: "cerebras", color: "#818cf8", gradient: "from-indigo-400 to-blue-500", panelType: "chat" },
                    { id: "mistral-large", name: "Mistral Large (Mistral)", apiModel: "mistral-large-latest", provider: "mistral", color: "#f97316", gradient: "from-orange-400 to-red-500", defaultTemperature: 0.2, defaultMaxTokens: 2048, defaultTopP: 0.9, panelType: "chat" },
                    { id: "nvidia-glm4.7", name: "Z.ai GLM 4.7 (NVIDIA)", apiModel: "z-ai/glm4.7", provider: "nvidia", color: "#16f921", gradient: "from-lime-400 to-green-500", defaultTemperature: 0.7, defaultMaxTokens: 2048, defaultTopP: 0.9, panelType: "chat" },
                    { id: "deepseek-v3.2", name: "DeepSeek v3.2 (NVIDIA)", apiModel: "deepseek-ai/deepseek-v3.2", provider: "nvidia", color: "#3b82f6", gradient: "from-blue-500 to-indigo-600", defaultTemperature: 0.3, defaultMaxTokens: 2048, defaultTopP: 0.95, panelType: "chat" },
                    { id: "google-gemma-3-27b-it", name: "(img) Gemma 3 27B IT (NVIDIA)", apiModel: "google/gemma-3-27b-it", provider: "nvidia", color: "#4285f4", gradient: "from-blue-400 to-red-400", supportsVision: true, defaultTemperature: 0.8, defaultMaxTokens: 2048, defaultTopP: 0.95, panelType: "chat" },



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
                        tier: "pro", tierLabel: "Premium",
                        description: "Professional developer assistant",
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
        label: "Image",
        emoji: "🖼️",
        color: "#f59e0b",
        defaultOpen: false,
        categories: [
            {
                id: "img_gen",
                label: null,
                models: [
                    {
                        id: "cf-sdxl",
                        name: "Stable Diffusion XL (Cloudflare)",
                        apiModel: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
                        provider: "cloudflare",
                        color: "#f6821f",
                        badge: "Cloudflare",
                        panelType: "image",
                        tier: "free", tierLabel: "Free",
                        description: "SDXL image generation",
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
                    {
                        id: "z-image-turbo",
                        name: "Z-Image Turbo (ModelScope)",
                        apiModel: "Tongyi-MAI/Z-Image-Turbo",
                        provider: "modelscope",
                        color: "#9333ea",
                        badge: "ModelScope",
                        badgeDetail: "Alibaba Tongyi - fast image generator",
                        description: "Z-Image Turbo image generation (free)",
                        tier: "free", tierLabel: "Free",
                        panelType: "image",
                    },
                    {
                        id: "qwen-image-2512",
                        name: "Qwen Image (ModelScope)",
                        apiModel: "Qwen/Qwen-Image-2512",
                        provider: "modelscope",
                        color: "#9333ea",
                        badge: "ModelScope",
                        badgeDetail: "Alibaba Qwen - fast image generator",
                        description: "Qwen image generation (free)",
                        tier: "free", tierLabel: "Free",
                        panelType: "image",
                    },
                    {
                        id: "flux2-klein-base-9B",
                        name: "Flux 2 (ModelScope)",
                        apiModel: "flux-community/FLUX.2-klein-base-9B",
                        provider: "modelscope",
                        color: "#9333ea",
                        badge: "ModelScope",
                        badgeDetail: "Alibaba Flux 2 - fast image generator",
                        description: "Flux 2 image generation (free)",
                        tier: "free", tierLabel: "Free",
                        panelType: "image",
                    },
                    {
                        id: "sd3-medium",
                        name: "Stable Diffusion 3 (ModelScope)",
                        apiModel: "MusePublic/stable-diffusion-3-medium",
                        provider: "modelscope",
                        color: "#9333ea",
                        badge: "ModelScope",
                        badgeDetail: "Alibaba SD 3 - fast image generator",
                        description: "SD 3 image generation (free)",
                        tier: "free", tierLabel: "Free",
                        panelType: "image",
                    },
                    {
                        id: "qwen-image-edit",
                        name: "Qwen Image Edit (ModelScope)",
                        apiModel: "Qwen/Qwen-Image-Edit-2511",
                        provider: "modelscope",
                        color: "#7c3aed",
                        badge: "ModelScope",
                        badgeDetail: "Alibaba Qwen - image editor",
                        description: "Edit an existing image with text instructions",
                        tier: "free", tierLabel: "Free",
                        panelType: "image",
                        needsInputImage: true,   // ← ez mondja meg a frontendnek, hogy kell input kép
                    },
                    {
                        id: "flux-1-edit",
                        name: "FLUX Edit (ModelScope)",
                        apiModel: "MusePublic/FLUX.1-Kontext-Dev",
                        provider: "modelscope",
                        color: "#7c3aed",
                        badge: "ModelScope",
                        badgeDetail: "Alibaba Flux - image editor",
                        description: "Edit an existing image with text instructions",
                        tier: "free", tierLabel: "Free",
                        panelType: "image",
                        needsInputImage: true,   // ← ez mondja meg a frontendnek, hogy kell input kép
                    },
                ],
            },
        ],
    },

    // ─── HANG ─────────────────────────────────────────────
    {
        id: "audio",
        label: "Audio",
        emoji: "🎵",
        color: "#10b981",
        defaultOpen: false,
        categories: [
            {
                id: "tts",
                label: "Text to Speech",
                models: [
                    {
                        id: "nvidia_magpie_tts",
                        name: "Magpie TTS",
                        tier: "pro", tierLabel: "Multilingual",
                        description: "NVIDIA Riva - expressive multilingual TTS",
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
                            { id: "Magpie-Multilingual.EN-US.Mia", label: "Mia (EN)", lang: "en-US" },
                            { id: "Magpie-Multilingual.EN-US.James", label: "James (EN)", lang: "en-US" },
                            { id: "Magpie-Multilingual.DE-DE.Karl", label: "Karl (DE)", lang: "de-DE" },
                            { id: "Magpie-Multilingual.ES-ES.Alba", label: "Alba (ES)", lang: "es-ES" },
                            { id: "Magpie-Multilingual.FR-FR.Lea", label: "Lea (FR)", lang: "fr-FR" },
                            { id: "Magpie-Multilingual.ZH-CN.Mei", label: "Mei (ZH)", lang: "zh-CN" },
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
                    {
                        id: "deapi_kokoro_tts",
                        name: "Kokoro",
                        tier: "lite", tierLabel: "API",
                        description: "deAPI text-to-audio TTS",
                        badge: "deAPI",
                        priceNote: "5 RPM / 300 RPD",
                        apiId: "txt2audio",
                        apiModel: "Kokoro",
                        provider: "deapi",
                        deapiTtsModelSlug: "Kokoro",
                        deapiTtsDefaultMode: "custom_voice",
                        deapiTtsModes: ["custom_voice"],
                        deapiTtsDefaults: { voice: "af_alloy", lang: "en-us", speed: 1, format: "mp3", sampleRate: 24000 },
                        deapiTtsLimits: { minText: 3, maxText: 10001, minSpeed: 0.5, maxSpeed: 2 },
                        deapiTtsLanguages: DEAPI_KOKORO_LANGUAGES,
                        deapiTtsVoices: DEAPI_KOKORO_VOICES,
                        color: "#14b8a6",
                        gradient: "from-teal-400 to-emerald-500",
                        panelType: "audio",
                        audioType: "tts",
                    },
                    {
                        id: "deapi_chatterbox_tts",
                        name: "Chatterbox",
                        tier: "lite", tierLabel: "API",
                        description: "deAPI text-to-audio TTS",
                        badge: "deAPI",
                        priceNote: "5 RPM / 300 RPD",
                        apiId: "txt2audio",
                        apiModel: "Chatterbox",
                        provider: "deapi",
                        deapiTtsModelSlug: "Chatterbox",
                        deapiTtsDefaultMode: "custom_voice",
                        deapiTtsModes: ["custom_voice"],
                        deapiTtsDefaults: { voice: "default", lang: "en", speed: 1, format: "mp3", sampleRate: 24000 },
                        deapiTtsLimits: { minText: 10, maxText: 2000, minSpeed: 1, maxSpeed: 1 },
                        deapiTtsLanguages: DEAPI_CHATTERBOX_LANGUAGES,
                        deapiTtsVoices: [{ id: "default", label: "Default" }],
                        color: "#f59e0b",
                        gradient: "from-amber-400 to-orange-500",
                        panelType: "audio",
                        audioType: "tts",
                    },
                    {
                        id: "deapi_qwen3_tts",
                        name: "Qwen3 TTS",
                        tier: "lite", tierLabel: "API",
                        description: "deAPI text-to-audio TTS",
                        badge: "deAPI",
                        priceNote: "5 RPM / 300 RPD",
                        apiId: "txt2audio",
                        apiModel: "Qwen3_TTS_12Hz_1_7B_CustomVoice",
                        provider: "deapi",
                        deapiTtsModelSlug: "Qwen3_TTS_12Hz_1_7B_CustomVoice",
                        deapiTtsDefaultMode: "custom_voice",
                        deapiTtsModes: ["voice_clone", "voice_design", "custom_voice"],
                        deapiTtsDefaultVariant: "custom_voice",
                        deapiTtsVariants: [
                            {
                                id: "custom_voice",
                                label: "Preset voice",
                                description: "Preset voice",
                                slug: "Qwen3_TTS_12Hz_1_7B_CustomVoice",
                                mode: "custom_voice",
                                defaults: { voice: "Vivian", lang: "English", speed: 1, format: "mp3", sampleRate: 24000 },
                                limits: { minText: 10, maxText: 5000, minSpeed: 1, maxSpeed: 1 },
                                languages: DEAPI_QWEN3_TTS_LANGUAGES,
                                voices: DEAPI_QWEN3_TTS_VOICES,
                            },
                            {
                                id: "voice_design",
                                label: "Sound design",
                                description: "Leirasbol",
                                slug: "Qwen3_TTS_12Hz_1_7B_VoiceDesign",
                                mode: "voice_design",
                                defaults: { voice: "default", lang: "English", speed: 1, format: "mp3", sampleRate: 24000 },
                                limits: { minText: 10, maxText: 5000, minSpeed: 1, maxSpeed: 1 },
                                languages: DEAPI_QWEN3_TTS_LANGUAGES,
                                voices: [],
                            },
                            {
                                id: "base",
                                label: "Voice cloning",
                                description: "Reference",
                                slug: "Qwen3_TTS_12Hz_1_7B_Base",
                                mode: "voice_clone",
                                defaults: { voice: "default", lang: "English", speed: 1, format: "mp3", sampleRate: 24000 },
                                limits: { minText: 10, maxText: 5000, minSpeed: 1, maxSpeed: 1, minRefAudioDuration: 5, maxRefAudioDuration: 15 },
                                languages: DEAPI_QWEN3_TTS_LANGUAGES,
                                voices: [],
                            },
                        ],
                        color: "#8b5cf6",
                        gradient: "from-violet-400 to-fuchsia-500",
                        panelType: "audio",
                        audioType: "tts",
                    },
                ],
            },
            {
                id: "music",
                label: "Text to Music",
                models: [
                    {
                        id: "minimax_music_2_6_free",
                        name: "MiniMax Music 2.6 Free",
                        tier: "lite", tierLabel: "Free",
                        description: "MiniMax - lyric-based or instrumental music generation",
                        badge: "MiniMax API",
                        priceNote: "Free tier",
                        apiId: "music-2.6-free",
                        provider: "minimax",
                        color: "#22c55e",
                        gradient: "from-emerald-400 to-lime-500",
                        panelType: "audio",
                        audioType: "music",
                    },
                    {
                        id: "deapi_acestep_1_5_xl_turbo_int8",
                        name: "Ace Step 1.5 XL Turbo INT8",
                        tier: "lite", tierLabel: "API",
                        description: "deAPI ACE-Step XL Turbo INT8 text-to-music generation",
                        badge: "deAPI",
                        priceNote: "Queue-based",
                        apiId: "txt2music",
                        provider: "deapi",
                        deapiModelSlug: "AceStep_1_5_XL_Turbo_INT8",
                        color: "#38bdf8",
                        gradient: "from-sky-400 to-cyan-500",
                        panelType: "audio",
                        audioType: "music",
                    },
                    {
                        id: "deapi_acestep_1_5_base",
                        name: "Ace Step 1.5 Base",
                        tier: "lite", tierLabel: "API",
                        description: "deAPI ACE-Step 1.5 Base text-to-music generation",
                        badge: "deAPI",
                        priceNote: "Queue-based",
                        apiId: "txt2music",
                        provider: "deapi",
                        deapiModelSlug: "AceStep_1_5_Base",
                        color: "#0ea5e9",
                        gradient: "from-sky-500 to-blue-500",
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
                        panelType: "threed",        // → Trellis2Panel (Meshy)
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
                        panelType: "threed",        // → Trellis2Panel (Meshy)
                    },
                    {
                        id: "nvidia_trellis",
                        name: "Trellis (NVIDIA)",
                        tier: "pro", tierLabel: "Prémium",
                        description: "microsoft/trellis — NVIDIA NIM",
                        badge: "NVIDIA NIM",
                        priceNote: "~30 sec",
                        provider: "nvidia",
                        color: "#a78bfa",
                        gradient: "from-violet-500 to-purple-600",
                        inputType: "image",
                        outputNote: "GLB",
                        panelType: "trellis",       // → TrellisPanel (NVIDIA)
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
                        panelType: "tripo",
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
            name: "⚖️ Balanced",
            description: "Optimized for general use",
            systemPrompt: "You are a helpful, harmless, and honest assistant. Respond in the same language the user writes in.",
            temperature: 0.7,
            maxTokens: 2048,
            topP: 0.9,
            isDefault: true,
        },
        {
            id: "default_creative",
            name: "🎨 Creative",
            description: "Creativity and variety",
            systemPrompt: "You are a creative and imaginative assistant. Think outside the box, use vivid language, and offer unexpected perspectives. Respond in the same language the user writes in.",
            temperature: 1.1,
            maxTokens: 3000,
            topP: 0.95,
            isDefault: true,
        },
        {
            id: "default_precise",
            name: "🎯 Precise",
            description: "Factual, accurate answers",
            systemPrompt: "You are a precise and factual assistant. Provide accurate, well-structured information. Cite your reasoning. Avoid speculation. Respond in the same language the user writes in.",
            temperature: 0.3,
            maxTokens: 2048,
            topP: 0.85,
            isDefault: true,
        },
        {
            id: "default_code",
            name: "💻 Code Assistant",
            description: "For development tasks",
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
            name: "📚 Tutor",
            description: "For teaching and explanations",
            systemPrompt: "You are a patient and thorough teacher. Break down complex topics into simple, digestible parts. Use examples and analogies. Adapt to the student's level. Respond in the same language the user writes in.",
            temperature: 0.6,
            maxTokens: 3000,
            topP: 0.9,
            isDefault: true,
        },
        {
            id: "default_translate",
            name: "🌍 Translator",
            description: "For translation tasks",
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
            name: "📷 Photorealistic",
            description: "Realistic, detailed images",
            positivePrefix: "photorealistic, 8k uhd, professional photography, sharp focus, detailed, ",
            negativePrompt: "cartoon, anime, painting, drawing, illustration, blurry, low quality, watermark",
            width: 1024, height: 1024,
            steps: 30, guidance: 7.5,
            isDefault: true,
        },
        {
            id: "img_anime",
            name: "🎌 Anime",
            description: "Japanese anime style",
            positivePrefix: "anime style, high quality anime, detailed anime artwork, vibrant colors, ",
            negativePrompt: "realistic, photo, 3d render, low quality, blurry",
            width: 1024, height: 1024,
            steps: 25, guidance: 7.0,
            isDefault: true,
        },
        {
            id: "img_painting",
            name: "🖌️ Oil Painting",
            description: "Classic painting look",
            positivePrefix: "oil painting, impressionist style, thick brushstrokes, canvas texture, artistic, ",
            negativePrompt: "photo, realistic, digital art, low quality",
            width: 1024, height: 1024,
            steps: 35, guidance: 8.0,
            isDefault: true,
        },
        {
            id: "img_cinematic",
            name: "🎬 Cinematic",
            description: "Cinematic, dramatic look",
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
            name: "🗣️ Natural",
            description: "Calm, natural voice",
            speed: 1.0, stability: 0.75, similarityBoost: 0.85,
            isDefault: true,
        },
        {
            id: "audio_dramatic",
            name: "🎭 Dramatic",
            description: "More emotional, varied delivery",
            speed: 0.95, stability: 0.4, similarityBoost: 0.9,
            isDefault: true,
        },
        {
            id: "music_cinematic",
            name: "🎬 Filmzene",
            description: "Epic, sweeping instrumental",
            prompt: "Epic cinematic soundtrack, heroic finale, sweeping strings, thunderous percussion, dramatic rise",
            lyrics: "",
            instrumental: true,
            lyricsOptimizer: false,
            stream: false,
            outputFormat: "url",
            sampleRate: 44100,
            bitrate: 256000,
            fileFormat: "mp3",
            isDefault: true,
        },
        {
            id: "music_lofi",
            name: "☕ Lo-fi",
            description: "Warm, chill instrumental texture",
            prompt: "Lo-fi hip hop, warm vinyl texture, rainy window ambience, mellow keys, late-night study session",
            lyrics: "",
            instrumental: true,
            lyricsOptimizer: false,
            stream: false,
            outputFormat: "url",
            sampleRate: 32000,
            bitrate: 128000,
            fileFormat: "mp3",
            isDefault: true,
        },
    ],
};
