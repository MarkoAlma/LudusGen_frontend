
// ────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────────────────────────────────

import { STYLE_OPTIONS } from "./Constants";

/**
 * Strip style prefix from a prompt
 * @param {string} prompt - The prompt to strip
 * @param {string} styleId - The style ID
 * @returns {string} - Prompt without prefix
 */
export function stripStylePrefix(prompt, styleId) {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style?.prefix) return prompt;
  if (prompt.startsWith(style.prefix)) return prompt.slice(style.prefix.length);
  return prompt;
}

/**
 * Apply style prefix to a raw prompt
 * @param {string} rawPrompt - The raw prompt
 * @param {string} styleId - The style ID
 * @returns {string} - Prompt with prefix
 */
export function applyStylePrefix(rawPrompt, styleId) {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style?.prefix) return rawPrompt;
  return style.prefix + rawPrompt;
}

/**
 * Format date to Hungarian locale
 * @param {Date|Timestamp} d - Date to format
 * @returns {string} - Formatted date string
 */
export function fmtDate(d) {
  if (!d) return '';
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleString('hu-HU', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Get default Trellis parameters
 * @returns {Object} - Default parameter object
 */
export function defaultParams() {
  return {
    slat_cfg_scale: 3.0,
    ss_cfg_scale: 7.5,
    slat_sampling_steps: 25,
    ss_sampling_steps: 25,
    seed: 0,
    randomSeed: false,
  };
}

/**
 * Fetch GLB file as blob URL
 * @param {string} modelUrl - URL of the model
 * @param {Function} getIdToken - Function to get authentication token
 * @returns {Promise<string|null>} - Blob URL or null
 */
export async function fetchGlbAsBlob(modelUrl, getIdToken) {
  if (!modelUrl) return null;
  if (modelUrl.startsWith('data:')) return modelUrl;

  let fetchUrl = modelUrl;

  if (modelUrl.startsWith('/api/')) {
    fetchUrl = `http://localhost:3001${modelUrl}`;
  } else if (modelUrl.startsWith('https://s3.') || modelUrl.includes('backblazeb2.com')) {
    fetchUrl = `http://localhost:3001/api/trellis/proxy?url=${encodeURIComponent(modelUrl)}`;
  }

  const token = getIdToken ? await getIdToken() : '';
  const r = await fetch(fetchUrl, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!r.ok) throw new Error(`GLB letöltés sikertelen (${r.status})`);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}