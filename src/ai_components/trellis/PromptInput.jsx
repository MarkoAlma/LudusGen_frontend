import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, Zap, Wand2, Sparkles } from 'lucide-react';

function Tooltip({ text, children, side = 'top' }) {
  const [show, setShow] = useState(false);

  const arrowBorder =
    side === 'top'
      ? { borderTop: 'none', borderLeft: 'none' }   // nyíl ↓, tooltip fölül
      : { borderRight: 'none', borderBottom: 'none' }; // nyíl ↑, tooltip alul

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && text && (
        <div
          style={{
            position: 'absolute',
            [side === 'top' ? 'bottom' : 'top']: '100%',
            left: '50%',
            transform: `translateX(-50%) ${show ? 'translateY(0)' : side === 'top' ? 'translateY(4px)' : 'translateY(-4px)'}`,
            marginBottom: side === 'top' ? 9 : 0,
            marginTop: side === 'bottom' ? 9 : 0,
            padding: '5px 10px',
            background: 'rgba(8,8,18,0.97)',
            color: '#e2e8f0',
            fontSize: 10,
            fontWeight: 500,
            borderRadius: 7,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.09)',
            letterSpacing: '0.01em',
            animation: 'tooltipFadeIn 0.12s ease-out forwards',
          }}
        >
          <style>{`
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: translateX(-50%) ${side === 'top' ? 'translateY(4px)' : 'translateY(-4px)'}; }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          {text}
          {/* Nyílka — most már side-függő border-logikával */}
          <div
            style={{
              position: 'absolute',
              [side === 'top' ? 'bottom' : 'top']: -4,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 7,
              height: 7,
              background: 'rgba(8,8,18,0.97)',
              border: '1px solid rgba(255,255,255,0.09)',
              ...arrowBorder,
            }}
          />
        </div>
      )}
    </div>
  );
}

const MAX_CHARS = 1000;

function PromptInput({
  value,
  onChange,
  onSubmit,
  onEnhance,
  enhancing,
  onDechance,
  dechantig,
  color = '#818cf8',
  disabled,
}) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;
  const hasContent = value.trim().length > 0;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  }, [value]);

  const handleKeyDown = useCallback(
    (e) => {
      if (
        e.key === 'Enter' &&
        (e.ctrlKey || e.metaKey) &&
        !disabled &&
        value.trim() &&
        !isOverLimit
      ) {
        onSubmit();
      }
    },
    [disabled, value, isOverLimit, onSubmit]
  );

  const simplifyDisabled = !hasContent || dechantig || disabled;
  const enhanceDisabled = !hasContent || enhancing || disabled;

  const borderColor = isOverLimit
    ? 'rgba(248,113,113,0.5)'
    : focused
    ? `${color}60`
    : hasContent
    ? `${color}30`
    : 'rgba(255,255,255,0.07)';

  const glowShadow = focused && !isOverLimit
    ? `0 0 0 3px ${color}14, 0 2px 8px rgba(0,0,0,0.5)`
    : '0 1px 3px rgba(0,0,0,0.35)';

  const fillPct = Math.min(100, ((MAX_CHARS - remaining) / MAX_CHARS) * 100);
  const barColor = isOverLimit ? '#f87171' : remaining < 100 ? '#f59e0b' : color;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 13,
          background: disabled
            ? 'rgba(255,255,255,0.01)'
            : focused
            ? 'rgba(255,255,255,0.035)'
            : 'rgba(255,255,255,0.022)',
          border: `1px solid ${borderColor}`,
          boxShadow: glowShadow,
          transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}
      >
        {/* Top sheen */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: focused
              ? `linear-gradient(90deg, transparent, ${color}38, transparent)`
              : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
            pointerEvents: 'none',
            zIndex: 1,
            transition: 'all 0.3s',
          }}
        />

        {/* Subtle corner glow when focused */}
        {focused && !isOverLimit && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 13,
              background: `radial-gradient(ellipse at 50% 0%, ${color}08 0%, transparent 70%)`,
              pointerEvents: 'none',
              zIndex: 0,
              transition: 'opacity 0.3s',
            }}
          />
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={'Írj le egy 3D objektumot angolul…\npl. a rustic log cabin with a stone chimney'}
          rows={5}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '13px 14px 36px 14px',
            resize: 'none',
            minHeight: 108,
            maxHeight: 220,
            fontSize: 12,
            lineHeight: 1.8,
            color: disabled ? 'rgba(229,231,235,0.3)' : '#e5e7eb',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: "'SF Pro Text', system-ui, -apple-system, sans-serif",
            letterSpacing: '0.005em',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            display: 'block',
            position: 'relative',
            zIndex: 2,
          }}
        />

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            height: 32,
            borderTop: '1px solid rgba(255,255,255,0.045)',
            background: 'rgba(0,0,0,0.18)',
            zIndex: 3,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.18)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            }}
          >
            ⌘↵ generálás
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {hasContent && (
              <div
                style={{
                  width: 32,
                  height: 3,
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.07)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 99,
                    width: `${fillPct}%`,
                    background: barColor,
                    transition: 'width 0.15s, background 0.2s',
                    boxShadow: `0 0 6px ${barColor}80`,
                  }}
                />
              </div>
            )}
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                fontFamily: "'SF Mono', monospace",
                color: isOverLimit
                  ? '#f87171'
                  : remaining < 100
                  ? '#f59e0b'
                  : 'rgba(255,255,255,0.22)',
                minWidth: 28,
                textAlign: 'right',
                transition: 'color 0.2s',
                letterSpacing: '0.04em',
              }}
            >
              {remaining}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 5,
          marginTop: 7,
        }}
      >
        <Tooltip
          text={!hasContent ? 'Írj be egy promptot először' : 'Prompt egyszerűsítése'}
          side="top"
        >
          <ActionButton
            onClick={onDechance}
            disabled={simplifyDisabled}
            loading={dechantig}
            accentColor="#fb923c"
            icon={<Zap style={{ width: 10, height: 10 }} />}
            label="Simplify"
            loadingLabel="Simplify…"
          />
        </Tooltip>

        <Tooltip
          text={!hasContent ? 'Írj be egy promptot először' : 'AI prompt fejlesztés'}
          side="top"
        >
          <ActionButton
            onClick={onEnhance}
            disabled={enhanceDisabled}
            loading={enhancing}
            accentColor={color}
            icon={<Wand2 style={{ width: 10, height: 10 }} />}
            label="Enhance"
            loadingLabel="Enhance…"
          />
        </Tooltip>
      </div>
    </div>
  );
}

function ActionButton({ onClick, disabled, loading, accentColor, icon, label, loadingLabel }) {
  const [hovered, setHovered] = useState(false);

  const bg = loading || hovered
    ? `rgba(${hexToRgb(accentColor)}, 0.14)`
    : `rgba(${hexToRgb(accentColor)}, 0.07)`;

  const outline = hovered && !disabled
    ? `1px solid rgba(${hexToRgb(accentColor)}, 0.38)`
    : `1px solid rgba(${hexToRgb(accentColor)}, 0.16)`;

  const textColor = disabled
    ? `rgba(${hexToRgb(accentColor)}, 0.3)`
    : accentColor;

  const glow = (loading || hovered) && !disabled
    ? `0 0 14px rgba(${hexToRgb(accentColor)}, 0.18)`
    : 'none';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 11px',
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        background: bg,
        color: textColor,
        outline,
        boxShadow: glow,
        fontFamily: "'SF Pro Text', system-ui, sans-serif",
      }}
    >
      {loading ? (
        <>
          <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  );
}

// Hex → "r, g, b" string helper (pl. "#818cf8" → "129, 140, 248")
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export default React.memo(PromptInput);