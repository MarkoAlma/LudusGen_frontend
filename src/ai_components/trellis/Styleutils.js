/**
 * Stílus opciók a Trellis generáláshoz
 * Minden stílus egy prefix-et ad hozzá a prompt elejéhez
 */
export const STYLE_OPTIONS = [
  { 
    id: 'nostyle', 
    label: 'Nincs', 
    emoji: '🚫', 
    prefix: '', 
    tip: 'Nincs stílus prefix' 
  },
  { 
    id: 'realistic', 
    label: 'Fotórealisztikus', 
    emoji: '📷', 
    prefix: 'photorealistic, highly detailed, 8k resolution, ', 
    tip: 'Fotórealisztikus megjelenés' 
  },
  { 
    id: 'lowpoly', 
    label: 'Low-poly', 
    emoji: '🔷', 
    prefix: 'low-poly art style, faceted geometry, simple shapes, ', 
    tip: 'Egyszerű, sokszögű stílus' 
  },
  { 
    id: 'cartoon', 
    label: 'Cartoon', 
    emoji: '🎨', 
    prefix: 'cartoon style, stylized, vibrant colors, playful, ', 
    tip: 'Rajzfilm szerű megjelenés' 
  },
  { 
    id: 'scifi', 
    label: 'Sci-fi', 
    emoji: '🚀', 
    prefix: 'sci-fi style, futuristic, metallic, high-tech, ', 
    tip: 'Tudományos-fantasztikus megjelenés' 
  },
  { 
    id: 'fantasy', 
    label: 'Fantasy', 
    emoji: '🗡️', 
    prefix: 'fantasy style, magical, ornate details, mystical, ', 
    tip: 'Fantasy világbeli tárgyak' 
  },
  { 
    id: 'minimalist', 
    label: 'Minimalista', 
    emoji: '◽', 
    prefix: 'minimalist design, clean lines, simple forms, ', 
    tip: 'Letisztult, egyszerű forma' 
  },
  { 
    id: 'steampunk', 
    label: 'Steampunk', 
    emoji: '⚙️', 
    prefix: 'steampunk style, brass, gears, victorian era, ', 
    tip: 'Gőzgép-punk stílus' 
  },
  { 
    id: 'cyberpunk', 
    label: 'Cyberpunk', 
    emoji: '🌃', 
    prefix: 'cyberpunk style, neon lights, dystopian, high-tech low-life, ', 
    tip: 'Kiberpunk városi stílus' 
  },
];

/**
 * Hozzáadja a stílus prefix-et a prompthoz
 * @param {string} prompt - Az eredeti prompt
 * @param {string} styleId - A kiválasztott stílus ID-ja
 * @returns {string} - A prefix-szel kiegészített prompt
 */
export function applyStylePrefix(prompt, styleId) {
  if (!prompt || !styleId || styleId === 'nostyle') {
    return prompt;
  }
  
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style || !style.prefix) {
    return prompt;
  }
  
  // Ellenőrizzük hogy a prompt már nem tartalmazza-e a prefix-et
  const cleanPrompt = prompt.trim();
  if (cleanPrompt.startsWith(style.prefix)) {
    return cleanPrompt;
  }
  
  return style.prefix + cleanPrompt;
}

/**
 * Eltávolítja a stílus prefix-et a promptból
 * @param {string} prompt - A prompt ami tartalmazhatja a prefix-et
 * @param {string} styleId - A kiválasztott stílus ID-ja
 * @returns {string} - A prefix nélküli prompt
 */
export function stripStylePrefix(prompt, styleId) {
  if (!prompt || !styleId || styleId === 'nostyle') {
    return prompt;
  }
  
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style || !style.prefix) {
    return prompt;
  }
  
  const trimmed = prompt.trim();
  if (trimmed.startsWith(style.prefix)) {
    return trimmed.slice(style.prefix.length).trim();
  }
  
  return trimmed;
}

/**
 * Megkeresi hogy melyik stílus prefix-ével kezdődik a prompt
 * @param {string} prompt - A prompt szöveg
 * @returns {string|null} - A talált stílus ID-ja vagy null
 */
export function detectStyleFromPrompt(prompt) {
  if (!prompt) return null;
  
  const trimmed = prompt.trim();
  for (const style of STYLE_OPTIONS) {
    if (style.prefix && trimmed.startsWith(style.prefix)) {
      return style.id;
    }
  }
  
  return null;
}