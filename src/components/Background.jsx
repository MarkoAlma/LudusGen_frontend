export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">

      {/* Core gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-cyan-900/30" />

      {/* Radial depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(236,72,153,0.18),transparent_65%)]" />

      {/* Massive glow blobs (STATIC, no pulse) */}
      <div className="absolute -top-48 left-1/4 w-[700px] h-[700px] rounded-full bg-cyan-500/12 blur-[180px]" />
      <div className="absolute bottom-[-350px] right-1/4 w-[800px] h-[800px] rounded-full bg-pink-500/12 blur-[200px]" />

      {/* Accent glow */}
      <div className="absolute top-1/3 left-[-200px] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[160px]" />

      {/* Cinematic horizon */}
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-cyan-400/15 to-transparent" />

      {/* Ultra-fine grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px',
        }}
      />

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_35%,rgba(0,0,0,0.7)_100%)]" />

      {/* Film grain */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.035] mix-blend-overlay" />
    </div>
  );
}
