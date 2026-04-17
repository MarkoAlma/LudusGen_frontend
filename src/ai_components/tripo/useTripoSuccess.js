// src/ai_components/tripo/useTripoSuccess.js
//
// Builds success handlers for each Tripo operation type.
// Used by resume useEffect and future refactors of handleGen / handleAutoRig.

import { useCallback } from 'react';

const BASE_URL_FALLBACK = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * @param {{
 *   fetchProxy: Function,
 *   revokeBlobUrl: Function,
 *   prevUrl: React.MutableRefObject<string|null>,
 *   saveHist: Function|null,
 *   saveRigHist: Function|null,
 *   markHistorySaved: Function,
 *   getIdToken: Function,
 *   BASE_URL: string,
 *   setModelUrl: Function,
 *   setGenStatus: Function,
 *   setProgress: Function,
 *   setStatusMsg: Function,
 *   setIsRunning: Function,
 *   setRigStep: Function,
 *   setRiggedId: Function,
 *   setShowRig: Function,
 *   clearPersistedGen: Function,
 * }} deps
 */
export function useTripoSuccess({
  fetchProxy,
  revokeBlobUrl,
  prevUrl,
  saveHist,
  saveRigHist,
  markHistorySaved,
  getIdToken,
  BASE_URL,
  setModelUrl,
  setGenStatus,
  setProgress,
  setStatusMsg,
  setIsRunning,
  setRigStep,
  setRiggedId,
  setShowRig,
  clearPersistedGen,
}) {
  const resolvedBase = BASE_URL ?? BASE_URL_FALLBACK;

  const _ack = useCallback((taskId) => {
    getIdToken().then(tok =>
      fetch(`${resolvedBase}/api/tripo/task/${taskId}/ack`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}` },
      }).catch(() => {})
    );
  }, [getIdToken, resolvedBase]);

  /**
   * Builds an async success handler for the given operation type.
   *
   * @param {"generate"|"retopo"|"texture"|"stylize"|"refine"|"fill"|"animate"|"segment"|"rig"} opType
   * @param {string} taskId
   * @param {{ cancelled: boolean }} pt  — poll-abort token
   * @param {{
   *   animSlugs?: string[],
   *   baseNameForAnim?: string,
   *   riggedId?: string,
   *   srcId?: string,
   *   prompt?: string,
   *   userStoppedRef?: React.MutableRefObject<boolean>,
   * }} extra
   * @returns {(d: object) => Promise<void>}
   */
  const buildSuccessHandler = useCallback((opType, taskId, pt, extra = {}) => {
    switch (opType) {
      case "animate":
        return async (d) => {
          if (pt.cancelled) return;
          const animatedModels = Array.isArray(d.rawOutput?.animated_models) ? d.rawOutput.animated_models : null;
          const rawUrl = d.modelUrl ?? (animatedModels ? animatedModels[0] : null);
          if (!rawUrl) throw Object.assign(new Error("Generation blocked."), { type: "nsfw" });
          const blob = await fetchProxy(rawUrl, taskId);
          if (pt.cancelled) { revokeBlobUrl(blob); return; }
          revokeBlobUrl(prevUrl.current);
          setModelUrl(blob); prevUrl.current = blob;
          setGenStatus("succeeded"); setProgress(100); setStatusMsg(""); setIsRunning(false);
          setRiggedId(taskId); setShowRig(true);
          if (!extra.userStoppedRef?.current) {
            const urlsToSave = animatedModels ?? [rawUrl];
            const animSlugs = extra.animSlugs ?? [];
            const baseNameForAnim = extra.baseNameForAnim ?? "model";
            for (let i = 0; i < urlsToSave.length; i++) {
              const url = urlsToSave[i];
              if (!url) continue;
              const singleSlug = animSlugs[i] ?? animSlugs[0] ?? null;
              const singleLabel = singleSlug ?? "animation";
              const animSuffix = (singleSlug || singleLabel || "anim").split(":").pop().toLowerCase();
              const ni = await saveHist(taskId, url, {
                prompt: singleLabel,
                name: `${baseNameForAnim}_${animSuffix}`,
                animation: singleSlug,
                animated: true,
                animationName: singleLabel,
                animations: animSlugs.length > 1 ? animSlugs : undefined,
                animationIndex: animSlugs.length > 1 ? i : undefined,
                originalModelTaskId: extra.riggedId || extra.srcId || null,
              });
              if (ni) _ack(taskId);
            }
            markHistorySaved();
          }
          clearPersistedGen();
        };

      case "segment":
        return async (d) => {
          if (pt.cancelled) return;
          setProgress(100); setStatusMsg(""); setIsRunning(false);
          clearPersistedGen();
        };

      case "rig":
        return async (d) => {
          if (pt.cancelled) return;
          const blob = d.modelUrl ? await fetchProxy(d.modelUrl, taskId) : null;
          if (pt.cancelled) { revokeBlobUrl(blob); return; }
          if (blob) { revokeBlobUrl(prevUrl.current); setModelUrl(blob); prevUrl.current = blob; }
          setRiggedId(taskId); setRigStep("rigged"); setShowRig(true);
          setStatusMsg(""); setGenStatus("succeeded");
          const ni = await saveRigHist(taskId, d.modelUrl, {
            prompt: "auto-rig",
            originalModelTaskId: extra.srcId,
          });
          markHistorySaved();
          if (ni) _ack(taskId);
          clearPersistedGen();
        };

      // generate, retopo, texture, texture_edit, stylize, refine, fill
      default:
        return async (d) => {
          if (pt.cancelled) return;
          const animatedModels = Array.isArray(d.rawOutput?.animated_models) ? d.rawOutput.animated_models : null;
          const rawUrl = d.modelUrl ?? (animatedModels ? animatedModels[0] : null);
          if (!rawUrl) throw Object.assign(new Error("Generation blocked: content policy or empty output. Credits were not charged."), { type: "nsfw" });
          const blob = await fetchProxy(rawUrl, taskId);
          if (pt.cancelled) { revokeBlobUrl(blob); return; }
          revokeBlobUrl(prevUrl.current);
          setModelUrl(blob); prevUrl.current = blob;
          setGenStatus("succeeded"); setProgress(100); setStatusMsg(""); setIsRunning(false);
          setRigStep("idle"); setRiggedId(null); setShowRig(false);
          if (extra.userStoppedRef && !extra.userStoppedRef.current) {
            const ni = await saveHist(taskId, rawUrl, { prompt: extra.prompt ?? "" });
            markHistorySaved();
            if (ni) _ack(taskId);
          }
          clearPersistedGen();
        };
    }
  }, [fetchProxy, revokeBlobUrl, prevUrl, saveHist, saveRigHist, markHistorySaved, _ack, setModelUrl, setGenStatus, setProgress, setStatusMsg, setIsRunning, setRigStep, setRiggedId, setShowRig, clearPersistedGen]);

  return { buildSuccessHandler };
}
