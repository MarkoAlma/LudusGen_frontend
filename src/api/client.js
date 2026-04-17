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

/**
 * Upload a file (GLB/FBX/OBJ) to Tripo assets.
 * @param {File} file
 * @param {(() => Promise<string>) | string} getIdTokenOrToken
 * @returns {Promise<{ success: boolean, filename?: string, message?: string }>}
 */
export async function uploadAsset(file, getIdTokenOrToken) {
  const form = new FormData();
  form.append('file', file);
  const url = `${API_BASE}${ENDPOINTS.TRIPO_ASSETS_UPLOAD}`;
  const token = typeof getIdTokenOrToken === 'function'
    ? (await getIdTokenOrToken())
    : (getIdTokenOrToken || '');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return res.json();
}

/**
 * Upload an image to Tripo for text-to-3D or image-to-3D.
 * @param {File} file
 * @param {(() => Promise<string>) | string} getIdTokenOrToken
 * @returns {Promise<string>} imageToken
 */
export async function uploadTripoImage(file, getIdTokenOrToken) {
  const form = new FormData();
  form.append('file', file);
  const url = `${API_BASE}${ENDPOINTS.TRIPO_UPLOAD}`;
  const token = typeof getIdTokenOrToken === 'function'
    ? (await getIdTokenOrToken())
    : (getIdTokenOrToken || '');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const d = await res.json();
  if (!d.success) throw new Error(d.message);
  return d.imageToken;
}

/**
 * Enhance or simplify a prompt via the /api/enhance endpoint.
 * @param {object} params
 * @param {string} params.systemPrompt - system message content
 * @param {string} params.userPrompt - user message content
 * @param {number} [params.temperature=0.4]
 * @param {number} [params.top_p=0.9]
 * @param {number} [params.max_tokens=10000]
 * @param {string} [params.model='openai/gpt-oss-120b']
 * @param {string} [params.provider='groq']
 * @param {(() => Promise<string>) | string} params.getIdTokenOrToken
 * @returns {Promise<string>} cleaned response text
 */
export async function enhancePrompt({
  systemPrompt,
  userPrompt,
  temperature = 0.4,
  top_p = 0.9,
  max_tokens = 1000,
  model = 'openai/gpt-oss-120b',
  provider = 'groq',
  getIdTokenOrToken,
}) {
  const headers = await authHeaders(getIdTokenOrToken);
  const res = await fetch(`${API_BASE}${ENDPOINTS.ENHANCE}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      provider,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      top_p,
      max_tokens,
    }),
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { const j = await res.json(); errMsg = j.message || errMsg; } catch {}
    throw new Error(errMsg);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'API hiba');
  return (json.content || '').trim();
}

export { API_BASE };
