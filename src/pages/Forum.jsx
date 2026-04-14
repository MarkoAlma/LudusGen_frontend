import React, { useState, useRef, useEffect, useCallback, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import { MyUserContext } from "../context/MyUserProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, ChevronRight, ChevronDown,
  ThumbsUp, Eye, Clock, Pin, Flame, Sparkles, Trophy,
  TrendingUp, Plus, Search, Bookmark, MoreHorizontal,
  Hash, Zap, Bot, Send, X, Bell, Settings, LogOut, User,
  Shield, Lock, CheckCircle, RefreshCw, SlidersHorizontal,
  ArrowUp, Rss, Award, Tag, Globe, Heart, Smile,
  BarChart2, PenSquare, HelpCircle, Megaphone, AtSign,
  Trash2, Edit3, Unlock, Home, Activity, Code, Image, Music, Box,
  Bold, Italic, List, Heading2, Quote, Link,
} from "lucide-react";
import ForumPost from "./ForumPost";
import ForumAnimatedBg from "../components/ForumAnimatedBg";
import CreditTopup from "../components/CreditTopup";
import { auth, db } from "../firebase/firebaseApp";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, arrayUnion, arrayRemove,
  query, orderBy, serverTimestamp, getDoc, onSnapshot, where, limit, Timestamp, writeBatch,
  increment
} from "firebase/firestore";

// ─── Admin UIDs ───────────────────────────────────────────────────
const ADMIN_UIDS = ["T7fU9Zp3N5M9wz2G8xQ4L1rV6bY2"];

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
  { id: "all", label: "Összes", emoji: "🌐", color: "#6366f1", icon: Globe },
  {
    id: "chat", label: "Chat AI", emoji: "💬", color: "#a78bfa",
    description: "GPT, Claude, Gemini és egyéb chat modellek", icon: MessageSquare
  },
  {
    id: "code", label: "Code AI", emoji: "🧠", color: "#34d399",
    description: "GitHub Copilot, Cursor, kód generálás és review", icon: Code
  },
  {
    id: "image", label: "Kép AI", emoji: "🖼️", color: "#f472b6",
    description: "Midjourney, DALL·E, Stable Diffusion promptok", icon: Image
  },
  {
    id: "audio", label: "Hang AI", emoji: "🎵", color: "#fb923c",
    description: "Suno, Udio, ElevenLabs, hangklónozás", icon: Music
  },
  {
    id: "threed", label: "3D AI", emoji: "🧊", color: "#38bdf8",
    description: "Meshy, Tripo3D, TripoSG, szövegből/képből 3D", icon: Box
  },
];

// Dynamic tags will be calculated inside the component


const ANNOUNCEMENTS = [
  { id: 1, text: "🚀 Új funkció: AI Fórum LIVE chat — hamarosan!", color: "#a78bfa" },
  { id: 2, text: "📢 Pályázat: Legjobb AI prompt — 50.000 Ft díj!", color: "#fbbf24" },
  { id: 3, text: "🧪 Beta tesztelők kerestetnek a 3D AI szekcióhoz", color: "#38bdf8" },
];

// ─── Hash-based Tag Colors ────────────────────────────────────────
const TAG_PALETTE = ["#a78bfa", "#34d399", "#f472b6", "#fb923c", "#38bdf8", "#fbbf24", "#4ade80", "#a855f7", "#ec4899", "#8b5cf6"];
const getTagColor = (label) => {
  if (!label) return TAG_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
};

// ── Circuit Board Background — dense, detailed, GPU-optimized ──

// ─── Forum Background — Animated Canvas (particles + grid + network + orbs) ──
const ForumBackground = ForumAnimatedBg;

const RECENT_ACTIVITY = [
  { user: "pixel_witch", action: "hozzászólt", post: "Midjourney v7 guide", time: "2p", color: "#f472b6" },
  { user: "devmaster_hu", action: "új témát nyitott", post: "Claude API tippek", time: "5p", color: "#7c3aed" },
  { user: "beatmaker99", action: "like-olt", post: "Suno prompting technikák", time: "12p", color: "#ea580c" },
  { user: "typescript_king", action: "hozzászólt", post: "Cursor AI konfig", time: "18p", color: "#34d399" },
  { user: "3d_builder", action: "új témát nyitott", post: "Meshy vs TripoSG 2025", time: "31p", color: "#0284c7" },
];

