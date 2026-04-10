import React from 'react';
import { tokens } from '../../styles/tokens';

export default function PasswordStrength({ password }) {
  if (!password) return null;

  const getStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/\p{Lu}/u.test(pw)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;
    if (pw.length > 12) score++;
    return score; // max 4
  };

  const score = getStrength(password);
  
  const segments = [1, 2, 3, 4];
  
  let label = 'Weak';
  let color = tokens.color.status.error;
  
  if (score === 2) { label = 'Fair'; color = tokens.color.status.warning; }
  else if (score >= 3) { label = 'Strong'; color = tokens.color.status.success; }

  return (
    <div style={{ marginTop: tokens.spacing[2] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tokens.spacing[1] }}>
        <span style={{ fontSize: tokens.font.size.xs, color: tokens.color.text.tertiary, fontFamily: tokens.font.family }}>Password strength</span>
        <span style={{ fontSize: tokens.font.size.xs, color: color, fontFamily: tokens.font.family, fontWeight: tokens.font.weight.medium }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: tokens.spacing[1] }}>
        {segments.map((segment) => (
          <div 
            key={segment} 
            style={{ 
              height: '4px', 
              flex: 1, 
              borderRadius: tokens.radius.full, 
              backgroundColor: segment <= score ? color : tokens.color.bg.surface3,
              transition: tokens.transition.fast
            }} 
          />
        ))}
      </div>
    </div>
  );
}
