import React, { useState, useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForumLogic } from '../hooks/useForumLogic';
import ForumHeader from '../components/forum/ForumHeader';
import ForumSidebar from '../components/forum/ForumSidebar';
import PostList from '../components/forum/PostList';
import ForumModals from '../components/forum/ForumModals';
import { MyUserContext } from '../context/MyUserProvider';
import { auth } from '../firebase/firebaseApp';

import forum_bg from '../assets/backgrounds/forum_bg.png';

// ─── Segéd UI ─────────────────────────────────────────────────────
const GlassCard = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{
    background: "rgba(12,12,30,0.75)",
    backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1.25rem",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
    ...style,
  }}>{children}</div>
);

const TagPill = ({ label, color, active, onClick, count }) => (
  <button onClick={onClick} className="cursor-pointer transition-all active:scale-95 flex-shrink-0"
    style={{
      background: active ? `${color}25` : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? color + "55" : "rgba(255,255,255,0.08)"}`,
      borderRadius: "2rem", padding: "0.25rem 0.625rem",
      color: active ? color : "#6b7280", fontSize: "0.7rem", fontWeight: active ? 700 : 500,
    }}>
    #{label}{count ? <span className="ml-1 opacity-60">{count}</span> : null}
  </button>
);

const AnnouncementBanner = () => {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const announcements = [
    { id: 1, text: "🚀 Új funkció: AI Fórum LIVE chat — hamarosan!", color: "#a78bfa" },
    { id: 2, text: "📢 Pályázat: Legjobb AI prompt — 50.000 Ft díj!", color: "#fbbf24" },
    { id: 3, text: "🧪 Beta tesztelők kerestetnek a 3D AI szekcióhoz", color: "#38bdf8" },
  ];
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % announcements.length), 4000);
    return () => clearInterval(t);
  }, [announcements.length]);
  if (!visible) return null;
  const ann = announcements[idx];
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl mb-6 transition-all duration-500"
      style={{ background: `${ann.color}12`, border: `1px solid ${ann.color}30` }}>
      <div className="flex items-center gap-2">
        <Megaphone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ann.color }} />
        <span className="text-white text-xs font-medium">{ann.text}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1">
          {announcements.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className="cursor-pointer w-1 h-1 rounded-full transition-all"
              style={{ background: i === idx ? ann.color : "rgba(255,255,255,0.2)", transform: i === idx ? "scale(1.5)" : "scale(1)" }} />
          ))}
        </div>
        <button onClick={() => setVisible(false)} className="cursor-pointer text-gray-600 hover:text-gray-400 p-0.5">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const CATEGORIES = [
  { id: "all", label: "Összes", emoji: "🌐", color: "#a78bfa", threads: 5241, online: 203 },
  { id: "chat", label: "Chat AI", emoji: "💬", color: "#a78bfa", description: "GPT, Claude, Gemini és egyéb chat modellek" },
  { id: "code", label: "Code AI", emoji: "🧠", color: "#34d399", description: "GitHub Copilot, Cursor, kód generálás" },
  { id: "image", label: "Kép AI", emoji: "🖼️", color: "#f472b6", description: "Midjourney, Stable Diffusion promptok" },
  { id: "audio", label: "Hang AI", emoji: "🎵", color: "#fb923c", description: "Suno, Udio, ElevenLabs" },
  { id: "threed", label: "3D AI", emoji: "🧊", color: "#38bdf8", description: "Meshy, Tripo3D, szövegből 3D" },
];

const LEADERBOARD = [
  { name: "prompt_guru", points: 4821, badge: "🥇", color: "#fbbf24", posts: 234 },
  { name: "pixel_witch", points: 3214, badge: "🥈", color: "#94a3b8", posts: 189 },
  { name: "devmaster_hu", points: 2987, badge: "🥉", color: "#b45309", posts: 156 },
];

const ADMIN_UIDS = [
  "T7fU9Zp3N5M9wz2G8xQ4L1rV6bY2", 
  "olive_placeholder_uid" // Added for moderation parity
];

export default function Forum() {
  const navigate = useNavigate();
  const { user } = React.useContext(MyUserContext);
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  const {
    posts, loading, searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    bookmarkedIds, setBookmarkedIds,
    viewedIds, setViewedIds,
    isNewPostModalOpen, setIsNewPostModalOpen,
    editingPost, setEditingPost,
    notifications, markNotificationRead, clearAllNotifications, deleteNotification,
    handleCreatePost,
    handleDeletePost,
    toggleStatus
  } = useForumLogic(user);

  const handlePostClick = (post) => {
    // Increment views via status toggle
    toggleStatus(post.id, "views", (post.views || 0) + 1);
    navigate(`/forum/${post.category}/${post.slug || post.id}`);
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setIsNewPostModalOpen(true);
  };
  
  const handleDelete = async (id) => {
    if (window.confirm("Biztosan törlöd ezt a témát?")) {
      await handleDeletePost(id);
    }
  };

  const toggleBookmark = (postId) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#03000a] text-white pb-20 px-4 md:px-6 lg:px-8 relative overflow-hidden">
      {/* Cinematic Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <img 
          src={forum_bg} 
          className="absolute inset-0 w-full h-full object-cover opacity-[0.05] scale-110" 
          alt="" 
        />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .prose-ludus h1, .prose-ludus h2, .prose-ludus h3 { font-style: italic; letter-spacing: -0.05em; }
        .prose-ludus p { line-height: 1.8; color: #94a3b8; }
        .glass-panel { background: rgba(12, 12, 35, 0.4); backdrop-filter: blur(24px); }
      `}</style>

      <div className="max-w-7xl mx-auto relative z-10 pt-8">
        <AnnouncementBanner />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10">
          {/* Main Content: Feed */}
          <div className="md:col-span-8 lg:col-span-8 order-2 md:order-1">
            <ForumHeader 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              onNewPost={() => setIsNewPostModalOpen(true)}
              notifications={notifications}
              onMarkRead={markNotificationRead}
              onDeleteOne={deleteNotification}
              onDeleteAll={clearAllNotifications}
            />
            
            <PostList 
              posts={posts}
              loading={loading}
              onPostClick={handlePostClick}
              viewedIds={viewedIds}
              bookmarkedIds={bookmarkedIds}
              onBookmark={toggleBookmark}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusToggle={toggleStatus}
              isAdmin={isAdmin}
              currentUser={user}
            />
          </div>

          {/* Sidebar Column */}
          <div className="md:col-span-4 lg:col-span-4 order-1 md:order-2">
             <ForumSidebar 
               selectedCategory={selectedCategory}
               setSelectedCategory={setSelectedCategory}
             />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ForumModals 
        isOpen={isNewPostModalOpen}
        onClose={() => setIsNewPostModalOpen(false)}
        onSubmit={handleCreatePost}
        editPost={editingPost}
        defaultCategory={selectedCategory !== "all" ? selectedCategory : "chat"}
      />
    </div>
  );
}