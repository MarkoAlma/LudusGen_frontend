import React from 'react';
import Button from '../ui/Button';
import { tokens } from '../../styles/tokens';
import Divider from '../ui/Divider';

export default function OAuthButtons({ onGoogleSignIn, disabled }) {
  return (
    <>
      <Divider label="or continue with" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
        <Button 
          variant="subtle" 
          size="lg" 
          onClick={onGoogleSignIn} 
          disabled={disabled}
          style={{ width: '100%', borderColor: tokens.color.border.default }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
          <span>Google</span>
        </Button>
      </div>
    </>
  );
}
