import { STYLE_OPTIONS } from './Constants';

// ────────────────────────────────────────────────────────────────────────────
// Style helpers
// ────────────────────────────────────────────────────────────────────────────

export function stripStylePrefix(prompt, styleId) {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style?.prefix) return prompt;
  if (prompt.startsWith(style.prefix)) return prompt.slice(style.prefix.length);
  return prompt;
}

export function applyStylePrefix(rawPrompt, styleId) {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style?.prefix) return rawPrompt;
  return style.prefix + rawPrompt;
}

// ────────────────────────────────────────────────────────────────────────────
// Date formatter
// ────────────────────────────────────────────────────────────────────────────

export function fmtDate(d) {
  if (!d) return '';
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleString('hu-HU', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Default params
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// GLB fetcher
// ────────────────────────────────────────────────────────────────────────────

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
      Authorization: `Bearer ${token}`,
    },
  });

  if (!r.ok) throw new Error(`GLB letöltés sikertelen (${r.status})`);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

// ────────────────────────────────────────────────────────────────────────────
// SSE stream reader — shared by Enhance and Dechanter
// ────────────────────────────────────────────────────────────────────────────

/**
 * Sends a chat request to the local API and collects the full streamed response.
 *
 * @param {string}   url       - API endpoint
 * @param {Object}   headers   - Auth + content-type headers
 * @param {Object}   body      - Request body (model, messages, temperature, max_tokens)
 * @returns {Promise<string>}  - Accumulated response text
 */
export async function streamChat(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const raw = trimmed.slice(6);
      if (raw === '[DONE]') continue;
      try { accumulated += JSON.parse(raw).delta || ''; } catch { /* skip malformed */ }
    }
  }

  return accumulated;
}