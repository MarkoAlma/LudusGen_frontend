import React from 'react';
import { ArrowLeft, Clock, Eye, MessageSquare, Pin, Flame, User, Share2, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PostHeader({ post, onBack, color, onShare, onBookmark, bookmarked, liked, likeCount, onLike }) {
  return (
    <div className="mb-10">
      {/* Navigation */}
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-primary transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> Vissza a fórumhoz
      </button>

      {/* Hero Metadata */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border"
            style={{ backgroundColor: `${color}10`, color, borderColor: `${color}30` }}>
            {post.category}
          </span>
          {post.pinned && (
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl flex items-center gap-1.5">
               <Pin className="w-3 h-3" /> Kitűzve
            </span>
          )}
          {post.hot && (
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl flex items-center gap-1.5">
               <Flame className="w-3 h-3" /> Trending
            </span>
          )}
          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest ml-auto flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> {post.time}
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter leading-[0.9] max-w-4xl">
          {post.title}
        </h1>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-black text-xl">
                {post.author ? post.author[0].toUpperCase() : 'U'}
             </div>
             <div>
                <p className="text-white font-black text-base italic tracking-tight">{post.author}</p>
                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                   <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views} megtekintés</span>
                   <span>·</span>
                   <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comments} válasz</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
               onClick={onLike}
               className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest ${liked ? 'bg-pink-500/10 border-pink-500/30 text-pink-500' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
             >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} /> {likeCount}
             </button>
             <button 
               onClick={onBookmark}
               className={`p-3 rounded-2xl border transition-all ${bookmarked ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
             >
                <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
             </button>
             <button 
               onClick={onShare}
               className="p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
             >
                <Share2 className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Heart = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);
