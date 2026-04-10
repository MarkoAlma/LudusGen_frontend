import React from 'react';
import { tokens } from '../../styles/tokens';

export default function Panel({ header, children, className = '' }) {
  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: tokens.color.bg.surface1,
        borderRight: `1px solid ${tokens.color.border.subtle}`,
        fontFamily: tokens.font.family,
      }}
    >
      {header && (
        <div style={{ padding: tokens.spacing[4], borderBottom: `1px solid ${tokens.color.border.subtle}` }}>
          {header}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: tokens.spacing[4] }}>
        {children}
      </div>
    </div>
  );
}
