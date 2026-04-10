import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2 } from 'lucide-react';

const NOTIF_COLORS = {
  like: "#f472b6",
  comment: "#a78bfa",
  reply: "#34d399",
  mention: "#38bdf8",
  system: "#fbbf24",
};

const formatNotifTime = (ts) => {
  if (!ts?.toDate) return "Most";
  const diff = Date.now() - ts.toDate();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Most";
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ó`;
  return `${Math.floor(h / 24)}n`;
};

export default function NotifDropdown({ 
  notifications, 
  onMarkRead, 
  onDeleteOne, 
  onDeleteAll,
  onClose 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 top-full mt-4 w-[320px] md:w-[380px] glass-panel rounded-[2rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[100] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="text-sm font-black text-white uppercase tracking-wider">Értesítések</span>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={onDeleteAll}
            className="text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors"
          >
            Összes törlése
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
             <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-6 h-6 text-gray-700" />
             </div>
             <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Nincs új értesítés</p>
             <p className="text-xs text-gray-700 font-medium">Amint történik valami izgalmas, itt fogod látni!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((n) => (
              <div 
                key={n.id}
                onClick={() => onMarkRead(n.id)}
                className={`flex items-start gap-4 px-6 py-5 transition-colors cursor-pointer group/item relative ${!n.read ? 'bg-primary/5' : 'hover:bg-white/[0.03]'}`}
              >
                {!n.read && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                )}
                
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${NOTIF_COLORS[n.type] || '#a78bfa'}15`, border: `1px solid ${NOTIF_COLORS[n.type] || '#a78bfa'}20` }}
                >
                  <Bell className="w-4 h-4" style={{ color: NOTIF_COLORS[n.type] }} />
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <p className={`text-sm leading-snug mb-1 ${!n.read ? 'text-white font-bold' : 'text-gray-400 font-medium'}`}>
                    {n.text}
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                    {formatNotifTime(n.createdAt)}
                  </span>
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all scale-90 group-hover/item:scale-100">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteOne(n.id); }}
                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
         <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
            <button 
              onClick={onClose}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-white transition-colors"
            >
               Bezárás
            </button>
         </div>
      )}
    </motion.div>
  );
}
