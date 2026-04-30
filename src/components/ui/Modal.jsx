import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '../../styles/tokens';

export default function Modal({ isOpen, onClose, children, className = '' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className={className}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.spacing[4],
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: tokens.color.bg.overlay,
              backdropFilter: tokens.blur.glass,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={tokens.transition.normal}
            style={{
              position: 'relative',
              zIndex: 10,
              width: '100%',
              maxWidth: '500px',
              backgroundColor: tokens.color.bg.surface1,
              border: `1px solid ${tokens.color.border.default}`,
              borderRadius: tokens.radius.xl,
              boxShadow: tokens.shadow.md,
              color: tokens.color.text.primary,
              fontFamily: tokens.font.family,
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
