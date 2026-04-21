// useTripoHistory — Firestore history persistence for Tripo
// Owns: saveHist, saveRigHist

import { useCallback } from "react";
import { saveHistoryToFirestore } from "../trellis/utils";

// Session-level dedup guard — prevents double-saving the same URL+taskId pair
// Shared at module level so it survives re-renders but resets on full page reload
const _savedUrls = new Set();

/**
 * @param {{
 *   userId: string,
 *   prompt: string,
 *   negPrompt: string,
 *   mode: string,
 *   modelVer: string,
 *   activeStyle: string|null,
 *   history: Array,
 *   histInit: React.MutableRefObject,
 *   setOptimisticItems: Function,
 *   setHistory: Function,
 *   setSelHistId: Function,
 * }} params
 */
export function useTripoHistory({
  userId,
  prompt,
  negPrompt,
  mode,
  modelVer,
  activeStyle,
  history,
  histInit,
  setOptimisticItems,
  setHistory,
  setSelHistId,
}) {
  const saveHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const dedupKey = rawUrl + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);
    const cap2 = s => s ? s.trim().split(/\s+/).slice(0, 2).join(" ") : s;
    const effectivePrompt = extra.prompt ?? prompt;
    const effectiveMode = extra.mode ?? mode;
    const effectiveModelVer = extra.modelVer ?? modelVer;
    const autoName = cap2(effectivePrompt.trim());
    const resolvedName = cap2(extra.name) || autoName || null;
    const item = {
      prompt: effectivePrompt.trim() || extra.label || effectiveMode,
      name: resolvedName,
      status: "succeeded",
      model_url: rawUrl,
      source: "tripo",
      mode: effectiveMode,
      taskId,
      styleId: activeStyle || null,
      negPrompt: (extra.negPrompt ?? negPrompt) || null,
      params: { model_version: effectiveModelVer, mode: effectiveMode, ...extra },
      ts: Date.now(),
    };
    const stableDocId = extra.animationIndex != null
      ? `tripo_${taskId}_${extra.animationIndex}`
      : `tripo_${taskId}`;
    const { docId } = await saveHistoryToFirestore(userId, item, stableDocId, 'tripo_history');
    const ni = { id: docId ?? stableDocId, ...item, createdAt: { toDate: () => new Date() } };
    setOptimisticItems(prev => prev.filter(o => o.id !== stableDocId));
    setHistory(h => [ni, ...h]);
    setSelHistId(ni.id);
    histInit.current = true;
    return ni;
  }, [userId, prompt, negPrompt, mode, modelVer, activeStyle, setOptimisticItems, setHistory, setSelHistId, histInit]);

  const saveRigHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const dedupKey = rawUrl + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);
    const srcItem = history.find(h => h.taskId === extra.originalModelTaskId);
    const srcPrompt = srcItem?.name || srcItem?.prompt || extra.prompt || "model";
    const srcShort = srcPrompt.trim().split(/\s+/).slice(0, 2).join(" ");
    const rigName = extra.aiName || `Rig:${srcShort}`;
    const params = {
      rigModelVer: extra.rigModelVer,
      rigType: extra.rigType,
      rigSpec: extra.rigSpec,
      originalModelTaskId: extra.originalModelTaskId,
      mode: "rig",
      rigged: true,
    };
    const item = {
      prompt: extra.prompt || "auto-rig",
      name: rigName,
      status: "succeeded",
      model_url: rawUrl,
      source: "tripo",
      mode: "rig",
      taskId,
      styleId: activeStyle || null,
      params,
      ts: Date.now(),
    };
    const stableDocId = `tripo_${taskId}`;
    const { docId } = await saveHistoryToFirestore(userId, item, stableDocId, 'tripo_history');
    const ni = { id: docId ?? stableDocId, ...item, createdAt: { toDate: () => new Date() } };
    setOptimisticItems(prev => prev.filter(o => o.id !== stableDocId));
    setHistory(h => [ni, ...h]);
    setSelHistId(ni.id);
    histInit.current = true;
    return ni;
  }, [userId, history, activeStyle, setOptimisticItems, setHistory, setSelHistId, histInit]);

  return { saveHist, saveRigHist };
}
