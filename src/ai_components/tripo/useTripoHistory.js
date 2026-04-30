// useTripoHistory — Firestore history persistence for Tripo
// Owns: saveHist, saveRigHist

import { useCallback } from "react";
import { saveHistoryToFirestore } from "../trellis/utils";
import { ENDPOINTS, post } from "../../api/client";
import { stripTripoStylePrefix } from "./tripoStylePresets";

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
 *   getIdToken: Function,
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
  getIdToken,
}) {
  const requestGeneratedName = useCallback(async ({
    promptText,
    basePrompt,
    mode: historyMode,
    type,
    styleId,
    sourceName,
    negativePrompt: negativePromptText,
    modelVersion,
  }) => {
    if (!getIdToken) return null;
    const hasEnoughContext = [promptText, basePrompt, sourceName].some(
      (value) => typeof value === "string" && value.trim()
    );
    if (!hasEnoughContext) return null;

    try {
      const response = await post(ENDPOINTS.TRIPO_ASSET_NAME, {
        prompt: promptText,
        basePrompt,
        mode: historyMode,
        type,
        styleId,
        sourceName,
        negativePrompt: negativePromptText,
        modelVersion,
      }, getIdToken);

      return {
        name: typeof response?.name === "string" ? response.name.trim() : "",
        summary: typeof response?.summary === "string" ? response.summary.trim() : "",
      };
    } catch {
      return null;
    }
  }, [getIdToken]);

  const saveHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const dedupKey = rawUrl + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);

    const cap2 = (value) => value ? value.trim().split(/\s+/).slice(0, 2).join(" ") : value;
    const effectivePrompt = extra.prompt ?? prompt;
    const effectiveMode = extra.mode ?? mode;
    const effectiveModelVer = getCanonicalModelVersion(extra.model_version ?? extra.modelVer ?? modelVer);
    const cleanExtra = omitUndefined(extra);
    const storedStyleId = cleanExtra.styleId ?? activeStyle ?? null;
    const storedBasePrompt =
      cleanExtra.basePrompt
      ?? stripTripoStylePrefix(effectivePrompt.trim(), storedStyleId);
    const requestedName = typeof cleanExtra.requestedName === "string" ? cleanExtra.requestedName.trim() : "";
    const sourceName = cleanExtra.sourceName ?? cleanExtra.name ?? "";
    const previewImageUrls = normalizePreviewImageUrls(cleanExtra);

    delete cleanExtra.modelVer;
    delete cleanExtra.modelVersion;
    delete cleanExtra.requestedName;
    removePreviewFields(cleanExtra);

    const topLevelType = cleanExtra.type ?? null;
    const marksTexturedOutput =
      cleanExtra.texture === true ||
      cleanExtra.texture === "true" ||
      cleanExtra.pbr === true ||
      cleanExtra.pbr === "true" ||
      cleanExtra.type === "texture_model";
    const marksPbrOutput = cleanExtra.pbr === true || cleanExtra.pbr === "true";
    const generated = requestedName
      ? { name: requestedName, summary: "" }
      : await requestGeneratedName({
        promptText: effectivePrompt.trim(),
        basePrompt: storedBasePrompt,
        mode: effectiveMode,
        type: topLevelType,
        styleId: storedStyleId,
        sourceName,
        negativePrompt: cleanExtra.negPrompt ?? negPrompt,
        modelVersion: effectiveModelVer,
      });
    const autoName = cap2(effectivePrompt.trim());
    const resolvedName = generated?.name || cap2(extra.name) || autoName || null;

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
      styleId: storedStyleId,
      negPrompt: (extra.negPrompt ?? negPrompt) || null,
      params: omitUndefined({
        ...cleanExtra,
        model_version: effectiveModelVer,
        mode: effectiveMode,
        basePrompt: storedBasePrompt || undefined,
        styleId: storedStyleId || undefined,
        promptSummary: generated?.summary || undefined,
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
    const { docId } = await saveHistoryToFirestore(userId, item, stableDocId, "tripo_history");
    const ni = { id: docId ?? stableDocId, ...item, createdAt: { toDate: () => new Date() } };
    setOptimisticItems((prev) => prev.filter((optimisticItem) => optimisticItem.id !== stableDocId));
    setHistory((items) => [ni, ...items]);
    histInitRef.current = true;
    return ni;
  }, [userId, prompt, negPrompt, mode, modelVer, activeStyle, setOptimisticItems, setHistory, histInitRef, requestGeneratedName]);

  const saveRigHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const dedupKey = rawUrl + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);

    const srcItem = history.find((entry) => entry.taskId === extra.originalModelTaskId);
    const srcPrompt = srcItem?.name || srcItem?.prompt || extra.prompt || "model";
    const srcShort = srcPrompt.trim().split(/\s+/).slice(0, 2).join(" ");
    const storedStyleId = extra.styleId ?? activeStyle ?? null;
    const generated = extra.aiName
      ? { name: extra.aiName, summary: "" }
      : await requestGeneratedName({
        promptText: extra.prompt || "",
        basePrompt: extra.basePrompt || srcPrompt,
        mode: "rig",
        type: "animate_rig",
        styleId: storedStyleId,
        sourceName: srcItem?.name || srcItem?.prompt || "",
        modelVersion: extra.rigModelVer,
      });
    const rigName = generated?.name || extra.aiName || `Rigged ${srcShort}`;
    const previewImageUrls = normalizePreviewImageUrls(extra);
    const params = omitUndefined({
      rigModelVer: extra.rigModelVer,
      rigType: extra.rigType,
      rigSpec: extra.rigSpec,
      originalModelTaskId: extra.originalModelTaskId,
      mode: "rig",
      rigged: true,
      basePrompt: extra.basePrompt || undefined,
      styleId: storedStyleId || undefined,
      promptSummary: generated?.summary || undefined,
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
      styleId: storedStyleId,
      params,
      ts: Date.now(),
    };
    const stableDocId = `tripo_${taskId}`;
    const { docId } = await saveHistoryToFirestore(userId, item, stableDocId, "tripo_history");
    const ni = { id: docId ?? stableDocId, ...item, createdAt: { toDate: () => new Date() } };
    setOptimisticItems((prev) => prev.filter((optimisticItem) => optimisticItem.id !== stableDocId));
    setHistory((items) => [ni, ...items]);
    histInitRef.current = true;
    return ni;
  }, [userId, history, activeStyle, setOptimisticItems, setHistory, histInitRef, requestGeneratedName]);

  const saveImageHist = useCallback(async (taskId, imageUrls = [], extra = {}) => {
    const normalizedUrls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
    if (!normalizedUrls.length) return null;
    const dedupKey = normalizedUrls.join("|") + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);

    const cap2 = (value) => value ? value.trim().split(/\s+/).slice(0, 2).join(" ") : value;
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
    setOptimisticItems((prev) => prev.filter((optimisticItem) => optimisticItem.id !== stableDocId));
    setHistory((items) => [ni, ...items.filter((existing) => existing.id !== (docId ?? stableDocId))]);
    histInitRef.current = true;
    return ni;
  }, [userId, prompt, negPrompt, mode, modelVer, activeStyle, setOptimisticItems, setHistory, histInitRef]);

  return { saveHist, saveRigHist, saveImageHist };
}
