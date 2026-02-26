import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const T = {
  radius: { sm: 6, md: 10 },
};

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Törlés',
  confirmColor = '#ef4444',
  isDeleting = false,
}) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      
      <div
        style={{
          width: 420,
          maxWidth: '90vw',
          background: 'rgba(18, 18, 28, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: T.radius.md,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          animation: 'slideUp 0.3s ease-out',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle style={{ width: 16, height: 16, color: '#ef4444' }} />
            </div>
            <h3 style={{
              color: '#e5e7eb',
              fontSize: 14,
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!isDeleting) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            }}
          >
            <X style={{ width: 14, height: 14, color: '#9ca3af' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 18px' }}>
          <p style={{
            color: '#9ca3af',
            fontSize: 13,
            lineHeight: 1.6,
            margin: 0,
          }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '14px 18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.01)',
        }}>
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: T.radius.sm,
              fontSize: 12,
              fontWeight: 600,
              color: '#9ca3af',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!isDeleting) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            Mégse
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: T.radius.sm,
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              background: isDeleting 
                ? 'rgba(239, 68, 68, 0.3)' 
                : `linear-gradient(135deg, ${confirmColor} 0%, ${confirmColor}bb 100%)`,
              border: 'none',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
              transition: 'all 0.15s',
              boxShadow: isDeleting ? 'none' : `0 2px 12px ${confirmColor}40`,
            }}
          >
            {isDeleting ? 'Törlés...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}