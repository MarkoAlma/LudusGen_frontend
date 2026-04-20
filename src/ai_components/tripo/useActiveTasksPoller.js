// src/ai_components/tripo/useActiveTasksPoller.js
import { useEffect, useRef } from "react";
import { persistActiveTask, removeActiveTask } from "./useGenerationPersist";

const POLL_MS = 2500;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Polls all running activeTasks instances every POLL_MS.
 *
 * @param {React.MutableRefObject<Map>} activeTasksRef  - ref to the activeTasks Map
 * @param {() => void} forceUpdate  - call to trigger re-render
 * @param {() => Promise<string>} getIdToken  - returns Firebase Bearer token string
 * @param {(url: string, taskId: string) => Promise<string>} fetchProxy  - proxies model URL → blob URL
 * @param {(url: string) => void} revokeBlobUrl  - revokes previous blob URL
 * @param {() => void} refreshCredits  - refreshes user credit display
 */
export function useActiveTasksPoller({
  activeTasksRef,
  forceUpdate,
  getIdToken,
  fetchProxy,
  revokeBlobUrl,
  refreshCredits,
}) {
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
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
          refreshCredits?.();
          changed = true;
          try {
            const { default: toast } = await import("react-hot-toast");
            toast.success(`${current.label} kész! Kattints a betöltéshez.`, { duration: 6000 });
          } catch {}
        } else if (d.status === "failed" || d.status === "cancelled") {
          map.set(inst.instanceId, {
            ...current,
            status: "failed",
            errorMsg: `Task ${d.status}`,
          });
          removeActiveTask(inst.instanceId);
          refreshCredits?.();
          changed = true;
        } else {
          const prog = Math.min(d.progress ?? current.progress, 99);
          if (prog !== current.progress) {
            map.set(inst.instanceId, { ...current, progress: prog });
            persistActiveTask({ ...current, progress: prog });
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
