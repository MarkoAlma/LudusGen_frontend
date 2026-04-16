import React from 'react';
import { T } from './tokens';
import { Tooltip } from '../meshy/ui/Primitives';
import { PersonStanding } from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// RigControl Component
// ────────────────────────────────────────────────────────────────────────────
// Toggle button for showing/hiding the rig skeleton overlay.
// When the model is not rigged (riggedId is null), the button is dimmed and
// shows "not rigged yet" text.

export function RigControl({ active, onToggle, rigged }) {
  return (
    <Tooltip text={rigged ? (active ? 'Hide rig skeleton' : 'Show rig skeleton') : 'Model not rigged yet'} side="bottom">
      <button
        onClick={rigged ? onToggle : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: T.radius.sm,
          fontSize: 10, fontWeight: 700, cursor: rigged ? 'pointer' : 'not-allowed',
          border: 'none', transition: 'all 0.15s',
          background: rigged && active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
          color: rigged && active ? '#22c55e' : rigged ? '#6b7280' : '#2a2a3a',
          outline: rigged && active ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.07)',
          opacity: rigged ? 1 : 0.45,
        }}
      >
        <PersonStanding style={{ width: 12, height: 12 }} />
        <span>Rig</span>
        {!rigged && (
          <span style={{ fontSize: 8, fontWeight: 500, opacity: 0.6, marginLeft: 2 }}>
            not rigged
          </span>
        )}
      </button>
    </Tooltip>
  );
}
