import React from 'react';
import { motion } from 'framer-motion';
import { tokens } from '../../styles/tokens';

export default function Card({ 
  children, 
  variant = 'default', 
  className = '', 
  style = {},
  ...props 
}) {
  const isElevated = variant === 'elevated';
  const isInteractive = variant === 'interactive';

  let bg = tokens.color.bg.surface1;
  let border = `1px solid ${tokens.color.border.subtle}`;
  let shadow = 'none';

  if (isElevated || isInteractive) {
    bg = tokens.color.bg.surface2;
    border = `1px solid ${tokens.color.border.default}`;
    shadow = tokens.shadow.md;
  }

  const baseStyle = {
    background: bg,
    border: border,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing[6],
    boxShadow: shadow,
    color: tokens.color.text.primary,
    fontFamily: tokens.font.family,
    transition: tokens.transition.normal,
    ...style
  };

  if (isInteractive) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className={className}
        style={{ ...baseStyle, cursor: 'pointer' }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={className} style={baseStyle} {...props}>
      {children}
    </div>
  );
}
