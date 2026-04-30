import React from 'react';
import { tokens } from '../../styles/tokens';

export default function Container({ children, className = '', ...props }) {
  return (
    <div 
      className={className}
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: `0 ${tokens.spacing[6]}`, // using 24px default, responsive max can be handled via media queries when integrating tailwind if needed
      }}
      {...props}
    >
      {children}
    </div>
  );
}
