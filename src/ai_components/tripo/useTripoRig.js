// useTripoRig — rig compatibility check and auto-rig flow
// Owns: getCompatibility (3-phase: memory → Firestore → API), handleAutoRig

import { useCallback, useRef } from "react";
import { getDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseApp";
import { getCachedThumbnail } from "../trellis/Glbthumbnail";
import { persistGen, markHistorySaved } from "./useGenerationPersist";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * @param {{
 *   activeTaskId: string|null,
 *   animId: string,
 *   authH: Function,
 *   pollTask: Function,
 *   fetchProxy: Function,
 *   revokeBlobUrl: Function,
 *   saveRigHist: Function,
 *   generateAIName: Function,
 *   getIdToken: Function,
 *   rigSpec: string,
 *   animOutFormat: string,
 *   rigType: string,
 *   animModelVer: string,
 *   animBakeAnimation: boolean,
 *   animExportGeometry: boolean,
 *   animAnimateInPlace: boolean,
 *   history: Array,
 *   prompt: string,
 *   syncSelHist: Function,
 *   addJob: Function,
 *   updateJob: Function,
 *   markJobDoneAndSeen: Function,
 *   markJobError: Function,
 *   pollAb: React.MutableRefObject,
 *   prevUrl: React.MutableRefObject,
 *   currentTaskId: React.MutableRefObject,
 *   userStoppedRef: React.MutableRefObject,
 *   setRigBtnLocked: Function,
 *   setErrorMsg: Function,
 *   setRigCompat: Function,
 *   setRigStep: Function,
 *   setDetectedRigModelVer: Function,
 *   setDetectedRigType: Function,
 *   setDetectedRigSpec: Function,
 *   setStatusMsg: Function,
 *   setModelUrl: Function,
 *   setRiggedId: Function,
 *   setShowRig: Function,
 *   setGenStatus: Function,
 *   setOptimisticItems: Function,
 *   setHistory: Function,
 * }} params
 */
export function useTripoRig({
  activeTaskId,
  animId,
  authH,
  pollTask,
  fetchProxy,
  revokeBlobUrl,
  saveRigHist,
  generateAIName,
  getIdToken,
  rigSpec,
  animOutFormat,
  rigType,
  animModelVer,
  animBakeAnimation,
  animExportGeometry,
  animAnimateInPlace,
  history,
  prompt,
  syncSelHist,
  addJob,
  updateJob,
  markJobDoneAndSeen,
  markJobError,
  pollAb,
  prevUrl,
  currentTaskId,
  userStoppedRef,
  setRigBtnLocked,
  setErrorMsg,
  setRigCompat,
  setRigStep,
  setDetectedRigModelVer,
  setDetectedRigType,
  setDetectedRigSpec,
  setStatusMsg,
  setModelUrl,
  setRiggedId,
  setShowRig,
  setGenStatus,
  setOptimisticItems,
  setHistory,
}) {
  // In-memory rig compatibility cache: { [taskId]: boolean|null }
  const rigCompatRef = useRef({});

  // NOTE: Tripo data now lives in 'tripo_history'. Existing docs with tripo_ prefixed IDs
  // in 'trellis_history' need a one-time migration script to move them here.
  const getCompatibility = useCallback(async (srcId) => {
    // 1. In-memory cache
    if (rigCompatRef.current[srcId] !== undefined) return rigCompatRef.current[srcId];

    // 2. Firestore read
    try {
      const snap = await getDoc(doc(db, "tripo_history", `tripo_${srcId}`));
      if (snap.exists()) {
        const val = snap.data()?.params?.isAnimatable;
        if (val !== undefined && val !== null) {
          rigCompatRef.current[srcId] = val;
          return val;
        }
      }
    } catch (_) { }

    // 3. API call — costs 0 credits
    try {
      const headers = await authH();
      const rr = await fetch(BASE_URL + "/api/tripo/task", {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "animate_prerigcheck", original_model_task_id: srcId }),
      });
      const rd = await rr.json();
      if (!rd.success) throw new Error(rd.message);
      let result = null;
      await pollTask(rd.taskId, { cancelled: false }, headers, d => {
        result = d.rigCheckResult ?? d.is_animatable ?? null;
        if (d.detectedRigType) setDetectedRigType(d.detectedRigType);
      }, { skipJumpCheck: true });

      const boolResult = result === null ? null : Boolean(result);
      rigCompatRef.current[srcId] = boolResult;

      // Persist to Firestore
      try {
        const ref = doc(db, "tripo_history", `tripo_${srcId}`);
        try {
          await updateDoc(ref, { "params.isAnimatable": boolResult });
        } catch {
          await setDoc(ref, { params: { isAnimatable: boolResult } }, { merge: true });
        }
      } catch (fsErr) {
        console.warn("[getCompatibility] Firestore write failed:", fsErr.message);
      }

      return boolResult;
    } catch {
      return null;
    }
  }, [authH, pollTask, setDetectedRigType]);

  const handleAutoRig = useCallback(async () => {
    if (!activeTaskId && !animId) return;
    setRigBtnLocked(true);
    setTimeout(() => setRigBtnLocked(false), 2000);
    setErrorMsg("");

    // Phase 1: rig compatibility check (0 credits)
    const srcId = animId.trim() || activeTaskId;
    setRigCompat("checking");
    const isAnimatable = await getCompatibility(srcId);
    if (isAnimatable === false) {
      setRigCompat(false);
      return;
    }
    setRigCompat(isAnimatable === true ? true : null);

    // Phase 2: actual rig (25 credits)
    setRigStep("rigging");
    setDetectedRigModelVer(null); setDetectedRigType(null); setDetectedRigSpec(null);
    if (pollAb.current) pollAb.current.cancelled = true;
    const pt = { cancelled: false }; pollAb.current = pt;
    userStoppedRef.current = false;
    const jobId = crypto.randomUUID();
    addJob({ id: jobId, panelType: "tripo", title: "Auto Rig", status: "queued", progress: 0, createdAt: Date.now(), updatedAt: Date.now() });
    try {
      const headers = await authH();
      setStatusMsg("Rigging…");
      const rr = await fetch(BASE_URL + "/api/tripo/task", {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "animate_rig", original_model_task_id: srcId, spec: rigSpec, out_format: animOutFormat, rig_type: rigType, bake_animation: animBakeAnimation, export_with_geometry: animExportGeometry, animate_in_place: animAnimateInPlace }),
      });
      const rd = await rr.json();
      if (!rd.success) throw new Error(rd.message);
      currentTaskId.current = rd.taskId;
      updateJob(jobId, { status: "running", progress: 0 });
      await pollTask(rd.taskId, pt, headers, async d => {
        if (pt.cancelled) return;
        const blob = d.modelUrl ? await fetchProxy(d.modelUrl, rd.taskId) : null;
        if (pt.cancelled) { revokeBlobUrl(blob); return; }
        if (blob) { revokeBlobUrl(prevUrl.current); setModelUrl(blob); prevUrl.current = blob; }
        const actualRigType = d.rigType || rigType;
        setRiggedId(rd.taskId); setRigStep("rigged"); setShowRig(true); setStatusMsg(""); setGenStatus("succeeded");
        setDetectedRigModelVer(animModelVer); setDetectedRigType(actualRigType); setDetectedRigSpec(rigSpec);

        if (d.modelUrl && blob) {
          try {
            const buf = await fetch(blob).then(r => r.arrayBuffer());
            await getCachedThumbnail(buf, { width: 280, height: 280 }, d.modelUrl);
          } catch { }
        }

        const mockStableId = `tripo_${rd.taskId}`;
        const rigOptEntry = {
          id: mockStableId, taskId: rd.taskId, status: "succeeded",
          model_url: d.modelUrl, source: "tripo", mode: "rig", ts: Date.now(),
          prompt: "auto-rig",
          name: (history.find(h => h.taskId === srcId)?.name || "model") + "_rigged",
          params: { rigModelVer: animModelVer, rigType: actualRigType, rigSpec, rigged: true, mode: "rig" },
          createdAt: { toDate: () => new Date() },
        };
        setOptimisticItems(prev => [rigOptEntry, ...prev.filter(o => o.id !== mockStableId)]);
        setHistory(h => h.some(x => x.id === mockStableId) ? h : [rigOptEntry, ...h]);
        syncSelHist(rigOptEntry);

        currentTaskId.current = null;
        markJobDoneAndSeen(jobId, { title: "Auto Rig", progress: 100 });
        persistGen({ taskId: rd.taskId, requestId: rd.taskId, mode: "animate", prompt: "auto-rig", modelVer: "", lastProgress: 100, lastProgressAt: Date.now(), startedAt: Date.now(), riggedId: rd.taskId, opType: "rig", rigModelVer: animModelVer, rigType: actualRigType, rigSpec });
        const srcItemForRig = history.find(h => h.taskId === srcId);
        const rigBasePrompt = srcItemForRig?.prompt?.trim() || srcItemForRig?.name?.trim() || prompt.trim();
        const aiRigName = await generateAIName(rigBasePrompt, "rig");
        const _ni4 = await saveRigHist(rd.taskId, d.modelUrl, { prompt: "auto-rig", originalModelTaskId: srcId, aiName: aiRigName ?? undefined, rigModelVer: animModelVer, rigType: actualRigType, rigSpec });
        markHistorySaved();
        if (_ni4) getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${rd.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
      }, { skipJumpCheck: true, onProgress: dp => updateJob(jobId, { status: "running", progress: dp }) });
    } catch (e) {
      currentTaskId.current = null;
      if (pt.cancelled) { markJobError(jobId, "Cancelled"); return; }
      setRigStep("idle"); setRiggedId(null); setShowRig(false); setErrorMsg(e.message); setStatusMsg(""); markJobError(jobId, e.message);
    }
  }, [activeTaskId, animId, authH, pollTask, fetchProxy, revokeBlobUrl, saveRigHist, generateAIName, getIdToken, rigSpec, animOutFormat, rigType, animModelVer, animBakeAnimation, animExportGeometry, animAnimateInPlace, syncSelHist, addJob, updateJob, markJobDoneAndSeen, markJobError, getCompatibility, history, prompt, pollAb, prevUrl, currentTaskId, userStoppedRef, setRigBtnLocked, setErrorMsg, setRigCompat, setRigStep, setDetectedRigModelVer, setDetectedRigType, setDetectedRigSpec, setStatusMsg, setModelUrl, setRiggedId, setShowRig, setGenStatus, setOptimisticItems, setHistory]);

  return { rigCompatRef, getCompatibility, handleAutoRig };
}
