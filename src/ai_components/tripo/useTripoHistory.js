// useTripoHistory — Firestore history persistence for Tripo
// Owns: saveHist, saveRigHist

import { useCallback } from "react";
import { saveHistoryToFirestore } from "../trellis/utils";

// Session-level dedup guard — prevents double-saving the same URL+taskId pair
// Shared at module level so it survives re-renders but resets on full page reload
const _savedUrls = new Set();

const omitUndefined = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value !== undefined)
);

const getCanonicalModelVersion = (value) => value ?? null;

const normalizePreviewImageUrls = (extra = {}) => {
  const urls = [
    ...(Array.isArray(extra.previewImageUrls) ? extra.previewImageUrls : []),
    ...(Array.isArray(extra.preview_image_urls) ? extra.preview_image_urls : []),
    ...(extra.previewImageUrl ? [extra.previewImageUrl] : []),
    ...(extra.preview_image_url ? [extra.preview_image_url] : []),
  ].filter(Boolean);

  return [...new Set(urls)];
};

const removePreviewFields = (obj) => {
  delete obj.previewImageUrl;
  delete obj.previewImageUrls;
  delete obj.preview_image_url;
  delete obj.preview_image_urls;
};

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
  histInit: histInitRef,
  setOptimisticItems,
  setHistory,
}) {
  const saveHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const dedupKey = rawUrl + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);
    const cap2 = s => s ? s.trim().split(/\s+/).slice(0, 2).join(" ") : s;
    const effectivePrompt = extra.prompt ?? prompt;
    const effectiveMode = extra.mode ?? mode;
    const effectiveModelVer = getCanonicalModelVersion(extra.model_version ?? extra.modelVer ?? modelVer);
    const cleanExtra = omitUndefined(extra);
    const previewImageUrls = normalizePreviewImageUrls(cleanExtra);
    delete cleanExtra.modelVer;
    delete cleanExtra.modelVersion;
    removePreviewFields(cleanExtra);
    const topLevelType = cleanExtra.type ?? null;
    const marksTexturedOutput =
      cleanExtra.texture === true ||
      cleanExtra.texture === "true" ||
      cleanExtra.pbr === true ||
      cleanExtra.pbr === "true" ||
      cleanExtra.type === "texture_model";
    const marksPbrOutput = cleanExtra.pbr === true || cleanExtra.pbr === "true";
    const autoName = cap2(effectivePrompt.trim());
    const resolvedName = cap2(extra.name) || autoName || null;
    const item = {
      prompt: effectivePrompt.trim() || extra.label || effectiveMode,
      name: resolvedName,
      status: "succeeded",
      model_url: rawUrl,
      ...(previewImageUrls.length > 0 && {
        previewImageUrl: previewImageUrls[0],
        previewImageUrls,
      }),
      source: extra.source ?? "tripo",
      mode: effectiveMode,
      taskId,
      ...(topLevelType && { type: topLevelType }),
      ...(marksTexturedOutput && { texture: true }),
      ...(marksPbrOutput && { pbr: true }),
      styleId: activeStyle || null,
      negPrompt: (extra.negPrompt ?? negPrompt) || null,
      params: omitUndefined({
        ...cleanExtra,
        model_version: effectiveModelVer,
        mode: effectiveMode,
      }),
      ts: Date.now(),
    };
    if (import.meta.env.DEV && import.meta.env.VITE_TRIPO_DEBUG === "true") console.log("[useTripoHistory][saveHist]", {
      taskId,
      mode: effectiveMode,
      type: item.params?.type ?? null,
      originalModelTaskId: item.params?.originalModelTaskId ?? null,
      texture: item.params?.texture ?? null,
      pbr: item.params?.pbr ?? null,
    });
    const stableDocId = extra.animationIndex != null
      ? `tripo_${taskId}_${extra.animationIndex}`
      : `tripo_${taskId}`;
    const { docId } = await saveHistoryToFirestore(userId, item, stableDocId, 'tripo_history');
    const ni = { id: docId ?? stableDocId, ...item, createdAt: { toDate: () => new Date() } };
    setOptimisticItems(prev => prev.filter(o => o.id !== stableDocId));
    setHistory(h => [ni, ...h]);
    histInitRef.current = true;
    return ni;
  }, [userId, prompt, negPrompt, mode, modelVer, activeStyle, setOptimisticItems, setHistory, histInitRef]);

  const saveRigHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const dedupKey = rawUrl + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);
    const srcItem = history.find(h => h.taskId === extra.originalModelTaskId);
    const srcPrompt = srcItem?.name || srcItem?.prompt || extra.prompt || "model";
    const srcShort = srcPrompt.trim().split(/\s+/).slice(0, 2).join(" ");
    const rigName = extra.aiName || `Rig:${srcShort}`;
    const previewImageUrls = normalizePreviewImageUrls(extra);
    const params = omitUndefined({
      rigModelVer: extra.rigModelVer,
      rigType: extra.rigType,
      rigSpec: extra.rigSpec,
      originalModelTaskId: extra.originalModelTaskId,
      mode: "rig",
      rigged: true,
    });
    const item = {
      prompt: extra.prompt || "auto-rig",
      name: rigName,
      status: "succeeded",
      model_url: rawUrl,
      ...(previewImageUrls.length > 0 && {
        previewImageUrl: previewImageUrls[0],
        previewImageUrls,
      }),
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
    histInitRef.current = true;
    return ni;
  }, [userId, history, activeStyle, setOptimisticItems, setHistory, histInitRef]);

  const saveImageHist = useCallback(async (taskId, imageUrls = [], extra = {}) => {
    const normalizedUrls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
    if (!normalizedUrls.length) return null;
    const dedupKey = normalizedUrls.join("|") + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);

    const cap2 = s => s ? s.trim().split(/\s+/).slice(0, 2).join(" ") : s;
    const effectivePrompt = extra.prompt ?? prompt;
    const effectiveMode = extra.mode ?? mode;
    const effectiveModelVer = getCanonicalModelVersion(extra.model_version ?? extra.modelVer ?? modelVer);
    const cleanExtra = omitUndefined(extra);
    delete cleanExtra.modelVer;
    delete cleanExtra.modelVersion;
    const topLevelType = cleanExtra.type ?? null;
    const resolvedName = cap2(extra.name) || cap2(effectivePrompt.trim()) || "Views";
    const item = {
      prompt: effectivePrompt.trim() || extra.label || effectiveMode || "views",
      name: resolvedName,
      status: "succeeded",
      source: extra.source ?? "tripo",
      mode: effectiveMode,
      taskId,
      kind: "images",
      image_urls: normalizedUrls,
      previewImageUrl: normalizedUrls[0] ?? null,
      previewImageUrls: normalizedUrls,
      ...(topLevelType && { type: topLevelType }),
      styleId: activeStyle || null,
      negPrompt: (extra.negPrompt ?? negPrompt) || null,
      params: omitUndefined({
        ...cleanExtra,
        assetKind: "images",
        model_version: effectiveModelVer,
        mode: effectiveMode,
      }),
      ts: Date.now(),
    };

    const stableDocId = `tripo_${taskId}`;
    const { docId } = await saveHistoryToFirestore(userId, item, stableDocId, "tripo_history");
    const ni = { id: docId ?? stableDocId, ...item, createdAt: { toDate: () => new Date() } };
    setOptimisticItems(prev => prev.filter(o => o.id !== stableDocId));
    setHistory(h => [ni, ...h.filter(existing => existing.id !== (docId ?? stableDocId))]);
    histInitRef.current = true;
    return ni;
  }, [userId, prompt, negPrompt, mode, modelVer, activeStyle, setOptimisticItems, setHistory, histInitRef]);

  return { saveHist, saveRigHist, saveImageHist };
}
