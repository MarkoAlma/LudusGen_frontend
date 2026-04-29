import React, { useState } from "react";
import { Camera, Check, Edit3, ImagePlus, Layers3, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";

const VIEW_OPTIONS = [
  { value: "front", label: "Front" },
  { value: "left", label: "Left" },
  { value: "back", label: "Back" },
  { value: "right", label: "Right" },
];

const ORIENTATION_OPTIONS = [
  { value: "", label: "Default" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
  { value: "square", label: "Square" },
];

const COMPRESS_OPTIONS = [
  { value: "", label: "Off" },
  { value: "geometry", label: "Geometry" },
];

function TripoSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div
      className="tp-custom-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      style={{ position: "relative" }}
    >
      <button
        type="button"
        className="tp-custom-select-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected?.label || "Default"}</span>
        <span
          style={{
            width: 15,
            height: 15,
            opacity: 0.78,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.16s ease",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="tp-custom-select-menu">
          {options.map((option) => (
            <button
              key={option.value || "default"}
              type="button"
              className={`tp-custom-select-option${option.value === value ? " selected" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MultiviewImagesPanel({
  mode,
  setMode,
  prompt,
  setPrompt,
  referenceImage,
  setReferenceImage,
  uploadReferenceImage,
  generationModel,
  setGenerationModel,
  generationTemplateId,
  setGenerationTemplateId,
  generationOrientation,
  setGenerationOrientation,
  generationCompress,
  setGenerationCompress,
  generationRenderImage,
  setGenerationRenderImage,
  generationTextureAlignment,
  setGenerationTextureAlignment,
  sourceImage,
  setSourceImage,
  uploadImage,
  hasSelectedTask,
  editPrompt,
  setEditPrompt,
  editView,
  setEditView,
}) {
  const isReferenceUploaded = Boolean(referenceImage?.tripoFile || referenceImage?.token);
  const isSourceUploaded = Boolean(sourceImage?.tripoFile || sourceImage?.token);

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
  const sourceModeBtnStyle = (index, count = 1) => ({
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    border: 0,
    borderLeft: index > 0 ? "1px solid rgba(139,220,255,0.12)" : 0,
    background: "transparent",
    color: "#94a3b8",
    fontSize: count >= 3 ? 9 : 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  });

  const openImagePicker = (setter, uploader) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/avif";
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const preview = readerEvent.target.result;
        setter({ file, preview, token: null });
        uploader?.(file)
          .then((payload) => {
            setter({
              file,
              preview,
              token: typeof payload === "string"
                ? payload
                : payload?.token || payload?.object?.key || "sts",
              ...(typeof payload === "object" && payload ? { tripoFile: payload } : {}),
            });
          })
          .catch(() => {
            setter(null);
          });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const renderUploadCard = ({
    value,
    onPick,
    emptyIcon,
    emptyTitle,
    emptyHint,
    uploadedBadge = true,
  }) => (
    <div
      onClick={onPick}
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
      {value?.preview ? (
        <>
          <img src={value.preview} alt="" style={{ width: "100%", height: "100%", minHeight: 168, objectFit: "cover" }} />
          {!value?.tripoFile && !value?.token && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(3,0,10,0.56)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 className="anim-spin" style={{ width: 20, height: 20, color: "#00e5ff" }} />
            </div>
          )}
          {uploadedBadge && (value?.tripoFile || value?.token) && (
            <div style={{ position: "absolute", right: 10, bottom: 10, width: 22, height: 22, borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.42)" }}>
              <Check style={{ width: 13, height: 13, color: "#fff" }} />
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: 18 }}>
          {emptyIcon}
          <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>{emptyTitle}</div>
          <div style={{ color: "rgba(148,163,184,0.78)", fontSize: 10, fontWeight: 700, marginTop: 6 }}>{emptyHint}</div>
        </div>
      )}
    </div>
  );

  const helpText = (() => {
    if (mode === "generate_image") {
      return "Generate a source image inside Tripo first, then use it however you want in the rest of the pipeline.";
    }
    if (mode === "generate_multiview_image") {
      return "Upload one source image. Tripo will create front, left, back, and right guide views from it.";
    }
    return hasSelectedTask
      ? "Edit the latest generated or selected multiview image set. Choose a view and describe only the change."
      : "Generate views first, then use Edit Views to adjust a specific camera angle.";
  })();

  return (
    <div className="tp-workflow-page" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="tp-source-mode-row" style={{ display: "flex", borderRadius: 20, overflow: "hidden", background: "rgba(3,7,18,0.28)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045)" }}>
        <button
          type="button"
          className={`tp-source-mode-btn-clean${mode === "generate_image" ? " active" : ""}`}
          data-active={mode === "generate_image" ? "true" : "false"}
          aria-pressed={mode === "generate_image"}
          onClick={() => setMode("generate_image")}
          style={sourceModeBtnStyle(0, 3)}
        >
          Generate Image
        </button>
        <button
          type="button"
          className={`tp-source-mode-btn-clean${mode === "generate_multiview_image" ? " active" : ""}`}
          data-active={mode === "generate_multiview_image" ? "true" : "false"}
          aria-pressed={mode === "generate_multiview_image"}
          onClick={() => setMode("generate_multiview_image")}
          style={sourceModeBtnStyle(1, 3)}
        >
          Generate Views
        </button>
        <button
          type="button"
          className={`tp-source-mode-btn-clean${mode === "edit_multiview_image" ? " active" : ""}`}
          data-active={mode === "edit_multiview_image" ? "true" : "false"}
          aria-pressed={mode === "edit_multiview_image"}
          onClick={() => setMode("edit_multiview_image")}
          style={sourceModeBtnStyle(2, 3)}
        >
          Edit Views
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 16, background: "rgba(0,229,255,0.055)", border: "1px solid rgba(0,229,255,0.14)", boxShadow: "0 0 22px rgba(0,229,255,0.06)" }}>
        {mode === "generate_image" ? (
          <Sparkles style={{ width: 15, height: 15, color: "#00e5ff", flex: "0 0 auto", marginTop: 1 }} />
        ) : mode === "generate_multiview_image" ? (
          <Camera style={{ width: 15, height: 15, color: "#00e5ff", flex: "0 0 auto", marginTop: 1 }} />
        ) : (
          <Edit3 style={{ width: 15, height: 15, color: "#00e5ff", flex: "0 0 auto", marginTop: 1 }} />
        )}
        <p style={{ color: "rgba(226,232,240,0.72)", fontSize: 10, fontWeight: 700, lineHeight: 1.5, margin: 0 }}>{helpText}</p>
      </div>

      {mode === "generate_image" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={labelStyle}>Image Prompt</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder="Describe the source image you want Tripo to generate…"
              style={{ ...fieldStyle, resize: "vertical", minHeight: 96 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Reference Image</label>
            {renderUploadCard({
              value: referenceImage,
              onPick: () => openImagePicker(setReferenceImage, uploadReferenceImage),
              emptyIcon: <Upload style={{ width: 26, height: 26, color: "#00e5ff", margin: "0 auto 10px" }} />,
              emptyTitle: "Add reference image",
              emptyHint: "Optional STS upload for look and composition guidance",
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div>
              <label style={labelStyle}>Image Model</label>
              <input value={generationModel} onChange={(event) => setGenerationModel(event.target.value)} placeholder="Optional model id" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Template</label>
              <input value={generationTemplateId} onChange={(event) => setGenerationTemplateId(event.target.value)} placeholder="Optional template id" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Orientation</label>
              <TripoSelect value={generationOrientation} onChange={setGenerationOrientation} options={ORIENTATION_OPTIONS} />
            </div>
            <div>
              <label style={labelStyle}>Compress</label>
              <TripoSelect value={generationCompress} onChange={setGenerationCompress} options={COMPRESS_OPTIONS} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Texture Alignment</label>
            <input value={generationTextureAlignment} onChange={(event) => setGenerationTextureAlignment(event.target.value)} placeholder="Optional texture alignment hint" style={fieldStyle} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>Render Image</div>
              <p style={{ color: "rgba(148,163,184,0.78)", fontSize: 10, lineHeight: 1.5, margin: 0 }}>Keep a preview render in the Tripo task output.</p>
            </div>
            <div className={`tp-switch${generationRenderImage ? " on" : ""}`} onClick={() => setGenerationRenderImage((value) => !value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 16, background: isReferenceUploaded ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.026)", border: isReferenceUploaded ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(255,255,255,0.08)" }}>
            <Wand2 style={{ width: 15, height: 15, color: isReferenceUploaded ? "#10B981" : "#94a3b8", flex: "0 0 auto", marginTop: 1 }} />
            <p style={{ color: "rgba(226,232,240,0.72)", fontSize: 10, fontWeight: 800, lineHeight: 1.5, margin: 0 }}>
              {isReferenceUploaded ? "Reference image uploaded. Use the bottom action button to generate a Tripo image task." : "No reference required. A prompt-only image generation task is ready as soon as the prompt is filled."}
            </p>
          </div>
        </div>
      ) : mode === "generate_multiview_image" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 16, background: isSourceUploaded ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.026)", border: isSourceUploaded ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(255,255,255,0.08)" }}>
            <Layers3 style={{ width: 15, height: 15, color: isSourceUploaded ? "#10B981" : "#94a3b8", flex: "0 0 auto", marginTop: 1 }} />
            <p style={{ color: "rgba(226,232,240,0.72)", fontSize: 10, fontWeight: 800, lineHeight: 1.5, margin: 0 }}>
              {isSourceUploaded ? "Source image uploaded. Use the bottom action button to generate the guide views." : "No extra settings needed here: Tripo only needs one source image for Generate Views."}
            </p>
          </div>
          <label style={labelStyle}>Source Image</label>
          {renderUploadCard({
            value: sourceImage,
            onPick: () => openImagePicker(setSourceImage, uploadImage),
            emptyIcon: <ImagePlus style={{ width: 26, height: 26, color: "#00e5ff", margin: "0 auto 10px" }} />,
            emptyTitle: "Upload source image",
            emptyHint: "JPG, PNG, WEBP, AVIF",
          })}
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
            <textarea value={editPrompt} onChange={(event) => setEditPrompt(event.target.value)} rows={4} placeholder="Describe what should change on this view..." style={{ ...fieldStyle, resize: "vertical", minHeight: 104 }} />
          </div>
        </>
      )}
    </div>
  );
}
