import React from 'react';
import { motion } from 'framer-motion';
import Spinner from './Spinner';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false, 
  onClick, 
  className = '',
  type = 'button',
  ...props 
}) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const isSubtle = variant === 'subtle';
  const isDanger = variant === 'danger';

  let baseStyles = "relative inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all overflow-hidden rounded-xl";
  let variantStyles = "";
  
  if (isPrimary) {
    variantStyles = "bg-primary text-white hover:brightness-110 shadow-[0_0_30px_rgba(138,43,226,0.3)] hover:shadow-[0_0_40px_rgba(138,43,226,0.5)] border border-primary/50";
  } else if (isGhost) {
    variantStyles = "bg-transparent text-gray-300 border border-white/5 hover:border-white/20 hover:text-white hover:bg-white/5";
  } else if (isSubtle) {
    variantStyles = "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10";
  } else if (isDanger) {
    variantStyles = "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]";
  }

  const heights = { sm: 'h-10', md: 'h-12', lg: 'h-14' };
  const paddings = { sm: 'px-4', md: 'px-6', lg: 'px-8' };
  const fontSizes = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={(!disabled && !loading) ? { scale: 0.97 } : {}}
      className={`
        ${baseStyles} ${variantStyles} ${heights[size]} ${paddings[size]} ${fontSizes[size]}
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {/* Cinematic Highlight effect for primary buttons */}
      {isPrimary && !disabled && !loading && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-white/20 pointer-events-none" />
      )}
      
      {loading ? <Spinner size={size} color="currentColor" /> : children}
    </motion.button>
  );
}
