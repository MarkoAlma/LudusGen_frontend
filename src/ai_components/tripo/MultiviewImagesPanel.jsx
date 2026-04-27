import React from "react";
import { Camera, Check, Edit3, ImagePlus, Layers3, Loader2 } from "lucide-react";

const VIEW_OPTIONS = [
  { value: "front", label: "Front" },
  { value: "left", label: "Left" },
  { value: "back", label: "Back" },
  { value: "right", label: "Right" },
];

export default function MultiviewImagesPanel({
  mode,
  setMode,
  sourceImage,
  setSourceImage,
  uploadImage,
  hasSelectedTask,
  editPrompt,
  setEditPrompt,
  editView,
  setEditView,
}) {
  const isUploaded = Boolean(sourceImage?.tripoFile || sourceImage?.token);

  const openPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/avif";
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const preview = readerEvent.target.result;
        setSourceImage({ file, preview, token: null });
        uploadImage?.(file)
          .then((payload) => {
            setSourceImage({
              file,
              preview,
              token: typeof payload === "string"
                ? payload
                : payload?.token || payload?.object?.key || "sts",
              ...(typeof payload === "object" && payload ? { tripoFile: payload } : {}),
            });
          })
          .catch(() => {
            setSourceImage(null);
          });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const labelStyle = {
    color: "rgba(225,226,212,0.70)",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6,
  };
  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(139,220,255,0.16)",
    background: "linear-gradient(145deg, rgba(15,23,42,0.44), rgba(3,7,18,0.34))",
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: 700,
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  };
  const helpText = mode === "generate_multiview_image"
    ? "Upload one source image. Tripo will create front, left, back, and right guide views from it."
    : hasSelectedTask
      ? "Edit the latest generated or selected multiview image set. Choose a view and describe only the change."
      : "Generate views first, then use Edit Views to adjust a specific camera angle.";

  return (
    <div className="tp-workflow-page" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="tp-source-mode-row" style={{ display: "flex", borderRadius: 20, overflow: "hidden", background: "rgba(3,7,18,0.28)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045)" }}>
        <button
          type="button"
          className={"tp-source-mode-btn-clean" + (mode === "generate_multiview_image" ? " active" : "")}
          data-active={mode === "generate_multiview_image" ? "true" : "false"}
          aria-pressed={mode === "generate_multiview_image"}
          onClick={() => setMode("generate_multiview_image")}
          style={{ flex: 1, minHeight: 48, border: 0, background: "transparent", color: "#94a3b8", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          Generate Views
        </button>
        <button
          type="button"
          className={"tp-source-mode-btn-clean" + (mode === "edit_multiview_image" ? " active" : "")}
          data-active={mode === "edit_multiview_image" ? "true" : "false"}
          aria-pressed={mode === "edit_multiview_image"}
          onClick={() => setMode("edit_multiview_image")}
          style={{ flex: 1, minHeight: 48, border: 0, borderLeft: "1px solid rgba(139,220,255,0.12)", background: "transparent", color: "#94a3b8", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          Edit Views
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 16, background: "rgba(0,229,255,0.055)", border: "1px solid rgba(0,229,255,0.14)", boxShadow: "0 0 22px rgba(0,229,255,0.06)" }}>
        {mode === "generate_multiview_image" ? <Camera style={{ width: 15, height: 15, color: "#00e5ff", flex: "0 0 auto", marginTop: 1 }} /> : <Edit3 style={{ width: 15, height: 15, color: "#00e5ff", flex: "0 0 auto", marginTop: 1 }} />}
        <p style={{ color: "rgba(226,232,240,0.72)", fontSize: 10, fontWeight: 700, lineHeight: 1.5, margin: 0 }}>{helpText}</p>
      </div>

      {mode === "generate_multiview_image" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 16, background: isUploaded ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.026)", border: isUploaded ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(255,255,255,0.08)" }}>
            <Layers3 style={{ width: 15, height: 15, color: isUploaded ? "#10B981" : "#94a3b8", flex: "0 0 auto", marginTop: 1 }} />
            <p style={{ color: "rgba(226,232,240,0.72)", fontSize: 10, fontWeight: 800, lineHeight: 1.5, margin: 0 }}>
              {isUploaded ? "Source image uploaded. Use the bottom action button to generate the guide views." : "No extra settings needed here: Tripo only needs one source image for Generate Views."}
            </p>
          </div>
          <label style={labelStyle}>Source Image</label>
          <div
            onClick={openPicker}
            style={{
              minHeight: 168,
              borderRadius: 18,
              border: "1.5px dashed rgba(0,229,255,0.28)",
              background: "rgba(255,255,255,0.025)",
              cursor: "pointer",
              overflow: "hidden",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {sourceImage?.preview ? (
              <>
                <img src={sourceImage.preview} alt="" style={{ width: "100%", height: "100%", minHeight: 168, objectFit: "cover" }} />
                {!isUploaded && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(3,0,10,0.56)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 className="anim-spin" style={{ width: 20, height: 20, color: "#00e5ff" }} />
                  </div>
                )}
                {isUploaded && (
                  <div style={{ position: "absolute", right: 10, bottom: 10, width: 22, height: 22, borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.42)" }}>
                    <Check style={{ width: 13, height: 13, color: "#fff" }} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 18 }}>
                <ImagePlus style={{ width: 26, height: 26, color: "#00e5ff", margin: "0 auto 10px" }} />
                <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>Upload source image</div>
                <div style={{ color: "rgba(148,163,184,0.78)", fontSize: 10, fontWeight: 700, marginTop: 6 }}>JPG, PNG, WEBP, AVIF</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 16, background: hasSelectedTask ? "rgba(16,185,129,0.07)" : "rgba(245,158,11,0.055)", border: hasSelectedTask ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(245,158,11,0.22)" }}>
            <Check style={{ width: 15, height: 15, color: hasSelectedTask ? "#10B981" : "#F59E0B", flex: "0 0 auto", marginTop: 1 }} />
            <p style={{ color: "rgba(226,232,240,0.72)", fontSize: 10, fontWeight: 800, lineHeight: 1.5, margin: 0 }}>
              {hasSelectedTask ? "Using the latest generated or selected multiview image set automatically." : "No generated views are selected yet. Generate Views first."}
            </p>
          </div>
          <div>
            <label style={labelStyle}>View</label>
            <div className="tp-view-choice-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {VIEW_OPTIONS.map((option) => {
                const active = String(editView).toLowerCase() === String(option.value).toLowerCase();
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`tp-view-choice ${active ? "active" : ""}`}
                    data-active={active ? "true" : "false"}
                    aria-pressed={active}
                    onClick={() => setEditView(option.value)}
                    style={{
                      ...fieldStyle,
                      position: "relative",
                      height: 52,
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "pointer",
                      border: active ? "2px solid #00e5ff" : "1px solid rgba(255,255,255,0.09)",
                      background: active ? "linear-gradient(145deg, rgba(0,229,255,0.3), rgba(138,43,226,0.2))" : "rgba(255,255,255,0.04)",
                      boxShadow: active ? "0 0 25px rgba(0,229,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
                      color: active ? "#ffffff" : "rgba(255,255,255,0.4)",
                      opacity: active ? 1 : 0.7,
                      transform: active ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Edit Prompt</label>
            <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={4} placeholder="Describe what should change on this view..." style={{ ...fieldStyle, resize: "vertical", minHeight: 104 }} />
          </div>
        </>
      )}
    </div>
  );
}
