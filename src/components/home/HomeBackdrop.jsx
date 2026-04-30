import React from 'react';

export default function HomeBackdrop({
  image,
  className = 'opacity-40 transform scale-110',
  overlayClassName = 'bg-gradient-to-b from-[#03000a] via-[#03000a]/20 to-[#03000a]',
  topFade = false,
  bottomFade = false,
}) {
  return (
    <div className={`absolute inset-0 z-0 pointer-events-none ${className}`} aria-hidden="true">
      <img src={image} alt="" className="w-full h-full object-cover" />
      <div className={`absolute inset-0 ${overlayClassName}`} />
      {topFade && <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#03000a] to-transparent" />}
      {bottomFade && <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#03000a] to-transparent" />}
    </div>
  );
}
