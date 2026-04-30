export const HISTORY_THUMBNAIL_CACHE_VERSION = "history-thumb-v3";

export function getHistoryThumbnailCacheKey(item) {
  return item?.model_url ? `${item.model_url}#${HISTORY_THUMBNAIL_CACHE_VERSION}` : null;
}

const resolvedHistoryThumbnailCache = new Map();
const resolvedHistoryThumbnailListeners = new Map();

function normalizeHistoryKey(value) {
  const key = String(value || "").trim();
  return key.startsWith("tripo_") ? key.slice(6) : key;
}

function getResolvedHistoryThumbnailKeys(item) {
  if (!item) return [];
  const keys = new Set();
  const add = (kind, value) => {
    const raw = String(value || "").trim();
    if (!raw) return;
    keys.add(`${kind}:${raw}`);
    const normalized = normalizeHistoryKey(raw);
    if (normalized && normalized !== raw) keys.add(`${kind}:${normalized}`);
  };

  add("id", item.id);
  add("task", item.taskId);
  add("task", item.task_id);
  add("url", item.model_url);
  return [...keys];
}

export function checkResolvedHistoryThumbnail(item) {
  for (const key of getResolvedHistoryThumbnailKeys(item)) {
    const thumbnail = resolvedHistoryThumbnailCache.get(key);
    if (thumbnail) return thumbnail;
  }
  return null;
}

export function rememberResolvedHistoryThumbnail(item, thumbnail) {
  if (!thumbnail) return;
  const keys = getResolvedHistoryThumbnailKeys(item);
  if (!keys.length) return;

  const listeners = new Set();
  keys.forEach((key) => {
    resolvedHistoryThumbnailCache.set(key, thumbnail);
    resolvedHistoryThumbnailListeners.get(key)?.forEach((listener) => listeners.add(listener));
  });
  listeners.forEach((listener) => listener(thumbnail));
}

export function subscribeResolvedHistoryThumbnail(item, callback) {
  if (typeof callback !== "function") return () => {};
  const keys = getResolvedHistoryThumbnailKeys(item);
  keys.forEach((key) => {
    const listeners = resolvedHistoryThumbnailListeners.get(key) || new Set();
    listeners.add(callback);
    resolvedHistoryThumbnailListeners.set(key, listeners);
  });

  return () => {
    keys.forEach((key) => {
      const listeners = resolvedHistoryThumbnailListeners.get(key);
      if (!listeners) return;
      listeners.delete(callback);
      if (listeners.size === 0) resolvedHistoryThumbnailListeners.delete(key);
    });
  };
}