export const MOCK_POSTS = [
  {
    id: "mock_1", category: "chat", pinned: true, hot: true, locked: false, solved: false,
    title: "Claude vs GPT-4o — melyik a jobb kódoláshoz? [Összehasonlítás 2025]",
    preview: "Elvégeztem 50+ tesztet mindkét modellen. Az eredmények meglepőek: Claude jobban teljesít hosszú fájloknál, de GPT gyorsabb egyszerű snippeteknél...",
    content: `Elvégeztem **50+ tesztet** mindkét modellen, különböző kódolási feladatokon.`,
    author: "devmaster_hu", avatar: "D", avatarColor: "#7c3aed",
    authorId: "mock_user_1",
    time: "2 órája", views: 3241, likes: 187, comments: 64,
    tags: ["claude", "gpt-4o", "összehasonlítás", "kódolás"],
    readTime: 4, poll: null,
  },
  {
    id: "mock_2", category: "image", pinned: false, hot: true, locked: false, solved: false,
    title: "Midjourney v7 vs FLUX — részletes prompt guide kezdőknek",
    preview: "Az új MJ v7 teljesen megváltoztatta a prompt struktúrát. Összeállítottam egy 20 pontos checklist-et...",
    content: `Az új **Midjourney v7** teljesen megváltoztatta a prompt struktúrát.`,
    author: "pixel_witch", avatar: "P", avatarColor: "#db2777",
    authorId: "mock_user_2",
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
    id: "mock_3", category: "code", pinned: false, hot: false, locked: false, solved: true,
    title: "Cursor AI beállítása React projekthez — teljes konfig + .cursorrules",
    preview: "Megosztom a .cursorrules fájlomat amit 3 hónap alatt finomítottam...",
    content: `Megosztom a **.cursorrules** fájlomat amit 3 hónap alatt finomítottam.`,
    author: "typescript_king", avatar: "T", avatarColor: "#34d399",
    authorId: "mock_user_3",
    time: "1 napja", views: 1876, likes: 234, comments: 47,
    tags: ["cursor", "react", "typescript", "tipp"],
    readTime: 3, poll: null,
  },
  {
    id: "mock_4", category: "audio", pinned: false, hot: false, locked: false, solved: false,
    title: "Suno v4 — prompting technikák amikkel profin szól a zene",
    preview: "A legtöbb ember rosszul használja a Suno-t. A kulcs nem a stílusban van, hanem a struktúra...",
    content: `A legtöbb ember rosszul használja a Suno-t.`,
    author: "beatmaker99", avatar: "B", avatarColor: "#ea580c",
    authorId: "mock_user_4",
    time: "3 napja", views: 987, likes: 89, comments: 31,
    tags: ["suno", "prompt", "zene", "tipp"],
    readTime: 5, poll: null,
  },
  {
    id: "mock_5", category: "threed", pinned: false, hot: true, locked: false, solved: false,
    title: "Meshy vs TripoSG — melyik generál jobb 3D modellt képből? [2025 teszt]",
    preview: "Teszteltem mindkét platformot ugyanazokkal a képekkel...",
    content: `Teszteltem mindkét platformot ugyanazokkal a referencia képekkel.`,
    author: "3d_builder", avatar: "3", avatarColor: "#0284c7",
    authorId: "mock_user_5",
    time: "1 hete", views: 2134, likes: 156, comments: 58,
    tags: ["meshy", "triposg", "3d", "összehasonlítás"],
    readTime: 4, poll: null,
  },
  {
    id: "mock_6", category: "chat", pinned: false, hot: false, locked: true, solved: false,
    title: "Hogyan írjak tökéletes system promptot? Bevált módszerek gyűjteménye",
    preview: "3 éve dolgozom prompt engineeringgel. Megosztom azokat a mintákat amik mindig működnek...",
    content: `3 éve dolgozom prompt engineeringgel. Ezek a minták mindig működnek.`,
    author: "prompt_guru", avatar: "G", avatarColor: "#a78bfa",
    authorId: "mock_user_6",
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
const SurfaceCard = ({ children, style = {}, className = "", hover = false }) => (
  <div className={className} style={{
    background: "#13111c",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "1rem",
    ...(hover ? { transition: "border-color 0.2s, transform 0.2s" } : {}),
    ...style,
  }}>{children}</div>
);

const TagPill = ({ label, color, active, onClick, count }) => (
  <button onClick={onClick} className="cursor-pointer transition-all active:scale-95 flex-shrink-0"
    style={{
      background: active ? `${color}12` : "transparent",
      border: `1px solid ${active ? color + "30" : "rgba(255,255,255,0.07)"}`,
      borderRadius: "2rem", padding: "0.25rem 0.625rem",
      color: active ? color : "#5a5470", fontSize: "0.7rem", fontWeight: active ? 600 : 500,
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
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl mb-3 transition-all duration-500"
      style={{ background: `${ann.color}06`, border: `1px solid ${ann.color}12` }}>
      <div className="flex items-center gap-2">
        <Megaphone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ann.color }} />
        <span className="text-white/80 text-xs font-medium">{ann.text}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1">
          {announcements.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className="cursor-pointer w-1 h-1 rounded-full transition-all"
              style={{ background: i === idx ? ann.color : "rgba(255,255,255,0.12)", transform: i === idx ? "scale(1.5)" : "scale(1)" }} />
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

const NOTIF_COLORS = {
  like: "#f472b6",
  comment: "#a78bfa",
  reply: "#34d399",
  mention: "#38bdf8",
  system: "#fbbf24",
};

const NotifDropdown = ({ notifs, onNotifClick, onDeleteAll, onDeleteOne, onClose }) => {
  return (
    <div className="absolute right-0 top-full w-80 rounded-2xl overflow-hidden mt-2"
      style={{ zIndex: 100000, background: "#13111c", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-white/90 font-semibold text-sm">Értesítések</span>
        <button onClick={(e) => { e.stopPropagation(); onDeleteAll(); }} className="cursor-pointer text-xs text-red-400 hover:text-red-300">Összes törlése</button>
      </div>
      {notifs.length === 0 && (
        <div className="px-4 py-6 text-center">
          <Bell className="w-6 h-6 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-600 text-xs">Nincs értesítés</p>
        </div>
      )}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {notifs.map(n => (
          <div key={n.id}
            onClick={(e) => { e.stopPropagation(); onNotifClick(n); }}
            className="flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group/notif"
            style={{ background: !n.read ? "rgba(139,92,246,0.04)" : "transparent" }}>
            {!n.read && <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: NOTIF_COLORS[n.type] || "#8b5cf6" }} />}
            {n.read && <div className="w-1.5 h-1.5 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed" style={{ color: n.read ? "#6b5f8a" : "#c4b5d8" }}>{n.text}</p>
              <p className="text-gray-600 text-xs mt-0.5">{typeof n.time === "string" ? n.time : formatNotifTime(n.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {!n.read && <CheckCircle className="w-3 h-3 text-gray-700" />}
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteOne(n.id); }}
                className="cursor-pointer p-1 rounded-md text-gray-700 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover/notif:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const isRead = viewedIds?.has(post.id);
  const isOwn = currentUserId && post.authorId === currentUserId;
  const canManage = isOwn || isAdmin;

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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.015 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group cursor-pointer relative overflow-hidden sm:overflow-visible"
      style={{
        background: "linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.4))",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: `${cat.color}25`,
        borderTop: `1px solid ${cat.color}40`,
        borderLeft: `1px solid ${cat.color}30`,
        borderRight: `1px solid ${cat.color}10`,
        borderBottom: `1px solid ${cat.color}10`,
        boxShadow: `0 20px 50px -10px rgba(0,0,0,0.8), 0 0 35px -10px ${cat.color}35, inset 0 1px 0 0 ${cat.color}20`,
        borderRadius: "1.5rem",
        padding: "1rem",
        marginBottom: "0.75rem",
        zIndex: showMenu ? 50 : "auto",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.2))";
        e.currentTarget.style.borderColor = `${cat.color}50`;
        e.currentTarget.style.borderTop = `1px solid ${cat.color}70`;
        e.currentTarget.style.borderLeft = `1px solid ${cat.color}60`;
        e.currentTarget.style.boxShadow = `0 30px 60px -15px rgba(0,0,0,0.9), 0 0 50px -10px ${cat.color}50, inset 0 1px 0 0 ${cat.color}40`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "linear-gradient(145deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.3))";
        e.currentTarget.style.borderColor = `${cat.color}25`;
        e.currentTarget.style.borderTop = `1px solid ${cat.color}40`;
        e.currentTarget.style.borderLeft = `1px solid ${cat.color}30`;
        e.currentTarget.style.boxShadow = `0 20px 50px -10px rgba(0,0,0,0.8), 0 0 35px -10px ${cat.color}35, inset 0 1px 0 0 ${cat.color}20`;
      }}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-5">

        {/* Left Column (Icon + Decorative) */}
        <div className="flex flex-col items-center mt-0.5 flex-shrink-0 self-stretch">
          {/* Avatar Logo */}
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: `inset 0 0 20px ${cat.color}10`
            }}>
            {cat.icon ? (
              <cat.icon className="w-4 h-4 sm:w-6 sm:h-6 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ color: cat.color }} />
            ) : (
              <span className="text-white/80 font-black italic text-base sm:text-xl uppercase transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ color: cat.color }}>
                {cat.emoji || "U"}
              </span>
            )}
          </div>

          {/* Premium Tech Circuit Tracker - hidden on mobile */}
          <div className="relative flex-1 w-full flex flex-col items-center mt-3 mb-1 min-h-[3.5rem] opacity-40 group-hover:opacity-100 transition-opacity duration-500 hidden sm:flex">
            {/* Background Track */}
            <div className="absolute inset-y-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

            {/* Data Pulse Core */}
            <div className="absolute top-2 w-[2px] h-10 rounded-full"
              style={{
                background: `linear-gradient(to bottom, transparent, ${cat.color}, transparent)`,
                boxShadow: `0 0 12px ${cat.color}`
              }} />

            {/* Cyber Nodes */}
            <div className="absolute top-4 w-2 h-2 rotate-45 border transition-all duration-300 group-hover:rotate-90 group-hover:scale-110"
              style={{ borderColor: cat.color, background: 'rgba(0,0,0,0.8)' }} />
            <div className="absolute top-8 w-1 h-1 rounded-full bg-white/50" />
            <div className="absolute top-12 w-3 h-px opacity-70"
              style={{ background: cat.color, boxShadow: `0 0 8px ${cat.color}` }} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">

          {/* Header: Cat Pill & Time */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.55rem] px-2 py-0.5 sm:px-3 sm:py-1 rounded-[1rem] font-black tracking-[0.25em] uppercase italic whitespace-nowrap"
              style={{ background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}25` }}>
              {cat.label}
            </span>
            <div className="flex items-center gap-1 sm:gap-2 text-[0.6rem] text-zinc-500 font-bold tracking-widest uppercase relative flex-shrink-0" ref={menuRef}>
              <span className="flex items-center gap-1 opacity-70">
                <Clock className="w-3 h-3" /> {post.time}
              </span>
              <span className="opacity-30 hidden sm:inline">•</span>

              {/* MORE / Menu Button */}
              <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
                className="flex items-center gap-0.5 cursor-pointer hover:text-zinc-300 transition-colors">
                TÖBB
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-2xl"
                  onClick={e => e.stopPropagation()}
                  style={{ zIndex: 9999, background: "#13111c", border: `1px solid ${cat.color}30`, boxShadow: `0 12px 40px rgba(0,0,0,0.8), 0 0 0 1px ${cat.color}15` }}>

                  <button onClick={e => { e.stopPropagation(); onBookmark(post.id); setShowMenu(false); }}
                    className="cursor-pointer w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                    <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "text-amber-400 fill-current" : ""}`} /> {bookmarked ? "Könyvjelző törlése" : "Mentés"}
                  </button>

                  {canManage && (
                    <>
                      <div className="border-t border-white/5 my-1" />
                      {isOwn && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setShowMenu(false); onEdit(post); }}
                            className="cursor-pointer w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                            <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Szerkesztés
                          </button>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setShowMenu(false); onToggle(post.id, "pinned", !post.pinned); }}
                            className="cursor-pointer w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                            <Pin className="w-3.5 h-3.5 text-amber-400" /> {post.pinned ? "Kitűzés levétele" : "Kitűzés"}
                          </button>
                        </>
                      )}
                      <div className="border-t border-white/5 my-1" />
                      <button onClick={e => { e.stopPropagation(); setShowMenu(false); onDelete(post.id, post.authorId); }}
                        className="cursor-pointer w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Törlés
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-black italic leading-tight py-1 transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] line-clamp-2"
            style={{ color: cat.color }}>
            {post.title}
          </h3>

          {/* Preview text */}
          <p className="text-zinc-400 text-[12px] sm:text-[13px] font-medium leading-relaxed line-clamp-2 mb-1">
            {post.preview || post.content?.slice(0, 160) || "Olvasás megkezdése..."}
          </p>

          {/* Footer row */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 flex-wrap gap-2">

            <div className="flex items-center gap-2 sm:gap-5 flex-wrap">
              {/* Author Pill */}
              <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg pr-2 sm:pr-3 pl-1 py-1 transition-all"
                style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)" }}>
                {post.avatarUrl || post.authorPhotoUrl ? (
                  <img src={post.avatarUrl || post.authorPhotoUrl} alt={post.author} className="w-4 h-4 sm:w-5 sm:h-5 rounded object-cover border border-white/10" />
                ) : (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center font-black text-[0.5rem] sm:text-[0.6rem] uppercase"
                    style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {post.avatar || post.author?.[0] || "U"}
                  </div>
                )}
                <span className="text-[0.55rem] sm:text-[0.6rem] font-black text-zinc-500 tracking-[0.2em] uppercase italic opacity-80 truncate max-w-[80px] sm:max-w-none">{post.author}</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 sm:gap-4 text-zinc-500 text-[0.65rem] sm:text-[0.7rem] font-bold">
                <span className="flex items-center gap-1 sm:gap-1.5 opacity-60 hover:opacity-100 transition-opacity"><MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{post.comments}</span>
                <span className="flex items-center gap-1 sm:gap-1.5 opacity-60 hover:opacity-100 transition-opacity"><Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{post.likes}</span>
                <span className="flex items-center gap-1 sm:gap-1.5 opacity-60 hover:opacity-100 transition-opacity"><Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{post.views?.toLocaleString()}</span>
              </div>
            </div>

            {/* Chevron Edge Button */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: `${cat.color}08`,
                border: `1px solid ${cat.color}20`,
                color: cat.color,
                boxShadow: `0 0 15px ${cat.color}15`
              }}>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

          </div>

        </div>

      </div>
    </motion.div>
  );
};

