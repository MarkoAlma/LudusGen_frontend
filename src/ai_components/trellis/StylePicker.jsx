import React, { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { T } from './tokens';
import { STYLE_OPTIONS } from './Constants';

function Tooltip({ text, children, side = 'top' }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', width: '100%' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && text && (
        <div style={{
          position: 'absolute',
          [side === 'top' ? 'bottom' : 'top']: '100%',
          left: '50%', transform: 'translateX(-50%)',
          marginBottom: side === 'top' ? 8 : 0,
          marginTop: side === 'bottom' ? 8 : 0,
          padding: '5px 10px',
          background: '#0a0a14',
          color: '#e2e8f0',
          fontSize: 10, fontWeight: 500, borderRadius: 7,
          whiteSpace: 'nowrap', zIndex: 1000, pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          letterSpacing: '0.01em',
        }}>
          {text}
          <div style={{
            position: 'absolute',
            [side === 'top' ? 'bottom' : 'top']: -4,
            left: '50%', transform: 'translateX(-50%) rotate(45deg)',
            width: 7, height: 7,
            background: '#0a0a14',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRight: 'none', borderBottom: 'none',
          }} />
        </div>
      )}
    </div>
  );
}

function StylePicker({ selected, onSelect, color, disabled }) {
  const activeStyle = useMemo(
    () => STYLE_OPTIONS.find(s => s.id === selected),
    [selected]
  );

  return (
    <div style={{ marginBottom: 12 }}>

      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 9,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Icon badge */}
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            background: `linear-gradient(135deg, ${color}20, ${color}08)`,
            border: `1px solid ${color}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 8px ${color}10`,
          }}>
            <Sparkles style={{ width: 10, height: 10, color }} />
          </div>
          <span style={{
            color: '#9ca3af',
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
          }}>
            Stílus
          </span>
        </div>

        {/* Active style pill */}
        {selected !== 'nostyle' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 99,
            fontSize: 9, fontWeight: 700,
            letterSpacing: '0.03em',
            background: `${color}14`,
            color,
            border: `1px solid ${color}28`,
            boxShadow: `0 0 10px ${color}10`,
          }}>
            {activeStyle?.emoji}
            <span>{activeStyle?.label}</span>
          </span>
        )}
      </div>

      {/* Style grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4,
      }}>
        {STYLE_OPTIONS.map(style => {
          const isActive = selected === style.id;
          return (
            <Tooltip key={style.id} text={style.tip} side="top">
              <button
                onClick={() => !disabled && onSelect(style.id)}
                disabled={disabled}
                style={{
                  padding: '9px 4px 8px',
                  borderRadius: 10,
                  fontSize: 9, fontWeight: 700,
                  width: '100%',
                  border: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  background: isActive
                    ? `linear-gradient(160deg, ${color}20, ${color}0c)`
                    : 'rgba(255,255,255,0.025)',
                  color: isActive ? color : '#4b5563',
                  outline: isActive
                    ? `1px solid ${color}45`
                    : '1px solid rgba(255,255,255,0.055)',
                  transition: 'all 0.16s cubic-bezier(0.4,0,0.2,1)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: disabled ? 0.35 : 1,
                  boxShadow: isActive
                    ? `inset 0 1px 0 ${color}18, 0 4px 12px ${color}12`
                    : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!disabled && !isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.outline = '1px solid rgba(255,255,255,0.1)';
                  }
                }}
                onMouseLeave={e => {
                  if (!disabled && !isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                    e.currentTarget.style.color = '#4b5563';
                    e.currentTarget.style.outline = '1px solid rgba(255,255,255,0.055)';
                  }
                }}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 4, height: 4, borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                  }} />
                )}

                <span style={{
                  fontSize: 16, lineHeight: 1,
                  filter: disabled ? 'grayscale(1) opacity(0.4)' : 'none',
                  transition: 'transform 0.15s',
                }}>
                  {style.emoji}
                </span>
                <span style={{
                  fontSize: 9, lineHeight: 1.3,
                  textAlign: 'center',
                  letterSpacing: '0.02em',
                  fontWeight: isActive ? 800 : 600,
                }}>
                  {style.label}
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Active style prefix tag */}
      {selected !== 'nostyle' && activeStyle?.prefix && (
        <div style={{
          marginTop: 8,
          padding: '7px 11px',
          borderRadius: 9,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.055)',
          display: 'flex', alignItems: 'flex-start', gap: 7,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: 8, fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: "'SF Mono', monospace",
            flexShrink: 0,
            paddingTop: 1,
          }}>
            prefix
          </span>
          {/* Divider */}
          <div style={{
            width: 1, height: '100%', minHeight: 12,
            background: 'rgba(255,255,255,0.07)',
            flexShrink: 0,
          }} />
          <span style={{
            color: `${color}b0`,
            fontSize: 9, fontWeight: 600,
            fontFamily: "'SF Mono', monospace",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}>
            {activeStyle.prefix}
          </span>
        </div>
      )}
    </div>
  );
}

export default React.memo(StylePicker);