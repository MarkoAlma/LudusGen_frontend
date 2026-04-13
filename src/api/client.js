/**
 * Centralized API client for LudusGen frontend.
 * All HTTP calls to the backend should go through this module.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Build auth headers from a Firebase ID token getter.
 * @param {(() => Promise<string>) | string} getIdTokenOrToken - async function that returns a Firebase ID token, or a raw token string
 * @returns {Promise<Record<string, string>>}
 */
export async function authHeaders(getIdTokenOrToken) {
  const token = typeof getIdTokenOrToken === 'function'
    ? (await getIdTokenOrToken())
    : (getIdTokenOrToken || '');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Generic POST helper with JSON body and auth.
 * @param {string} endpoint - relative path like '/api/enhance' or full URL
 * @param {object} body
 * @param {(() => Promise<string>) | string} getIdTokenOrToken
 * @returns {Promise<object>} parsed JSON response
 */
export async function post(endpoint, body, getIdTokenOrToken) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = await authHeaders(getIdTokenOrToken);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { const j = await res.json(); errMsg = j.message || errMsg; } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

/**
 * Generic GET helper with auth.
 * @param {string} endpoint
 * @param {(() => Promise<string>) | string} getIdTokenOrToken
 * @returns {Promise<object>} parsed JSON response
 */
export async function get(endpoint, getIdTokenOrToken) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = await authHeaders(getIdTokenOrToken);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { const j = await res.json(); errMsg = j.message || errMsg; } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

/**
 * Generic DELETE helper with auth.
 * @param {string} endpoint
 * @param {(() => Promise<string>) | string} getIdTokenOrToken
 * @returns {Promise<object>} parsed JSON response
 */
export async function del(endpoint, getIdTokenOrToken) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = await authHeaders(getIdTokenOrToken);
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { const j = await res.json(); errMsg = j.message || errMsg; } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

// ── Endpoint constants ──────────────────────────────────────────────────────

export const ENDPOINTS = {
  // Auth / User
  REGISTER_USER: '/api/register-user',
  GET_USER: (uid) => `/api/get-user/${uid}`,
  CHECK_2FA_REQUIRED: '/api/check-2fa-required',
  VALIDATE_PASSWORD: '/api/validate-password',
  VALIDATE_GOOGLE_SESSION: '/api/validate-google-session',
  CHECK_2FA_STATUS: '/api/check-2fa-status',
  FORGOT_PASSWORD: '/api/forgot-password',

  // AI
  CHAT: '/api/chat',
  ENHANCE: '/api/enhance',
  VISION_DESCRIBE: '/api/vision-describe',
  GENERATE_TTS: '/api/generate-tts',
  GENERATE_MUSIC: '/api/generate-music',
  TRELLIS: '/api/trellis',

  // Tripo
  TRIPO_TASK: '/api/tripo/task',
  TRIPO_TASK_STATUS: (taskId) => `/api/tripo/task/${taskId}`,
  TRIPO_TASK_CANCEL: (taskId) => `/api/tripo/task/${taskId}/cancel`,
  TRIPO_UPLOAD: '/api/tripo/upload',
  TRIPO_ASSETS_UPLOAD: '/api/tripo/assets/upload',
  TRIPO_MODEL_CAPABILITIES: '/api/tripo/model-capabilities',
  TRIPO_HISTORY_EXPIRED: '/api/tripo/history/expired',
  TRIPO_MODEL_PROXY: (url) => `/api/tripo/model-proxy?url=${encodeURIComponent(url)}`,

  // Meshy
  MESHY_TASK: (type, id) => `/api/meshy/task/${type}/${id}`,
  MESHY_TEXT_TO_3D: '/api/meshy/text-to-3d',
  MESHY_IMAGE_TO_3D: '/api/meshy/image-to-3d',
  MESHY_REFINE: '/api/meshy/refine',

  // Proxies for GLB/model downloads
  TRELLIS_PROXY: (url) => `/api/trellis/proxy?url=${encodeURIComponent(url)}`,
};

export { API_BASE };
