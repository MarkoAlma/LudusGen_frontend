import React, { useState, useEffect } from 'react';
import { Box, Loader2 } from 'lucide-react';
import { getCachedThumbnail } from './Glbthumbnail';

const T = {
  radius: { sm: 6, md: 10 },
};

/**
 * Formázza a Firestore timestamp-et olvasható dátummá
 */
function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'most';
  if (minutes < 60) return `${minutes}p`;
  if (hours < 24) return `${hours}ó`;
  if (days < 7) return `${days}n`;

  return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

/**
 * HistoryCard komponens
 * @param {Object} item - A history item objektum (prompt, model_url, createdAt, stb.)
 * @param {boolean} isActive - Aktív-e ez a card
 * @param {Function} onSelect - Callback amikor kiválasztják a card-ot
 * @param {Function} onReuse - Callback amikor újra használják a promptot
 * @param {Function} onDownload - Callback amikor letöltik a modellt
 * @param {Function} onDelete - Callback amikor törlik a modellt
 * @param {string} color - Accent szín (pl. '#a78bfa')
 */
export default function HistoryCard({ 
  item, 
  isActive, 
  onSelect, 
  onReuse, 
  onDownload, 
  onDelete, 
  color 
}) {
  const [thumbnail, setThumbnail] = useState(null);
  const [loadingThumb, setLoadingThumb] = useState(false);

  // Thumbnail betöltés amikor a card mount-ol vagy model_url változik
  useEffect(() => {
    if (!item.model_url) return;

    setLoadingThumb(true);
    getCachedThumbnail(item.model_url, {
      width: 68,
      height: 68,
      bgColor: '#0a0a14',
    })
      .then(thumb => {
        if (thumb) setThumbnail(thumb);
      })
      .catch(err => console.warn('Thumbnail hiba:', err))
      .finally(() => setLoadingThumb(false));
  }, [item.model_url]);

  return (
    <button 
      onClick={() => onSelect(item)} 
      style={{
        width: '100%', 
        borderRadius: T.radius.md, 
        padding: '9px 10px',
        border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.06)'}`,
        background: isActive ? `${color}0e` : 'rgba(255,255,255,0.015)',
        cursor: 'pointer', 
        textAlign: 'left', 
        transition: 'all 0.15s',
        boxShadow: isActive 
          ? `0 0 0 1px ${color}20, inset 0 1px 0 rgba(255,255,255,0.04)` 
          : 'none',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        {/* Thumbnail/Icon terület */}
        <div style={{
          width: 34, 
          height: 34, 
          borderRadius: T.radius.sm, 
          flexShrink: 0,
          background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isActive ? color + '30' : 'rgba(255,255,255,0.07)'}`,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          transition: 'all 0.15s',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Loading spinner */}
          {loadingThumb && (
            <Loader2 
              style={{ width: 12, height: 12, color: '#4b5563' }} 
              className="animate-spin" 
            />
          )}
          
          {/* Thumbnail kép */}
          {!loadingThumb && thumbnail && (
            <img
              src={thumbnail}
              alt="Model preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                imageRendering: 'crisp-edges',
              }}
            />
          )}
          
          {/* Fallback ikon ha nincs thumbnail */}
          {!loadingThumb && !thumbnail && (
            <Box 
              style={{ 
                width: 14, 
                height: 14, 
                color: isActive ? color : '#4b5563' 
              }} 
            />
          )}
        </div>

        {/* Szöveg tartalom */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Prompt */}
          <p style={{
            color: isActive ? '#e5e7eb' : '#6b7280',
            fontSize: 10, 
            fontWeight: 600, 
            margin: '0 0 2px',
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}>
            {item.prompt || 'Trellis generálás'}
          </p>
          
          {/* Dátum */}
          <p style={{ 
            color: '#2d3748', 
            fontSize: 9, 
            margin: '0 0 5px', 
            fontFamily: "'SF Mono', monospace" 
          }}>
            {fmtDate(item.createdAt)}
          </p>
          
          {/* Akció gombok */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4, 
            flexWrap: 'wrap' 
          }}>
            {/* Mentve badge */}
            <span style={{
              fontSize: 9, 
              fontWeight: 700, 
              padding: '1px 6px', 
              borderRadius: 4,
              background: 'rgba(74,222,128,0.08)', 
              color: '#4ade8080',
              border: '1px solid rgba(74,222,128,0.15)',
            }}>
              ☁ Mentve
            </span>
            
            {/* Újra gomb */}
            <button
              onClick={e => { 
                e.stopPropagation(); 
                onReuse(item.prompt); 
              }}
              style={{
                fontSize: 9, 
                padding: '1px 6px', 
                borderRadius: 4,
                background: `${color}12`, 
                color: `${color}cc`, 
                border: `1px solid ${color}25`,
                cursor: 'pointer', 
                transition: 'all 0.12s',
              }}
            >
              ↩ Újra
            </button>
            
            {/* Letöltés gomb (csak ha van model_url) */}
            {item.model_url && (
              <button
                onClick={e => { 
                  e.stopPropagation(); 
                  onDownload(item); 
                }}
                style={{
                  fontSize: 9, 
                  padding: '1px 6px', 
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)', 
                  color: '#4b5563',
                  border: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer', 
                  transition: 'all 0.12s',
                }}
              >
                ↓ GLB
              </button>
            )}
            
            {/* Törlés gomb */}
            <button
              onClick={e => { 
                e.stopPropagation(); 
                onDelete(item); 
              }}
              style={{
                fontSize: 9, 
                padding: '1px 6px', 
                borderRadius: 4,
                background: 'rgba(239,68,68,0.08)', 
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.15)',
                cursor: 'pointer', 
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                e.currentTarget.style.color = '#f87171';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                e.currentTarget.style.color = '#ef4444';
              }}
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </button>
  );
}