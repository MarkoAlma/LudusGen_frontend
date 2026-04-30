import { createPortal } from "react-dom";
import { motion as Motion } from "framer-motion";
import { Images, Upload, X } from "lucide-react";

export default function TripoImageSourceChoiceModal({
  title = "Add image",
  subtitle = "Choose where the new image should come from.",
  onClose,
  onDevice,
  onGallery,
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 px-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <Motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#05010e]/95 shadow-[0_0_40px_rgba(138,43,226,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300/70">Upload Images</p>
            <h3 className="mt-2 text-xl font-black italic tracking-tighter text-white">{title}</h3>
            <p className="mt-2 text-sm font-bold text-zinc-400">{subtitle}</p>
          </div>
          <Motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </Motion.button>
        </div>

        <div className="grid gap-3 p-6">
          <Motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onDevice}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-all hover:border-primary/40 hover:bg-primary/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white">From Device</p>
              <p className="mt-1 text-sm font-bold text-zinc-400">Pick fresh files from the local device.</p>
            </div>
          </Motion.button>

          <Motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onGallery}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
              <Images className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white">From Gallery</p>
              <p className="mt-1 text-sm font-bold text-zinc-400">Reuse images already saved by the shared image gallery.</p>
            </div>
          </Motion.button>
        </div>
      </Motion.div>
    </div>,
    document.body,
  );
}
