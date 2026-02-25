import React from 'react';
import { Loader2, Zap, Wand2 } from 'lucide-react';

const T = {
  radius: { sm: 6, md: 10 },
};

/**
 * Tooltip komponens - egyszerű tooltip megjelenítéshez
 */
function Tooltip({ text, children, side = 'top' }) {
  const [show, setShow] = React.useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && text && (
        <div style={{
          position: 'absolute',
          [side === 'top' ? 'bottom' : 'top']: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: side === 'top' ? 8 : 0,
          marginTop: side === 'bottom' ? 8 : 0,
          padding: '6px 10px',
          background: 'rgba(0, 0, 0, 0.95)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 500,
          borderRadius: 6,
          whiteSpace: 'nowrap',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          {text}
          <div style={{
            position: 'absolute',
            [side === 'top' ? 'bottom' : 'top']: -4,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 8,
            height: 8,
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRight: 'none',
            borderBottom: 'none',
          }} />
        </div>
      )}
    </div>
  );
}

/**
 * PromptInput komponens - Trellis prompt beviteli mező
 * @param {string} value - A prompt értéke
 * @param {Function} onChange - Callback amikor a prompt változik (value) => void
 * @param {Function} onSubmit - Callback amikor Enter+Cmd/Ctrl-t nyomnak () => void
 * @param {Function} onEnhance - Callback az Enhance gombra () => void
 * @param {boolean} enhancing - Fut-e az enhance művelet
 * @param {Function} onDechance - Callback a Simplify gombra () => void
 * @param {boolean} dechantig - Fut-e a simplify művelet
 * @param {string} color - Accent szín (pl. '#a78bfa')
 * @param {boolean} disabled - Le van-e tiltva az input
 */
export default function PromptInput({ 
  value, 
  onChange, 
  onSubmit, 
  onEnhance, 
  enhancing, 
  onDechance, 
  dechantig, 
  color, 
  disabled 
}) {
  const MAX_CHARS = 1000;
  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !disabled && value.trim() && !isOverLimit) {
      onSubmit();
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Írj le egy 3D objektumot angolul…&#10;pl. a rustic log cabin with a stone chimney"
          rows={5}
          style={{
            width: '100%', 
            boxSizing: 'border-box',
            padding: '10px 12px 30px 12px',
            borderRadius: T.radius.md, 
            resize: 'vertical', 
            minHeight: 100, 
            maxHeight: 220,
            fontSize: 11, 
            lineHeight: 1.7, 
            color: '#e5e7eb',
            background: disabled 
              ? 'rgba(255,255,255,0.015)' 
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${
              isOverLimit 
                ? '#f87171' 
                : value.trim() 
                  ? color + '45' 
                  : 'rgba(255,255,255,0.08)'
            }`,
            outline: 'none', 
            fontFamily: "system-ui, -apple-system, sans-serif",
            transition: 'border-color 0.2s, background 0.2s',
            opacity: disabled ? 0.4 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            boxShadow: value.trim() && !isOverLimit 
              ? `inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 3px ${color}10` 
              : 'inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        />
        
        {/* Karakter számláló */}
        <span style={{
          position: 'absolute', 
          bottom: 8, 
          right: 10,
          fontSize: 9, 
          fontWeight: 700, 
          fontFamily: "'SF Mono', monospace",
          color: isOverLimit 
            ? '#f87171' 
            : remaining < 100 
              ? '#f59e0b' 
              : '#2d3748',
        }}>
          {remaining}
        </span>
      </div>

      {/* Alsó toolbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginTop: 7 
      }}>
        {/* Kbd hint */}
        <p style={{ 
          color: '#2d3748', 
          fontSize: 9, 
          margin: 0, 
          fontFamily: "'SF Mono', monospace" 
        }}>
          ⌘↵ generálás
        </p>
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {/* Simplify button */}
          <Tooltip 
            text={!value.trim() 
              ? 'Írj be egy promptot először' 
              : 'Prompt egyszerűsítése'
            } 
            side="top"
          >
            <button
              onClick={onDechance}
              disabled={!value.trim() || dechantig || disabled}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: 4,
                padding: '4px 9px', 
                borderRadius: T.radius.sm, 
                fontSize: 10, 
                fontWeight: 700,
                cursor: (!value.trim() || dechantig || disabled) 
                  ? 'not-allowed' 
                  : 'pointer',
                border: 'none', 
                transition: 'all 0.15s',
                background: dechantig 
                  ? 'rgba(251,146,60,0.12)' 
                  : 'rgba(251,146,60,0.08)',
                color: '#fb923c',
                outline: '1px solid rgba(251,146,60,0.2)',
                opacity: (!value.trim() || disabled) ? 0.35 : 1,
              }}
            >
              {dechantig ? (
                <>
                  <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />
                  {' '}Simplify…
                </>
              ) : (
                <>
                  <Zap style={{ width: 10, height: 10 }} />
                  {' '}Simplify
                </>
              )}
            </button>
          </Tooltip>
          
          {/* Enhance button */}
          <Tooltip 
            text={!value.trim() 
              ? 'Írj be egy promptot először' 
              : 'AI prompt fejlesztés'
            } 
            side="top"
          >
            <button
              onClick={onEnhance}
              disabled={!value.trim() || enhancing || disabled}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: 4,
                padding: '4px 9px', 
                borderRadius: T.radius.sm, 
                fontSize: 10, 
                fontWeight: 700,
                cursor: (!value.trim() || enhancing || disabled) 
                  ? 'not-allowed' 
                  : 'pointer',
                border: 'none', 
                transition: 'all 0.15s',
                background: enhancing ? `${color}12` : `${color}18`,
                color,
                outline: `1px solid ${color}35`,
                opacity: (!value.trim() || disabled) ? 0.35 : 1,
              }}
            >
              {enhancing ? (
                <>
                  <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />
                  {' '}Enhance…
                </>
              ) : (
                <>
                  <Wand2 style={{ width: 10, height: 10 }} />
                  {' '}Enhance
                </>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}