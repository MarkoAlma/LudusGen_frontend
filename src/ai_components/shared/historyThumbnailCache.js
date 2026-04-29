export const HISTORY_THUMBNAIL_CACHE_VERSION = "history-thumb-v3";

export function getHistoryThumbnailCacheKey(item) {
  return item?.model_url ? `${item.model_url}#${HISTORY_THUMBNAIL_CACHE_VERSION}` : null;
}
