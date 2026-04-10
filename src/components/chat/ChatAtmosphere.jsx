import React from 'react';

/**
 * ChatAtmosphere Component
 * Modularizes the visual experience layers including tech-grids, noise, 
 * atmospheric glows, and aurora blurs.
 */
export default function ChatAtmosphere({ themeColor }) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
      
      {/* ── Forum-Matched Tech Grid ── */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* ── Forum-Matched Global Atmospheric Glows ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* ── Forum Signature Texture Overlay (Carbon Fibre) ── */}
      <div 
        className="absolute inset-0 z-1 opacity-[0.02] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("https://www.transparenttextures.com/patterns/carbon-fibre.png")`
        }}
      />


      {/* ── Stable Theme Accent Glows ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[140px] opacity-10" 
          style={{ background: `radial-gradient(circle, ${themeColor}, transparent)` }} 
        />
        <div 
          className="absolute -bottom-[20%] -right-[15%] w-[60%] h-[60%] rounded-full blur-[140px] opacity-5" 
          style={{ 
            background: `radial-gradient(circle, #00e5ff, transparent)`
          }} 
        />
      </div>


      {/* ── Bottom Horizon Shadow ── */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60" />
      
      {/* ── Top Vignette Overlay ── */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent opacity-40" />
    </div>
  );
}
