import React from 'react';

export default function BackgroundFilters() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        <filter id="liquid-wave-filter">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.015 0.02" 
            numOctaves="2" 
            result="noise"
          >
            <animate 
              attributeName="baseFrequency" 
              values="0.015 0.02; 0.02 0.025; 0.015 0.02" 
              dur="20s" 
              repeatCount="indefinite" 
            />
          </feTurbulence>
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="noise" 
            scale="40" 
            xChannelSelector="R" 
            yChannelSelector="G" 
          />
        </filter>
      </defs>
    </svg>
  );
}
