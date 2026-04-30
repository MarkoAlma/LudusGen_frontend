import { isImageHistoryItem } from "./tripoImageHistoryUtils.js";

export function shouldAutoSelectGeneratedHistoryItem(item) {
  if (!item) return false;
  return isImageHistoryItem(item);
}