// ─── WYSIWYG Editor Styles ────────────────────────────────────────
const editorStyles = `
  .wysiwyg-editor h2 {
    color: #ffffff;
    font-weight: 700;
    font-size: 1.1rem;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .wysiwyg-editor h2::before {
    content: '';
    width: 3px;
    height: 1.2rem;
    background: #8b5cf6;
    border-radius: 99px;
    display: inline-block;
  }
  .wysiwyg-editor blockquote {
    border-left: 3px solid #8b5cf6;
    padding-left: 1rem;
    color: #9ca3af;
    font-style: italic;
    margin: 1rem 0;
  }
  .wysiwyg-editor pre {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 0.75rem;
    border-radius: 0.75rem;
    font-family: monospace;
    color: #67e8f9;
    margin: 1rem 0;
    white-space: pre-wrap;
  }
  .wysiwyg-editor ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 1rem 0;
  }
  .wysiwyg-editor li {
    margin-bottom: 0.25rem;
    color: #d1d5db;
  }
  .wysiwyg-editor a {
    color: #8b5cf6;
    text-decoration: underline;
  }
`;
const NewPostModal = ({ isOpen, onClose, defaultCategory, onSubmit, editPost = null }) => {
  const isEditMode = !!editPost;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCat, setSelectedCat] = useState(defaultCategory || "chat");
  const [tags, setTags] = useState("");
  const [addPoll, setAddPoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);

  const editorRef = useRef(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(!content);
  const cat = CATEGORIES.find(c => c.id === selectedCat);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && editPost) {
        setTitle(editPost.title || "");
        // Pre-fill contentEditable with HTML if needed, but since we store MD, 
        // we'll need a basic MD->HTML converter for editing
        const initialHtml = markdownToHtml(editPost.content || "");
        if (editorRef.current) {
          editorRef.current.innerHTML = initialHtml;
        }
        setContent(editPost.content || "");
        setIsEditorEmpty(!editPost.content);
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
        if (editorRef.current) editorRef.current.innerHTML = "";
        setContent("");
        setIsEditorEmpty(true);
        setSelectedCat(defaultCategory || "chat");
        setTags("");
        setAddPoll(false);
        setPollQ("");
        setPollOpts(["", ""]);
      }
    }
  }, [isOpen, isEditMode, editPost, defaultCategory]);

  if (!isOpen) return null;

  // Simple MD to HTML for initializing the editor in edit mode
  const markdownToHtml = (md) => {
    if (!md) return "";
    return md
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  // HTML to MD for serializing the editor content before submission
  const htmlToMarkdown = (html) => {
    let md = html
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n')
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      .replace(/<\/li>/g, '') // clean up
      .replace(/<ul>/g, '').replace(/<\/ul>/g, '')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<div>/g, '\n').replace(/<\/div>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]*>/g, ''); // strip any remaining tags
    return md.trim();
  };

  const addPollOpt = () => { if (pollOpts.length < 6) setPollOpts(p => [...p, ""]); };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleLink = () => {
    const url = window.prompt("Írd be a hivatkozás címét (URL):", "https://");
    if (url) handleFormat("createLink", url);
  };

  const handleEditorInput = (e) => {
    const html = e.currentTarget.innerHTML;
    setIsEditorEmpty(!e.currentTarget.textContent.trim() && !html.includes('<img') && !html.includes('<br'));
  };

  const handleSubmit = () => {
    if (!title.trim() || title.trim().length < 10) return;

    // Serialize editor HTML to Markdown
    const finalContent = editorRef.current ? htmlToMarkdown(editorRef.current.innerHTML) : "";

    const data = {
      title: title.trim(),
      content: finalContent,
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

  const ToolbarBtn = ({ icon: Icon, onClick, label }) => (
    <button onClick={onClick} title={label}
      className="cursor-pointer p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all active:scale-90 group relative">
      <Icon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black text-[0.6rem] text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </div>
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4" style={{ zIndex: 10000 }}>
      <style>{editorStyles}</style>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#13111c", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "92vh", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/5 flex-shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${cat?.color}15`, color: cat?.color }}>
              {isEditMode ? <Edit3 className="w-4 h-4" /> : <PenSquare className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isEditMode ? "Téma szerkesztése" : "Új téma indítása"}
              </h3>
              <p className="text-[0.6rem] text-gray-500 mt-1.5 uppercase tracking-widest font-bold opacity-40">Bejegyzés létrehozása</p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer p-2 rounded-xl text-gray-600 hover:text-white hover:bg-white/5 transition-all"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-6 space-y-7">
          {/* Category */}
          <div className="space-y-3">
            <label className="text-gray-500 text-[0.65rem] font-bold uppercase tracking-widest block opacity-70">Kategória választása</label>
            <div className="grid grid-cols-5 gap-2.5">
              {CATEGORIES.filter(c => c.id !== "all").map(c => (
                <button key={c.id} onClick={() => setSelectedCat(c.id)}
                  className="cursor-pointer flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: selectedCat === c.id ? `${c.color}15` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedCat === c.id ? c.color + "50" : "rgba(255,255,255,0.05)"}`,
                    color: selectedCat === c.id ? "#ffffff" : "#5a5470",
                    boxShadow: selectedCat === c.id ? `0 8px 20px ${c.color}20` : "none"
                  }}>
                  <span className="text-xl filter drop-shadow-sm">{c.emoji}</span>
                  <span className="font-bold text-[0.65rem] tracking-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <label className="text-gray-500 text-[0.65rem] font-bold uppercase tracking-widest block opacity-70">Téma megnevezése</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Miről szeretnél beszélgetni?"
              className="w-full px-5 py-4 rounded-2xl text-white text-[0.95rem] placeholder-gray-700 bg-white/[0.03] border border-white/[0.06] focus:border-purple-500/30 focus:outline-none transition-all shadow-inner"
            />
            <div className="flex justify-between items-center text-[0.6rem] px-1 font-bold tracking-wider">
              <span style={{ color: title.length > 0 && title.length < 10 ? "#f87171" : "#5a5470" }}>
                {title.length > 0 && title.length < 10 ? `SZÜKSÉGES: ${10 - title.length} KARAKTER` : "MINIMUM 10 KARAKTER ELEVE"}
              </span>
              <span className="opacity-40">{title.length}/200</span>
            </div>
          </div>

          {/* Editor */}
          <div className="space-y-3">
            <label className="text-gray-500 text-[0.65rem] font-bold uppercase tracking-widest block opacity-70">Kifejtés és részletek</label>
            <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden focus-within:border-purple-500/30 transition-all shadow-inner relative">
              <div className="px-3 py-2 border-b border-white/[0.04] bg-white/[0.01] flex items-center gap-1">
                <ToolbarBtn icon={Bold} onClick={() => handleFormat("bold")} label="Félkövér" />
                <ToolbarBtn icon={Italic} onClick={() => handleFormat("italic")} label="Dőlt" />
                <div className="w-px h-4 bg-white/10 mx-1.5" />
                <ToolbarBtn icon={Heading2} onClick={() => handleFormat("formatBlock", "h2")} label="Címsor" />
                <ToolbarBtn icon={Quote} onClick={() => handleFormat("formatBlock", "blockquote")} label="Idézet" />
                <ToolbarBtn icon={List} onClick={() => handleFormat("insertUnorderedList")} label="Felsorolás" />
                <div className="w-px h-4 bg-white/10 mx-1.5" />
                <ToolbarBtn icon={Code} onClick={() => handleFormat("formatBlock", "pre")} label="Kód" />
                <ToolbarBtn icon={Link} onClick={handleLink} label="Hivatkozás" />
              </div>
              <div className="relative min-h-[220px] flex flex-col">
                {isEditorEmpty && (
                  <div className="absolute top-4 left-5 text-gray-700 pointer-events-none text-[0.95rem] select-none">
                    Ide írd a bejegyzésed tartalmát...
                  </div>
                )}
                <div
                  ref={editorRef}
                  contentEditable={true}
                  onInput={handleEditorInput}
                  className="w-full px-5 py-4 text-white text-[0.95rem] bg-transparent focus:outline-none leading-relaxed min-h-[200px] wysiwyg-editor"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <label className="text-gray-500 text-[0.65rem] font-bold uppercase tracking-widest block opacity-70">Címkék hozzáfűzése</label>
            <div className="relative group">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 group-focus-within:text-purple-400 transition-colors" />
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="például: claude, tipp, hír (vesszővel elválasztva)"
                className="w-full pl-11 pr-5 py-4 rounded-2xl text-white text-sm placeholder-gray-700 bg-white/[0.03] border border-white/[0.06] focus:outline-none focus:border-purple-500/30 transition-all" />
            </div>
          </div>

          {/* Poll */}
          <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between group hover:border-emerald-500/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-white font-bold block leading-none text-sm">Szavazás indítása</span>
                <span className="text-[0.65rem] text-gray-500 mt-1.5 font-medium block">Interaktív kérdés a többi felhasználónak</span>
              </div>
            </div>
            <button onClick={() => setAddPoll(v => !v)}
              className="cursor-pointer relative w-11 h-6 rounded-full transition-all duration-300 shadow-inner"
              style={{ background: addPoll ? "#10b981" : "rgba(255,255,255,0.08)" }}>
              <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md"
                style={{ left: addPoll ? "24px" : "4px" }} />
            </button>
          </div>

          {addPoll && (
            <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
              <input value={pollQ} onChange={e => setPollQ(e.target.value)} placeholder="Tedd fel a kérdésed..."
                className="w-full px-5 py-3 rounded-xl text-white text-sm placeholder-gray-700 bg-white/[0.03] border border-white/[0.06] focus:outline-none" />
              <div className="space-y-3">
                {pollOpts.map((opt, i) => (
                  <div key={i} className="flex gap-3">
                    <input value={opt} onChange={e => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }}
                      placeholder={`${i + 1}. opció`}
                      className="flex-1 px-5 py-3 rounded-xl text-white text-sm placeholder-gray-700 bg-white/[0.03] border border-white/[0.06] focus:outline-none" />
                    {i > 1 && (
                      <button onClick={() => setPollOpts(p => p.filter((_, j) => j !== i))}
                        className="cursor-pointer p-2.5 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              {pollOpts.length < 6 && (
                <button onClick={addPollOpt} className="cursor-pointer text-xs font-bold text-gray-500 hover:text-white flex items-center gap-2 transition-all p-1">
                  <Plus className="w-4 h-4" /> Új opció hozzáadása
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-6 border-t border-white/5 flex gap-4 flex-shrink-0 bg-white/[0.01]">
          <button onClick={onClose} className="cursor-pointer flex-1 py-4 rounded-2xl text-sm font-bold text-gray-500 hover:text-white bg-white/[0.03] border border-white/[0.06] transition-all">Mégse</button>
          <button onClick={handleSubmit} disabled={title.trim().length < 10}
            className="cursor-pointer flex-[2] py-4 rounded-2xl text-sm text-white font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2.5"
            style={{
              background: cat ? `linear-gradient(135deg, ${cat.color}, ${cat.color}CC)` : "rgba(255,255,255,0.08)",
              boxShadow: cat && title.length >= 10 ? `0 12px 30px ${cat.color}35` : "none"
            }}>
            {isEditMode ? <CheckCircle className="w-4 h-4" /> : <Send className="w-5 h-5" />}
            {isEditMode ? "Változtatások mentése" : "Téma közzététele"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Törlés megerősítő dialog ─────────────────────────────────────
const ConfirmDialog = ({ isOpen, onConfirm, onCancel, message }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative rounded-2xl p-6 max-w-sm w-full"
        style={{ background: "#13111c", border: "1px solid rgba(239,68,68,0.15)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-white/90 font-semibold text-sm">Biztosan törlöd?</h3>
        </div>
        <p className="text-gray-500 text-xs mb-5 leading-relaxed">{message || "Ez a művelet nem vonható vissza."}</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="cursor-pointer flex-1 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            Mégse
          </button>
          <button onClick={onConfirm}
            className="cursor-pointer flex-1 py-2 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7c3aed, #dc2626)" }}>
            Törlés
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Kategória sidebar card ───────────────────────────────────────
const CatSidebarCard = ({ cat, isActive, onClick, threadCount }) => (
  <motion.button whileHover={{ scale: 1.03, x: 5 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} onClick={() => onClick(cat.id)} className="cursor-pointer w-full text-left transition-all duration-150 active:scale-[0.98]"
    style={{
      background: isActive ? `${cat.color}20` : "rgba(255,255,255,0.03)",
      border: `1px solid ${isActive ? cat.color + "50" : "rgba(255,255,255,0.1)"}`,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      borderRadius: "0.75rem",
      padding: "0.625rem 0.875rem",
    }}
    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; } }}
    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } }}>
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
        style={{ background: `${cat.color}10`, color: cat.color }}>{cat.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-white/80 font-medium text-[0.8rem]">{cat.label}</span>
          <span className="text-gray-600 text-[0.7rem] font-medium">{threadCount}</span>
        </div>
      </div>
    </div>
  </motion.button>
);

// ─── FŐ KOMPONENS ─────────────────────────────────────────────────
export default function Forum() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: globalUser } = useContext(MyUserContext);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("hot");
  const [search, setSearch] = useState("");
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [openPost, setOpenPost] = useState(null);
  const [isInitializingRoute, setIsInitializingRoute] = useState(() => !!getPostInfoFromURL());
  const [bookmarks, setBookmarks] = useState(new Set());
  const [viewedIds, setViewedIds] = useState(new Set());
  const [activeTagFilters, setActiveTagFilters] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterOwn, setFilterOwn] = useState(false);
  const [filterFollowed, setFilterFollowed] = useState(false);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [filterSolved, setFilterSolved] = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterHot, setFilterHot] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ─── Optimized Popular Tags (Firestore Aggregation) ──────────────
  const [popularTags, setPopularTags] = useState([]);

  useEffect(() => {
    // Top 15 tag lekérése a statisztikai táblából
    const q = query(
      collection(db, "forum_tag_stats"),
      orderBy("count", "desc"),
      limit(15)
    );

    const unsub = onSnapshot(q, (snap) => {
      const tags = snap.docs.map(d => ({
        label: d.id,
        count: d.data().count || 0,
        color: getTagColor(d.id)
      }));
      setPopularTags(tags);
    }, (err) => {
      console.error("Hiba a tag statisztikák betöltésekor:", err);
      // Fallback a meglévő posztokból való számításra ha üres a tábla (csak bootstrap idejére)
      if (posts.length > 0 && popularTags.length === 0) {
        // ... (elhagyható, ha már van adat a DB-ben)
      }
    });

    return unsub;
  }, []);

  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const initialSlugRef = useRef(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const accentColor = CATEGORIES.find(c => c.id === activeCategory)?.color || "#a78bfa";
  const activeQuickFiltersCount = [
    showOnlyBookmarks,
    filterOwn,
    filterFollowed,
    filterSolved,
    filterPinned,
    filterHot,
    activeTagFilters.length > 0,
    activeCategory !== "all",
    !!search,
  ].filter(Boolean).length;

  const handlePostClick = (post) => {
    // Increment views via status toggle
    toggleStatus(post.id, "views", (post.views || 0) + 1);
    navigate(`/forum/${post.category}/${post.slug || post.id}`);
  };

  const handleEdit = (post) => {
    setEditingPost(post);
  };

  // ── Auth state figyelés ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setCurrentUserId(user?.uid || null);
      setIsAdmin(!!user && ADMIN_UIDS.includes(user.uid));
      dbg("Auth state:", { uid: user?.uid, isAdmin: ADMIN_UIDS.includes(user?.uid) });
    });
    return unsub;
  }, []);

  // ── Értesítések Firebase figyelés ───────────────────────────────
  useEffect(() => {
    if (!currentUserId) { setNotifications([]); return; }
    const q = query(
      collection(db, "forum_notifications"),
      where("recipientId", "==", currentUserId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      dbg(`Notifications loaded: ${items.length}`);
      setNotifications(items);
    }, (err) => {
      console.error("Notification listener error:", err);
    });
    return unsub;
  }, [currentUserId]);

  useEffect(() => { dbg("confirmDelete state:", confirmDelete); }, [confirmDelete]);
  useEffect(() => { dbg("editingPost state:", editingPost ? `id=${editingPost.id}` : "null"); }, [editingPost]);

  useEffect(() => {
    if (!currentUserId) {
      setBookmarks(new Set());
      setFollowingIds(new Set());
      return;
    }

    // Load Bookmarks
    const loadBookmarks = async () => {
      try {
        const snap = await getDoc(doc(db, "forum_bookmarks", currentUserId));
        if (snap.exists() && snap.data().postIds) {
          setBookmarks(new Set(snap.data().postIds));
        } else {
          setBookmarks(new Set());
        }
      } catch (e) {
        console.error("Hiba a könyvjelzők betöltésekor:", e);
      }
    };
    loadBookmarks();

    // Load Following
    const qF = query(collection(db, "forum_follows"), where("followerId", "==", currentUserId));
    const unsubF = onSnapshot(qF, (snap) => {
      const ids = snap.docs.map(d => d.data().followedId);
      setFollowingIds(new Set(ids));
      dbg(`Following sync: ${ids.length} users`);
    }, (err) => console.error("Following listener error:", err));

    return () => unsubF();
  }, [currentUserId]);

  // ── Poszt keresése ───────────────────────────────────────────────
  const findPost = useCallback((category, slug, postList) => {
    return (
      postList.find(p => p.slug === slug && p.category === category) ||
      postList.find(p => p.slug === slug) ||
      null
    );
  }, []);

  // ── Firebase betöltés (Egyszeri betöltés) ────────────────────────
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

        // Összefésülés a mock adatokkal
        const allPosts = [...fbPosts, ...MOCK_POSTS];
        setPosts(allPosts);

        // REFRESH FIX: Azonnal ellenőrizzük az URL-t a betöltött adatokkal
        if (!initialSlugRef.current) {
          const info = getPostInfoFromURL();
          if (info) {
            const found = findPost(info.category, info.slug, allPosts);
            if (found) {
              setOpenPost(found);
              setViewedIds(prev => new Set([...prev, found.id]));
            }
          }
          initialSlugRef.current = true;
          setIsInitializingRoute(false);
        }
      } catch (e) {
        console.error("Firebase betöltési hiba:", e);
        if (!initialSlugRef.current) {
          initialSlugRef.current = true;
          setIsInitializingRoute(false);
        }
      }
    };
    loadFirebasePosts();
  }, [findPost]);

  // ── React Router location → openPost szinkronizáció ────────────
  // Ez az egyetlen megbízható módszer: a React Router location.pathname
  // változását figyeljük, és ennek alapján állítjuk be az openPost state-et.
  // A handleOpenPost és handleBack is navigate()-et használ, így ez mindig
  // lefut mind a Navbar Community linkre kattintásnál, mind a Vissza gomb,
  // mind pedig a böngésző vissza/előre gombjainál.
  useEffect(() => {
    const isPostRoute = /^\/forum\/([^/]+)\/(.+)/.exec(location.pathname);
    if (!isPostRoute) {
      // Nem poszt URL → zárjuk be a posztot
      if (openPost) setOpenPost(null);
    } else {
      // Poszt URL → nyissuk meg a megfelelő posztot (ha még nincs nyitva)
      const category = isPostRoute[1];
      const slug = isPostRoute[2];
      if (!openPost || openPost.slug !== slug) {
        const found = findPost(category, slug, posts);
        if (found) {
          setOpenPost(found);
          setViewedIds(prev => new Set([...prev, found.id]));
        }
      }
    }
  }, [location.pathname, posts, findPost]);

  useEffect(() => {
    const handler = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleFollow = async (followedId) => {
    if (!currentUserId || !followedId || followedId === currentUserId) return;

    try {
      const q = query(
        collection(db, "forum_follows"),
        where("followerId", "==", currentUserId),
        where("followedId", "==", followedId)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        // Unfollow
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        dbg("Unfollowed user:", followedId);
      } else {
        // Follow
        await addDoc(collection(db, "forum_follows"), {
          followerId: currentUserId,
          followedId,
          createdAt: serverTimestamp()
        });
        dbg("Followed user:", followedId);
      }
    } catch (e) {
      console.error("Toggle follow error:", e);
    }
  };

  const toggleBookmark = async (id) => {
    const isBookmarked = bookmarks.has(id);
    setBookmarks(p => {
      const n = new Set(p);
      isBookmarked ? n.delete(id) : n.add(id);
      return n;
    });

    if (currentUserId) {
      try {
        const ref = doc(db, "forum_bookmarks", currentUserId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { postIds: [id] });
        } else {
          await updateDoc(ref, {
            postIds: isBookmarked ? arrayRemove(id) : arrayUnion(id)
          });
        }
      } catch (e) {
        console.error("Hiba a könyvjelző mentésekor:", e);
      }
    }
  };

  const handleOpenPost = (post) => {
    setViewedIds(p => new Set([...p, post.id]));
    // navigate() használata pushState helyett, hogy a React Router
    // location.pathname is frissüljön → a location useEffect zárja/nyitja a posztot
    navigate(`/forum/${post.category}/${post.slug || post.id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    navigate("/forum");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Értesítés kezelők ────────────────────────────────────────
  const handleNotifClick = async (notif) => {
    try {
      if (!notif.read) {
        await updateDoc(doc(db, "forum_notifications", notif.id), { read: true });
      }

      // Navigáció a bejegyzéshez
      if (notif.postId) {
        // 1. Megpróbáljuk megkeresni a helyi állapotban
        let postToOpen = posts.find(p => p.id === notif.postId);

        // 2. Ha nincs meg (pl. most jött létre és nem frissült még a tábla), lekérjük a DB-ből
        if (!postToOpen) {
          dbg("[Forum] Notification post missing from state, fetching from DB:", notif.postId);
          const pSnap = await getDoc(doc(db, "forum_posts", notif.postId));
          if (pSnap.exists()) {
            const data = pSnap.data();
            postToOpen = {
              ...data,
              id: pSnap.id,
              time: formatFirebaseTime(data.createdAt),
              slug: data.slug || generateSlug(data.title || ""),
            };
            // Hozzáadjuk a listához, hogy később is meg legyen
            setPosts(prev => [postToOpen, ...prev]);
          }
        }

        if (postToOpen) {
          handleOpenPost(postToOpen);
        } else {
          console.warn("[Forum] Notification linked post not found even in DB:", notif.postId);
          // Fallback: Ha van kategória és slug, próbáljunk oda navigálni hátha a route betölti
          if (notif.category && notif.slug) {
            pushPostURL(notif.category, notif.slug);
          }
        }
      }
      setShowNotifs(false);
    } catch (e) { console.error("Notif click error:", e); }
  };

  const deleteNotification = async (notifId) => {
    try {
      await deleteDoc(doc(db, "forum_notifications", notifId));
      dbg("Notification deleted:", notifId);
    } catch (e) { console.error("Notif delete error:", e); }
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, "forum_notifications", n.id));
      });
      await batch.commit();
      dbg("All notifications deleted for user:", currentUserId);
    } catch (e) { console.error("Notif batch delete error:", e); }
  };

  // Értesítés létrehozás segédfüggvény
  const createNotification = async (recipientId, type, text, extraData = {}) => {
    if (!recipientId || recipientId === currentUserId) return; // ne értesítsd magad
    try {
      await addDoc(collection(db, "forum_notifications"), {
        recipientId,
        type,
        text,
        read: false,
        createdAt: serverTimestamp(),
        ...extraData
      });
      dbg("Notification created:", { recipientId, type, text, ...extraData });
    } catch (e) { console.error("Create notif error:", e); }
  };

  // ── Új / szerkesztett poszt mentése ─────────────────────────────
  // ── Új poszt értesítés követőknek ─────────────────────────────
  const notifyFollowersNewPost = async (authorId, authorName, postTitle, postId, category, slug) => {
    if (!authorId) return;
    try {
      const q = query(collection(db, "forum_follows"), where("followedId", "==", authorId));
      const snap = await getDocs(q);

      const notifPromises = snap.docs.map(d => {
        const followerId = d.data().followerId;
        return createNotification(
          followerId,
          "system",
          `${authorName} új témát indított: "${postTitle}"`,
          { postId, category, slug }
        );
      });

      await Promise.all(notifPromises);
      dbg(`Follower notifications sent: ${snap.docs.length}`);
    } catch (e) {
      console.error("Notify followers error:", e);
    }
  };

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

      // ─── TAG STATS UPDATE ───────────────────────────────────────
      if (postData.tags && postData.tags.length > 0) {
        const batch = writeBatch(db);
        postData.tags.forEach(tag => {
          const cleanTag = tag.trim().toLowerCase();
          if (cleanTag) {
            const tagRef = doc(db, "forum_tag_stats", cleanTag);
            batch.set(tagRef, { count: increment(1) }, { merge: true });
          }
        });
        await batch.commit();
        dbg("Tag statisztikák frissítve (increment)");
      }
    } catch (e) {
      console.error("Firebase mentési hiba:", e);
    }

    setPosts(p => [{ ...postData, id: finalId }, ...p]);

    // Értesítjük a követőket az új posztról
    notifyFollowersNewPost(currentUserId, postData.author, postData.title, finalId, postData.category, postData.slug);
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
        // Poszt adatok lekérése a tagek miatt a törlés előtt
        const postSnap = await getDoc(doc(db, "forum_posts", postIdStr));
        if (postSnap.exists()) {
          const postTags = postSnap.data().tags || [];

          await deleteDoc(doc(db, "forum_posts", postIdStr));
          dbg("Firebase törlés OK:", postIdStr);

          // ─── TAG STATS UPDATE ─────────────────────────────────────
          if (postTags.length > 0) {
            const batch = writeBatch(db);
            postTags.forEach(tag => {
              const cleanTag = tag.trim().toLowerCase();
              if (cleanTag) {
                const tagRef = doc(db, "forum_tag_stats", cleanTag);
                batch.set(tagRef, { count: increment(-1) }, { merge: true });
              }
            });
            await batch.commit();
            dbg("Tag statisztikák frissítve (decrement)");
          }
        }
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

    // 1. Optimista UI: azonnal frissítjük a lokális state-eket
    setPosts(p => p.map(post =>
      String(post.id) === postIdStr ? { ...post, [field]: value } : post
    ));

    if (openPost && String(openPost.id) === postIdStr) {
      setOpenPost(prev => ({ ...prev, [field]: value }));
    }

    // 2. Háttérben elküldjük a Firebase-nek
    const isFbPost = !postIdStr.startsWith("local_") &&
      !postIdStr.startsWith("mock_") &&
      isNaN(Number(postIdStr));

    if (isFbPost) {
      try {
        await updateDoc(doc(db, "forum_posts", postIdStr), { [field]: value });
        dbg(`Firebase mentés sikeres: ${field}=${value}`);
      } catch (e) {
        console.error(`!!! FIREBASE MENTÉSI HIBA. Ellenőrizd a szabályokat a Firebase konzolban!`, e);
      }
    } else {
      dbg("Helyi/Mock poszt módosítva - a változás frissítés után elvész (nem Firebase poszt).");
    }
  };

  // ── Like kezelése ────────────────────────────────────────────────
  const handleLikePost = useCallback(async (postId) => {
    if (!currentUserId) return;
    const postIdStr = String(postId);

    let isLikedNow = false;

    // 1. Állam frissítése belső updaterrel a konkurrencia miatt
    const updateState = (prevPosts) => {
      return prevPosts.map(p => {
        if (String(p.id) !== postIdStr) return p;

        const isLiked = p.likedIds?.includes(currentUserId);
        isLikedNow = isLiked; // Ezt használjuk majd a Firebase híváshoz

        const newLikes = isLiked ? Math.max(0, (p.likes || 0) - 1) : (p.likes || 0) + 1;
        const newLikedIds = isLiked
          ? (p.likedIds || []).filter(id => id !== currentUserId)
          : [...(p.likedIds || []), currentUserId];

        return { ...p, likes: newLikes, likedIds: newLikedIds };
      });
    };

    setPosts(prev => updateState(prev));
    setOpenPost(prev => {
      if (!prev || String(prev.id) !== postIdStr) return prev;
      const isLiked = prev.likedIds?.includes(currentUserId);
      const newLikes = isLiked ? Math.max(0, (prev.likes || 0) - 1) : (prev.likes || 0) + 1;
      const newLikedIds = isLiked
        ? (prev.likedIds || []).filter(id => id !== currentUserId)
        : [...(prev.likedIds || []), currentUserId];
      return { ...prev, likes: newLikes, likedIds: newLikedIds };
    });

    // 2. Firebase szinkronizáció
    const isFbPost = !postIdStr.startsWith("local_") && !postIdStr.startsWith("mock_") && isNaN(Number(postIdStr));
    if (isFbPost) {
      try {
        const postRef = doc(db, "forum_posts", postIdStr);
        // Itt megint meg kell néznünk a pillanatnyi állapotot a Firebase-hez,
        // de az optimista UI már lefutott. A backendnél az increment() és arrayUnion() atomi.
        await updateDoc(postRef, {
          likes: increment(isLikedNow ? -1 : 1),
          likedIds: isLikedNow ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
        });
      } catch (e) {
        console.error("Hiba a kedvelés mentésekor:", e);
      }
    }
  }, [currentUserId]);


  // ── Szűrés + rendezés ────────────────────────────────────────────
  const filteredPosts = posts.filter(p => {
    if (showOnlyBookmarks && !bookmarks.has(p.id)) return false;
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (activeTagFilters.length > 0 && !activeTagFilters.every(t => p.tags?.includes(t))) return false;
    if (filterOwn && p.authorId !== currentUserId) return false;
    if (filterFollowed && !followingIds.has(p.authorId)) return false;
    if (filterSolved && !p.solved) return false;
    if (filterPinned && !p.pinned) return false;
    if (filterHot && !p.hot) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.tags.some(t => t.includes(search.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "hot") return (b.likes * 3 + b.views / 10 + b.comments * 2) - (a.likes * 3 + a.views / 10 + a.comments * 2);
    if (sortBy === "new") return String(b.id) > String(a.id) ? 1 : -1;
    if (sortBy === "top") return b.likes - a.likes;
    if (sortBy === "views") return b.views - a.views;
    return 0;
  });

  const categoryCounts = useMemo(() => {
    const counts = {};
    posts.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [posts]);

  const totalThreads = posts.length;

  const resetFilters = () => {
    setActiveCategory("all");
    setActiveTagFilters([]);
    setShowOnlyBookmarks(false);
    setFilterOwn(false);
    setFilterFollowed(false);
    setFilterSolved(false);
    setFilterPinned(false);
    setFilterHot(false);
    setSortBy("hot");
    setSearch("");
  };

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

      {/* Új poszt modal */}
      <NewPostModal
        isOpen={newPostOpen}
        onClose={() => setNewPostOpen(false)}
        defaultCategory={activeCategory !== "all" ? activeCategory : "chat"}
        onSubmit={handleNewPost}
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
  if (isInitializingRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: "#06050a" }}>
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

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
          isBookmarked={bookmarks.has(openPost?.id)}
          onBookmark={toggleBookmark}
          isFollowing={followingIds.has(openPost?.authorId)}
          onToggleFollow={toggleFollow}
          onDelete={(id, authorId) => {
            dbg("ForumPost onDelete:", { id, authorId });
            setConfirmDelete({ id, authorId });
          }}
          onEdit={(post) => {
            dbg("ForumPost onEdit:", post.id);
            setEditingPost(post);
          }}
          onToggle={handleToggleField}
          onLike={handleLikePost}
        />
        {sharedModals}
      </>
    );
  }

  // ── Fórum lista nézet ────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden text-white"
      style={{
        backgroundColor: "transparent",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
      }}>

      {/* ── Studio Background ── */}
      <ForumBackground />



      <div className="relative z-10 w-full overflow-x-hidden">

        {/* ══ SEARCH & ACTIONS ══ */}
        <div className="relative z-50 max-w-[1200px] mx-auto px-3 sm:px-4 mt-5 mb-6">
          {/* Search bar — full width, own row */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Keress a fórumon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#13111c] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/20 transition-all"
            />
          </div>

          {/* Action buttons — separate row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium">{posts.length} téma</span>
              <span className="text-gray-700">·</span>
              <span>{totalThreads.toLocaleString()} összesen</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="cursor-pointer p-2.5 rounded-xl bg-[#13111c] border border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
                {showNotifs && (
                  <NotifDropdown
                    notifs={notifications}
                    onNotifClick={handleNotifClick}
                    onDeleteAll={deleteAllNotifications}
                    onDeleteOne={deleteNotification}
                    onClose={() => setShowNotifs(false)}
                  />
                )}
              </div>

              <button
                onClick={() => setNewPostOpen(true)}
                className="px-6 py-2.5 rounded-[1rem] text-[0.65rem] font-black uppercase tracking-[0.2em] italic transition-all flex items-center gap-2 hover:scale-105 active:scale-95 group/btn relative overflow-hidden"
                style={{
                  background: `${accentColor}10`,
                  color: accentColor,
                  border: `1px solid ${accentColor}30`,
                  boxShadow: `inset 0 0 15px ${accentColor}10, 0 5px 25px ${accentColor}15`
                }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-10 transition-opacity" />
                <span className="tracking-[0.25em]">Új Téma</span> <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        <main className="relative z-10 max-w-[1200px] mx-auto px-3 sm:px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 pb-16">
          {/* Left Column: Post List */}
          <div>


            <div className="mb-5 space-y-3">
              <div
                className="rounded-xl border p-3 sm:p-4"
                style={{
                  background: "#13111c",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-lg"
                          style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}18` }}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        </div>
                        <div>
                          <div className="text-[0.68rem] font-semibold text-white/80">
                            Szűrők
                          </div>
                          <div className="text-xs text-gray-600">
                            {filteredPosts.length} találat • {activeQuickFiltersCount} aktív szűrő
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#9a90a8" }}
                      >
                        {activeCategory === "all" ? "Összes kategória" : CATEGORIES.find(c => c.id === activeCategory)?.label}
                      </div>
                      <button
                        onClick={resetFilters}
                        className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-white/5"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: activeQuickFiltersCount > 0 ? "#c4b5d8" : "#5a5470" }}
                      >
                        Szűrők törlése
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="mb-2.5 flex items-center gap-2 text-[0.62rem] font-semibold tracking-wide uppercase text-gray-600">
                        <Zap className="w-3 h-3" />
                        Gyorsszűrők
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            key: "bookmarks",
                            active: showOnlyBookmarks,
                            onClick: () => setShowOnlyBookmarks(v => !v),
                            label: "Könyvjelző",
                            icon: Bookmark,
                            color: "#fbbf24",
                            fill: true,
                          },
                          {
                            key: "pinned",
                            active: filterPinned,
                            onClick: () => setFilterPinned(v => !v),
                            label: "Kitűzött",
                            icon: Pin,
                            color: "#f59e0b",
                          },
                          {
                            key: "solved",
                            active: filterSolved,
                            onClick: () => setFilterSolved(v => !v),
                            label: "Megoldott",
                            icon: CheckCircle,
                            color: "#4ade80",
                          },
                          {
                            key: "own",
                            active: filterOwn,
                            onClick: () => setFilterOwn(v => !v),
                            label: "Saját",
                            icon: User,
                            color: "#a855f7",
                          },
                          {
                            key: "followed",
                            active: filterFollowed,
                            onClick: () => setFilterFollowed(v => !v),
                            label: "Követett",
                            icon: Rss,
                            color: "#38bdf8",
                          },
                        ].map(item => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.key}
                              onClick={item.onClick}
                              className="cursor-pointer group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                              style={{
                                background: item.active ? `${item.color}10` : "transparent",
                                border: `1px solid ${item.active ? `${item.color}25` : "rgba(255,255,255,0.05)"}`,
                                color: item.active ? "#ffffff" : "#7a7490",
                              }}
                            >
                              <Icon className={`w-3.5 h-3.5 ${item.fill && item.active ? "fill-current" : ""}`} style={{ color: item.color }} />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="mb-2.5 flex items-center gap-2 text-[0.62rem] font-semibold tracking-wide uppercase text-gray-600">
                        <TrendingUp className="w-3 h-3" />
                        Rendezés
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "hot", label: "Felkapott", icon: Flame, tone: "#fb923c" },
                          { id: "top", label: "Legjobb", icon: Trophy, tone: "#a78bfa" },
                          { id: "new", label: "Legújabb", icon: Clock, tone: "#38bdf8" },
                          { id: "views", label: "Népszerű", icon: Eye, tone: "#34d399" },
                        ].map(option => {
                          const Icon = option.icon;
                          const active = sortBy === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => setSortBy(option.id)}
                              className="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all"
                              style={{
                                background: active ? `${option.tone}10` : "transparent",
                                border: `1px solid ${active ? `${option.tone}25` : "rgba(255,255,255,0.05)"}`,
                                color: active ? "#ffffff" : "#7a7490",
                              }}
                            >
                              <Icon className="w-3.5 h-3.5" style={{ color: option.tone }} />
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {(activeTagFilters.length > 0 || activeCategory !== "all" || search) && (
                    <div
                      className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="mb-2.5 text-[0.62rem] font-semibold tracking-wide uppercase text-gray-600">
                        Aktív szűrések
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeTagFilters.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setActiveTagFilters(prev => prev.filter(t => t !== tag))}
                            className="cursor-pointer flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
                            style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20`, color: accentColor }}
                          >
                            <Tag className="w-3 h-3" />
                            #{tag}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                        {activeCategory !== "all" && (
                          <button
                            onClick={() => setActiveCategory("all")}
                            className="cursor-pointer flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
                            style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20`, color: accentColor }}
                          >
                            <Hash className="w-3 h-3" />
                            {CATEGORIES.find(c => c.id === activeCategory)?.label}
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {search && (
                          <button
                            onClick={() => setSearch("")}
                            className="cursor-pointer flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#9a90a8" }}
                          >
                            <Search className="w-3 h-3" />
                            {search}
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {filteredPosts.length === 0 && (
                <div className="bg-[#13111c] border border-white/5 rounded-xl p-8 text-center">
                  <HelpCircle className="w-8 h-8 mx-auto mb-3 text-gray-700" />
                  <p className="text-white/80 font-medium mb-1">Nincs találat ezekre a szűrőkre</p>
                  <p className="text-sm text-gray-600 mb-4">Próbálj másik kategóriát, taget vagy gyorsszűrőt választani.</p>
                  <button
                    onClick={resetFilters}
                    className="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}
                  >
                    Összes szűrő törlése
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => handleOpenPost(post)}
                  bookmarked={bookmarks.has(post.id)}
                  onBookmark={toggleBookmark}
                  viewedIds={viewedIds}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onDelete={(id, authorId) => setConfirmDelete({ id, authorId })}
                  onEdit={handleEdit}
                  onToggle={handleToggleField}
                />
              ))}
            </div>

            <div className="flex justify-center mt-10">
              <button className="bg-white/5 border border-white/5 text-gray-500 px-8 py-3 rounded-xl text-xs font-medium hover:bg-white/8 hover:text-gray-300 transition-all">
                További témák betöltése
              </button>
            </div>
          </div>

          {/* Right Column: Sidebar - hidden on mobile, shown on lg+ */}
          <div className="space-y-4 hidden lg:block">
            {/* Categories Widget */}
            <SurfaceCard style={{ padding: "1rem" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-semibold text-white/80">Kategóriák</span>
                </div>
                <div className="flex items-center gap-2 text-[0.65rem] text-gray-600">
                  <span>{totalThreads.toLocaleString()} téma</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {CATEGORIES.map(cat => (
                  <CatSidebarCard
                    key={cat.id}
                    cat={cat}
                    isActive={activeCategory === cat.id}
                    onClick={setActiveCategory}
                    threadCount={cat.id === "all" ? posts.length : categoryCounts[cat.id] || 0}
                  />
                ))}
              </div>
            </SurfaceCard>

            {/* Tags Widget */}
            <SurfaceCard style={{ padding: "1rem" }}>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-white/80">Népszerű tagek</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map(tag => (
                  <TagPill
                    key={tag.label}
                    label={tag.label}
                    count={tag.count}
                    color={tag.color}
                    active={activeTagFilters.includes(tag.label)}
                    onClick={() => setActiveTagFilters(prev =>
                      prev.includes(tag.label) ? prev.filter(t => t !== tag.label) : [...prev, tag.label]
                    )}
                  />
                ))}
                {popularTags.length === 0 && (
                  <p className="text-[0.65rem] text-gray-600 italic">Nincsenek elérhető tagek...</p>
                )}
              </div>
            </SurfaceCard>



            {/* Activity Widget */}
            <SurfaceCard style={{ padding: "1rem" }}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-white/80">Aktivitás</span>
              </div>

              <div className="space-y-4 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/5" />
                {RECENT_ACTIVITY.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex gap-3 relative z-10">
                    <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#0c0a12", border: "2px solid #1a1129" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
                    </div>
                    <div>
                      <p className="text-[0.68rem] text-gray-500">
                        <span className="font-medium text-white/80">{a.user}</span> {a.action}
                      </p>
                      <p className="text-xs font-medium text-white/70 mt-0.5">"{a.post}"</p>
                      <span className="text-[0.6rem] text-gray-700 mt-0.5 block">{a.time}P</span>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>

          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                  onClick={() => setMobileSidebarOpen(false)}
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="lg:hidden fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] overflow-y-auto p-4"
                  style={{ background: "#0a0814", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-sm">Szűrők és Kategóriák</h3>
                    <button onClick={() => setMobileSidebarOpen(false)} className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {/* Categories Widget (Mobile) */}
                    <SurfaceCard style={{ padding: "1rem" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-xs font-semibold text-white/80">Kategóriák</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {CATEGORIES.map(cat => (
                          <CatSidebarCard
                            key={cat.id}
                            cat={cat}
                            isActive={activeCategory === cat.id}
                            onClick={(id) => { setActiveCategory(id); setMobileSidebarOpen(false); }}
                            threadCount={cat.id === "all" ? posts.length : categoryCounts[cat.id] || 0}
                          />
                        ))}
                      </div>
                    </SurfaceCard>

                    {/* Tags Widget (Mobile) */}
                    <SurfaceCard style={{ padding: "1rem" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs font-semibold text-white/80">Népszerű tagek</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {popularTags.map(tag => (
                          <TagPill
                            key={tag.label}
                            label={tag.label}
                            count={tag.count}
                            color={tag.color}
                            active={activeTagFilters.includes(tag.label)}
                            onClick={() => setActiveTagFilters(prev =>
                              prev.includes(tag.label) ? prev.filter(t => t !== tag.label) : [...prev, tag.label]
                            )}
                          />
                        ))}
                      </div>
                    </SurfaceCard>

                    {/* Activity (Mobile) */}
                    <SurfaceCard style={{ padding: "1rem" }}>
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-xs font-semibold text-white/80">Aktivitás</span>
                      </div>
                      <div className="space-y-4 relative">
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/5" />
                        {RECENT_ACTIVITY.slice(0, 3).map((a, i) => (
                          <div key={i} className="flex gap-3 relative z-10">
                            <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#0c0a12", border: "2px solid #1a1129" }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
                            </div>
                            <div>
                              <p className="text-[0.68rem] text-gray-500">
                                <span className="font-medium text-white/80">{a.user}</span> {a.action}
                              </p>
                              <p className="text-xs font-medium text-white/70 mt-0.5">"{a.post}"</p>
                              <span className="text-[0.6rem] text-gray-700 mt-0.5 block">{a.time}P</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SurfaceCard>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </main>
      </div>

      {sharedModals}
    </div>
  );
}
