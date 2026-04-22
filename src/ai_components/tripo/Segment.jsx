// trellis/Segment.jsx
import React from "react";
import {
  Scissors, Boxes, Box, ChevronRight, HelpCircle, AlertTriangle, Check, Upload,
} from "lucide-react";
import { Tooltip } from "../meshy/ui/Primitives";

/*
 *  Tripo API restrictions for mesh_segmentation:
 *
 *  - The source model CANNOT be a rigged/animated output.
 *    (animate_rig or animate_retarget task outputs are not segmentable.)
 *  - The source model CANNOT be a converted/retopo output from convert_model
 *    if it has already been processed with animation.
 *  - Valid sources: text_to_model, image_to_model, multiview_to_model,
 *    refine_model, stylize_model, smart_low_poly (retopo), import_model.
 *
 *  mesh_completion (fill_parts):
 *  - Source must be a previously segmented model (mesh_segmentation output).
 *  - Cannot be applied to rigged models.
 */

export default function Segment({ segSub, activeTaskId, isRiggedInput, isSegmentOutput }) {
  return (
    <>
      {/* ── SEGMENT (mesh_segmentation) ── */}
      {segSub === "segment" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 0" }}>

          {/* Rigged model blocker */}
          {isRiggedInput && (
            <div style={{ width: "100%", padding: "8px 12px", borderRadius: 11, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 14, textAlign: "left", display: "flex", gap: 8 }}>
              <AlertTriangle style={{ width: 13, height: 13, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: "#f87171", fontSize: 11, fontWeight: 600, margin: 0 }}>Incompatible model</p>
                <p style={{ color: "#ef4444", fontSize: 10, margin: "3px 0 0", lineHeight: 1.5 }}>
                  Rigged and animated models cannot be segmented. Select an unrigged model.
                </p>
              </div>
            </div>
          )}

          {activeTaskId ? (
            /* ── Selected model — Ready state ── */
            <div style={{ width: "100%" }}>
                <div 
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 14 }}
                  title="The model is suitable for AI-driven segmentation into discrete parts."
                >
                  <Check style={{ width: 14, height: 14, color: "#22c55e", flexShrink: 0 }} />
                  <span style={{ color: "#86efac", fontSize: 12, fontWeight: 700 }}>Ready to Segment</span>
                </div>
              <div style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.25)", marginBottom: 10 }}>
                <p style={{ color: "#a5a0ff", fontSize: 11, fontWeight: 600, margin: 0 }}>Selected model</p>
                <p style={{ color: "#2d2d48", fontSize: 9, margin: "2px 0 0", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeTaskId}</p>
              </div>
              <div style={{ width: "100%", padding: "6px 9px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "left" }}>
                <p style={{ color: "#2d2d48", fontSize: 9, margin: 0, lineHeight: 1.6 }}>
                  Valid sources: text/image/multiview generation, imported models, retopo outputs.
                </p>
              </div>
            </div>
          ) : (
            /* ── No model selected ── */
            <>
              <p style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500, lineHeight: 1.6, margin: "0 0 20px" }}>
                Select a model<br />from the <span style={{ color: "#f5a623" }}>Archive</span> panel or<br /><span style={{ color: "#a5a0ff" }}>upload your own</span>
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, opacity: 0.7 }}>
                <div style={{ width: 90, height: 90, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Scissors style={{ width: 28, height: 28, color: "#3a3a58" }} />
                </div>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(108,99,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ChevronRight style={{ width: 11, height: 11, color: "#6c63ff" }} />
                </div>
                <div style={{ width: 90, height: 90, borderRadius: 12, background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Scissors style={{ width: 28, height: 28, color: "#6c63ff", opacity: 0.5 }} />
                </div>
              </div>

              <div style={{ width: "100%", padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "left", marginBottom: 10 }}>
                <p style={{ color: "#2d2d48", fontSize: 9, margin: 0, lineHeight: 1.6 }}>
                  Valid sources: text/image/multiview generation, imported models, retopo outputs.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FILL PARTS (mesh_completion) ── */}
      {segSub === "fill_parts" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 0" }}>

          {/* Rigged model blocker */}
          {isRiggedInput && (
            <div style={{ width: "100%", padding: "8px 12px", borderRadius: 11, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 14, textAlign: "left", display: "flex", gap: 8 }}>
              <AlertTriangle style={{ width: 13, height: 13, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: "#f87171", fontSize: 11, fontWeight: 600, margin: 0 }}>Incompatible model</p>
                <p style={{ color: "#ef4444", fontSize: 10, margin: "3px 0 0", lineHeight: 1.5 }}>
                  Part Completion cannot be applied to rigged or animated models.
                </p>
              </div>
            </div>
          )}

          {/* Not segmented blocker */}
          {activeTaskId && !isSegmentOutput && !isRiggedInput && (
            <div style={{ width: "100%", padding: "8px 12px", borderRadius: 11, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 14, textAlign: "left", display: "flex", gap: 8 }}>
              <AlertTriangle style={{ width: 13, height: 13, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: "#f87171", fontSize: 11, fontWeight: 600, margin: 0 }}>Incompatible model</p>
                <p style={{ color: "#ef4444", fontSize: 10, margin: "3px 0 0", lineHeight: 1.5 }}>
                  Part Completion requires a segmented model. Please run the Segment task first.
                </p>
              </div>
            </div>
          )}

          {activeTaskId && isSegmentOutput ? (
            /* ── Selected model — Ready state ── */
            <div style={{ width: "100%" }}>
                <div 
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 14 }}
                  title="This segmented model can now be completed with part-specific details."
                >
                  <Check style={{ width: 14, height: 14, color: "#22c55e", flexShrink: 0 }} />
                  <span style={{ color: "#86efac", fontSize: 12, fontWeight: 700 }}>Ready for Part Completion</span>
                </div>
              <div style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.25)", marginBottom: 10 }}>
                <p style={{ color: "#a5a0ff", fontSize: 11, fontWeight: 600, margin: 0 }}>Selected model</p>
                <p style={{ color: "#2d2d48", fontSize: 9, margin: "2px 0 0", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeTaskId}</p>
              </div>
              <div style={{ width: "100%", padding: "6px 9px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "left" }}>
                <p style={{ color: "#2d2d48", fontSize: 9, margin: 0, lineHeight: 1.6 }}>
                  Source must be a segmented model (mesh_segmentation output).
                </p>
              </div>
            </div>
          ) : (
            /* ── No model selected ── */
            <>
              <p style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500, lineHeight: 1.6, margin: "0 0 20px" }}>
                Select a segmented model<br />from the <span style={{ color: "#f5a623" }}>Archive</span> panel or<br /><span style={{ color: "#a5a0ff" }}>upload your own</span>
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, opacity: 0.7 }}>
                <div style={{ width: 90, height: 90, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Boxes style={{ width: 28, height: 28, color: "#3a3a58" }} />
                </div>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(108,99,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ChevronRight style={{ width: 11, height: 11, color: "#6c63ff" }} />
                </div>
                <div style={{ width: 90, height: 90, borderRadius: 12, background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Box style={{ width: 28, height: 28, color: "#6c63ff", opacity: 0.5 }} />
                </div>
              </div>

              <div style={{ width: "100%", padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "left", marginBottom: 10 }}>
                <p style={{ color: "#2d2d48", fontSize: 9, margin: 0, lineHeight: 1.6 }}>
                  Source must be a segmented model (mesh_segmentation output).
                </p>
              </div>
            </>
          )}

          <button
            style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "#3a3a58", fontSize: 11, fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.color = "#8a8aaa"}
            onMouseLeave={e => e.currentTarget.style.color = "#3a3a58"}
          >
            <HelpCircle style={{ width: 12, height: 12 }} /> How it works
          </button>
        </div>
      )}
    </>
  );
}