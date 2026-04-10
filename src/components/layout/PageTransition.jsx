import React from 'react';
import { motion } from 'framer-motion';

export default function PageTransition({ children }) {
  // Respect prefers-reduced-motion using a media query roughly, but we'll let framer motion handle it globally, or we can just keep it subtle.
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="w-full flex-1 flex flex-col min-h-full basis-full"
    >
      {children}
    </motion.div>
  );
}
