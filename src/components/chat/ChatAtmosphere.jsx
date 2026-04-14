import React from 'react';

/**
 * ChatAtmosphere — Minimal background, zero interference with text readability.
 */
export default function ChatAtmosphere({ themeColor }) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
      {/* Very subtle top accent glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full blur-[100px] opacity-[0.03]"
        style={{ background: `radial-gradient(ellipse, ${themeColor}, transparent)` }}
      />
    </div>
  );
}
