export const tokens = {
  color: {
    bg: {
      base:      '#0A0A0A',
      surface1:  '#111111',
      surface2:  '#161616',
      surface3:  '#1A1A1A',
      overlay:   'rgba(0,0,0,0.6)',
    },
    border: {
      subtle:    'rgba(255,255,255,0.06)',
      default:   'rgba(255,255,255,0.10)',
      strong:    'rgba(255,255,255,0.18)',
    },
    accent: {
      purple:    '#7C3AED',
      purpleGlow:'rgba(124,58,237,0.15)',
      blue:      '#3B82F6',
      blueGlow:  'rgba(59,130,246,0.15)',
    },
    text: {
      primary:   '#F9FAFB',
      secondary: '#9CA3AF',
      tertiary:  '#4B5563',
      disabled:  '#374151',
    },
    status: {
      success:   '#10B981',
      warning:   '#F59E0B',
      error:     '#EF4444',
      info:      '#3B82F6',
    }
  },
  radius: {
    sm:  '6px',
    md:  '10px',
    lg:  '14px',
    xl:  '20px',
    full:'9999px',
  },
  spacing: {
    // strict 8px grid
    1:  '4px',
    2:  '8px',
    3:  '12px',
    4:  '16px',
    5:  '20px',
    6:  '24px',
    8:  '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },
  font: {
    family: "'Inter', 'DM Sans', system-ui, sans-serif",
    size: {
      xs:  '11px',
      sm:  '13px',
      md:  '15px',
      lg:  '18px',
      xl:  '24px',
      '2xl': '32px',
      '3xl': '48px',
      '4xl': '64px',
    },
    weight: {
      regular: 400,
      medium:  500,
      semibold:600,
    },
    lineHeight: {
      tight:  1.2,
      normal: 1.5,
      loose:  1.8,
    }
  },
  shadow: {
    sm:   '0 1px 3px rgba(0,0,0,0.4)',
    md:   '0 4px 16px rgba(0,0,0,0.5)',
    glow: {
      purple: '0 0 24px rgba(124,58,237,0.12)',
      blue:   '0 0 24px rgba(59,130,246,0.12)',
    }
  },
  blur: {
    glass: 'blur(12px)',
    heavy: 'blur(24px)',
  },
  transition: {
    fast:   '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow:   '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  }
}
