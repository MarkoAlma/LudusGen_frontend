import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PostCard from './PostCard';
import { MessageSquare, RefreshCw, Layers } from 'lucide-react';

export default function PostList({ 
  posts, loading, onPostClick, viewedIds, bookmarkedIds, onBookmark,
  onEdit, onDelete, onStatusToggle, isAdmin, currentUser
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-primary" />
        </motion.div>
        <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Loading topics...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-32 text-center"
      >
        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
           <MessageSquare className="w-8 h-8 text-gray-700" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">No results</h3>
        <p className="text-gray-500 max-w-xs mx-auto font-medium">It looks like there are no active discussions in this category yet.</p>
        <button className="mt-8 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
           View all
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
           <Layers className="w-3.5 h-3.5" /> Recent Topics
        </h3>
        <div className="flex gap-4">
           <button className="text-[10px] font-black uppercase text-primary border-b-2 border-primary pb-1">Latest</button>
           <button className="text-[10px] font-black uppercase text-gray-700 hover:text-white transition-colors pb-1">Popular</button>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <PostCard 
              post={post}
              onClick={() => onPostClick(post)}
              isRead={viewedIds.has(post.id)}
              bookmarked={bookmarkedIds.has(post.id)}
              onBookmark={onBookmark}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusToggle={onStatusToggle}
              isOwner={currentUser && post.authorId === currentUser.uid}
              isAdmin={isAdmin}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      
      <div className="py-12 flex justify-center">
         <button className="px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">
           Load more topics
         </button>
      </div>
    </div>
  );
}
