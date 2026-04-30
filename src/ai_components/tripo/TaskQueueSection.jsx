// src/ai_components/tripo/TaskQueueSection.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ChevronDown, Plus } from "lucide-react";

export default function TaskQueueSection({ mode, activeTasks, onNewInstance, onLoad }) {
  const [open, setOpen] = useState(true);

  const instances = [...activeTasks.values()].filter(t => t.mode === mode);
  if (instances.length === 0) return null;

  const runningCount = instances.filter(t => t.status === "running").length;
  const doneCount = instances.filter(t => t.status === "done").length;

  return (
    <div style={{
      marginTop: 16,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.02)",
      overflow: "hidden",
    }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", cursor: "pointer",
          borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#6d6d8e", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Task Queue
          </span>
          {runningCount > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 900, color: "#8b5cf6",
              background: "rgba(139,92,246,0.12)", borderRadius: 999,
              padding: "1px 6px", letterSpacing: "0.1em",
            }}>
              {runningCount} running
            </span>
          )}
          {doneCount > 0 && runningCount === 0 && (
            <span style={{
              fontSize: 9, fontWeight: 900, color: "#10b981",
              background: "rgba(16,185,129,0.12)", borderRadius: 999,
              padding: "1px 6px", letterSpacing: "0.1em",
            }}>
              {doneCount} ready
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={e => { e.stopPropagation(); onNewInstance(); }}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 6,
              border: "1px solid rgba(139,92,246,0.3)",
              background: "rgba(139,92,246,0.1)",
              color: "#a78bfa", fontSize: 10, fontWeight: 800,
              cursor: "pointer", letterSpacing: "0.05em",
            }}
          >
            <Plus style={{ width: 10, height: 10 }} /> New
          </button>
          <ChevronDown style={{
            width: 13, height: 13, color: "#4a4a68",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.18s",
          }} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {instances.map((inst, i) => (
              <TaskCard
                key={inst.instanceId}
                inst={inst}
                isLast={i === instances.length - 1}
                onLoad={onLoad}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ inst, isLast, onLoad }) {
  const shortId = inst.originalTaskId
    ? inst.originalTaskId.slice(0, 8) + "…"
    : "—";

  return (
    <div style={{
      padding: "10px 12px",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <StatusIcon status={inst.status} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#d4d4f0" }}>{inst.label}</span>
        </div>
        {inst.status === "done" && inst.result && (
          <button
            onClick={() => onLoad(inst)}
            style={{
              padding: "3px 10px", borderRadius: 7,
              border: "1px solid rgba(16,185,129,0.4)",
              background: "rgba(16,185,129,0.1)",
              color: "#10b981", fontSize: 10, fontWeight: 800,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Load →
          </button>
        )}
      </div>

      <span style={{ fontSize: 9, color: "#3d3d5a", fontFamily: "monospace", fontWeight: 700 }}>
        {shortId}
      </span>

      {inst.status === "running" && (
        <div style={{ marginTop: 7 }}>
          <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#8b5cf6,#00e5ff)" }}
              animate={{ width: `${inst.progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span style={{ fontSize: 9, color: "#8b5cf6", fontFamily: "monospace", fontWeight: 800, marginTop: 3, display: "block" }}>
            {inst.progress}%
          </span>
        </div>
      )}

      {inst.status === "failed" && (
        <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, marginTop: 4, display: "block" }}>
          {inst.errorMsg ?? "Failed"}
        </span>
      )}
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === "running") return (
    <Loader2 style={{ width: 12, height: 12, color: "#8b5cf6" }} className="anim-spin" />
  );
  if (status === "done") return (
    <CheckCircle2 style={{ width: 12, height: 12, color: "#10b981" }} />
  );
  return <XCircle style={{ width: 12, height: 12, color: "#ef4444" }} />;
}
