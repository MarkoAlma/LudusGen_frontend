import React from 'react';
import { motion } from 'framer-motion';

export default function Spinner({ size = 'md', color = 'currentColor' }) {
  const sizeMap = { sm: 16, md: 24, lg: 32 };
  const d = sizeMap[size];

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      style={{
        width: d,
        height: d,
        border: `2px solid ${color}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        display: 'inline-block',
        boxSizing: 'border-box'
      }}
    />
  );
}
