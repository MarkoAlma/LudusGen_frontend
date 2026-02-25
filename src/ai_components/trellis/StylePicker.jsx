import React from 'react';
import { Sparkles } from 'lucide-react';
import { STYLE_OPTIONS } from './Styleutils';
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
 * Pill komponens - kis badge megjelenítéshez
 */
function Pill({ children, color, active }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: '2px 7px',
      borderRadius: 999,
      fontSize: 9,
      fontWeight: 700,
      background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
      color: active ? color : '#4b5563',
      border: `1px solid ${active ? color + '30' : 'rgba(255,255,255,0.08)'}`,
      letterSpacing: '0.01em',
    }}>
      {children}
    </span>
  );
}

/**
 * SectionLabel komponens - szekció címsor ikonnal
 */
function SectionLabel({ icon, children, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    }}>
      <div style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        background: `${color}12`,
        border: `1px solid ${color}25`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {React.cloneElement(icon, { 
          style: { width: 10, height: 10, color } 
        })}
      </div>
      <span style={{
        color: '#9ca3af',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {children}
      </span>
    </div>
  );
}

/**
 * StylePicker komponens - Trellis stílus kiválasztó
 * @param {string} selected - A kiválasztott stílus ID-ja
 * @param {Function} onSelect - Callback amikor új stílust választanak (styleId) => void
 * @param {string} color - Accent szín (pl. '#a78bfa')
 * @param {boolean} disabled - Le van-e tiltva a picker
 */
export default function StylePicker({ selected, onSelect, color, disabled }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <SectionLabel icon={<Sparkles />} color={color}>
        Stílus
        {selected !== 'nostyle' && (
          <Pill color={color} active>
            {STYLE_OPTIONS.find(s => s.id === selected)?.emoji}{' '}
            {STYLE_OPTIONS.find(s => s.id === selected)?.label}
          </Pill>
        )}
      </SectionLabel>
      
      {/* Stílus grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 4 
      }}>
        {STYLE_OPTIONS.map(style => {
          const isActive = selected === style.id;
          return (
            <Tooltip key={style.id} text={style.tip} side="top">
              <button
                onClick={() => !disabled && onSelect(style.id)}
                disabled={disabled}
                style={{
                  padding: '7px 4px', 
                  borderRadius: T.radius.md,
                  fontSize: 9, 
                  fontWeight: 700,
                  border: 'none', 
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  background: isActive ? `${color}1e` : 'rgba(255,255,255,0.025)',
                  color: isActive ? color : '#4b5563',
                  outline: isActive 
                    ? `1px solid ${color}50` 
                    : '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.15s',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: 3,
                  opacity: disabled ? 0.4 : 1,
                  boxShadow: isActive 
                    ? `inset 0 1px 0 ${color}20, 0 0 12px ${color}15` 
                    : 'none',
                }}
              >
                <span style={{ 
                  fontSize: 15, 
                  lineHeight: 1, 
                  filter: disabled ? 'grayscale(1)' : 'none' 
                }}>
                  {style.emoji}
                </span>
                <span style={{ 
                  fontSize: 9, 
                  lineHeight: 1.2, 
                  textAlign: 'center', 
                  letterSpacing: '0.01em' 
                }}>
                  {style.label}
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      
      {/* Prefix előnézet */}
      {selected !== 'nostyle' && (
        <div style={{
          marginTop: 6, 
          padding: '5px 9px', 
          borderRadius: T.radius.sm,
          background: 'rgba(255,255,255,0.025)', 
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', 
          alignItems: 'center', 
          gap: 5, 
          overflow: 'hidden',
        }}>
          <span style={{ 
            color: '#2d3748', 
            fontSize: 9, 
            flexShrink: 0, 
            fontFamily: "'SF Mono', monospace" 
          }}>
            prefix:
          </span>
          <span style={{
            color: `${color}cc`, 
            fontSize: 9, 
            fontWeight: 600, 
            fontFamily: "'SF Mono', monospace",
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
          }}>
            {STYLE_OPTIONS.find(s => s.id === selected)?.prefix}
          </span>
        </div>
      )}
    </div>
  );
}