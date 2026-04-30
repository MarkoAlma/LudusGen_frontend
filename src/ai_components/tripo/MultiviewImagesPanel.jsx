import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Camera, Check, Edit3, ImagePlus, Images, Layers3, Loader2, Plus, Sparkles, Upload, Wand2, X } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { enhancePrompt } from "../../api/client";
import { GalleryPickerModal } from "../../components/image_studio/ImageControls";
import {
  getTripoGenerateImageInputPolicy,
  getTripoGenerateImageModel,
  filterTripoReferenceImagesForPolicy,
  isTripoReferenceImageReady,
  normalizeTripoReferenceImages,
  TRIPO_GENERATE_IMAGE_MODELS,
  TRIPO_IMAGE_INPUT_MODES,
} from "./tripoImageGenerationConfig";

const VIEW_OPTIONS = [
  { value: "front", label: "Front" },
  { value: "left", label: "Left" },
  { value: "back", label: "Back" },
  { value: "right", label: "Right" },
];

const TRIPO_IMAGE_ENHANCE_PROMPT = `You are an expert image-generation prompt enhancer for Tripo generate_image.
Rewrite the user's idea into a clear, visual, generation-ready prompt for source image creation.
Preserve the user's subject, style, composition intent, and any explicit constraints.
Add concrete visual detail only when it improves recognizability: subject traits, materials, colors, pose, composition, camera framing, lighting, and background if useful.
Keep it concise enough for a 1024-character prompt.
Return ONLY the improved prompt. No markdown, no JSON, no explanation.`;

function createLocalReferenceId(file, index = 0) {
  return [
    "tripo-ref",
    Date.now(),
    index,
    file?.name || "image",
    file?.size || 0,
    file?.lastModified || 0,
  ].join("-");
}

function dataUrlToFile(dataUrl, name = "gallery-image.png") {
  const [header = "", base64 = ""] = String(dataUrl || "").split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] || "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], name, { type: mime });
}

function ImageSourceChoiceModal({ title = "Add image", onClose, onDevice, onGallery }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,360px)] rounded-2xl border border-white/10 bg-[#0a0a14] p-3 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-2 py-2">
          <h3 className="text-[11px] font-black text-white uppercase tracking-[0.22em]">{title}</h3>
          <p className="mt-1 text-[9px] font-bold text-white/30 uppercase tracking-[0.18em]">
            Choose image source
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDevice}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] text-zinc-300 transition-all hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]"
          >
            <Upload className="h-5 w-5 text-cyan-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">Device</span>
          </button>
          <button
            type="button"
            onClick={onGallery}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] text-zinc-300 transition-all hover:border-violet-300/30 hover:bg-violet-300/[0.06]"
          >
            <Images className="h-5 w-5 text-violet-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">Gallery</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function cleanEnhancedPrompt(raw) {
  const cleaned = String(raw ?? "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.prompt === "string") {
      return parsed.prompt.trim().slice(0, 1024);
    }
  } catch {
    // Plain text enhancer responses are expected here.
  }

  return cleaned.slice(0, 1024);
}

function getSelectCapabilityLabel(option) {
  if (!option?.inputMode) return "";
  if (option.inputMode === TRIPO_IMAGE_INPUT_MODES.PROMPT_ONLY) return "Prompt only";
  if (option.inputMode === TRIPO_IMAGE_INPUT_MODES.IMAGE_ONLY) return "Image only";
  if (option.maxFiles > 1) return `Prompt + ${option.maxFiles} refs`;
  return "Prompt + image";
}

function TripoSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div
      className={`tp-custom-select${open ? " open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      style={{ position: "relative" }}
    >
      <button
        type="button"
        className="tp-custom-select-trigger"
        aria-expanded={open}
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
              className={`tp-custom-select-option${option.value === value ? " selected" : ""}${option.disabled ? " disabled" : ""}`}
              disabled={Boolean(option.disabled)}
              title={option.disabledReason || option.description || option.label}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
              }}
              onClick={(event) => {
                if (event.detail !== 0 || option.disabled) return;
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

function TripoOverlaySelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 720;
    const gap = 6;
    const desiredHeight = Math.min(360, Math.max(220, options.length * 62 + 16));
    const below = viewportHeight - rect.bottom - gap - 8;
    const above = rect.top - gap - 8;
    const openUp = below < Math.min(desiredHeight, 220) && above > below;
    const maxHeight = Math.max(156, Math.min(desiredHeight, openUp ? above : below));

    setMenuStyle({
      position: "fixed",
      left: Math.round(rect.left),
      top: Math.round(openUp ? rect.top - maxHeight - gap : rect.bottom + gap),
      width: Math.round(rect.width),
      maxHeight,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const menu = open && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef} className="tp-custom-select-menu" style={menuStyle || undefined}>
      {options.map((option) => {
        const capability = getSelectCapabilityLabel(option);
        const isSelected = option.value === value;
        const isPremium = option.cost >= 10;

        return (
          <button
            key={option.value || "default"}
            type="button"
            className={`tp-custom-select-option${isSelected ? " selected" : ""}${option.disabled ? " disabled" : ""}${option.description ? " has-description" : ""}`}
            disabled={Boolean(option.disabled)}
            title={option.disabledReason || option.description || option.label}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (option.disabled) return;
              onChange(option.value);
              setOpen(false);
            }}
            onClick={(event) => {
              if (event.detail !== 0 || option.disabled) return;
              onChange(option.value);
              setOpen(false);
            }}
          >
            <span className="tp-custom-select-option-copy">
              <span className="tp-custom-select-option-head">
                <span className="tp-custom-select-title">{option.label}</span>
                {capability && <span className="tp-custom-select-hint">{capability}</span>}
              </span>
              {option.description && (
                <span className="tp-custom-select-description">
                  {option.description}
                </span>
              )}
            </span>
            {option.badge && (
              <span className={`tp-custom-select-badge${isPremium ? " premium" : ""}`}>
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`tp-custom-select${open ? " open" : ""}`}
      style={{ position: "relative" }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="tp-custom-select-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="tp-custom-select-trigger-copy">
          <span className="tp-custom-select-title">{selected?.label || "Default"}</span>
          {getSelectCapabilityLabel(selected) && (
            <span className="tp-custom-select-hint">{getSelectCapabilityLabel(selected)}</span>
          )}
        </span>
        <span className="tp-custom-select-trigger-meta">
          {selected?.badge && (
            <span className={`tp-custom-select-badge${selected.cost >= 10 ? " premium" : ""}`}>
              {selected.badge}
            </span>
          )}
          <ChevronDown
            style={{
              width: 15,
              height: 15,
              opacity: 0.78,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.16s ease",
              flex: "0 0 auto",
            }}
          />
        </span>
      </button>
      {menu}
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
  sourceImage,
  setSourceImage,
  uploadImage,
  hasSelectedTask,
  editPrompt,
  setEditPrompt,
  editView,
  setEditView,
  getIdToken,
}) {
  const [enhancingImagePrompt, setEnhancingImagePrompt] = useState(false);
  const [enhanceError, setEnhanceError] = useState("");
  const [sourceChoice, setSourceChoice] = useState(null);
  const [sourceGalleryOpen, setSourceGalleryOpen] = useState(false);
  const [referenceGalleryOpen, setReferenceGalleryOpen] = useState(false);
  const referenceImages = normalizeTripoReferenceImages(referenceImage);
  const isSourceUploaded = Boolean(sourceImage?.tripoFile || sourceImage?.token);
  const selectedGenerationModel = getTripoGenerateImageModel(generationModel);
  const imageInputPolicy = getTripoGenerateImageInputPolicy(generationModel);
  const promptEnabled = imageInputPolicy.prompt;
  const referenceEnabled = imageInputPolicy.image;
  const isPromptOnlyEngine = imageInputPolicy.inputMode === TRIPO_IMAGE_INPUT_MODES.PROMPT_ONLY;
  const isImageOnlyEngine = imageInputPolicy.inputMode === TRIPO_IMAGE_INPUT_MODES.IMAGE_ONLY;
  const maxReferenceImages = referenceEnabled ? Math.max(1, imageInputPolicy.maxFiles || 1) : 0;
  const activeReferenceImages = filterTripoReferenceImagesForPolicy(referenceImages, imageInputPolicy);
  const activeUploadedReferenceCount = activeReferenceImages.filter(isTripoReferenceImageReady).length;
  const heldReferenceCount = Math.max(0, referenceImages.length - activeReferenceImages.length);
  const isReferenceUploaded = activeUploadedReferenceCount > 0;
  const referenceSlotsRemaining = Math.max(0, maxReferenceImages - activeReferenceImages.length);
  const imageModelOptions = TRIPO_GENERATE_IMAGE_MODELS;

  const handleGenerationModelChange = useCallback((nextValueOrEvent) => {
    const nextValue = typeof nextValueOrEvent === "string"
      ? nextValueOrEvent
      : nextValueOrEvent?.target?.value;
    setGenerationModel(nextValue || "");
  }, [setGenerationModel]);

  useEffect(() => {
    if (!promptEnabled && prompt) {
      setPrompt("");
    }
  }, [prompt, promptEnabled, setPrompt]);

  const handleEnhanceImagePrompt = useCallback(async () => {
    if (!promptEnabled || !prompt.trim() || enhancingImagePrompt) return;
    setEnhancingImagePrompt(true);
    setEnhanceError("");
    try {
      const raw = await enhancePrompt({
        systemPrompt: TRIPO_IMAGE_ENHANCE_PROMPT,
        userPrompt: prompt.trim(),
        max_tokens: 900,
        getIdTokenOrToken: getIdToken,
      });
      const nextPrompt = cleanEnhancedPrompt(raw);
      if (!nextPrompt) throw new Error("The enhancer returned an empty prompt.");
      setPrompt(nextPrompt);
    } catch (error) {
      setEnhanceError(error?.message || "Prompt enhance failed.");
    } finally {
      setEnhancingImagePrompt(false);
    }
  }, [enhancingImagePrompt, getIdToken, prompt, promptEnabled, setPrompt]);

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

  const uploadPickedImage = (file, setter, uploader, previewOverride = null) => {
    const applyPreview = (preview) => {
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

    if (previewOverride) {
      applyPreview(previewOverride);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => applyPreview(readerEvent.target.result);
    reader.readAsDataURL(file);
  };

  const openDeviceImagePicker = (setter, uploader) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/avif";
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      uploadPickedImage(file, setter, uploader);
    };
    input.click();
  };

  const updateReferenceImage = useCallback((localId, nextItem) => {
    setReferenceImage((current) => {
      const next = normalizeTripoReferenceImages(current)
        .map((item) => (item?.localId === localId ? nextItem : item))
        .filter(Boolean);
      return next.length ? next : null;
    });
  }, [setReferenceImage]);

  const removeReferenceImage = useCallback((localId, indexToRemove = -1) => {
    setReferenceImage((current) => {
      const next = normalizeTripoReferenceImages(current)
        .filter((item, index) => (localId ? item?.localId !== localId : index !== indexToRemove));
      return next.length ? next : null;
    });
  }, [setReferenceImage]);

  const addReferenceFile = useCallback((file, index = 0, previewOverride = null) => {
    const localId = createLocalReferenceId(file, index);
    const applyPreview = (preview) => {
      const pendingItem = { localId, file, preview, token: null };
      setReferenceImage((current) => {
        const next = [...normalizeTripoReferenceImages(current), pendingItem];
        return next.length ? next : null;
      });
      uploadReferenceImage?.(file)
        .then((payload) => {
          updateReferenceImage(localId, {
            localId,
            file,
            preview,
            token: typeof payload === "string"
              ? payload
              : payload?.token || payload?.object?.key || "sts",
            ...(typeof payload === "object" && payload ? { tripoFile: payload } : {}),
          });
        })
        .catch(() => {
          removeReferenceImage(localId);
        });
    };

    if (previewOverride) {
      applyPreview(previewOverride);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => applyPreview(readerEvent.target.result);
    reader.readAsDataURL(file);
  }, [removeReferenceImage, setReferenceImage, updateReferenceImage, uploadReferenceImage]);

  const openDeviceReferencePicker = useCallback(() => {
    if (!referenceEnabled || referenceSlotsRemaining <= 0) return;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = maxReferenceImages > 1;
    input.accept = imageInputPolicy.disallowWebp
      ? "image/jpeg,image/png"
      : "image/jpeg,image/png,image/webp";
    input.onchange = (event) => {
      const files = Array.from(event.target.files || []).slice(0, referenceSlotsRemaining);
      files.forEach((file, index) => addReferenceFile(file, index));
    };
    input.click();
  }, [
    addReferenceFile,
    imageInputPolicy.disallowWebp,
    maxReferenceImages,
    referenceEnabled,
    referenceSlotsRemaining,
  ]);

  const handleSourceGallerySelect = (imgs) => {
    const first = imgs?.[0];
    if (!first?.dataUrl) return;
    const file = dataUrlToFile(first.dataUrl, first.name || "gallery-source.png");
    uploadPickedImage(file, setSourceImage, uploadImage, first.dataUrl);
  };

  const handleReferenceGallerySelect = (imgs) => {
    const slotsLeft = Math.max(0, referenceSlotsRemaining);
    imgs.slice(0, slotsLeft).forEach((img, index) => {
      if (!img?.dataUrl) return;
      const file = dataUrlToFile(img.dataUrl, img.name || `gallery-reference-${index + 1}.png`);
      addReferenceFile(file, index, img.dataUrl);
    });
  };

  const handleSourceChoiceDevice = () => {
    const choice = sourceChoice;
    setSourceChoice(null);
    if (choice === "reference") {
      openDeviceReferencePicker();
      return;
    }
    openDeviceImagePicker(setSourceImage, uploadImage);
  };

  const handleSourceChoiceGallery = () => {
    const choice = sourceChoice;
    setSourceChoice(null);
    if (choice === "reference") {
      setReferenceGalleryOpen(true);
      return;
    }
    setSourceGalleryOpen(true);
  };

  const renderUploadCard = ({
    value,
    onPick,
    emptyIcon,
    emptyTitle,
    emptyHint,
    uploadedBadge = true,
    disabled = false,
    disabledHint = "",
  }) => (
    <div
      onClick={disabled ? undefined : onPick}
      aria-disabled={disabled}
      style={{
        minHeight: 168,
        borderRadius: 18,
        border: disabled ? "1.5px dashed rgba(148,163,184,0.16)" : "1.5px dashed rgba(0,229,255,0.28)",
        background: disabled ? "rgba(15,23,42,0.22)" : "rgba(255,255,255,0.025)",
        cursor: disabled ? "not-allowed" : "pointer",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.62 : 1,
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
          <div style={{ color: disabled ? "rgba(226,232,240,0.54)" : "#e2e8f0", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>{emptyTitle}</div>
          <div style={{ color: disabled ? "rgba(148,163,184,0.58)" : "rgba(148,163,184,0.78)", fontSize: 10, fontWeight: 700, marginTop: 6 }}>{disabled ? disabledHint : emptyHint}</div>
        </div>
      )}
    </div>
  );

  const renderReferenceUploadGrid = () => {
    const heldNote = heldReferenceCount > 0 ? (
      <p style={{ color: "rgba(245,158,11,0.86)", fontSize: 10, fontWeight: 850, lineHeight: 1.45, margin: 0 }}>
        {heldReferenceCount} uploaded reference image{heldReferenceCount === 1 ? "" : "s"} kept, but not sent by this engine.
      </p>
    ) : null;

    if (referenceImages.length === 0) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {renderUploadCard({
            value: null,
            onPick: () => setSourceChoice("reference"),
            emptyIcon: <Upload style={{ width: 26, height: 26, color: isPromptOnlyEngine ? "#64748b" : "#00e5ff", margin: "0 auto 10px" }} />,
            emptyTitle: isPromptOnlyEngine
              ? "Reference disabled"
              : maxReferenceImages > 1
                ? `Add up to ${maxReferenceImages} references`
                : "Add reference image",
            emptyHint: imageInputPolicy.disallowWebp
              ? `JPG or PNG only. ${maxReferenceImages} reference slot${maxReferenceImages === 1 ? "" : "s"}.`
              : `JPG, PNG, or WEBP. ${maxReferenceImages} reference slot${maxReferenceImages === 1 ? "" : "s"}.`,
            disabled: !referenceEnabled,
            disabledHint: referenceImages.length > 0
              ? "References are kept here, but this engine will not send them."
              : "This selected image engine is prompt-only.",
          })}
          {heldNote}
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ color: "rgba(148,163,184,0.76)", fontSize: 10, fontWeight: 850, lineHeight: 1.4 }}>
            {activeUploadedReferenceCount}/{activeReferenceImages.length} active for this engine
          </span>
          <span style={{ color: "rgba(165,243,252,0.78)", fontSize: 9, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {referenceImages.length} uploaded
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8 }}>
          {referenceImages.map((item, index) => {
            const ready = isTripoReferenceImageReady(item);
            const isActive = activeReferenceImages.includes(item);
            const localId = item.localId || `${item.file?.name || "reference"}-${index}`;
            return (
              <div
                key={localId}
                role={item.preview ? "button" : undefined}
                tabIndex={item.preview ? 0 : undefined}
                title={item.preview ? "Open preview" : undefined}
                onClick={() => {
                  if (item.preview) window.open(item.preview, "_blank", "noopener,noreferrer");
                }}
                onKeyDown={(event) => {
                  if (!item.preview || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  window.open(item.preview, "_blank", "noopener,noreferrer");
                }}
                style={{
                  minHeight: 104,
                  aspectRatio: "1 / 1",
                  borderRadius: 16,
                  border: isActive
                    ? ready ? "1px solid rgba(16,185,129,0.26)" : "1px solid rgba(0,229,255,0.20)"
                    : "1px solid rgba(245,158,11,0.26)",
                  background: "rgba(255,255,255,0.026)",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: isActive
                    ? ready ? "0 0 18px rgba(16,185,129,0.08)" : "0 0 18px rgba(0,229,255,0.06)"
                    : "0 0 18px rgba(245,158,11,0.07)",
                  opacity: isActive ? 1 : 0.72,
                  cursor: item.preview ? "zoom-in" : "default",
                }}
              >
                {item.preview ? (
                  <img src={item.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ImagePlus style={{ width: 22, height: 22, color: "#00e5ff" }} />
                  </div>
                )}
                {!ready && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(3,0,10,0.56)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 className="anim-spin" style={{ width: 18, height: 18, color: "#00e5ff" }} />
                  </div>
                )}
                <div style={{ position: "absolute", left: 8, bottom: 8, minWidth: 22, height: 22, padding: "0 7px", borderRadius: 999, background: "rgba(3,7,18,0.74)", border: "1px solid rgba(255,255,255,0.16)", color: "#e2e8f0", fontSize: 10, fontWeight: 950, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {index + 1}
                </div>
                <div style={{ position: "absolute", right: 8, bottom: 8, minHeight: 22, padding: "0 7px", borderRadius: 999, background: isActive ? ready ? "rgba(16,185,129,0.92)" : "rgba(3,7,18,0.74)" : "rgba(245,158,11,0.90)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, border: "1px solid rgba(255,255,255,0.24)", color: "#fff", fontSize: 8, fontWeight: 950, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {isActive && ready && <Check style={{ width: 11, height: 11, color: "#fff" }} />}
                  {isActive ? ready ? "active" : "uploading" : "not sent"}
                </div>
                <button
                  type="button"
                  aria-label="Remove reference image"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeReferenceImage(item.localId, index);
                  }}
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(3,7,18,0.76)",
                    color: "#e2e8f0",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            );
          })}
          {referenceEnabled && referenceSlotsRemaining > 0 && (
            <button
              type="button"
              onClick={() => setSourceChoice("reference")}
              style={{
                minHeight: 104,
                aspectRatio: "1 / 1",
                borderRadius: 16,
                border: "1.5px dashed rgba(0,229,255,0.30)",
                background: "rgba(0,229,255,0.045)",
                color: "#a5f3fc",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                cursor: "pointer",
                fontSize: 9,
                fontWeight: 950,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <Plus style={{ width: 18, height: 18 }} />
              Add
            </button>
          )}
        </div>
        {heldNote}
        <p style={{ color: "rgba(148,163,184,0.70)", fontSize: 10, fontWeight: 750, lineHeight: 1.45, margin: 0 }}>
          {imageInputPolicy.disallowWebp
            ? "This engine rejects WebP references, so only JPG/PNG is accepted here."
            : `This engine can send up to ${maxReferenceImages} reference images with the prompt.`}
        </p>
      </div>
    );
  };

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
            <label style={labelStyle}>Image Engine</label>
            <TripoOverlaySelect
              value={generationModel}
              onChange={handleGenerationModelChange}
              options={imageModelOptions}
            />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
              <p style={{ color: "rgba(148,163,184,0.72)", fontSize: 10, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {selectedGenerationModel.description}
              </p>
              <span style={{ color: "#a5f3fc", fontSize: 9, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", flex: "0 0 auto" }}>
                {selectedGenerationModel.badge}
              </span>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <label style={labelStyle}>{isImageOnlyEngine ? "Image Prompt Disabled" : "Image Prompt"}</label>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                <Motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  disabled={!promptEnabled || !prompt.trim() || enhancingImagePrompt}
                  onClick={handleEnhanceImagePrompt}
                  title={!promptEnabled ? "This engine does not use a prompt" : !prompt.trim() ? "Write a prompt first" : "Enhance this image prompt"}
                  style={{
                    minHeight: 28,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,229,255,0.18)",
                    background: promptEnabled && prompt.trim() ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.026)",
                    color: promptEnabled && prompt.trim() ? "#a5f3fc" : "rgba(148,163,184,0.48)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: !promptEnabled || !prompt.trim() || enhancingImagePrompt ? "not-allowed" : "pointer",
                    fontSize: 9,
                    fontWeight: 950,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {enhancingImagePrompt ? (
                    <Loader2 className="anim-spin" style={{ width: 12, height: 12 }} />
                  ) : (
                    <Wand2 style={{ width: 12, height: 12 }} />
                  )}
                  Enhance
                </Motion.button>
                <span style={{ color: prompt.length > 900 ? "#F59E0B" : "rgba(148,163,184,0.65)", fontSize: 9, fontWeight: 900, letterSpacing: "0.08em" }}>
                  {prompt.length}/1024
                </span>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => {
                if (!promptEnabled) return;
                setPrompt(event.target.value.slice(0, 1024));
                if (enhanceError) setEnhanceError("");
              }}
              rows={4}
              disabled={!promptEnabled}
              placeholder={promptEnabled ? "Describe the source image you want Tripo to generate..." : "This engine uses image input only."}
              style={{ ...fieldStyle, resize: "vertical", minHeight: 96, opacity: promptEnabled ? 1 : 0.52, cursor: promptEnabled ? "text" : "not-allowed" }}
            />
            {enhanceError && (
              <div style={{ marginTop: 6, padding: "7px 9px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.22)", background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontSize: 10, fontWeight: 800, lineHeight: 1.45 }}>
                {enhanceError}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>{referenceEnabled ? "Reference Images" : "Reference Images Disabled"}</label>
            {renderReferenceUploadGrid()}
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 16, background: isReferenceUploaded ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.026)", border: isReferenceUploaded ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(255,255,255,0.08)" }}>
            <Wand2 style={{ width: 15, height: 15, color: isReferenceUploaded ? "#10B981" : "#94a3b8", flex: "0 0 auto", marginTop: 1 }} />
            <p style={{ color: "rgba(226,232,240,0.72)", fontSize: 10, fontWeight: 800, lineHeight: 1.5, margin: 0 }}>
              {isPromptOnlyEngine
                ? "Prompt-only engine selected. Image upload is disabled and no reference will be sent."
                : isReferenceUploaded
                  ? `${activeUploadedReferenceCount} active reference image${activeUploadedReferenceCount === 1 ? "" : "s"} uploaded. They will be sent together with the prompt.`
                  : `This engine can use prompt plus up to ${maxReferenceImages} optional reference image${maxReferenceImages === 1 ? "" : "s"}.`}
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
            onPick: () => setSourceChoice("source"),
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
      {sourceChoice && (
        <ImageSourceChoiceModal
          title={sourceChoice === "reference" ? "Add reference image" : "Add source image"}
          onClose={() => setSourceChoice(null)}
          onDevice={handleSourceChoiceDevice}
          onGallery={handleSourceChoiceGallery}
        />
      )}
      {sourceGalleryOpen && (
        <GalleryPickerModal
          onClose={() => setSourceGalleryOpen(false)}
          onSelectMultiple={handleSourceGallerySelect}
          getIdToken={getIdToken}
          slotsAvailable={1}
        />
      )}
      {referenceGalleryOpen && (
        <GalleryPickerModal
          onClose={() => setReferenceGalleryOpen(false)}
          onSelectMultiple={handleReferenceGallerySelect}
          getIdToken={getIdToken}
          slotsAvailable={Math.max(0, referenceSlotsRemaining)}
        />
      )}
    </div>
  );
}
