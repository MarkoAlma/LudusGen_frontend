import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '../../styles/tokens';

export default function Tooltip({ children, label, delay = 200 }) {
  const [isVisible, setIsVisible] = useState(false);
  let timeout;

  const show = () => {
    timeout = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timeout);
    setIsVisible(false);
  };

  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }} 
      onMouseEnter={show} 
      onMouseLeave={hide}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: tokens.spacing[2],
              padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
              backgroundColor: tokens.color.bg.surface3,
              color: tokens.color.text.primary,
              fontSize: tokens.font.size.xs,
              fontFamily: tokens.font.family,
              borderRadius: tokens.radius.sm,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 50,
              boxShadow: tokens.shadow.sm,
              border: `1px solid ${tokens.color.border.subtle}`
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
