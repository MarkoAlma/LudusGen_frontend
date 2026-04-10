import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Eye, Heart, Bookmark, Clock, Pin, Flame, 
  ChevronRight, User, MoreHorizontal, Trash, Edit, 
  Activity, CheckCircle, Lock, Unlock 
} from 'lucide-react';

function MetaItem({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold group/meta hover:text-gray-400 transition-colors cursor-pointer">
      <Icon className="w-3.5 h-3.5" />
      <span>{value}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, active, onClick, activeColor }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
        active 
          ? 'bg-white/10 border-white/20' 
          : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/5'
      }`}
      style={{ color: active ? activeColor : '#4b5563' }}
    >
      <Icon className={`w-4 h-4 ${active ? 'fill-current' : ''}`} />
    </button>
  );
}

export default function PostCard({ 
  post, 
  onClick, 
  isRead, 
  onBookmark, 
  bookmarked,
  onEdit,
  onDelete,
  onStatusToggle,
  isOwner,
  isAdmin
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const categoryColors = {
    chat: "#a78bfa",
    code: "#34d399",
    image: "#f472b6",
    audio: "#fb923c",
    threed: "#38bdf8",
  };

  const color = categoryColors[post.category] || "#7c3aed";

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showMenu]);

  const handleAction = (e, callback) => {
    e.stopPropagation();
    setShowMenu(false);
    callback();
  };

  return (
    <motion.div
      layoutId={`post-card-${post.id}`}
      onClick={onClick}
      className={`group cursor-pointer relative rounded-[2rem] border transition-all duration-700 overflow-visible ${
        isRead 
          ? 'bg-white/[0.01] border-white/5 opacity-40 grayscale hover:grayscale-0 hover:opacity-100' 
          : 'bg-white/[0.03] border-white/8 hover:border-primary/40 hover:bg-white/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      }`}
    >
      {/* Cinematic Border Beam */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Background Glow Overlay */}
      <div 
        className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl pointer-events-none z-0"
        style={{ background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)` }}
      />

      <div className="relative z-10 p-8 md:p-10">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Avatar Area - Premium Style */}
          <div className="flex-shrink-0 hidden md:flex flex-col items-center gap-4">
             <div 
               className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 group-hover:rotate-6 shadow-2xl overflow-hidden"
               style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}
             >
                {post.authorAvatar ? (
                  <img src={post.authorAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black italic">{post.authorName?.[0] || "U"}</span>
                )}
             </div>
             <div className="w-px h-full bg-gradient-to-b from-white/10 via-white/5 to-transparent flex-1" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              {post.pinned && (
                <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  <Pin className="w-3 h-3 fill-current" /> Rögzített
                </span>
              )}
              {post.hot && (
                <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                  <Flame className="w-3 h-3 fill-current" /> Trending
                </span>
              )}
              {post.solved && (
                <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                  <CheckCircle className="w-3 h-3" /> Megoldva
                </span>
              )}
              <span 
                className="text-[8px] font-black uppercase tracking-[0.22em] px-3 py-1 rounded-full border"
                style={{ backgroundColor: `${color}15`, color, borderColor: `${color}30` }}
              >
                {post.category}
              </span>
              <div className="ml-auto flex items-center gap-4 text-gray-700 font-bold uppercase tracking-widest text-[9px]">
                 <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {post.readTime || 5} PERC</span>
                 <div className="h-1 w-1 rounded-full bg-white/10" />
                 <span>{post.time || 'Nemrég'}</span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-6">
              <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-primary transition-all duration-500 italic tracking-tighter mb-4 leading-[1.1] flex-1">
                {post.title}
              </h3>
              
              {(isOwner || isAdmin) && (
                <div className="relative flex-shrink-0 pt-1" ref={menuRef}>
                   <button 
                     onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                     className={`p-2.5 rounded-xl border transition-all ${showMenu ? 'bg-primary border-primary text-white shadow-[0_0_20px_rgba(138,43,226,0.4)]' : 'bg-white/5 border-white/5 text-gray-600 hover:text-white hover:bg-white/10'}`}
                   >
                     <MoreHorizontal className="w-5 h-5" />
                   </button>

                   <AnimatePresence>
                      {showMenu && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.9, y: 10 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.9, y: 10 }}
                           className="absolute right-0 top-full mt-3 w-52 glass-panel border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden p-1.5"
                           style={{ background: "rgba(10,10,25,0.98)", backdropFilter: "blur(24px)" }}
                         >
                            <button onClick={(e) => handleAction(e, () => onEdit(post))} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                               <Edit className="w-4 h-4 text-blue-400" /> Szerkesztés
                            </button>
                            {isAdmin && (
                               <>
                                  <button onClick={(e) => handleAction(e, () => onStatusToggle(post.id, 'pinned', !post.pinned))} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                     <Pin className="w-4 h-4 text-yellow-400" /> {post.pinned ? 'Levétel' : 'Kitűzés'}
                                  </button>
                                  <button onClick={(e) => handleAction(e, () => onStatusToggle(post.id, 'hot', !post.hot))} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                     <Flame className="w-4 h-4 text-orange-400" /> Trending
                                  </button>
                                  <button onClick={(e) => handleAction(e, () => onStatusToggle(post.id, 'locked', !post.locked))} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                     <Lock className="w-4 h-4 text-gray-400" /> Lezárás
                                  </button>
                               </>
                            )}
                            <div className="h-px bg-white/5 my-1.5 mx-2" />
                            <button onClick={(e) => handleAction(e, () => onDelete(post.id))} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all">
                               <Trash className="w-4 h-4" /> Törlés
                            </button>
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>
              )}
            </div>
            
            <p className="text-gray-500 text-sm md:text-base line-clamp-2 mb-8 font-medium leading-relaxed group-hover:text-gray-300 transition-colors">
              {post.preview || post.content?.slice(0, 160) + "..."}
            </p>

            <div className="flex items-center justify-between mt-auto border-t border-white/5 pt-6">
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-3 group/author">
                    <div className="w-8 h-8 rounded-lg border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center font-black italic text-[10px] text-gray-400">
                       {post.authorName?.[0] || post.author?.[0] || 'U'}
                    </div>
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] group-hover/author:text-white transition-colors italic">
                      {post.authorName || post.author || "Anonymous"}
                    </span>
                 </div>
                 <div className="hidden sm:flex items-center gap-5">
                    <MetaItem icon={MessageSquare} value={post.comments} />
                    <MetaItem icon={Eye} value={post.views} />
                    <MetaItem icon={Heart} value={post.likes} />
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <ActionBtn 
                   active={bookmarked} 
                   onClick={(e) => { e.stopPropagation(); onBookmark(post.id); }}
                   icon={Bookmark}
                   activeColor="#eab308"
                 />
                 <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500">
                    <ChevronRight className="w-5 h-5 text-gray-800 group-hover:text-primary group-hover:translate-x-1 transition-all duration-500" />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
