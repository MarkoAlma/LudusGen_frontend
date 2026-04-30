import React from 'react';
import { motion } from 'framer-motion';
import { Link as LinkIcon, List, Zap, MessageSquare, Heart, TrendingUp } from 'lucide-react';

export default function PostSidebar({ post, color, relatedPosts = [] }) {
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    // Could add a toast here
  };

  return (
    <div className="space-y-8">
      {/* Action Card */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.01]">
         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4 flex items-center gap-2">
            <LinkIcon className="w-3.5 h-3.5" /> Link Megosztása
         </h4>
         <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl">
            <span className="text-[10px] font-mono text-gray-500 truncate flex-1">{window.location.href}</span>
            <button 
              onClick={copyLink}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              Másol
            </button>
         </div>
      </div>

      {/* Helpful Widget */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5">
         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4">Hasznosnak találtad?</h4>
         <div className="flex gap-2">
            <button className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-gray-400 hover:text-white hover:bg-white/10 transition-all">Igen 👍</button>
            <button className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-gray-400 hover:text-white hover:bg-white/10 transition-all">Nem 👎</button>
         </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="space-y-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 px-2 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Hasonló Témák
           </h4>
           <div className="space-y-3">
              {relatedPosts.map((rp, i) => (
                <div 
                  key={i} 
                  className="p-4 rounded-2xl bg-white/[0.02] border border-transparent hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer group"
                >
                   <p className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors mb-2 line-clamp-2">
                     {rp.title}
                   </p>
                   <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-gray-700">
                      <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5" /> {rp.likes}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" /> {rp.comments}</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
      
      {/* Decorative */}
      <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/10 text-center">
         <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">LudusGen Plus</p>
         <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Upgrade your experience.</p>
      </div>
    </div>
  );
}
