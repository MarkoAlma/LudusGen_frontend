// src/ai_components/tripo/useActiveTasksPoller.js
import { useEffect, useRef } from "react";
import { persistActiveTask, removeActiveTask } from "./useGenerationPersist";

const POLL_MS = 2500;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useActiveTasksPoller({
  activeTasksRef,
  forceUpdate,
  getIdToken,
  fetchProxy,
  revokeBlobUrl,
  refreshCredits,
  onTaskSuccess,
  onTaskFail,
  onTaskProgress,
}) {
  const intervalRef = useRef(null);

  // Refs so interval always calls latest versions — prevents stale closure bugs
  const cbRef = useRef({});
  cbRef.current = { getIdToken, fetchProxy, revokeBlobUrl, refreshCredits, forceUpdate, onTaskSuccess, onTaskFail, onTaskProgress };

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      const { getIdToken, fetchProxy, forceUpdate, onTaskSuccess, onTaskFail, onTaskProgress } = cbRef.current;
      const map = activeTasksRef.current;
      const running = [...map.values()].filter(t => t.status === "running" && t.taskId);
      if (running.length === 0) return;

      let token;
      try { token = await getIdToken(); } catch { return; }
      const headers = { Authorization: `Bearer ${token}` };

      const results = await Promise.allSettled(
        running.map(inst =>
          fetch(`${BASE_URL}/api/tripo/task/${inst.taskId}`, { headers })
            .then(r => r.json())
            .then(d => ({ inst, d }))
        )
      );

      let changed = false;
      for (const result of results) {
        if (result.status === "rejected") continue;
        const { inst, d } = result.value;
        if (!d.success) continue;

        const current = map.get(inst.instanceId);
        if (!current || current.status !== "running") continue;

        if (d.status === "success") {
          const rawUrl = d.modelUrl ?? null;
          let blobUrl = null;
          if (rawUrl) {
            try { blobUrl = await fetchProxy(rawUrl, inst.taskId); } catch { /* fallback null */ }
          }
          map.set(inst.instanceId, {
            ...current,
            status: "done",
            progress: 100,
            result: blobUrl ? { modelUrl: blobUrl, taskId: inst.taskId } : null,
          });
          removeActiveTask(inst.instanceId);
          changed = true;
          if (onTaskSuccess) {
            try { await onTaskSuccess(inst, d, blobUrl); } catch (e) { console.error("[useActiveTasksPoller] onTaskSuccess threw:", e?.message ?? e); }
          }
        } else if (d.status === "failed" || d.status === "cancelled") {
          map.set(inst.instanceId, {
            ...current,
            status: "failed",
            errorMsg: `Task ${d.status}`,
          });
          removeActiveTask(inst.instanceId);
          changed = true;
          if (onTaskFail) onTaskFail(inst, `Task ${d.status}`);
        } else {
          const prog = Math.min(d.progress ?? current.progress, 99);
          if (prog !== current.progress) {
            map.set(inst.instanceId, { ...current, progress: prog });
            persistActiveTask({ ...current, progress: prog });
            if (onTaskProgress) onTaskProgress(inst.instanceId, prog);
            changed = true;
          }
        }
      }

      if (changed) forceUpdate();
    }, POLL_MS);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line
}
