import React, { useState, useRef, useEffect, useCallback, useContext } from "react";
import { MyUserContext } from "../context/MyUserProvider";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, ChevronRight, ChevronDown,
  ThumbsUp, Eye, Clock, Pin, Flame, Sparkles, Trophy,
  TrendingUp, Plus, Search, Bookmark, MoreHorizontal,
  Hash, Zap, Bot, Send, X, Bell, Settings, LogOut, User,
  Shield, Lock, CheckCircle, RefreshCw, SlidersHorizontal,
  ArrowUp, Rss, Award, Tag, Globe, Heart, Smile,
  BarChart2, PenSquare, HelpCircle, Megaphone, AtSign,
  Trash2, Edit3, Unlock, Home,
} from "lucide-react";
import ForumPost from "./ForumPost";
import { auth, db } from "../firebase/firebaseApp";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  query, orderBy, serverTimestamp, getDoc,
} from "firebase/firestore";

// ─── Admin UIDs ───────────────────────────────────────────────────
const ADMIN_UIDS = [];

// ─── DEBUG MODE ───────────────────────────────────────────────────
const DEBUG = true;
const dbg = (...args) => { if (DEBUG) console.log("[Forum DEBUG]", ...args); };

// ─── Slug generátor ───────────────────────────────────────────────
export function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ö/g, "o").replace(/ő/g, "o")
    .replace(/ú/g, "u").replace(/ü/g, "u").replace(/ű/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ─── Firebase timestamp → olvasható szöveg ────────────────────────
const formatFirebaseTime = (timestamp) => {
  if (!timestamp?.toDate) return "Nemrég";
  const date = timestamp.toDate();
  const diff = Date.now() - date;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Most";
  if (m < 60) return `${m} perce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} órája`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} napja`;
  return `${Math.floor(d / 7)} hete`;
};

// ─── Adatok ───────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "Összes", emoji: "🌐", color: "#a78bfa", threads: 5241, online: 203 },
  {
    id: "chat", label: "Chat AI", emoji: "💬", color: "#a78bfa", threads: 1284, online: 47,
    description: "GPT, Claude, Gemini és egyéb chat modellek", icon: "MessageSquare"
  },
  {
    id: "code", label: "Code AI", emoji: "🧠", color: "#34d399", threads: 893, online: 31,
    description: "GitHub Copilot, Cursor, kód generálás és review"
  },
  {
    id: "image", label: "Kép AI", emoji: "🖼️", color: "#f472b6", threads: 2156, online: 89,
    description: "Midjourney, DALL·E, Stable Diffusion promptok"
  },
  {
    id: "audio", label: "Hang AI", emoji: "🎵", color: "#fb923c", threads: 567, online: 22,
    description: "Suno, Udio, ElevenLabs, hangklónozás"
  },
  {
    id: "threed", label: "3D AI", emoji: "🧊", color: "#38bdf8", threads: 341, online: 14,
    description: "Meshy, Tripo3D, TripoSG, szövegből/képből 3D"
  },
];

const ALL_TAGS = [
  { label: "prompt-engineering", count: 342, color: "#a78bfa" },
  { label: "claude", count: 289, color: "#a78bfa" },
  { label: "midjourney", count: 256, color: "#f472b6" },
  { label: "gpt-4o", count: 234, color: "#34d399" },
  { label: "cursor", count: 198, color: "#34d399" },
  { label: "suno", count: 167, color: "#fb923c" },
  { label: "stable-diffusion", count: 145, color: "#f472b6" },
  { label: "meshy", count: 112, color: "#38bdf8" },
  { label: "összehasonlítás", count: 98, color: "#fbbf24" },
  { label: "tipp", count: 87, color: "#4ade80" },
];

const ANNOUNCEMENTS = [
  { id: 1, text: "🚀 Új funkció: AI Fórum LIVE chat — hamarosan!", color: "#a78bfa" },
  { id: 2, text: "📢 Pályázat: Legjobb AI prompt — 50.000 Ft díj!", color: "#fbbf24" },
  { id: 3, text: "🧪 Beta tesztelők kerestetnek a 3D AI szekcióhoz", color: "#38bdf8" },
];

const LEADERBOARD = [
  { name: "prompt_guru", points: 4821, badge: "🥇", color: "#fbbf24", posts: 234 },
  { name: "pixel_witch", points: 3214, badge: "🥈", color: "#94a3b8", posts: 189 },
  { name: "devmaster_hu", points: 2987, badge: "🥉", color: "#b45309", posts: 156 },
  { name: "3d_builder", points: 1876, badge: "⭐", color: "#a78bfa", posts: 98 },
  { name: "typescript_king", points: 1543, badge: "⭐", color: "#34d399", posts: 87 },
];

const RECENT_ACTIVITY = [
  { user: "pixel_witch", action: "hozzászólt", post: "Midjourney v7 guide", time: "2p", color: "#f472b6" },
  { user: "devmaster_hu", action: "új témát nyitott", post: "Claude API tippek", time: "5p", color: "#7c3aed" },
  { user: "beatmaker99", action: "like-olt", post: "Suno prompting technikák", time: "12p", color: "#ea580c" },
  { user: "typescript_king", action: "hozzászólt", post: "Cursor AI konfig", time: "18p", color: "#34d399" },
  { user: "3d_builder", action: "új témát nyitott", post: "Meshy vs TripoSG 2025", time: "31p", color: "#0284c7" },
];

export const MOCK_POSTS = [
  {
    id: 1, category: "chat", pinned: true, hot: true, locked: false, solved: false,
    title: "Claude vs GPT-4o — melyik a jobb kódoláshoz? [Összehasonlítás 2025]",
    preview: "Elvégeztem 50+ tesztet mindkét modellen. Az eredmények meglepőek: Claude jobban teljesít hosszú fájloknál, de GPT gyorsabb egyszerű snippeteknél...",
    content: `Elvégeztem **50+ tesztet** mindkét modellen, különböző kódolási feladatokon.`,
    author: "devmaster_hu", avatar: "D", avatarColor: "#7c3aed",
    authorId: null,
    time: "2 órája", views: 3241, likes: 187, comments: 64,
    tags: ["claude", "gpt-4o", "összehasonlítás", "kódolás"],
    readTime: 4, poll: null,
  },
  {
    id: 2, category: "image", pinned: false, hot: true, locked: false, solved: false,
    title: "Midjourney v7 vs FLUX — részletes prompt guide kezdőknek",
    preview: "Az új MJ v7 teljesen megváltoztatta a prompt struktúrát. Összeállítottam egy 20 pontos checklist-et...",
    content: `Az új **Midjourney v7** teljesen megváltoztatta a prompt struktúrát.`,
    author: "pixel_witch", avatar: "P", avatarColor: "#db2777",
    authorId: null,
    time: "5 órája", views: 5892, likes: 412, comments: 103,
    tags: ["midjourney", "flux", "prompt", "összehasonlítás"],
    readTime: 6, poll: {
      question: "Melyiket használod inkább?",
      options: [
        { id: "a", label: "Midjourney v7", votes: 234 },
        { id: "b", label: "FLUX", votes: 189 },
        { id: "c", label: "Mindkettőt", votes: 67 },
        { id: "d", label: "Mást", votes: 23 },
      ],
    },
  },
  {
    id: 3, category: "code", pinned: false, hot: false, locked: false, solved: true,
    title: "Cursor AI beállítása React projekthez — teljes konfig + .cursorrules",
    preview: "Megosztom a .cursorrules fájlomat amit 3 hónap alatt finomítottam...",
    content: `Megosztom a **.cursorrules** fájlomat amit 3 hónap alatt finomítottam.`,
    author: "typescript_king", avatar: "T", avatarColor: "#34d399",
    authorId: null,
    time: "1 napja", views: 1876, likes: 234, comments: 47,
    tags: ["cursor", "react", "typescript", "tipp"],
    readTime: 3, poll: null,
  },
  {
    id: 4, category: "audio", pinned: false, hot: false, locked: false, solved: false,
    title: "Suno v4 — prompting technikák amikkel profin szól a zene",
    preview: "A legtöbb ember rosszul használja a Suno-t. A kulcs nem a stílusban van, hanem a struktúra...",
    content: `A legtöbb ember rosszul használja a Suno-t.`,
    author: "beatmaker99", avatar: "B", avatarColor: "#ea580c",
    authorId: null,
    time: "3 napja", views: 987, likes: 89, comments: 31,
    tags: ["suno", "prompt", "zene", "tipp"],
    readTime: 5, poll: null,
  },
  {
    id: 5, category: "threed", pinned: false, hot: true, locked: false, solved: false,
    title: "Meshy vs TripoSG — melyik generál jobb 3D modellt képből? [2025 teszt]",
    preview: "Teszteltem mindkét platformot ugyanazokkal a képekkel...",
    content: `Teszteltem mindkét platformot ugyanazokkal a referencia képekkel.`,
    author: "3d_builder", avatar: "3", avatarColor: "#0284c7",
    authorId: null,
    time: "1 hete", views: 2134, likes: 156, comments: 58,
    tags: ["meshy", "triposg", "3d", "összehasonlítás"],
    readTime: 4, poll: null,
  },
  {
    id: 6, category: "chat", pinned: false, hot: false, locked: true, solved: false,
    title: "Hogyan írjak tökéletes system promptot? Bevált módszerek gyűjteménye",
    preview: "3 éve dolgozom prompt engineeringgel. Megosztom azokat a mintákat amik mindig működnek...",
    content: `3 éve dolgozom prompt engineeringgel. Ezek a minták mindig működnek.`,
    author: "prompt_guru", avatar: "G", avatarColor: "#a78bfa",
    authorId: null,
    time: "2 hete", views: 8754, likes: 921, comments: 203,
    tags: ["prompt-engineering", "tipp", "claude", "gpt-4o"],
    readTime: 8, poll: null,
  },
];

MOCK_POSTS.forEach(p => { if (!p.slug) p.slug = generateSlug(p.title); });

// ─── Router segédfüggvények ───────────────────────────────────────
const BASE_PATH = "/forum";

function getPostInfoFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/forum\/([^/]+)\/(.+)/);
  return match ? { category: match[1], slug: match[2] } : null;
}

function pushPostURL(category, slug) {
  window.history.pushState({ category, slug }, "", `${BASE_PATH}/${category}/${slug}`);
}

function pushForumURL() {
  window.history.pushState({}, "", BASE_PATH);
}

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

// ─── Announcement banner ──────────────────────────────────────────
const AnnouncementBanner = () => {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % ANNOUNCEMENTS.length), 4000);
    return () => clearInterval(t);
  }, []);
  if (!visible) return null;
  const ann = ANNOUNCEMENTS[idx];
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl mb-3 transition-all duration-500"
      style={{ background: `${ann.color}12`, border: `1px solid ${ann.color}30` }}>
      <div className="flex items-center gap-2">
        <Megaphone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ann.color }} />
        <span className="text-white text-xs font-medium">{ann.text}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1">
          {ANNOUNCEMENTS.map((_, i) => (
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

// ─── Notification dropdown ────────────────────────────────────────
const NotifDropdown = ({ onClose }) => {
  const notifs = [
    { id: 1, text: "pixel_witch válaszolt a hozzászólásodra", time: "3p", read: false, color: "#f472b6" },
    { id: 2, text: "prompt_guru like-olta a bejegyzésedet", time: "15p", read: false, color: "#a78bfa" },
    { id: 3, text: "Új téma a Chat AI kategóriában", time: "1ó", read: true, color: "#34d399" },
    { id: 4, text: "typescript_king megemlített egy témában", time: "2ó", read: true, color: "#34d399" },
  ];
  return (
    <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-2xl overflow-hidden"
      style={{ background: "rgba(10,10,28,0.98)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="text-white font-semibold text-sm">Értesítések</span>
        <button className="cursor-pointer text-xs text-purple-400 hover:text-purple-300">Mind olvasott</button>
      </div>
      {notifs.map(n => (
        <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
          style={{ background: !n.read ? "rgba(167,139,250,0.04)" : "transparent" }}>
          {!n.read && <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.color }} />}
          {n.read && <div className="w-1.5 h-1.5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-300 leading-relaxed">{n.text}</p>
            <p className="text-gray-600 text-xs mt-0.5">{n.time}</p>
          </div>
        </div>
      ))}
      <div className="px-4 py-2.5 text-center">
        <button className="cursor-pointer text-xs text-gray-600 hover:text-gray-400">Összes értesítés →</button>
      </div>
    </div>
  );
};

// ─── Poszt kártya ─────────────────────────────────────────────────
const PostCard = ({
  post, onClick, bookmarked, onBookmark, viewedIds,
  currentUserId, isAdmin, onDelete, onEdit, onToggle,
}) => {
  const cat = CATEGORIES.find(c => c.id === post.category) || CATEGORIES[1];
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const isRead = viewedIds?.has(post.id);

  const isOwn = !post.authorId || (!!currentUserId && currentUserId === post.authorId);
  const canManage = isOwn || isAdmin;

  useEffect(() => {
    dbg(`PostCard render | post.id=${post.id} | post.authorId=${post.authorId} | currentUserId=${currentUserId} | isAdmin=${isAdmin} | isOwn=${isOwn} | canManage=${canManage}`);
  }, [post.id, post.authorId, currentUserId, isAdmin, isOwn, canManage]);

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

  return (
    <div
      className="group cursor-pointer transition-all duration-200 relative"
      style={{
        background: isRead ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isRead ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "1rem", padding: "1.125rem 1.25rem",
        overflow: "visible",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.border = `1px solid ${cat.color}30`;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isRead ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)";
        e.currentTarget.style.border = `1px solid ${isRead ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`;
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onClick={onClick}
    >
      {isRead
        ? <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        : <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-full" style={{ background: `linear-gradient(180deg, ${cat.color}, ${cat.color}40)` }} />
      }

      <div className="flex items-start gap-3 pl-1">
        {post.avatarUrl ? <img src={post.avatarUrl} alt="avatar" className="w-9 h-9 rounded-xl object-cover flex-shrink-0 mt-0.5" /> : <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0 mt-0.5"
          style={{ background: post.avatarColor + "45", border: `1px solid ${post.avatarColor}35` }}>
          {post.avatar}
        </div>}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {post.pinned && (
              <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                <Pin className="w-2.5 h-2.5" /> Kitűzve
              </span>
            )}
            {post.hot && (
              <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(251,113,33,0.15)", color: "#fb923c", border: "1px solid rgba(251,113,33,0.25)" }}>
                <Flame className="w-2.5 h-2.5" /> Trending
              </span>
            )}
            {post.locked && (
              <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                <Lock className="w-2.5 h-2.5" /> Lezárva
              </span>
            )}
            {post.solved && (
              <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                <CheckCircle className="w-2.5 h-2.5" /> Megoldva
              </span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30` }}>
              {cat.emoji} {cat.label}
            </span>
            <span className="text-xs text-gray-700 flex items-center gap-0.5 ml-auto">
              <Clock className="w-2.5 h-2.5" />{post.readTime} perc olvasás
            </span>
          </div>

          <h3 className={`font-semibold text-sm leading-snug mb-1 transition-colors group-hover:text-purple-200 ${isRead ? "text-gray-300" : "text-white"}`}>
            {post.title}
          </h3>

          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-2">{post.preview}</p>

          <div className="flex gap-1.5 flex-wrap mb-2.5">
            {post.tags.slice(0, 4).map(t => (
              <span key={t} className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: `${cat.color}12`, color: cat.color + "cc", border: `1px solid ${cat.color}20` }}>
                #{t}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="font-semibold" style={{ color: post.avatarColor }}>{post.author}</span>
              {isOwn && (
                <span className="text-xs px-1 py-0.5 rounded font-semibold"
                  style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", fontSize: "0.6rem" }}>
                  TE
                </span>
              )}
              <span>·</span>
              <span>{post.time}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); onBookmark(post.id); }}
                className="cursor-pointer p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-white/10"
                style={{ color: bookmarked ? "#fbbf24" : "#6b7280" }}
                title="Mentés"
              >
                <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
              </button>

              <button
                onClick={e => { e.stopPropagation(); setLiked(v => !v); setLikeCount(c => liked ? c - 1 : c + 1); }}
                className="cursor-pointer flex items-center gap-1 text-xs transition-all active:scale-90 px-2 py-1 rounded-lg hover:bg-white/8"
                style={{ color: liked ? "#f472b6" : "#6b7280" }}
              >
                <Heart className={`w-3 h-3 ${liked ? "fill-current" : ""}`} />
                <span>{likeCount}</span>
              </button>

              <span className="flex items-center gap-1 text-xs text-gray-600">
                <MessageSquare className="w-3 h-3" />{post.comments}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Eye className="w-3 h-3" />{post.views.toLocaleString()}
              </span>

              {canManage && (
                <div
                  className="relative"
                  ref={menuRef}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowMenu(v => !v);
                    }}
                    className="cursor-pointer p-1 rounded-lg transition-all hover:bg-white/10"
                    style={{
                      color: showMenu ? "#a78bfa" : "#6b7280",
                      background: showMenu ? "rgba(167,139,250,0.15)" : "transparent",
                      border: `1px solid ${showMenu ? "rgba(167,139,250,0.3)" : "transparent"}`,
                    }}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {showMenu && (
                    <div
                      className="absolute right-0 bottom-full mb-1 w-48 rounded-xl overflow-hidden"
                      style={{
                        zIndex: 9999,
                        background: "rgba(10,10,28,0.98)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
                      }}
                    >
                      {DEBUG && (
                        <div className="px-3 py-1.5 border-b border-white/10" style={{ background: "rgba(239,68,68,0.1)" }}>
                          <p style={{ color: "#f87171", fontSize: "0.55rem", fontFamily: "monospace" }}>
                            DEBUG | isOwn={String(isOwn)} | isAdmin={String(isAdmin)}<br />
                            authorId={String(post.authorId)} | uid={String(currentUserId)}
                          </p>
                        </div>
                      )}

                      {isOwn && (
                        <>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setShowMenu(false);
                              onEdit(post);
                            }}
                            className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Szerkesztés
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setShowMenu(false);
                              onToggle(post.id, "solved", !post.solved);
                            }}
                            className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            {post.solved ? "Megoldás visszavon" : "Megoldva jelöl"}
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setShowMenu(false);
                              onToggle(post.id, "locked", !post.locked);
                            }}
                            className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                          >
                            {post.locked
                              ? <><Unlock className="w-3.5 h-3.5 text-blue-400" /> Zárolás feloldása</>
                              : <><Lock className="w-3.5 h-3.5 text-orange-400" /> Téma zárolása</>
                            }
                          </button>
                        </>
                      )}

                      {isAdmin && (
                        <>
                          <div className="border-t border-white/8 my-0.5" />
                          <p className="px-3 pt-1.5 pb-0.5 text-gray-600" style={{ fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</p>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setShowMenu(false);
                              onToggle(post.id, "pinned", !post.pinned);
                            }}
                            className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                          >
                            <Pin className="w-3.5 h-3.5 text-yellow-400" />
                            {post.pinned ? "Kitűzés eltávolítása" : "Kitűzés"}
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setShowMenu(false);
                              onToggle(post.id, "hot", !post.hot);
                            }}
                            className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                          >
                            <Flame className="w-3.5 h-3.5 text-orange-400" />
                            {post.hot ? "Trending eltávolítása" : "Trending jelölés"}
                          </button>

                          {!isOwn && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setShowMenu(false);
                                onToggle(post.id, "locked", !post.locked);
                              }}
                              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                            >
                              {post.locked
                                ? <><Unlock className="w-3.5 h-3.5 text-blue-400" /> Zárolás feloldása</>
                                : <><Lock className="w-3.5 h-3.5 text-red-400" /> Téma zárolása</>
                              }
                            </button>
                          )}
                        </>
                      )}

                      <div className="border-t border-white/8 my-0.5" />
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onDelete(post.id, post.authorId);
                        }}
                        className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Téma törlése
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── New / Edit Post Modal ────────────────────────────────────────
const NewPostModal = ({ isOpen, onClose, defaultCategory, onSubmit, editPost = null }) => {
  const isEditMode = !!editPost;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCat, setSelectedCat] = useState(defaultCategory || "chat");
  const [tags, setTags] = useState("");
  const [addPoll, setAddPoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && editPost) {
        setTitle(editPost.title || "");
        setContent(editPost.content || "");
        setSelectedCat(editPost.category || "chat");
        setTags((editPost.tags || []).join(", "));
        if (editPost.poll) {
          setAddPoll(true);
          setPollQ(editPost.poll.question || "");
          setPollOpts(editPost.poll.options?.map(o => o.label) || ["", ""]);
        } else {
          setAddPoll(false);
          setPollQ("");
          setPollOpts(["", ""]);
        }
      } else {
        setTitle("");
        setContent("");
        setSelectedCat(defaultCategory || "chat");
        setTags("");
        setAddPoll(false);
        setPollQ("");
        setPollOpts(["", ""]);
      }
      setPreview(false);
    }
  }, [isOpen, isEditMode, editPost, defaultCategory]);

  if (!isOpen) return null;
  const cat = CATEGORIES.find(c => c.id === selectedCat);

  const addPollOpt = () => { if (pollOpts.length < 6) setPollOpts(p => [...p, ""]); };

  const handleSubmit = () => {
    if (!title.trim() || title.trim().length < 10) return;
    const data = {
      title: title.trim(),
      content: content.trim(),
      category: selectedCat,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      poll: addPoll && pollQ
        ? { question: pollQ, options: pollOpts.filter(Boolean).map((o, i) => ({ id: String.fromCharCode(97 + i), label: o, votes: 0 })) }
        : null,
    };
    if (!isEditMode) {
      data.authorId = auth.currentUser?.uid || null;
    }
    onSubmit?.(data, isEditMode ? editPost.id : null);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "rgba(10,10,28,0.98)", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "92vh", boxShadow: `0 30px 80px rgba(0,0,0,0.8), 0 0 60px ${cat?.color || "#7c3aed"}12` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2 text-sm">
            {isEditMode
              ? <><Edit3 className="w-4 h-4" style={{ color: cat?.color }} /> Téma szerkesztése</>
              : <><PenSquare className="w-4 h-4" style={{ color: cat?.color }} /> Új téma indítása</>
            }
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview(v => !v)}
              className="cursor-pointer text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: preview ? `${cat?.color}20` : "rgba(255,255,255,0.06)", color: preview ? cat?.color : "#9ca3af", border: `1px solid ${preview ? cat?.color + "40" : "rgba(255,255,255,0.1)"}` }}>
              {preview ? "Szerkesztés" : "Előnézet"}
            </button>
            <button onClick={onClose} className="cursor-pointer p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-2">Kategória *</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.filter(c => c.id !== "all").map(c => (
                <button key={c.id} onClick={() => setSelectedCat(c.id)}
                  className="cursor-pointer flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all text-xs active:scale-95"
                  style={{ background: selectedCat === c.id ? `${c.color}20` : "rgba(255,255,255,0.04)", border: `1px solid ${selectedCat === c.id ? c.color + "50" : "rgba(255,255,255,0.08)"}`, color: selectedCat === c.id ? c.color : "#6b7280" }}>
                  <span className="text-lg">{c.emoji}</span>
                  <span className="font-medium leading-tight text-center">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Cím *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Fogalmazd meg egyértelműen a témát..."
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${title.length >= 10 ? (cat?.color || "#7c3aed") + "50" : "rgba(255,255,255,0.1)"}` }} />
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: title.length > 0 && title.length < 10 ? "#f87171" : "#6b7280" }}>
                {title.length > 0 && title.length < 10 ? `Még ${10 - title.length} karakter kell` : "Min. 10 karakter"}
              </span>
              <span className="text-xs" style={{ color: title.length >= 10 ? "#4ade80" : "#6b7280" }}>{title.length}/200</span>
            </div>
            {title.length >= 5 && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-gray-700 text-xs">URL:</span>
                <span className="text-gray-600 text-xs font-mono">
                  /forum/{selectedCat}/{generateSlug(title) || "..."}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Tartalom</label>
            {!preview ? (
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Markdown támogatott: **félkövér**, `kód`, ## fejléc, - lista..."
                rows={7} className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none font-mono"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            ) : (
              <div className="w-full px-3 py-2.5 rounded-xl text-gray-300 text-sm min-h-[160px] leading-relaxed"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {content || <span className="text-gray-600 italic">Tartalom előnézete itt jelenik meg...</span>}
              </div>
            )}
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Tagek (vesszővel elválasztva)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="pl. claude, prompt-engineering, tipp"
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            {tags && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${cat?.color}18`, color: cat?.color, border: `1px solid ${cat?.color}30` }}>#{t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <span className="text-white text-sm font-medium">Szavazás hozzáadása</span>
            </div>
            <button onClick={() => setAddPoll(v => !v)}
              className="cursor-pointer relative rounded-full transition-all duration-200"
              style={{ background: addPoll ? `linear-gradient(135deg, ${cat?.color}, ${cat?.color}99)` : "rgba(255,255,255,0.1)", minWidth: "2.5rem", height: "1.375rem", width: "2.5rem" }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: addPoll ? "calc(100% - 1.125rem)" : "0.125rem" }} />
            </button>
          </div>

          {addPoll && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <input value={pollQ} onChange={e => setPollQ(e.target.value)} placeholder="Szavazás kérdése..."
                className="w-full px-3 py-2 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              {pollOpts.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={opt} onChange={e => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }}
                    placeholder={`${i + 1}. lehetőség`}
                    className="flex-1 px-3 py-2 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  {i > 1 && (
                    <button onClick={() => setPollOpts(p => p.filter((_, j) => j !== i))}
                      className="cursor-pointer p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
              {pollOpts.length < 6 && (
                <button onClick={addPollOpt} className="cursor-pointer text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Lehetőség hozzáadása
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/8 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>Mégse</button>
          <button onClick={handleSubmit} disabled={title.trim().length < 10}
            className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2"
            style={{ background: cat ? `linear-gradient(135deg, ${cat.color}, ${cat.color}99)` : "rgba(255,255,255,0.1)", boxShadow: cat && title.length >= 10 ? `0 4px 20px ${cat.color}30` : "none" }}>
            {isEditMode
              ? <><CheckCircle className="w-3.5 h-3.5" /> Mentés</>
              : <><Send className="w-3.5 h-3.5" /> Közzétesz</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Törlés megerősítő dialog ─────────────────────────────────────
const ConfirmDialog = ({ isOpen, onConfirm, onCancel, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl p-6 max-w-sm w-full"
        style={{ background: "rgba(10,10,28,0.99)", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-sm">Biztosan törlöd?</h3>
        </div>
        <p className="text-gray-400 text-xs mb-5 leading-relaxed">{message || "Ez a művelet nem vonható vissza."}</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="cursor-pointer flex-1 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Mégse
          </button>
          <button onClick={onConfirm}
            className="cursor-pointer flex-1 py-2 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            Törlés
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Kategória sidebar card ───────────────────────────────────────
const CatSidebarCard = ({ cat, isActive, onClick }) => (
  <button onClick={() => onClick(cat.id)} className="cursor-pointer w-full text-left transition-all duration-150 active:scale-[0.98]"
    style={{ background: isActive ? `${cat.color}12` : "rgba(255,255,255,0.02)", border: `1.5px solid ${isActive ? cat.color + "45" : "rgba(255,255,255,0.06)"}`, borderRadius: "0.875rem", padding: "0.75rem 0.875rem" }}
    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = `${cat.color}08`; e.currentTarget.style.border = `1.5px solid ${cat.color}25`; } }}
    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.06)"; } }}>
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: `${cat.color}20`, color: cat.color }}>{cat.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-white font-semibold text-xs">{cat.label}</span>
          <span className="text-gray-600 text-xs">{cat.threads}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: "#4ade80" }} />
          <span className="text-gray-600 text-xs">{cat.online} online</span>
        </div>
      </div>
    </div>
  </button>
);

// ─── FŐ KOMPONENS ─────────────────────────────────────────────────
export default function Forum() {
  const { user: globalUser, logoutUser, setIsAuthOpen, setShowNavbar } = useContext(MyUserContext);
  const navigate = useNavigate();
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("hot");
  const [search, setSearch] = useState("");
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [openPost, setOpenPost] = useState(null);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [viewedIds, setViewedIds] = useState(new Set());
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterLocked, setFilterLocked] = useState(false);
  const [filterSolved, setFilterSolved] = useState(false);
  const [unreadCount] = useState(2);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const initialSlugRef = useRef(false);

  const accentColor = CATEGORIES.find(c => c.id === activeCategory)?.color || "#a78bfa";

  // ── Auth figyelés ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      dbg("Auth state changed:", user ? `uid=${user.uid}` : "null");
      setCurrentUser(user || null);
      setCurrentUserId(user?.uid || null);
      if (user) {
        const adminStatus = ADMIN_UIDS.includes(user.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => { dbg("confirmDelete state:", confirmDelete); }, [confirmDelete]);
  useEffect(() => { dbg("editingPost state:", editingPost ? `id=${editingPost.id}` : "null"); }, [editingPost]);

  // ── Poszt keresése ───────────────────────────────────────────────
  const findPost = useCallback((category, slug, postList) => {
    return (
      postList.find(p => p.slug === slug && p.category === category) ||
      postList.find(p => p.slug === slug) ||
      null
    );
  }, []);

  // ── Firebase betöltés ────────────────────────────────────────────
  useEffect(() => {
    const loadFirebasePosts = async () => {
      try {
        const q = query(collection(db, "forum_posts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const fbPosts = snap.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            time: formatFirebaseTime(data.createdAt),
            slug: data.slug || generateSlug(data.title || ""),
          };
        });
        dbg(`Firebase: ${fbPosts.length} poszt betöltve`);
        if (fbPosts.length > 0) {
          setPosts([...fbPosts, ...MOCK_POSTS]);
        }
      } catch (e) {
        console.error("Firebase betöltési hiba:", e);
      }
    };
    loadFirebasePosts();
  }, []);

  // ── URL routing ──────────────────────────────────────────────────
  useEffect(() => {
    if (initialSlugRef.current) return;
    const info = getPostInfoFromURL();
    if (!info) { initialSlugRef.current = true; return; }
    const found = findPost(info.category, info.slug, posts);
    if (found) {
      setOpenPost(found);
      setViewedIds(prev => new Set([...prev, found.id]));
      initialSlugRef.current = true;
    }
  }, [posts, findPost]);

  useEffect(() => {
    const handlePopState = () => {
      const info = getPostInfoFromURL();
      if (info) {
        setPosts(currentPosts => {
          const found = findPost(info.category, info.slug, currentPosts);
          if (found) {
            setOpenPost(found);
            setViewedIds(prev => new Set([...prev, found.id]));
          }
          return currentPosts;
        });
      } else {
        setOpenPost(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [findPost]);

  useEffect(() => {
    const handler = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleBookmark = id => setBookmarks(p => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleOpenPost = (post) => {
    setViewedIds(p => new Set([...p, post.id]));
    setOpenPost(post);
    pushPostURL(post.category, post.slug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setOpenPost(null);
    pushForumURL();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Új / szerkesztett poszt mentése ─────────────────────────────
  const handleNewPost = async (data, editId = null) => {
    dbg("handleNewPost:", { editId, title: data.title });

    if (editId !== null) {
      const updates = {
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags,
        poll: data.poll,
        preview: data.content?.slice(0, 120) || "",
        slug: generateSlug(data.title),
      };

      const postIdStr = String(editId);
      const isFbPost = !postIdStr.startsWith("local_") && isNaN(Number(postIdStr));

      if (isFbPost) {
        try {
          await updateDoc(doc(db, "forum_posts", postIdStr), updates);
          dbg("Firebase frissítés OK:", postIdStr);
        } catch (e) {
          console.error("Firebase frissítési hiba:", e);
        }
      }

      setPosts(p => p.map(post =>
        String(post.id) === postIdStr ? { ...post, ...updates } : post
      ));

      if (openPost && String(openPost.id) === postIdStr) {
        setOpenPost(prev => ({ ...prev, ...updates }));
      }
      return;
    }

    // Új poszt
    const slug = generateSlug(data.title);
    let finalSlug = slug;
    let counter = 1;
    while (posts.some(p => p.slug === finalSlug && p.category === data.category)) {
      finalSlug = `${slug}-${counter++}`;
    }

    const postData = {
      slug: finalSlug,
      ...data,
      pinned: false, hot: false, locked: false, solved: false,
      author: globalUser?.displayName || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Névtelen",
      avatar: (globalUser?.displayName?.[0] || currentUser?.displayName?.[0] || currentUser?.email?.[0] || "?").toUpperCase(),
      avatarUrl: globalUser?.profilePicture || null,
      avatarColor: accentColor,
      authorId: currentUser?.uid || null,
      time: "Most", views: 1, likes: 0, comments: 0, readTime: 1,
      preview: data.content?.slice(0, 120) || "",
    };

    let finalId = `local_${Date.now()}`;
    try {
      const docRef = await addDoc(collection(db, "forum_posts"), {
        ...postData,
        createdAt: serverTimestamp(),
      });
      finalId = docRef.id;
      dbg("Firebase mentés OK:", docRef.id);
    } catch (e) {
      console.error("Firebase mentési hiba:", e);
    }

    setPosts(p => [{ ...postData, id: finalId }, ...p]);
  };

  // ── Poszt törlése ────────────────────────────────────────────────
  const handleDeletePost = async (postId, authorId) => {
    dbg("handleDeletePost:", { postId, authorId, currentUserId, isAdmin });

    if (authorId && !currentUserId) { dbg("MEGTAGADVA: nincs bejelentkezés"); return; }
    if (authorId && currentUserId !== authorId && !isAdmin) { dbg("MEGTAGADVA: nem saját poszt"); return; }

    const postIdStr = String(postId);
    const isFbPost = !postIdStr.startsWith("local_") && isNaN(Number(postIdStr));

    if (isFbPost) {
      try {
        await deleteDoc(doc(db, "forum_posts", postIdStr));
        dbg("Firebase törlés OK:", postIdStr);
      } catch (e) {
        console.error("Firebase törlési hiba:", e);
      }
    }

    setPosts(p => {
      const filtered = p.filter(post => String(post.id) !== postIdStr);
      dbg(`Törlés után: ${p.length} → ${filtered.length} poszt`);
      return filtered;
    });
    setConfirmDelete(null);

    if (openPost && String(openPost.id) === postIdStr) {
      handleBack();
    }
  };

  // ── Toggle mező ──────────────────────────────────────────────────
  const handleToggleField = async (postId, field, value) => {
    dbg("handleToggleField:", { postId, field, value });
    const postIdStr = String(postId);
    const isFbPost = !postIdStr.startsWith("local_") && isNaN(Number(postIdStr));

    if (isFbPost) {
      try {
        await updateDoc(doc(db, "forum_posts", postIdStr), { [field]: value });
        dbg(`Firebase toggle OK: ${field}=${value}`);
      } catch (e) {
        console.error(`Firebase ${field} toggle hiba:`, e);
      }
    }

    setPosts(p => p.map(post =>
      String(post.id) === postIdStr ? { ...post, [field]: value } : post
    ));

    if (openPost && String(openPost.id) === postIdStr) {
      setOpenPost(prev => ({ ...prev, [field]: value }));
    }
  };

  // ── Szűrés + rendezés ────────────────────────────────────────────
  const filteredPosts = posts.filter(p => {
    if (showOnlyBookmarks && !bookmarks.has(p.id)) return false;
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (activeTagFilter && !p.tags.includes(activeTagFilter)) return false;
    if (filterLocked && !p.locked) return false;
    if (filterSolved && !p.solved) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.tags.some(t => t.includes(search.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "hot") return (b.likes * 3 + b.views / 10 + b.comments * 2) - (a.likes * 3 + a.views / 10 + a.comments * 2);
    if (sortBy === "new") return String(b.id) > String(a.id) ? 1 : -1;
    if (sortBy === "top") return b.likes - a.likes;
    if (sortBy === "views") return b.views - a.views;
    return 0;
  });

  const totalOnline = CATEGORIES.slice(1).reduce((s, c) => s + c.online, 0);
  const totalThreads = CATEGORIES.slice(1).reduce((s, c) => s + c.threads, 0);

  // ── Közös modálok (mindkét nézetben renderelve) ──────────────────
  // FIX: ezek korábban az early-return UTÁN voltak, így poszt-nézetben
  // soha nem kerültek a DOM-ba → szerkesztés és törlés nem működött.
  const sharedModals = (
    <>
      {/* Szerkesztő modal */}
      <NewPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        defaultCategory={editingPost?.category || "chat"}
        onSubmit={handleNewPost}
        editPost={editingPost}
      />

      {/* Törlés megerősítő */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        message="A poszt véglegesen törlődik. Ez a művelet nem vonható vissza."
        onConfirm={() => {
          dbg("ConfirmDialog onConfirm → handleDeletePost", confirmDelete);
          handleDeletePost(confirmDelete.id, confirmDelete.authorId);
        }}
        onCancel={() => {
          dbg("ConfirmDialog onCancel");
          setConfirmDelete(null);
        }}
      />
    </>
  );

  // ── Poszt nézet (early return — de a modálok most itt is benne vannak!) ──
  if (openPost) {
    return (
      <>
        <ForumPost
          post={openPost}
          allPosts={posts}
          onBack={handleBack}
          onOpenPost={handleOpenPost}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onDelete={(id, authorId) => {
            dbg("ForumPost onDelete:", { id, authorId });
            setConfirmDelete({ id, authorId });
          }}
          onEdit={(post) => {
            dbg("ForumPost onEdit:", post.id);
            setEditingPost(post);
          }}
          onToggle={handleToggleField}
        />
        {sharedModals}
      </>
    );
  }

  // ── Fórum lista nézet ────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: "radial-gradient(ellipse at top, #1a0b2e 0%, #0a0118 50%, #000000 100%)", fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" style={{ animation: "floatA 22s ease-in-out infinite" }} />
        <div className="absolute bottom-1/3 right-1/5 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" style={{ animation: "floatA 28s ease-in-out infinite reverse" }} />
        <div className="absolute top-2/3 left-1/2 w-72 h-72 rounded-full blur-3xl transition-all duration-1000" style={{ background: `${accentColor}07`, animation: "floatA 32s ease-in-out infinite" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 md:px-5 py-5">

        {/* ══ HEADER ══ */}
        <GlassCard style={{ marginBottom: "1rem", padding: "0.875rem 1.25rem" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} title="Kezdőlap"
                className="cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, #7c3aed40, #7c3aed20)", border: "1px solid #7c3aed35" }}>
                <Home className="w-4 h-4 text-purple-400" />
              </button>
              <div>
                <h1 className="text-white font-bold text-base leading-tight flex items-center gap-2">
                  AI Fórum
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>BETA</span>
                  {isAdmin && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                      👑 Admin
                    </span>
                  )}
                  {DEBUG && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                      🐛 DEBUG
                    </span>
                  )}
                </h1>
                <p className="text-gray-500 text-xs">
                  {totalThreads.toLocaleString()} téma · <span className="text-green-400">{totalOnline} online</span>
                  {DEBUG && <span className="text-red-400 ml-2">· uid: {currentUserId || "null"}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés..."
                  className="w-48 md:w-60 pl-8 pr-3 py-2 rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${search ? accentColor + "40" : "rgba(255,255,255,0.08)"}` }} />
                {search && <button onClick={() => setSearch("")} className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"><X className="w-3 h-3" /></button>}
              </div>

              <div ref={notifRef} className="relative">
                <button onClick={() => setShowNotifs(v => !v)}
                  className="cursor-pointer relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all"
                  style={{ background: showNotifs ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${showNotifs ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", fontSize: "0.6rem" }}>{unreadCount}</span>
                  )}
                </button>
                {showNotifs && <NotifDropdown onClose={() => setShowNotifs(false)} />}
              </div>

              <div ref={userMenuRef} className="relative">
                <button onClick={() => setShowUserMenu(v => !v)}
                  className="cursor-pointer w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-white transition-all overflow-hidden"
                  style={{ background: globalUser?.profilePicture ? "transparent" : "linear-gradient(135deg,#7c3aed,#db2777)", boxShadow: showUserMenu ? "0 0 20px rgba(124,58,237,0.5)" : "none" }}>
                  {globalUser?.profilePicture ? (
                    <img src={globalUser.profilePicture} alt="user avatar" className="w-full h-full object-cover" />
                  ) : (
                    globalUser?.displayName?.[0]?.toUpperCase() || currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "?"
                  )}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 z-50 rounded-2xl overflow-hidden"
                    style={{ background: "rgba(10,10,28,0.98)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
                    <div className="px-4 py-3 border-b border-white/8">
                      <p className="text-white font-semibold text-sm">{currentUser?.displayName || currentUser?.email || "Felhasználó"}</p>
                      <p className="text-gray-500 text-xs">{isAdmin ? "👑 Admin" : "Tag"}</p>
                    </div>
                    {[
                      { icon: <Home className="w-3.5 h-3.5" />, label: "Kezdőlap", action: () => { setShowUserMenu(false); navigate('/'); } },
                      { icon: <Bookmark className="w-3.5 h-3.5" />, label: "Mentett témák", action: () => { setShowOnlyBookmarks(v => !v); setShowUserMenu(false); } },
                      { icon: <Settings className="w-3.5 h-3.5" />, label: "Beállítások", action: () => { setShowUserMenu(false); navigate('/settings'); } },
                      ...(isAdmin ? [{ icon: <Shield className="w-3.5 h-3.5" />, label: "Admin panel", action: null }] : []),
                    ].map(item => (
                      <button key={item.label} onClick={item.action || undefined}
                        className="cursor-pointer w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-400 hover:text-white hover:bg-white/8 transition-colors text-xs">
                        {item.icon}{item.label}
                        {item.label === "Mentett témák" && bookmarks.size > 0 && (
                          <span className="ml-auto text-xs px-1.5 rounded-full" style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>{bookmarks.size}</span>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-white/8">
                      <button onClick={() => { setShowUserMenu(false); logoutUser(); navigate('/'); }}
                        className="cursor-pointer w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400 hover:bg-red-400/10 transition-colors text-xs">
                        <LogOut className="w-3.5 h-3.5" /> Kijelentkezés
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setNewPostOpen(true)}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.97] flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
                <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Új téma</span>
              </button>
            </div>
          </div>
        </GlassCard>

        <AnnouncementBanner />

        {/* ══ STATS GRID ══ */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {CATEGORIES.filter(c => c.id !== "all").map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? "all" : cat.id)}
              className="cursor-pointer text-center py-3 px-2 rounded-xl transition-all duration-200 active:scale-[0.96]"
              style={{ background: activeCategory === cat.id ? `${cat.color}18` : "rgba(255,255,255,0.025)", border: `1px solid ${activeCategory === cat.id ? cat.color + "45" : "rgba(255,255,255,0.07)"}` }}>
              <div className="text-xl mb-0.5">{cat.emoji}</div>
              <div className="text-white font-bold text-sm">{cat.threads}</div>
              <div className="text-xs mt-0.5 truncate" style={{ color: activeCategory === cat.id ? cat.color : "#6b7280" }}>{cat.label}</div>
            </button>
          ))}
        </div>

        {/* ══ TAG CLOUD ══ */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          <div className="flex items-center gap-1.5 text-gray-600 text-xs flex-shrink-0">
            <Tag className="w-3 h-3" /> Szűrők:
          </div>
          {ALL_TAGS.map(t => (
            <TagPill key={t.label} label={t.label} color={t.color} count={t.count}
              active={activeTagFilter === t.label}
              onClick={() => setActiveTagFilter(activeTagFilter === t.label ? null : t.label)} />
          ))}
          {(activeTagFilter || showOnlyBookmarks || filterLocked || filterSolved) && (
            <button onClick={() => { setActiveTagFilter(null); setShowOnlyBookmarks(false); setFilterLocked(false); setFilterSolved(false); }}
              className="cursor-pointer flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-red-400 hover:bg-red-400/10 transition-all"
              style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
              <X className="w-2.5 h-2.5" /> Szűrők törlése
            </button>
          )}
        </div>

        {/* ══ MAIN GRID ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_272px] gap-4">

          {/* ── POSZT LISTA ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-1">
                {activeCategory !== "all" && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}35` }}>
                    {CATEGORIES.find(c => c.id === activeCategory)?.emoji} {CATEGORIES.find(c => c.id === activeCategory)?.label}
                    <button onClick={() => setActiveCategory("all")} className="cursor-pointer ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </div>
                )}
                {showOnlyBookmarks && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                    <Bookmark className="w-3 h-3" /> Mentett ({bookmarks.size})
                    <button onClick={() => setShowOnlyBookmarks(false)} className="cursor-pointer ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </div>
                )}
                <span className="text-gray-600 text-xs">{filteredPosts.length} téma</span>
              </div>

              <button onClick={() => setShowAdvancedFilter(v => !v)}
                className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: showAdvancedFilter ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)", color: showAdvancedFilter ? "#a78bfa" : "#6b7280", border: `1px solid ${showAdvancedFilter ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                <SlidersHorizontal className="w-3 h-3" /> Szűrő
              </button>

              <div className="flex items-center gap-0.5 p-0.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { id: "hot", icon: <Flame className="w-3 h-3" />, label: "Trending" },
                  { id: "new", icon: <Zap className="w-3 h-3" />, label: "Új" },
                  { id: "top", icon: <TrendingUp className="w-3 h-3" />, label: "Legjobb" },
                  { id: "views", icon: <Eye className="w-3 h-3" />, label: "Nézett" },
                ].map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id)}
                    className="cursor-pointer flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all"
                    style={{ background: sortBy === s.id ? `${accentColor}20` : "transparent", color: sortBy === s.id ? "white" : "#6b7280", fontWeight: sortBy === s.id ? 600 : 400 }}>
                    {s.icon}<span className="hidden sm:inline">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {showAdvancedFilter && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl flex-wrap"
                style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
                <span className="text-gray-400 text-xs font-semibold">Állapot:</span>
                {[
                  { label: "🔒 Lezárt", val: filterLocked, set: setFilterLocked },
                  { label: "✅ Megoldott", val: filterSolved, set: setFilterSolved },
                  { label: "🔖 Mentett", val: showOnlyBookmarks, set: setShowOnlyBookmarks },
                ].map(f => (
                  <button key={f.label} onClick={() => f.set(v => !v)}
                    className="cursor-pointer text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={{ background: f.val ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)", color: f.val ? "#a78bfa" : "#6b7280", border: `1px solid ${f.val ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {!currentUser && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <p className="text-gray-400 text-xs">
                  <span className="text-white font-medium">Jelentkezz be</span> a saját témáid szerkesztéséhez és törléséhez.
                  {DEBUG && <span className="text-red-400 ml-1">(DEBUG: mock postok mindenképp kezelhetők)</span>}
                </p>
              </div>
            )}

            {filteredPosts.length > 0
              ? filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => handleOpenPost(post)}
                  bookmarked={bookmarks.has(post.id)}
                  onBookmark={toggleBookmark}
                  viewedIds={viewedIds}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onDelete={(id, authorId) => {
                    dbg("PostCard onDelete prop hívva:", { id, authorId });
                    setConfirmDelete({ id, authorId });
                  }}
                  onEdit={(p) => {
                    dbg("PostCard onEdit prop hívva:", p.id);
                    setEditingPost(p);
                  }}
                  onToggle={handleToggleField}
                />
              ))
              : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Search className="w-10 h-10 text-gray-700" />
                  <p className="text-gray-500 text-sm">Nincs találat a megadott szűrőkre</p>
                  <button onClick={() => { setSearch(""); setActiveCategory("all"); setActiveTagFilter(null); setShowOnlyBookmarks(false); }}
                    className="cursor-pointer text-xs px-3 py-1.5 rounded-lg transition-all hover:bg-white/5" style={{ color: accentColor }}>
                    Összes szűrő törlése
                  </button>
                </div>
              )
            }

            {filteredPosts.length > 0 && (
              <button className="cursor-pointer w-full py-3 rounded-xl text-sm text-gray-600 hover:text-gray-400 transition-all hover:bg-white/5 flex items-center justify-center gap-2"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                <RefreshCw className="w-3.5 h-3.5" /> Több téma betöltése
              </button>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <div className="space-y-3">
            <GlassCard>
              <div className="px-4 pt-4 pb-3">
                <h3 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Hash className="w-3.5 h-3.5 text-purple-400" /> Kategóriák
                </h3>
                <div className="space-y-1.5">
                  <button onClick={() => setActiveCategory("all")}
                    className="cursor-pointer w-full text-left px-3 py-2 rounded-xl text-xs transition-all"
                    style={{ background: activeCategory === "all" ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${activeCategory === "all" ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.06)"}`, color: activeCategory === "all" ? "white" : "#9ca3af", fontWeight: activeCategory === "all" ? 600 : 400 }}>
                    🌐 Összes téma
                  </button>
                  {CATEGORIES.filter(c => c.id !== "all").map(cat => (
                    <CatSidebarCard key={cat.id} cat={cat} isActive={activeCategory === cat.id} onClick={setActiveCategory} />
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="px-4 pt-4 pb-3">
                <h3 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Heti toplista
                </h3>
                <div className="space-y-1">
                  {LEADERBOARD.map((user, i) => (
                    <div key={user.name} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer">
                      <span className="text-sm w-5 text-center flex-shrink-0">{user.badge}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: user.color }}>{user.name}</div>
                        <div className="text-gray-600 text-xs">{user.points.toLocaleString()} pont · {user.posts} bejegyzés</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="px-4 pt-4 pb-3">
                <h3 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Rss className="w-3.5 h-3.5 text-green-400" /> Legutóbbi aktivitás
                </h3>
                <div className="space-y-2.5">
                  {RECENT_ACTIVITY.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5"
                        style={{ background: a.color + "35", color: a.color }}>{a.user[0].toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug">
                          <span className="font-semibold" style={{ color: a.color }}>{a.user}</span>
                          <span className="text-gray-500"> {a.action}: </span>
                          <span className="text-gray-400">{a.post}</span>
                        </p>
                        <span className="text-gray-700 text-xs">{a.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="px-4 pt-4 pb-3">
                <h3 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                  <BarChart2 className="w-3.5 h-3.5 text-blue-400" /> Statisztikák
                </h3>
                {[
                  { label: "Összes téma", value: totalThreads.toLocaleString(), color: "#a78bfa" },
                  { label: "Online tagok", value: totalOnline, color: "#4ade80" },
                  { label: "Mai aktivitás", value: "347", color: "#38bdf8" },
                  { label: "Regisztrált tag", value: "12 841", color: "#fb923c" },
                  { label: "Mentett témák", value: bookmarks.size, color: "#fbbf24" },
                ].map(stat => (
                  <div key={stat.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-500 text-xs">{stat.label}</span>
                    <span className="text-xs font-bold" style={{ color: stat.color }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="px-4 pt-4 pb-3">
                <h3 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Globe className="w-3.5 h-3.5 text-purple-400" /> Gyors linkek
                </h3>
                <div className="space-y-1">
                  {[
                    { icon: <HelpCircle className="w-3.5 h-3.5" />, label: "GYIK / Segítség" },
                    { icon: <Shield className="w-3.5 h-3.5" />, label: "Fórum szabályok" },
                    { icon: <Award className="w-3.5 h-3.5" />, label: "Pontrendszer" },
                    { icon: <AtSign className="w-3.5 h-3.5" />, label: "Kapcsolat / Moderátorok" },
                  ].map(link => (
                    <button key={link.label} className="cursor-pointer w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all text-xs">
                      {link.icon}{link.label}<ChevronRight className="w-3 h-3 ml-auto" />
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Új poszt modal */}
      <NewPostModal
        isOpen={newPostOpen}
        onClose={() => setNewPostOpen(false)}
        defaultCategory={activeCategory !== "all" ? activeCategory : "chat"}
        onSubmit={handleNewPost}
      />

      {/* Közös modálok (szerkesztés + törlés) — lista nézetben */}
      {sharedModals}

      <style>{`
        @keyframes floatA { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-20px) scale(1.05)} 66%{transform:translate(-15px,15px) scale(0.95)} }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>
    </div>
  );
}