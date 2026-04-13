import React from 'react';
import TrellisGenerator from '../../components/trellis_studio/TrellisGenerator';

export default function TrellisPanel({ getIdToken, userId, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  return (
    <div className="h-full w-full">
      <TrellisGenerator getIdToken={getIdToken} userId={userId} isGlobalOpen={isGlobalOpen} toggleGlobalSidebar={toggleGlobalSidebar} globalSidebar={globalSidebar} />
    </div>
  );
}