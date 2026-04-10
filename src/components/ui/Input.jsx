import React, { useState } from 'react';

export default function Input({
  label,
  error,
  hint,
  icon: IconLeft,
  suffix: IconRight,
  size = 'md',
  className = '',
  ...props
}) {
  const [focused, setFocused] = useState(false);

  const heights = { sm: 'h-10', md: 'h-12', lg: 'h-14' };
  const fontSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && (
        <label className="text-xs font-black uppercase tracking-widest text-gray-400 pl-1">
          {label}
        </label>
      )}
      
      <div className="relative flex items-center group">
        {IconLeft && (
          <div className={`absolute left-4 transition-colors ${focused ? 'text-primary' : 'text-gray-500 group-hover:text-gray-400'}`}>
            <IconLeft size={18} />
          </div>
        )}
        
        <input
          {...props}
          onFocus={(e) => {
            setFocused(true);
            if (props.onFocus) props.onFocus(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            if (props.onBlur) props.onBlur(e);
          }}
          className={`
            w-full ${heights[size]} ${fontSizes[size]}
            ${IconLeft ? 'pl-11' : 'pl-4'}
            ${IconRight ? 'pr-11' : 'pr-4'}
            bg-white/5 hover:bg-white/[0.07] focus:bg-white/[0.03]
            border ${error ? 'border-red-500/50' : focused ? 'border-primary/50' : 'border-white/10 group-hover:border-white/20'}
            rounded-xl outline-none text-white transition-all
            shadow-inner placeholder-gray-600
          `}
        />
        
        {IconRight && (
          <div className="absolute right-4 text-gray-500 flex items-center justify-center">
            {typeof IconRight === 'function' ? <IconRight size={18} /> : IconRight}
          </div>
        )}
      </div>

      {(error || hint) && (
        <span className={`text-xs font-bold pl-1 ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
