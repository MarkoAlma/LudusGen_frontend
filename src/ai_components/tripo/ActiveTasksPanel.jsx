import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2, XCircle, ChevronDown, RefreshCw } from "lucide-react";

const PANEL_STYLES = {
  wrapper: {
    position: "relative",
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(139,92,246,0.22)",
    overflow: "hidden",
  },
  glowPurple: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "radial-gradient(ellipse at 20% 20%, rgba(139,92,246,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  glowCyan: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "radial-gradient(ellipse at 80% 80%, rgba(0,229,255,0.04) 0%, transparent 70%)",
    pointerEvents: "none",
  },
};

function StatusIcon({ status }) {
  if (status === "running" || status === "pending")
    return <Loader2 size={11} style={{ color: "#8b5cf6", animation: "spin 1s linear infinite", flexShrink: 0 }} />;
  if (status === "done")
    return <CheckCircle2 size={11} style={{ color: "#10b981", flexShrink: 0 }} />;
  return <XCircle size={11} style={{ color: "#ef4444", flexShrink: 0 }} />;
}

function TaskCard({ inst, isFocused, onFocus, onStop, onRetry, onLoad, onDismiss }) {
  const isActive = inst.status === "running" || inst.status === "pending";
  const isDone = inst.status === "done";
  const isFailed = inst.status === "failed";

  useEffect(() => {
    if (!isDone) return;
    const t = setTimeout(() => onDismiss(inst.instanceId), 60_000);
    return () => clearTimeout(t);
  }, [isDone, inst.instanceId, onDismiss]);

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ 
        y: 0, 
        opacity: 1,
        border: isDone ? "1px solid rgba(16,185,129,0.3)" : (isFocused ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.07)"),
        boxShadow: isDone ? "0 0 15px rgba(16,185,129,0.08)" : (isFocused ? "0 0 12px rgba(139,92,246,0.15)" : "none")
      }}
      exit={{ y: -6, opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onFocus(inst.instanceId)}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        background: isDone ? "rgba(16,185,129,0.04)" : (isFocused ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)"),
        cursor: "pointer",
        marginBottom: 6,
        transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {isDone && <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: "100%", background: "#10b981" }} />}
      
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (isActive || isFailed) ? 6 : 0 }}>
        <StatusIcon status={inst.status} />
        <span style={{
          fontSize: 10, fontWeight: 800, color: isDone ? "#ecfdf5" : "#e2e8f0", flex: 1,
          letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textTransform: "uppercase"
        }}>
          {inst.label}
        </span>

        {isDone && inst.result && (
          <button
            onClick={e => { e.stopPropagation(); onLoad(inst); }}
            style={{ 
              fontSize: 9, color: "#fff", 
              background: "rgba(16,185,129,0.2)", 
              border: "1px solid rgba(16,185,129,0.4)", 
              borderRadius: 6, padding: "3px 9px", 
              cursor: "pointer", fontWeight: 700, 
              letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: 4
            }}
          >
            VIEW RESULT
          </button>
        )}

        {isDone && (
          <button
            onClick={e => { e.stopPropagation(); onDismiss(inst.instanceId); }}
            style={{ fontSize: 14, color: "#475569", background: "none", border: "none", cursor: "pointer", padding: "0 5px", lineHeight: 1, flexShrink: 0, marginLeft: 4 }}
            title="Dismiss"
          >
            ×
          </button>
        )}

        {isActive && (
          <button
            onClick={e => { e.stopPropagation(); onStop(inst.instanceId); }}
            style={{ fontSize: 9, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 6, padding: "2px 7px", cursor: "pointer", fontWeight: 700 }}
          >
            STOP
          </button>
        )}

        {isFailed && inst.snapshot && (
          <button
            onClick={e => { e.stopPropagation(); onRetry(inst); }}
            style={{ fontSize: 9, color: "#a78bfa", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}
          >
            <RefreshCw size={8} /> RETRY
          </button>
        )}
      </div>

      {isActive && (
        <div style={{ padding: "2px 0 0" }}>
          <div style={{ width: "100%", height: 3, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 2 }}>
            <motion.div
              animate={{ width: `${inst.progress ?? 0}%` }}
              transition={{ duration: 0.4 }}
              style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#8b5cf6,#00e5ff)" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 8, fontWeight: 900, color: "#8b5cf6", fontFamily: "monospace" }}>{Math.round(inst.progress ?? 0)}%</span>
          </div>
        </div>
      )}

      {isFailed && inst.errorMsg && (
        <p style={{ fontSize: 9, color: "#fca5a5", margin: "4px 0 0", lineHeight: 1.4, background: "rgba(239,68,68,0.1)", padding: "4px 6px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.15)" }}>
          {inst.errorMsg}
        </p>
      )}
    </motion.div>
  );
}

export default memo(function ActiveTasksPanel({
  activeTasks,
  focusedInstanceId,
  onFocus,
  onStop,
  onRetry,
  onLoad,
  onDismiss,
  runningCount,
}) {
  const [open, setOpen] = useState(true);

  const instances = [...(activeTasks?.values() ?? [])].sort((a, b) => b.startedAt - a.startedAt);
  if (instances.length === 0) return null;

  return (
    <div style={{ padding: "8px 12px 6px", flexShrink: 0 }}>
      <div style={PANEL_STYLES.wrapper}>
        <div style={PANEL_STYLES.glowPurple} />
        <div style={PANEL_STYLES.glowCyan} />

        <button
          onClick={() => setOpen(o => !o)}
          style={{ width: "100%", padding: "8px 10px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, position: "relative", zIndex: 1 }}
        >
          <Sparkles size={10} style={{ color: "#8b5cf6", filter: "drop-shadow(0 0 4px rgba(139,92,246,0.6))", flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c4b5fd", flex: 1, textAlign: "left" }}>
            Active Tasks
          </span>
          {runningCount > 0 && (
            <span style={{ fontSize: 9, background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: 99, padding: "1px 7px", color: "#a78bfa", fontWeight: 700, flexShrink: 0 }}>
              {runningCount} running
            </span>
          )}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
            <ChevronDown size={12} style={{ color: "#475569" }} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden", position: "relative", zIndex: 1 }}
            >
              <div style={{ padding: "0 8px 8px", maxHeight: "min(260px, 40vh)", overflowY: "auto" }}>
                <AnimatePresence>
                  {instances.map(inst => (
                    <TaskCard
                      key={inst.instanceId}
                      inst={inst}
                      isFocused={inst.instanceId === focusedInstanceId}
                      onFocus={onFocus}
                      onStop={onStop}
                      onRetry={onRetry}
                      onLoad={onLoad}
                      onDismiss={onDismiss}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
);
