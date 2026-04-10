import React from 'react';
import { tokens } from '../../styles/tokens';

export default function Avatar({ src, alt, initials, status, size = 'md', className = '', onClick }) {
  const sizeMap = { sm: '32px', md: '40px', lg: '48px', xl: '64px' };
  const d = sizeMap[size];

  return (
    <div 
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: d,
        height: d,
        borderRadius: tokens.radius.full,
        backgroundColor: tokens.color.bg.surface3,
        border: `1px solid ${tokens.color.border.subtle}`,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {src ? (
        <img 
          src={src} 
          alt={alt || "Avatar"} 
          style={{ width: '100%', height: '100%', borderRadius: tokens.radius.full, objectFit: 'cover' }} 
        />
      ) : (
        <span style={{ color: tokens.color.text.secondary, fontSize: tokens.font.size[size], fontWeight: tokens.font.weight.medium, fontFamily: tokens.font.family }}>
          {initials || '?'}
        </span>
      )}
      
      {status && (
        <span 
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '25%',
            height: '25%',
            minWidth: '10px',
            minHeight: '10px',
            backgroundColor: tokens.color.status[status] || tokens.color.bg.surface3,
            border: `2px solid ${tokens.color.bg.base}`,
            borderRadius: tokens.radius.full,
          }}
        />
      )}
    </div>
  );
}
