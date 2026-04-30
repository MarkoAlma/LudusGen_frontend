import { useEffect, useRef, useMemo } from "react";
import { persistActiveTask, removeActiveTask } from "./useGenerationPersist";
import { streamTaskStatus } from "./tripoTransfers";
import { resolveTripoModelUrl } from "./utils/modelUrl";

const POLL_MS = 2500;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function buildTaskStatusUrl(taskId, snapshot) {
  const params = new URLSearchParams();
  if (snapshot?.type) params.set("type", snapshot.type);
  if (snapshot?.mode) params.set("mode", snapshot.mode);
  if (snapshot?.texture === true) params.set("texture", "true");
  if (snapshot?.pbr === true) params.set("pbr", "true");
  const qs = params.toString();
  return `${BASE_URL}/api/tripo/task/${taskId}${qs ? `?${qs}` : ""}`;
}

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
  const streamControllersRef = useRef(new Map());
  const streamFailuresRef = useRef(new Set());

  // Refs so interval always calls latest versions — prevents stale closure bugs
  const cbRef = useRef({});
  const debouncedUpdate = useMemo(() => debounce(() => forceUpdate(), 100), [forceUpdate]);

  useEffect(() => {
    cbRef.current = { getIdToken, fetchProxy, revokeBlobUrl, refreshCredits, forceUpdate: debouncedUpdate, onTaskSuccess, onTaskFail, onTaskProgress };
  }, [getIdToken, fetchProxy, revokeBlobUrl, refreshCredits, debouncedUpdate, onTaskSuccess, onTaskFail, onTaskProgress]);

  useEffect(() => {
    const controllers = streamControllersRef.current;
    const cleanupStream = (instanceId) => {
      const controller = controllers.get(instanceId);
      if (controller) {
        controller.abort();
        controllers.delete(instanceId);
      }
    };

    const resolveTaskSuccess = async (inst, d) => {
      const { fetchProxy, onTaskSuccess } = cbRef.current;
      const map = activeTasksRef.current;
      const current = map.get(inst.instanceId);
      if (!current || current.status !== "running") return false;

      const rawUrl = resolveTripoModelUrl(d);
      let blobUrl = null;
      if (rawUrl) {
        try { blobUrl = await fetchProxy(rawUrl, inst.taskId); } catch { /* fallback null */ }
      }

      map.set(inst.instanceId, {
        ...current,
        status: "done",
        progress: 100,
        result: blobUrl || rawUrl ? { modelUrl: blobUrl || rawUrl, taskId: inst.taskId } : null,
      });
      removeActiveTask(inst.instanceId);
      cleanupStream(inst.instanceId);
      if (onTaskSuccess) {
        try { await onTaskSuccess(inst, d, blobUrl); } catch (e) { console.error("[useActiveTasksPoller] onTaskSuccess threw:", e?.message ?? e); }
      }
      return true;
    };

    const resolveTaskFailure = (inst, reason) => {
      const { onTaskFail } = cbRef.current;
      const map = activeTasksRef.current;
      const current = map.get(inst.instanceId);
      if (!current || current.status !== "running") return false;

      map.set(inst.instanceId, {
        ...current,
        status: "failed",
        errorMsg: reason,
      });
      removeActiveTask(inst.instanceId);
      cleanupStream(inst.instanceId);
      if (onTaskFail) onTaskFail(inst, reason);
      return true;
    };

    const updateTaskProgress = (inst, progressValue) => {
      const { onTaskProgress } = cbRef.current;
      const map = activeTasksRef.current;
      const current = map.get(inst.instanceId);
      if (!current || current.status !== "running") return false;

      const prog = Math.min(progressValue ?? current.progress ?? 0, 99);
      if (prog === current.progress) return false;
      map.set(inst.instanceId, { ...current, progress: prog });
      persistActiveTask({ ...current, progress: prog });
      if (onTaskProgress) onTaskProgress(inst.instanceId, prog);
      return true;
    };

    const startTaskStream = (inst) => {
      if (!inst?.taskId || controllers.has(inst.instanceId) || streamFailuresRef.current.has(inst.instanceId)) {
        return;
      }

      const controller = new AbortController();
      controllers.set(inst.instanceId, controller);

      streamTaskStatus({
        taskId: inst.taskId,
        getIdToken: cbRef.current.getIdToken,
        signal: controller.signal,
        onStatus: async (eventType, payload) => {
          if (eventType !== "status") return;

          let changed = false;
          if (payload.status === "success") {
            changed = await resolveTaskSuccess(inst, payload);
          } else if (payload.status === "failed" || payload.status === "cancelled") {
            const reason =
              payload.errorMessage ||
              payload.rawOutput?.error_msg ||
              payload.rawOutput?.error_message ||
              payload.rawOutput?.error ||
              payload.rawOutput?.message ||
              payload.rawOutput?.reason ||
              `Task ${payload.status}`;
            changed = resolveTaskFailure(inst, reason);
          } else {
            changed = updateTaskProgress(inst, payload.progress);
          }

          if (changed) cbRef.current.forceUpdate();
        },
      }).then(() => {
        controllers.delete(inst.instanceId);
      }).catch((err) => {
        controllers.delete(inst.instanceId);
        if (err?.name === "AbortError") return;
        if (err?.status === 403) {
          if (resolveTaskFailure(inst, "Task access expired after backend restart")) {
            cbRef.current.forceUpdate();
          }
          return;
        }
        console.warn(`[useActiveTasksPoller] SSE stream failed for ${inst.taskId}:`, err?.message ?? err);
        streamFailuresRef.current.add(inst.instanceId);
      });
    };

    intervalRef.current = setInterval(async () => {
      const { getIdToken, forceUpdate } = cbRef.current;
      const map = activeTasksRef.current;
      const running = [...map.values()].filter(t => t.status === "running" && t.taskId);
      if (running.length === 0) return;

      running.forEach(startTaskStream);

      const pollTargets = running.filter((inst) => !controllers.has(inst.instanceId));
      if (pollTargets.length === 0) return;

      let token;
      try { token = await getIdToken(); } catch { return; }
      const headers = { Authorization: `Bearer ${token}` };

      const results = await Promise.allSettled(
        pollTargets.map(inst =>
          fetch(buildTaskStatusUrl(inst.taskId, inst.snapshot), { headers })
            .then(async (response) => {
              let d = null;
              try {
                d = await response.json();
              } catch {
                d = null;
              }
              return { inst, d, response };
            })
        )
      );

      let changed = false;
      for (const result of results) {
        if (result.status === "rejected") continue;
        const { inst, d, response } = result.value;
        if (!response.ok) {
          if (response.status === 404 || response.status === 410) {
            changed = resolveTaskFailure(inst, "Task expired or deleted from source") || changed;
          } else if (response.status === 403) {
            changed = resolveTaskFailure(inst, "Task access expired after backend restart") || changed;
          }
          continue;
        }
        if (!d?.success) continue;

        const current = map.get(inst.instanceId);
        if (!current || current.status !== "running") continue;

        if (d.status === "success") {
          changed = await resolveTaskSuccess(inst, d);
        } else if (d.status === "failed" || d.status === "cancelled") {
          const reason =
            d.errorMessage ||
            d.rawOutput?.error_msg ||
            d.rawOutput?.error_message ||
            d.rawOutput?.error ||
            d.rawOutput?.message ||
            d.rawOutput?.reason ||
            `Task ${d.status}`;
          changed = resolveTaskFailure(inst, reason);
        } else {
          changed = updateTaskProgress(inst, d.progress) || changed;
        }
      }

      if (changed) forceUpdate();
    }, POLL_MS);

    return () => {
      clearInterval(intervalRef.current);
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
    };
  }, []); // eslint-disable-line
}
