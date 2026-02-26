// trellis/HistoryCard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download,
  RotateCcw,
  Trash2,
  Loader2,
  Box,
  Sparkles,
} from "lucide-react";
import { getCachedThumbnail } from "./GlbThumbnail";
import { fetchGlbAsBlob } from "./utils";

const R = { sm: 5, md: 10, lg: 14 };

function fmtDateSafe(d) {
  try {
    if (!d) return "";
    const date = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Fallback: first 4 words of prompt
function promptFallbackName(prompt) {
  if (!prompt) return "Unnamed Model";
  const words = prompt.trim().split(/\s+/);
  const name = words.slice(0, 4).join(" ");
  return words.length > 4 ? name + "…" : name;
}

function useContainerWidth(ref) {
  const [width, setWidth] = useState(200);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    setWidth(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// ─────────────────────────────────────────────────────────────────────────────
const HistoryCard = React.memo(function HistoryCard({
  item,
  isActive,
  onSelect,
  onReuse,
  onDownload,
  onDelete,
  color = "#a78bfa",
  getIdToken,
}) {
  const containerRef = React.useRef(null);
  const containerWidth = useContainerWidth(containerRef);
  const isNarrow = containerWidth < 160;
  const isWide = containerWidth > 240;
  const thumbH = isNarrow ? 130 : isWide ? 200 : 170;

  const [thumbnail, setThumbnail] = useState(null);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!item?.model_url) return;
    let cancelled = false;
    setThumbError(false);
    (async () => {
      setThumbLoading(true);
      try {
        const blobUrl = await fetchGlbAsBlob(item.model_url, getIdToken);
        if (cancelled || !blobUrl) return;
        const thumb = await getCachedThumbnail(blobUrl, {
          width: 280,
          height: 280,
        });
        if (!cancelled) setThumbnail(thumb);
      } catch (err) {
        if (!cancelled) setThumbError(true);
        console.warn("HistoryCard thumbnail hiba:", err?.message ?? err);
      } finally {
        if (!cancelled) setThumbLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item?.model_url, getIdToken]);

  const handleSelect = useCallback(() => onSelect?.(item), [onSelect, item]);
const handleReuse = useCallback(
  (e) => {
    e.stopPropagation();
    onReuse?.(item);          // ← teljes item, nem csak prompt
  },
  [onReuse, item],
);
  const handleDownload = useCallback(
    (e) => {
      e.stopPropagation();
      onDownload?.(item);
    },
    [onDownload, item],
  );
  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      onDelete?.(item);
    },
    [onDelete, item],
  );

  const dateStr = fmtDateSafe(item?.createdAt ?? item?.ts);
  const prompt = item?.prompt ?? "";
  const accent = color ?? "#a78bfa";

  // Prefer AI-generated name, fall back to prompt words
  const hasAiName = !!item?.name;
  const displayName = useMemo(
    () => item?.name || promptFallbackName(prompt),
    [item?.name, prompt],
  );

  const styleEmoji =
    item?.style && item.style !== "nostyle"
      ? ({
          realistic: "📷",
          stylized: "🎨",
          cartoon: "🎪",
          pixelated: "🟫",
          lowpoly: "🔷",
        }[item.style] ?? null)
      : null;

  return (
    <div
      ref={containerRef}
      onClick={handleSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        borderRadius: R.md,
        border: `1px solid ${isActive ? accent + "55" : hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        background: isActive
          ? `linear-gradient(160deg, ${accent}10 0%, ${accent}05 100%)`
          : hovered
            ? "rgba(255,255,255,0.03)"
            : "rgba(255,255,255,0.018)",
        cursor: "pointer",
        overflow: "hidden",
        transition: "all 0.18s ease",
        boxShadow: isActive
          ? `0 0 22px ${accent}20, 0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 ${accent}20`
          : hovered
            ? "0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "inset 0 1px 0 rgba(255,255,255,0.025)",
      }}
    >
      {/* ── Thumbnail ── */}
      <div
        style={{
          width: "100%",
          height: thumbH,
          minHeight: thumbH,
          flexShrink: 0,
          background: "#0a0815",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={displayName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "#ffffff", // ← EZ A LÉNYEG
              display: "block",
              background: "#1A1528",
              transition: "transform 0.4s ease",
              transform: hovered ? "scale(1.04)" : "scale(1)",
            }}
          />
        ) : thumbLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${accent}12`,
                border: `1px solid ${accent}28`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Loader2
                style={{ width: 16, height: 16, color: accent, opacity: 0.6 }}
                className="animate-spin"
              />
            </div>
            <span
              style={{ color: "#2d2d4a", fontSize: 9, fontFamily: "monospace" }}
            >
              rendering…
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: thumbError ? "rgba(239,68,68,0.07)" : `${accent}08`,
                border: `1px solid ${thumbError ? "rgba(239,68,68,0.18)" : accent + "18"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                style={{
                  width: 20,
                  height: 20,
                  color: thumbError ? "#ef4444" : `${accent}40`,
                }}
              />
            </div>
            {thumbError && (
              <span
                style={{
                  color: "#2d2d4a",
                  fontSize: 8,
                  fontFamily: "monospace",
                }}
              >
                no preview
              </span>
            )}
          </div>
        )}

        {/* Active top glow bar */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${accent}e0, transparent)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Style badge */}
        {styleEmoji && (
          <div
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            {styleEmoji}
          </div>
        )}

        {/* Bottom gradient fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 52,
            background:
              "linear-gradient(to bottom, transparent, rgba(8,6,20,0.97))",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Info ── */}
      <div style={{ padding: "9px 11px 11px" }}>
        {/* Name row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 5,
            marginBottom: 3,
          }}
        >
          <p
            style={{
              flex: 1,
              color: isActive ? "#f0eeff" : "#d4d0e8",
              fontSize: 12,
              fontWeight: 700,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "-0.015em",
              lineHeight: 1.3,
            }}
          >
            {displayName}
          </p>

          {/* AI name badge */}
          {hasAiName && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: "2px 5px",
                borderRadius: 4,
                flexShrink: 0,
                background: `${accent}12`,
                border: `1px solid ${accent}20`,
                marginTop: 1,
              }}
            >
              <Sparkles style={{ width: 7, height: 7, color: `${accent}aa` }} />
              <span
                style={{
                  fontSize: 7.5,
                  fontWeight: 700,
                  color: `${accent}80`,
                  letterSpacing: "0.04em",
                  fontFamily: "'SF Mono', monospace",
                }}
              >
                AI
              </span>
            </div>
          )}
        </div>

        {/* Prompt preview — dimmer, smaller */}
        {hasAiName && (
          <p
            style={{
              color: "#252535",
              fontSize: 8.5,
              margin: "0 0 6px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.4,
              fontStyle: "italic",
            }}
          >
            {prompt.slice(0, 80)}
            {prompt.length > 80 ? "…" : ""}
          </p>
        )}

        {/* Date + seed */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 9,
          }}
        >
          {dateStr && (
            <span
              style={{
                color: "#2d2d48",
                fontSize: 9,
                fontFamily: "'SF Mono', monospace",
                letterSpacing: "0.01em",
              }}
            >
              {dateStr}
            </span>
          )}
          {item?.params?.seed != null && !item?.params?.randomSeed && (
            <span
              style={{
                color: "#1e1e34",
                fontSize: 8,
                fontFamily: "'SF Mono', monospace",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              #{item.params.seed}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          <ActionBtn
            onClick={handleReuse}
            title={`Reuse: "${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""}"`}
            accent={accent}
            label={isNarrow ? null : "Reuse"}
            flex
          >
            <RotateCcw style={{ width: 10, height: 10 }} />
          </ActionBtn>
<ActionBtn
  onClick={handleDownload}
  title="Letöltés formátumválasztóval"
  accent={accent}
  label={isNarrow ? null : "DL"}    // ← vagy akár null is lehet
>
  <Download style={{ width: 10, height: 10 }} />
</ActionBtn>
          <ActionBtn
            onClick={handleDelete}
            title="Törlés"
            accent="#ef4444"
            danger
            label={isNarrow ? null : "Del"}
          >
            <Trash2 style={{ width: 10, height: 10 }} />
          </ActionBtn>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
function ActionBtn({ onClick, title, accent, danger, label, flex, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: label ? 4 : 0,
        padding: label ? "5px 9px" : "5px 7px",
        borderRadius: R.sm,
        flex: flex ? "1" : undefined,
        justifyContent: flex ? "center" : undefined,
        border: `1px solid ${
          hovered
            ? danger
              ? "rgba(239,68,68,0.4)"
              : `${accent}50`
            : "rgba(255,255,255,0.07)"
        }`,
        background: hovered
          ? danger
            ? "rgba(239,68,68,0.12)"
            : `${accent}18`
          : "rgba(255,255,255,0.03)",
        color: hovered ? (danger ? "#ef4444" : accent) : "#3d3d5a",
        cursor: "pointer",
        transition: "all 0.14s",
        flexShrink: flex ? 0 : 1,
        minWidth: 0,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.03em",
        fontFamily: "'SF Mono', monospace",
        boxShadow: hovered && !danger ? `0 0 8px ${accent}18` : "none",
      }}
    >
      {children}
      {label}
    </button>
  );
}

export default HistoryCard;
