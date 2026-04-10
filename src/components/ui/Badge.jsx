import React from 'react';
import { tokens } from '../../styles/tokens';

export default function Badge({ children, variant = 'default', size = 'sm', className = '', ...props }) {
  let bg = tokens.color.bg.surface3;
  let color = tokens.color.text.primary;
  
  if (variant === 'purple') {
    bg = tokens.color.accent.purpleGlow;
    color = tokens.color.accent.purple;
  } else if (variant === 'blue') {
    bg = tokens.color.accent.blueGlow;
    color = tokens.color.accent.blue;
  } else if (variant === 'success') {
    bg = 'rgba(16, 185, 129, 0.15)';
    color = tokens.color.status.success;
  } else if (variant === 'warning') {
    bg = 'rgba(245, 158, 11, 0.15)';
    color = tokens.color.status.warning;
  } else if (variant === 'error') {
    bg = 'rgba(239, 68, 68, 0.15)';
    color = tokens.color.status.error;
  }

  const heights = { sm: '24px', md: '28px' };
  const paddings = { sm: `0 ${tokens.spacing[2]}`, md: `0 ${tokens.spacing[3]}` };
  const fontSizes = { sm: tokens.font.size.xs, md: tokens.font.size.sm };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: heights[size],
        padding: paddings[size],
        borderRadius: tokens.radius.full,
        backgroundColor: bg,
        color: color,
        fontSize: fontSizes[size],
        fontWeight: tokens.font.weight.medium,
        fontFamily: tokens.font.family,
        whiteSpace: 'nowrap'
      }}
      {...props}
    >
      {children}
    </span>
  );
}
