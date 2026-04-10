import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Search, Trash2, Box, ChevronRight, Clock } from 'lucide-react';

export default function TrellisHistory({ 
  history, 
  onSelectItem, 
  activeItemId,
  onDeleteItem,
  onClearHistory
}) {
  return (
    <div className="h-full flex flex-col bg-white/[0.01] border-l border-white/5">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
           <History className="w-4 h-4" /> History
        </h3>
        <button 
          onClick={onClearHistory}
          className="p-2 rounded-xl hover:bg-red-500/10 text-gray-700 hover:text-red-500 transition-all"
        >
           <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {history.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelectItem(item)}
            className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
              activeItemId === item.id 
              ? 'bg-primary/20 border-primary/40' 
              : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
            }`}
          >
             <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                   <Box className={`w-4 h-4 ${activeItemId === item.id ? 'text-primary' : 'text-gray-600 group-hover:text-gray-400'}`} />
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteItem(item); }}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-gray-700 hover:text-red-500 transition-all"
                >
                   <Trash2 className="w-3 h-3" />
                </button>
             </div>
             
             <p className="text-[11px] font-black text-gray-400 group-hover:text-white transition-colors line-clamp-2 mb-2 leading-snug uppercase tracking-tight">
               {item.name || item.prompt}
             </p>
             
             <div className="flex items-center justify-between text-[9px] font-bold text-gray-700 uppercase tracking-widest">
                <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(item.ts || item.createdAt?.toDate()).toLocaleDateString()}</span>
                <ChevronRight className={`w-3 h-3 transition-transform ${activeItemId === item.id ? 'translate-x-0 text-primary' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
             </div>
          </motion.div>
        ))}

        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
             <Box className="w-10 h-10 mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest">No previous models</p>
          </div>
        )}
      </div>
    </div>
  );
}
