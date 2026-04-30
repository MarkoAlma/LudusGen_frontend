import React from 'react';
import { tokens } from '../../styles/tokens';

export default function Divider({ label, className = '', ...props }) {
  if (label) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', width: '100%', margin: `${tokens.spacing[4]} 0` }} {...props}>
        <div style={{ flex: 1, height: '1px', backgroundColor: tokens.color.border.subtle }}></div>
        <span style={{ padding: `0 ${tokens.spacing[3]}`, color: tokens.color.text.tertiary, fontSize: tokens.font.size.sm, fontFamily: tokens.font.family }}>{label}</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: tokens.color.border.subtle }}></div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        width: '100%',
        height: '1px',
        backgroundColor: tokens.color.border.subtle,
        margin: `${tokens.spacing[4]} 0`
      }}
      {...props}
    />
  );
}
