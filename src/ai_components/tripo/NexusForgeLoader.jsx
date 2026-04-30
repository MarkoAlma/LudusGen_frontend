// src/ai_components/tripo/NexusForgeLoader.jsx
import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const HEX_SIZE = 28;
const HEX_W = HEX_SIZE * 2;
const HEX_H = Math.sqrt(3) * HEX_SIZE;

function HexGrid() {
  const prefersReduced = useReducedMotion();
  const hexes = [];
  for (let row = -1; row < 12; row++) {
    for (let col = -1; col < 10; col++) {
      const x = col * HEX_W * 0.75 + (row % 2 === 0 ? 0 : HEX_W * 0.375);
      const y = row * HEX_H * 0.5;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i - 30);
        return `${x + HEX_SIZE * Math.cos(angle)},${y + HEX_SIZE * Math.sin(angle)}`;
      }).join(" ");
      hexes.push(<polygon key={`${row}-${col}`} points={pts} />);
    }
  }

  return (
    <motion.svg
      width="600" height="600"
      viewBox="0 0 600 600"
      style={{ position: "absolute", inset: 0, margin: "auto", opacity: 0.18 }}
      animate={prefersReduced ? {} : { rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
    >
      <g fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth="0.8">
        {hexes}
      </g>
    </motion.svg>
  );
}

function EnergyCore({ progress }) {
  const prefersReduced = useReducedMotion();
  const RADIUS = 80;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div style={{ position: "relative", width: 200, height: 200, flexShrink: 0 }}>
      <motion.svg
        width="200" height="200" viewBox="0 0 200 200"
        style={{ position: "absolute", inset: 0 }}
        animate={prefersReduced ? {} : { rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="90" fill="none"
          stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" strokeDasharray="6 8" />
      </motion.svg>

      <svg width="200" height="200" viewBox="0 0 200 200"
        style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="100" cy="100" r={RADIUS}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>

      <motion.div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <motion.div
          style={{
            width: 120, height: 120, borderRadius: "50%",
            background: "rgba(139,92,246,0.1)",
          }}
          animate={prefersReduced ? {} : { scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: "#00e5ff",
          boxShadow: "0 0 16px #00e5ff, 0 0 32px rgba(0,229,255,0.4)",
        }} />
      </div>
    </div>
  );
}

export default function NexusForgeLoader({ progress = 0, statusMsg = "", onStop }) {
  return (
    <motion.div
      key="nexus-forge"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "absolute", inset: 0, zIndex: 40,
        background: "rgba(3,0,10,0.88)",
        backdropFilter: "blur(20px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <HexGrid />

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 20,
        padding: "0 32px", width: "100%", maxWidth: 400,
      }}>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: "-0.03em",
          margin: 0,
          background: "linear-gradient(135deg, #c084fc, #38bdf8, #f472b6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textAlign: "center",
        }}>
          NEXUS FORGE ALPHA
        </h2>

        <EnergyCore progress={progress} />

        <span style={{
          fontFamily: "monospace", fontSize: 11, fontWeight: 900,
          color: "#8b5cf6", letterSpacing: "0.2em", textTransform: "uppercase",
        }}>
          {progress}% COMPLETE
        </span>

        {statusMsg && (
          <span style={{ fontSize: 12, color: "#6d6d8e", fontWeight: 700, textAlign: "center" }}>
            {statusMsg}
          </span>
        )}

        <div style={{ width: "100%", height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <motion.div
            style={{
              height: "100%", borderRadius: 2,
              background: "linear-gradient(90deg,#8b5cf6,#00e5ff)",
              boxShadow: "0 0 12px #8b5cf6",
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        {onStop && (
          <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onStop}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.08)",
                color: "#ef4444", fontSize: 10, fontWeight: 900,
                cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase",
              }}
            >
              Terminate
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
