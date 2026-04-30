import React, { useState, useRef, useEffect, useContext, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { MyUserContext } from "../context/MyUserProvider";
import { auth, db } from "../firebase/firebaseApp";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  query, orderBy, serverTimestamp, getDoc, onSnapshot, where, limit, Timestamp, writeBatch,
  increment, arrayUnion, arrayRemove
} from "firebase/firestore";
import {
  ArrowLeft, ThumbsUp, Eye, MessageSquare, Clock, Pin, Flame,
  Share2, Bookmark, MoreHorizontal, Send, ChevronDown, ChevronUp,
  Check, Copy, Sparkles, Bot, User, Reply, Trash2, Flag,
  Hash, TrendingUp, Star, Heart, Smile, Lock, CheckCircle,
  AlertCircle, Award, Edit3, X, BarChart2, RefreshCw,
  ArrowUp, Zap, AtSign, Bold, Italic, Code,
  List, Quote, ChevronRight, Image, Music, Box,
  PenSquare, Shield, Search, Rss, Link, Unlock,
} from "lucide-react";
import ForumAnimatedBg from "../components/ForumAnimatedBg";
import {
  applyProfileToForumComment,
  applyProfileToForumPost,
  fetchPublicProfile,
  getProfileAvatarUrl,
  getProfileDisplayName,
  getProfileInitial,
} from "../utils/communityProfiles";
import { REPORT_REASONS, submitContentReport } from "../utils/reports";

const CATEGORIES = {
  code: { label: "Code AI", color: "#34d399", icon: Code },
  image: { label: "Image AI", color: "#f472b6", icon: Image },
  audio: { label: "Audio AI", color: "#fb923c", icon: Music },
  threed: { label: "3D AI", color: "#38bdf8", icon: Box },
};

const CategoryIcon = ({ category, className = "w-3 h-3", style = {} }) => {
  const Icon = category?.icon || Hash;
  return <Icon className={className} style={{ color: category?.color, ...style }} />;
};

const CategoryLabel = ({ category, className = "" }) => (
  <span className={`inline-flex items-center gap-1 ${className}`}>
    <CategoryIcon category={category} className="w-3 h-3" />
    {category?.label || "Code AI"}
  </span>
);

const ADMIN_UIDS = ["T7fU9Zp3N5M9wz2G8xQ4L1rV6bY2"];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const HIDDEN_CONTENT_STATUSES = new Set(["hidden", "deleted", "removed"]);
const isVisibleComment = (comment) => {
  if (!comment || comment.isHidden === true || comment.deletedAt) return false;
  return !HIDDEN_CONTENT_STATUSES.has(String(comment.status || "").toLowerCase());
};

// ─── Related topics fallback ─────────────────────────────────
const RELATED_MOCK = [
  {
    id: "rm2", category: "code",
    title: "GitHub Copilot vs Cursor AI - 2025 comparison",
    likes: 134, comments: 41, time: "5 d ago",
    tags: ["cursor", "copilot"],
  },
  {
    id: "rm3", category: "image",
    title: "Midjourney Sref codes: the secret to style consistency",
    likes: 201, comments: 58, time: "1 w ago",
    tags: ["midjourney", "prompt"],
  },
  {
    id: "rm4", category: "audio",
    title: "Suno v4 prompting: structure, chorus, mood",
    likes: 76, comments: 18, time: "4 d ago",
    tags: ["suno", "prompt"],
  },
];

// ─── Mock comments ────────────────────────────────────────────────
const INITIAL_COMMENTS = [
  {
    id: 1, parentId: null,
    author: "typescript_king", avatar: "T", avatarColor: "#34d399",
    content: "I completely agree about the difference on long files. In my 800-line React component refactor, Claude was simply much better. GPT-4o got \"lost\" halfway through.",
    time: "1 h ago", likes: 34, likedIds: [], pinned: true,
    replies: [
      {
        id: 11, parentId: 1,
        author: "devmaster_hu", avatar: "D", avatarColor: "#7c3aed",
        content: "Yes, exactly my experience too. The 200k-token context window matters a lot in these cases.",
        time: "45 min ago", likes: 12, likedIds: [], isOP: true,
        replies: [],
      },
      {
        id: 12, parentId: 1,
        author: "react_wizard", avatar: "R", avatarColor: "#f472b6",
        content: "Interesting, I had the opposite experience... maybe it depends on the model version? Which Claude did you test?",
        time: "30 min ago", likes: 5, likedIds: [],
        replies: [],
      },
    ],
  },
  {
    id: 2, parentId: null,
    author: "pixel_witch", avatar: "P", avatarColor: "#db2777",
    content: "The unit test part surprised me too. I expected Claude to be better there as well, but GPT really seems to know Jest/Vitest syntax better. Has anyone tried both in Cursor?",
    time: "55 min ago", likes: 21, likedIds: [], pinned: false,
    replies: [],
  },
  {
    id: 3, parentId: null,
    author: "prompt_guru", avatar: "G", avatarColor: "#a78bfa",
    content: `Good comparison! I would add one thing: the quality of the **system prompt** makes a huge difference. This is the template I use:

\`\`\`
You are an expert software engineer. When refactoring code:
1. Preserve all existing functionality
2. Improve readability and maintainability  
3. Add JSDoc comments to all functions
4. Point out potential bugs you notice
\`\`\`

This makes Claude's performance stand out even more.`,
    time: "40 min ago", likes: 67, likedIds: [], pinned: false,
    replies: [
      {
        id: 31, parentId: 3,
        author: "beatmaker99", avatar: "B", avatarColor: "#ea580c",
        content: "This is gold, thanks! I am trying it right away.",
        time: "25 min ago", likes: 8, likedIds: [],
        replies: [],
      },
    ],
  },
  {
    id: 4, parentId: null,
    author: "3d_builder", avatar: "3", avatarColor: "#0284c7",
    content: "It would be worth running the same test with Gemini 2.5 Pro. Someone recently said it may already beat Claude at coding.",
    time: "20 min ago", likes: 15, likedIds: [], pinned: false,
    replies: [],
  },
];


// ─── Firebase timestamp → olvasható szöveg ────────────────────────
const formatFirebaseTime = (timestamp) => {
  if (!timestamp?.toDate) return "Recently";
  const date = timestamp.toDate();
  const diff = Date.now() - date;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d ago`;
  return `${Math.floor(d / 7)} w ago`;
};



// ─── Markdown renderer ────────────────────────────────────────────
const renderMd = (text) => {
  if (!text) return null;
  const safeUrl = (url) => /^(https?:\/\/|mailto:)/i.test(String(url || "").trim()) ? String(url).trim() : "";
  const renderInline = (line, keyPrefix) => {
    return String(line || "")
      .split(/(`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/gi)
      .map((chunk, ci) => {
        if (!chunk) return null;

        const linkMatch = chunk.match(/^\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)$/i);
        if (linkMatch) {
          const href = safeUrl(linkMatch[2]);
          return href ? (
            <a key={`${keyPrefix}-link-${ci}`} href={href} target="_blank" rel="noreferrer" className="text-purple-300 hover:text-purple-200 underline underline-offset-2">
              {linkMatch[1]}
            </a>
          ) : linkMatch[1];
        }

        if (chunk.startsWith("`") && chunk.endsWith("`")) {
          return <code key={`${keyPrefix}-code-${ci}`} className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#0c0a12", color: "#67e8f9", border: "1px solid rgba(255,255,255,0.06)" }}>{chunk.slice(1, -1)}</code>;
        }
        if (chunk.startsWith("***") && chunk.endsWith("***")) {
          return <strong key={`${keyPrefix}-bold-italic-${ci}`} className="text-white font-semibold"><em className="italic">{chunk.slice(3, -3)}</em></strong>;
        }
        if (chunk.startsWith("**") && chunk.endsWith("**")) {
          return <strong key={`${keyPrefix}-bold-${ci}`} className="text-white font-semibold">{chunk.slice(2, -2)}</strong>;
        }
        if (chunk.startsWith("*") && chunk.endsWith("*")) {
          return <em key={`${keyPrefix}-italic-${ci}`} className="text-gray-300 italic">{chunk.slice(1, -1)}</em>;
        }
        return chunk;
      });
  };

  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const content = part.slice(3, -3);
      const lines = content.split("\n");
      const firstLine = lines[0].trim().toLowerCase();
      const knownLangs = ["python", "py", "javascript", "js", "typescript", "ts", "jsx", "tsx", "html", "css", "bash", "sh", "json", "sql", "java", "c", "cpp", "rust", "go"];
      const lang = knownLangs.includes(firstLine) ? firstLine : "";
      const code = lang ? lines.slice(1).join("\n") : content;
      return (
        <div key={i} className="my-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "#13111c", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-gray-500 text-xs font-mono">{lang || "code"}</span>
            <CopyCodeBtn code={code} />
          </div>
          <pre className="p-3 overflow-x-auto text-xs" style={{ background: "rgba(0,0,0,0.45)", color: "#e2e8f0", margin: 0 }}>
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    return (
      <span key={i}>
        {part.split("\n").map((line, li, arr) => {
          const orderedMatch = line.match(/^(\d+)\. (.*)$/);
          if (line.startsWith("## ")) return <h2 key={li} className="text-white font-bold text-base mt-5 mb-2 flex items-center gap-2"><span className="w-0.5 h-5 rounded-full bg-purple-500 inline-block" />{renderInline(line.slice(3), `h2-${i}-${li}`)}</h2>;
          if (line.startsWith("# ")) return <h1 key={li} className="text-white font-bold text-lg mt-4 mb-2">{renderInline(line.slice(2), `h1-${i}-${li}`)}</h1>;
          if (line.startsWith("> ")) return <blockquote key={li} className="my-2 pl-3 border-l-2 border-purple-500 text-gray-400 italic text-sm">{renderInline(line.slice(2), `quote-${i}-${li}`)}</blockquote>;
          if (orderedMatch) return <div key={li} className="flex gap-2 my-0.5"><span className="text-purple-400 flex-shrink-0 font-bold text-xs mt-0.5">{orderedMatch[1]}.</span><span className="text-gray-300 text-sm">{renderInline(orderedMatch[2], `ol-${i}-${li}`)}</span></div>;
          if (line.startsWith("- ")) return <div key={li} className="flex gap-2 my-0.5"><span className="text-purple-400 flex-shrink-0 mt-1.5">•</span><span className="text-gray-300 text-sm">{renderInline(line.slice(2), `ul-${i}-${li}`)}</span></div>;
          return <React.Fragment key={li}>{renderInline(line, `line-${i}-${li}`)}{li < arr.length - 1 && <br />}</React.Fragment>;
        })}
      </span>
    );
  });
};

const CopyCodeBtn = ({ code }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-all"
      style={{ background: copied ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)", color: copied ? "#4ade80" : "#9ca3af", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}` }}>
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  );
};

// ─── Forum Background — Animated Canvas (shared with Forum.jsx) ──
const ForumBackground = ForumAnimatedBg;




// ─── Glass card ───────────────────────────────────────────────────
const GlassCard = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{
    background: "#13111c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "1rem",
    ...style,
  }}>{children}</div>
);

const AuthRequiredCard = ({ color, title = "Sign-in required", text = "You can read freely, but you need to sign in to interact.", onAction }) => (
  <GlassCard style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${color}25` }}>
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" style={{ color }} /> {title}
        </h3>
        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{text}</p>
      </div>
      <button
        onClick={onAction}
        className="cursor-pointer px-4 py-2 rounded-xl text-xs text-white font-bold transition-all hover:opacity-90 active:scale-[0.97] flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 8px 20px ${color}20` }}
      >
        Sign in
      </button>
    </div>
  </GlassCard>
);

const PollWidget = ({ poll, color, currentUserId, onVote, onRequireAuth }) => {
  const userVotes = poll.userVotes || {};
  const myVote = currentUserId ? userVotes[currentUserId] : null;

  const voteCounts = {};
  poll.options.forEach(o => voteCounts[o.id] = o.votes || 0);
  Object.values(userVotes).forEach(optId => {
    voteCounts[optId] = (voteCounts[optId] || 0) + 1;
  });

  const total = Object.values(voteCounts).reduce((s, v) => s + v, 0);

  const handleVote = (optId) => {
    if (!currentUserId) {
      onRequireAuth?.();
      return;
    }
    const newVotes = { ...userVotes };
    if (newVotes[currentUserId] === optId) {
      delete newVotes[currentUserId];
    } else {
      newVotes[currentUserId] = optId;
    }

    // Parent handleToggleField is now completely zero-delay
    onVote({ ...poll, userVotes: newVotes });
  };

  return (
    <div className="my-4 p-4 rounded-2xl space-y-2" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4" style={{ color }} />
        <span className="text-white font-semibold text-sm">{poll.question}</span>
      </div>
      {poll.options.map(opt => {
        const v = voteCounts[opt.id] || 0;
        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
        const isWinner = v > 0 && v === Math.max(...Object.values(voteCounts));

        return (
          <button key={opt.id} onClick={() => handleVote(opt.id)}
            className="cursor-pointer w-full text-left relative overflow-hidden rounded-xl transition-all active:scale-[0.99]"
            style={{ border: `1px solid ${myVote === opt.id ? color + "60" : "rgba(255,255,255,0.08)"}` }}>
            <div className="absolute inset-0 transition-all duration-700 rounded-xl"
              style={{ width: myVote ? `${pct}%` : "0%", background: myVote === opt.id ? `${color}30` : `${color}12`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
            <div className="relative flex items-center justify-between px-3 py-2.5">
              <span className="text-white text-sm flex items-center gap-2">
                {myVote === opt.id && (
                  <motion.span initial={{ scale: 0, opacity: 0, width: 0 }} animate={{ scale: 1, opacity: 1, width: "auto" }} className="flex-shrink-0">
                    <Check className="w-3.5 h-3.5" style={{ color }} />
                  </motion.span>
                )}
                <span className="truncate">{opt.label}</span>
              </span>
              {myVote && <span className="text-xs font-bold" style={{ color: myVote === opt.id ? color : "#6b7280" }}>{pct}%</span>}
            </div>
          </button>
        );
      })}
      <p className="text-gray-600 text-xs text-right mt-3">
        {myVote ? `${total} votes` : "Vote to see the results!"}
      </p>
    </div>
  );
};

// ─── Reaction bar ─────────────────────────────────────────────────


const CommentEditor = ({ placeholder, onSubmit, onCancel, color, isReply = false, defaultValue = "", submitLabel = "Publish" }) => {
  const [text, setText] = useState(defaultValue);

  return (
    <div className="mt-4 space-y-3 relative z-10 animate-in fade-in slide-in-from-top-2 duration-300">
      <textarea 
        value={text} 
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { 
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { 
            e.preventDefault(); 
            if (text.trim()) { onSubmit(text); setText(""); } 
          } 
        }}
        placeholder={placeholder}
        rows={isReply ? 2 : 4}
        className="w-full px-4 py-3.5 rounded-2xl text-white text-sm placeholder-gray-700 bg-[#0c0a12] border border-white/[0.08] focus:border-purple-500/30 focus:outline-none transition-all resize-none leading-relaxed"
        style={{ minHeight: isReply ? "60px" : "110px", boxShadow: "inset 0 4px 12px rgba(0,0,0,0.4)" }} 
      />

      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-gray-700 text-[0.65rem] font-bold uppercase tracking-widest opacity-40">Ctrl+Enter = send</span>
        <div className="flex gap-3">
          {onCancel && (
            <button onClick={onCancel} className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all">
              Cancel
            </button>
          )}
          <button onClick={() => { if (text.trim()) { onSubmit(text); setText(""); } }}
            disabled={!text.trim()}
            className="cursor-pointer flex items-center gap-2 px-5 py-2 rounded-xl text-xs text-white font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-20 disabled:grayscale"
            style={{ background: text.trim() ? `linear-gradient(135deg, ${color}, ${color}CC)` : "rgba(255,255,255,0.04)", boxShadow: text.trim() ? `0 8px 20px ${color}20` : "none" }}>
            <Send className="w-3.5 h-3.5" /> {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Report Modal ─────────────────────────────────────────────────
const ReportModal = ({ isOpen, onClose, onSubmit, title = "Report" }) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setDetails("");
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.({ reason, details });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="absolute inset-0 bg-black/70" onClick={submitting ? undefined : onClose} />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "#13111c", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-white font-bold text-sm flex items-center gap-2"><Flag className="w-4 h-4 text-red-400" /> {title}</h3>
          <button onClick={onClose} disabled={submitting} className="cursor-pointer text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all disabled:opacity-40"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-gray-400 text-xs mb-3">Why do you want to report this content?</p>
          {REPORT_REASONS.map(r => (
            <label key={r} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{ background: reason === r ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${reason === r ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}` }}>
              <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{ borderColor: reason === r ? "#f87171" : "#4b5563", background: reason === r ? "#f87171" : "transparent" }}>
                {reason === r && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <input type="radio" className="hidden" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span className="text-xs" style={{ color: reason === r ? "#fca5a5" : "#9ca3af" }}>{r}</span>
            </label>
          ))}
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-medium text-white outline-none focus:border-red-400/40"
            placeholder="Optional context"
          />
        </div>
        <div className="px-5 py-4 border-t border-white/5 flex gap-2">
          <button onClick={onClose} disabled={submitting} className="cursor-pointer flex-1 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>Cancel</button>
          <button disabled={!reason || submitting} onClick={handleSubmit}
            className="cursor-pointer flex-1 py-2 rounded-xl text-sm text-white font-semibold transition-all disabled:opacity-30"
          style={{ background: "linear-gradient(135deg,#dc2626,#4c1d95)" }}>
            {submitting ? "Sending..." : "Send report"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Comment card ─────────────────────────────────────────────────
const CommentCard = ({ comment, color, isReply = false, onAddReply, onLikeComment, onReportComment, currentUserId }) => {
  const [showReplies, setShowReplies] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [content, setContent] = useState(comment.content);
  const [showReport, setShowReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const menuRef = useRef(null);
  const isOwn = !!currentUserId && comment.authorId === currentUserId;

  const liked = useMemo(() => comment.likedIds?.includes(currentUserId), [comment.likedIds, currentUserId]);
  const likeCount = comment.likes || 0;
  const requestAuth = () => onLikeComment?.(comment.id);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleReply = (text) => {
    onAddReply?.(comment.id, text);
    setReplyOpen(false);
  };

  const handleQuoteReply = (text) => {
    const quoted = `> *${comment.author} wrote:*\n> ${comment.content.slice(0, 100).replace(/\n/g, "\n> ")}${comment.content.length > 100 ? "..." : ""}\n\n${text}`;
    onAddReply?.(comment.id, quoted);
    setQuoting(false);
  };

  const copyCommentLink = () => {
    navigator.clipboard.writeText(`${window.location.href}#comment-${comment.id}`);
    setShowMenu(false);
  };

  return (
    <div id={`comment-${comment.id}`} className={isReply ? "ml-4 sm:ml-6 mt-2" : "mt-3"}>
      <div className="group transition-all duration-150 relative"
        style={{
          background: comment.pinned ? "#16132a" : isReply ? "#110f1a" : "#13111c",
          border: comment.pinned ? "1px solid rgba(167,139,250,0.2)" : `1px solid ${isReply ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)"}`,
          borderRadius: "0.875rem", padding: isReply ? "0.625rem 0.75rem" : "0.75rem 1rem",
          zIndex: showMenu ? 50 : "auto",
          position: "relative",
        }}>

        {comment.pinned && (
          <div className="flex items-center gap-1 mb-2 text-purple-400">
            <Pin className="w-2.5 h-2.5" />
            <span className="text-xs font-semibold">Highlighted by moderator</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {comment.avatarUrl ? <img src={comment.avatarUrl} alt="avatar" className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover flex-shrink-0" /> : <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
              style={{ background: comment.avatarColor + "45", border: `1px solid ${comment.avatarColor}35` }}>
              {comment.avatar}
            </div>}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs truncate" style={{ color: comment.avatarColor }}>{comment.author}</span>
                {comment.isOP && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap" style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>OP</span>}
                {isOwn && !comment.isOP && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap" style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>You</span>}
              </div>
              <div className="flex items-center gap-1 text-gray-600 text-xs">
                <Clock className="w-2.5 h-2.5" />{comment.time}
              </div>
            </div>
          </div>

          <div ref={menuRef} className="relative">
            <button onClick={() => setShowMenu(v => !v)}
              className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/10">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden w-44"
                style={{ zIndex: 9999, background: "rgba(16,12,24,0.98)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
                <button onClick={copyCommentLink} className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Copy link
                </button>
                <button onClick={() => { if (!currentUserId) { requestAuth(); setShowMenu(false); return; } setQuoting(true); setShowMenu(false); }} className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
                  <Quote className="w-3.5 h-3.5" /> Quote reply
                </button>
                {isOwn && (
                  <button onClick={() => { setEditing(true); setShowMenu(false); }} className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button onClick={() => { if (!currentUserId) { requestAuth(); setShowMenu(false); return; } setShowReport(true); setShowMenu(false); }} className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-colors">
                  <Flag className="w-3.5 h-3.5" /> Report
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-gray-300 text-sm leading-relaxed pl-8 sm:pl-9">
          {editing ? (
            <div>
              <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}40` }} />
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setContent(editedContent); setEditing(false); }}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs text-white font-semibold transition-all"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>Save</button>
                <button onClick={() => { setEditing(false); setEditedContent(content); }}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all">Cancel</button>
              </div>
            </div>
          ) : renderMd(content)}
        </div>



        <div className="flex items-center gap-2 sm:gap-3 pl-8 sm:pl-9 mt-2.5 flex-wrap">
          <button onClick={() => onLikeComment?.(comment.id)}
            className="cursor-pointer flex items-center gap-1.5 text-xs transition-all active:scale-90 px-2.5 py-1 rounded-lg"
            style={{
              background: liked ? `${color}15` : "rgba(255,255,255,0.03)",
              border: `1px solid ${liked ? color + "40" : "rgba(255,255,255,0.06)"}`,
              color: liked ? color : "#6b7280"
            }}>
            <ThumbsUp className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
            <span className="font-bold">{Math.max(0, likeCount)}</span>
          </button>

          {!isReply && (
            <button onClick={() => { if (!currentUserId) { requestAuth(); return; } setReplyOpen(v => !v); setQuoting(false); }}
              className="cursor-pointer flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/8">
              <Reply className="w-3 h-3" /> Reply
            </button>
          )}

          {!isReply && comment.replies?.length > 0 && (
            <button onClick={() => setShowReplies(v => !v)}
              className="cursor-pointer flex items-center gap-1 text-xs transition-all px-2 py-1 rounded-lg hover:bg-white/8"
              style={{ color }}>
              {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {comment.replies.length} replies
            </button>
          )}
        </div>

        {(replyOpen || quoting) && !isReply && (
          <div className="pl-9 mt-3">
            <CommentEditor
              placeholder={quoting ? `Quote reply to ${comment.author}...` : `Reply to ${comment.author}...`}
              onSubmit={quoting ? handleQuoteReply : handleReply}
              onCancel={() => { setReplyOpen(false); setQuoting(false); }}
              color={color} isReply submitLabel="Send reply"
            />
          </div>
        )}
      </div>

      {!isReply && showReplies && comment.replies?.length > 0 && (
        <div className="space-y-2 mt-2">
          {comment.replies.map(reply => (
            <CommentCard
              key={reply.id}
              comment={reply}
              color={color}
              isReply
              onLikeComment={onLikeComment}
              onReportComment={onReportComment}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        title="Report comment"
        onSubmit={(payload) => onReportComment?.(comment, payload)}
      />
    </div>
  );
};

// ─── Reading progress bar ─────────────────────────────────────────
const ReadingProgress = ({ color }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handler = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setProgress(Math.min(100, Math.round(scrolled * 100)));
    };
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="h-full transition-all duration-150 rounded-r-full"
        style={{ width: `${progress}%`, background: `linear-gradient(90deg, #7c3aed, ${color})` }} />
    </div>
  );
};

// ─── Scroll to top ────────────────────────────────────────────────
const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const h = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  if (!visible) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="cursor-pointer fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95"
      style={{ background: "#13111c", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <ArrowUp className="w-4 h-4" />
    </button>
  );
};

// ─── Table of Contents ────────────────────────────────────────────
const TableOfContents = ({ content, color }) => {
  const headings = content?.split("\n").filter(l => l.startsWith("## ")).map(l => l.slice(3)) || [];
  if (headings.length < 2) return null;
  return (
    <GlassCard style={{ marginBottom: "1rem" }}>
      <div className="px-4 pt-4 pb-3">
        <h4 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 mb-2">
          <List className="w-3.5 h-3.5" style={{ color }} /> Tartalom
        </h4>
        <div className="space-y-1">
          {headings.map((h, i) => (
            <button key={i} className="cursor-pointer w-full text-left text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-2 py-0.5">
              <span className="w-3 h-3 rounded-sm flex-shrink-0 text-center text-gray-700" style={{ fontSize: "0.6rem" }}>{i + 1}</span>
              {h}
            </button>
          ))}
        </div>
      </div>

    </GlassCard>
  );
};


// ─── Helpful widget ───────────────────────────────────────────────
const HelpfulWidget = ({ color, currentUserId, onRequireAuth }) => {
  const [voted, setVoted] = useState(null);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-gray-500 text-xs whitespace-nowrap">Was this post helpful?</span>
      <div className="flex items-center gap-2">
        {["Yes 👍", "No 👎"].map((label, i) => (
          <button key={label} onClick={() => {
            if (!currentUserId) {
              onRequireAuth?.();
              return;
            }
            setVoted(i);
          }}
            className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
            style={{
              background: voted === i ? (i === 0 ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.15)") : "rgba(255,255,255,0.04)",
              border: `1px solid ${voted === i ? (i === 0 ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.35)") : "rgba(255,255,255,0.08)"}`,
              color: voted === i ? (i === 0 ? "#4ade80" : "#f87171") : "#9ca3af",
            }}>
            {voted === i ? <Check className="w-3 h-3 inline mr-1" /> : null}{label}
          </button>
        ))}
      </div>
      {voted !== null && <span className="text-green-400 text-xs whitespace-nowrap">Thanks!</span>}
    </div>
  );
};

// ─── Permalink widget ─────────────────────────────────────────────
const PermalinkWidget = ({ category, slug, color }) => {
  const [copied, setCopied] = useState(false);
  const permalink = `${window.location.origin}/forum/${category}/${slug}`;
  const displayPath = `/forum/${category}/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(permalink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <GlassCard>
      <div className="px-4 pt-4 pb-3">
        <h4 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 mb-2">
          <Link className="w-3.5 h-3.5" style={{ color }} /> Direct link
        </h4>
        <div className="flex items-center gap-2 p-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-gray-500 text-xs font-mono truncate flex-1">{displayPath}</span>
          <button onClick={handleCopy}
            className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all flex-shrink-0"
            style={{ background: copied ? "rgba(74,222,128,0.15)" : `${color}20`, color: copied ? "#4ade80" : color, border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : color + "40"}` }}>
            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

// ─── User Profile Modal ───────────────────────────────────────────
const UserProfileModal = ({
  isOpen, onClose, author, authorId, authorAvatar, authorAvatarUrl, authorColor,
  authorPosts = [], onOpenPost, isFollowing, onToggleFollow, currentUserId, authorJoinedDate, authorStats
}) => {
  if (!isOpen) return null;
  const totalViews = authorPosts.reduce((s, p) => s + (p.views || 0), 0);
  const totalComments = authorPosts.reduce((s, p) => s + (p.comments || 0), 0);
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4" style={{ zIndex: 10000 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#13111c", border: `1px solid ${authorColor}30`, maxHeight: "90vh", boxShadow: `0 30px 80px rgba(0,0,0,0.8), 0 0 60px ${authorColor}12` }}>
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <h3 className="text-white font-bold text-sm flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 flex-shrink-0" style={{ color: authorColor }} /> <span className="truncate">User profile</span>
          </h3>
          <button onClick={onClose} className="cursor-pointer p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {/* Profile info */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            {authorAvatarUrl
              ? <img src={authorAvatarUrl} alt="avatar" className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover flex-shrink-0" />
              : <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg text-white flex-shrink-0"
                style={{ background: authorColor + "45", border: `1px solid ${authorColor}35` }}>{authorAvatar}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white font-bold text-sm sm:text-base truncate" style={{ color: authorColor }}>{author}</div>
                  <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5 truncate">
                    Forum member - {authorJoinedDate}
                  </div>
                </div>
                {currentUserId && authorId && currentUserId !== authorId && (
                  <button
                    onClick={() => onToggleFollow?.(authorId)}
                    className="cursor-pointer flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 flex-shrink-0"
                    style={{
                      background: isFollowing ? `${authorColor}20` : "rgba(255,255,255,0.04)",
                      color: isFollowing ? authorColor : "#9ca3af",
                      border: `1px solid ${isFollowing ? authorColor + "40" : "rgba(255,255,255,0.08)"}`
                    }}
                  >
                    <Rss className="w-3 h-3" />
                    <span className="hidden sm:inline">{isFollowing ? "Following" : "Follow"}</span>
                    <span className="sm:hidden">{isFollowing ? "Following" : "+"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Posts", value: authorPosts.length, color: authorColor },
              { label: "Views", value: totalViews.toLocaleString(), color: "#38bdf8" },
              { label: "Comments", value: totalComments.toLocaleString(), color: "#4ade80" },
            ].map(s => (
              <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
                <div className="text-gray-600 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Posts list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <PenSquare className="w-3.5 h-3.5" style={{ color: authorColor }} /> Posts ({authorPosts.length})
          </h4>
          {authorPosts.length > 0 ? (
            <div className="space-y-2">
              {authorPosts.map(p => {
                const pc = CATEGORIES[p.category] || CATEGORIES.code;
                return (
                  <button key={p.id} onClick={() => { onClose(); onOpenPost?.(p); }}
                    className="cursor-pointer w-full text-left p-3 rounded-xl transition-all hover:bg-white/5 group"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {p.pinned && <span className="text-xs px-1 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontSize: "0.6rem" }}>📌</span>}
                      {p.hot && <span className="text-xs px-1 py-0.5 rounded-full" style={{ background: "rgba(251,113,33,0.15)", color: "#fb923c", fontSize: "0.6rem" }}>🔥</span>}
                      <span className="text-xs px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: `${pc?.color || authorColor}15`, color: pc?.color || authorColor, fontSize: "0.65rem" }}>
                        <CategoryLabel category={pc} />
                      </span>
                    </div>
                    <p className="text-white text-xs font-semibold leading-snug group-hover:text-purple-200 transition-colors line-clamp-2">{p.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-gray-600 text-xs">
                      <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{p.likes}</span>
                      <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />{p.comments}</span>
                      <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{p.views?.toLocaleString()}</span>
                      <span className="ml-auto">{p.time}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <PenSquare className="w-8 h-8 text-gray-700" />
              <p className="text-gray-600 text-xs">No posts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Delete megerősítő dialog (lokális, poszt nézetben) ───────────
const ConfirmDeleteModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl p-6 max-w-sm w-full"
        style={{ background: "#13111c", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-sm">Are you sure?</h3>
        </div>
        <p className="text-gray-400 text-xs mb-5 leading-relaxed">The post will be permanently deleted. This action cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="cursor-pointer flex-1 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="cursor-pointer flex-1 py-2 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7c3aed, #dc2626)" }}>
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── FŐ KOMPONENS ─────────────────────────────────────────────────
// JAVÍTÁS: currentUserId, isAdmin, onDelete, onEdit, onToggle propok hozzáadva
export default function ForumPost({
  post,
  allPosts = [],
  onBack,
  onOpenPost,
  currentUserId,
  isAdmin,
  isBookmarked,
  onBookmark,
  onDelete,
  onEdit,
  onToggle,
  onLike,
  isFollowing: propIsFollowing,
  onToggleFollow: propOnToggleFollow,
  onRequireAuth,
}) {
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [liked, setLiked] = useState(() => !!(post?.likedIds?.includes(currentUserId)));
  const [likeCount, setLikeCount] = useState(() => Math.max(0, post?.likes || 0));

  // ── Sync Props ───────────────────────────────────────────────────
  useEffect(() => {
    setLiked(!!(post?.likedIds?.includes(currentUserId)));
    setLikeCount(Math.max(0, post?.likes || 0));
  }, [post?.likes, post?.likedIds, currentUserId]);

  const [internalIsFollowing, setInternalIsFollowing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortComments, setSortComments] = useState("top");
  const [commentSearch, setCommentSearch] = useState("");
  const [showCommentSearch, setShowCommentSearch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [authorUserDoc, setAuthorUserDoc] = useState(null);
  const [commentAuthorProfiles, setCommentAuthorProfiles] = useState({});
  const [mobilePostSidebarOpen, setMobilePostSidebarOpen] = useState(false);
  const [showPostReport, setShowPostReport] = useState(false);


  const { user: globalUser, setIsAuthOpen } = useContext(MyUserContext);
  const cat = CATEGORIES[post?.category] || CATEGORIES.code;
  const color = cat.color;
  const isCommunityAuthenticated = !!(currentUserId || globalUser?.uid);
  const currentAuthorProfile = useMemo(() => {
    const uid = currentUserId || globalUser?.uid;
    if (!uid && !globalUser) return null;

    return {
      uid,
      displayName: globalUser?.displayName || "",
      name: globalUser?.name || globalUser?.displayName || "",
      email: globalUser?.email || "",
      profilePicture: globalUser?.profilePicture || globalUser?.photoURL || null,
      photoURL: globalUser?.photoURL || null,
      createdAt: globalUser?.createdAt || null,
    };
  }, [
    currentUserId,
    globalUser?.uid,
    globalUser?.displayName,
    globalUser?.name,
    globalUser?.email,
    globalUser?.profilePicture,
    globalUser?.photoURL,
    globalUser?.createdAt,
  ]);
  const authorProfile = useMemo(() => {
    if (!post?.authorId) return null;
    if ((currentUserId && post.authorId === currentUserId) || (globalUser?.uid && post.authorId === globalUser.uid)) {
      return currentAuthorProfile;
    }
    return authorUserDoc;
  }, [authorUserDoc, currentAuthorProfile, currentUserId, globalUser?.uid, post?.authorId]);
  const displayPost = useMemo(() => {
    return applyProfileToForumPost(post, authorProfile);
  }, [authorProfile, post]);
  const requireCommunityAuth = useCallback(() => {
    if (isCommunityAuthenticated) return true;
    if (onRequireAuth) return onRequireAuth();
    setIsAuthOpen(true);
    return false;
  }, [isCommunityAuthenticated, onRequireAuth, setIsAuthOpen]);
  const isOwnAuthor = !!currentUserId && !!post?.authorId && currentUserId === post.authorId;

  // JAVÍTÁS: jogosultság-számítás
  // Ha nincs authorId (mock poszt) → mindenki kezelheti; ha van → csak a saját uid
  // Az isAdmin prop-ot kiegészítjük a helyi ADMIN_UIDS ellenőrzéssel is
  const isLocalAdmin = !!currentUserId && ADMIN_UIDS.includes(currentUserId);
  const effectiveIsAdmin = isAdmin || isLocalAdmin;
  const isOwn = !!currentUserId && (!post?.authorId || currentUserId === post?.authorId);
  const canManage = !!currentUserId && (isOwn || effectiveIsAdmin);

  const relatedPosts = (allPosts.length > 1
    ? allPosts.filter(p => p.id !== post?.id && p.category === post?.category)
    : RELATED_MOCK
  ).slice(0, 3);

  const authorPosts = useMemo(() => {
    if (post?.authorId) return allPosts.filter(p => p.authorId === post.authorId);
    return allPosts.filter(p => p.author === displayPost?.author);
  }, [allPosts, displayPost?.author, post?.authorId]);

  const authorStats = {
    themes: authorPosts.length,
    comments: authorPosts.reduce((s, p) => s + (p.comments || 0), 0),
  };

  useEffect(() => {
    setAuthorUserDoc(null);
  }, [post?.authorId]);

  // ── Author adatainak lekérése (Biztonságos API-n keresztül) ────────
  useEffect(() => {
    if (!post?.authorId || authorUserDoc?.uid === post.authorId) return;
    if ((currentUserId && post.authorId === currentUserId) || (globalUser?.uid && post.authorId === globalUser.uid)) return;
    const fetchAuthor = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch(`${API_BASE}/api/get-public-profile/${post.authorId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Firestore-szerű adatstrukturát emulálunk a kompatibilitás miatt
            const userData = {
              ...result.user,
              // Ha a backend nem Timestamp-et küld, konvertáljuk (szimpla dátum ként)
              createdAt: result.user.createdAt
            };
            setAuthorUserDoc(userData);
          }
        }
      } catch (e) {
        console.error("[ForumPost] Failed to load author data (API):", e);
      }
    };
    fetchAuthor();
  }, [authorUserDoc?.uid, currentUserId, globalUser?.uid, post?.authorId]);

  const authorJoinedDate = useMemo(() => {
    let date = null;

    // 1. Próbáljuk a valódi regisztrációs dátumot
    if (authorProfile?.createdAt) {
      date = authorProfile.createdAt.toDate ? authorProfile.createdAt.toDate() : new Date(authorProfile.createdAt._seconds * 1000);
    }
    // 2. Fallback: legelső poszt dátuma
    else if (authorPosts.length > 0) {
      const sorted = [...authorPosts].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateA - dateB;
      });
      date = sorted[0].createdAt?.toDate?.() || null;
    }

    if (!date) return "2024. december";

    const formatted = date.toLocaleDateString("hu-HU", { year: "numeric", month: "short" })
      .replace(/ /g, "")
      .replace(/\./g, ". ");

    return formatted.trim();
  }, [authorProfile, authorPosts]);



  const handleShare = () => {
    const permalink = post?.slug && post?.category
      ? `${window.location.origin}/forum/${post.category}/${post.slug}`
      : window.location.href;
    navigator.clipboard.writeText(permalink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReportPost = async ({ reason, details }) => {
    if (!requireCommunityAuth()) throw new Error("Sign in to submit a report");
    try {
      await submitContentReport({
        sourceType: "forum_post",
        targetId: String(post.id),
        targetPath: post.slug && post.category ? `/forum/${post.category}/${post.slug}` : window.location.pathname,
        targetTitle: post.title,
        targetOwnerId: post.authorId || "",
        reason,
        details,
        metadata: {
          category: post.category,
          author: displayPost.author,
          preview: String(post.content || post.preview || "").slice(0, 600),
        },
      });
      toast.success("Report sent");
    } catch (err) {
      toast.error(err.message || "Failed to send report");
      throw err;
    }
  };

  const handleReportComment = async (comment, { reason, details }) => {
    if (!requireCommunityAuth()) throw new Error("Sign in to submit a report");
    try {
      await submitContentReport({
        sourceType: "forum_comment",
        targetId: String(comment.id),
        targetPath: `${post.slug && post.category ? `/forum/${post.category}/${post.slug}` : window.location.pathname}#comment-${comment.id}`,
        targetTitle: `${post.title} - comment by ${comment.author}`,
        targetOwnerId: comment.authorId || "",
        reason,
        details,
        metadata: {
          postId: String(post.id),
          postTitle: post.title,
          category: post.category,
          parentId: comment.parentId || "",
          comment: String(comment.content || "").slice(0, 600),
        },
      });
      toast.success("Report sent");
    } catch (err) {
      toast.error(err.message || "Failed to send report");
      throw err;
    }
  };

  // ── Értesítés létrehozása ──────────────────────────────────────────
  const createNotification = useCallback(async (recipientId, type, text, extraData = {}) => {
    if (!recipientId || recipientId === currentUserId) return; // ne értesítsd magad
    try {
      await addDoc(collection(db, "forum_notifications"), {
        recipientId,
        type,
        text,
        read: false,
        createdAt: serverTimestamp(),
        // Alapértelmezett navigációs adatok az aktuális poszthoz
        postId: post.id,
        category: post.category,
        slug: post.slug,
        ...extraData
      });
      console.log("[ForumPost] Notification created:", { recipientId, type, text, ...extraData });
    } catch (e) {
      console.error("[ForumPost] Failed to create notification:", e);
    }
  }, [currentUserId, post?.id, post?.category, post?.slug]);


  const isFollowing = propOnToggleFollow ? propIsFollowing : internalIsFollowing;

  // ── Following Sync (Fallback for direct URL access) ────────────────
  useEffect(() => {
    if (propOnToggleFollow || !currentUserId || !post?.authorId || isOwnAuthor) return;
    const q = query(
      collection(db, "forum_follows"),
      where("followerId", "==", currentUserId),
      where("followedId", "==", post.authorId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setInternalIsFollowing(!snap.empty);
    });
    return unsub;
  }, [currentUserId, post?.authorId, propOnToggleFollow, isOwnAuthor]);

  const handleToggleFollow = async () => {
    if (!requireCommunityAuth()) return;
    if (isOwnAuthor) return;
    if (propOnToggleFollow) {
      propOnToggleFollow(post.authorId);
      return;
    }
    // Deep fallback logic
    if (!currentUserId || !post?.authorId || currentUserId === post.authorId) return;
    try {
      const q = query(
        collection(db, "forum_follows"),
        where("followerId", "==", currentUserId),
        where("followedId", "==", post.authorId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } else {
        await addDoc(collection(db, "forum_follows"), {
          followerId: currentUserId,
          followedId: post.authorId,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Internal toggle follow error:", e);
    }
  };
  const fetchComments = useCallback(async () => {
    if (!post?.id) return;
    setIsLoadingComments(true);
    try {
      const q = query(
        collection(db, "forum_comments"),
        where("postId", "==", post.id)
      );
      const snap = await getDocs(q);
      const allComms = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        time: formatFirebaseTime(d.data().createdAt)
      })).filter(isVisibleComment);

      // Csoportosítás parentId alapján
      const rootComments = allComms.filter(c => !c.parentId);
      const replies = allComms.filter(c => c.parentId);

      const assembled = rootComments.map(rc => ({
        ...rc,
        replies: replies.filter(r => r.parentId === rc.id)
      }));

      // RÖGZÍTETT RENDEZÉS LEKÉRÉSKOR
      assembled.sort((a, b) => {
        if (sortComments === "top") return (b.likes || 0) - (a.likes || 0);
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

      console.log(`[ForumPost] ${assembled.length} comments loaded (static order)`);

      if (assembled.length === 0 && (typeof post.id === 'number' || String(post.id).length < 5)) {
        setComments(INITIAL_COMMENTS);
      } else {
        setComments(assembled);
      }
    } catch (err) {
      console.error("[ForumPost] Firebase error:", err);
      if (typeof post.id === 'number' || String(post.id).length < 5) setComments(INITIAL_COMMENTS);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post?.id, sortComments]);

  useEffect(() => {
    fetchComments();
  }, [post?.id, fetchComments]);




  const handleAddComment = async (text) => {
    if (!requireCommunityAuth()) return;
    if (!post?.id) return;

    try {
      const nc = {
        postId: post.id,
        parentId: null,
        author: getProfileDisplayName(currentAuthorProfile, "User"),
        authorId: currentUserId || null,
        avatar: getProfileInitial(currentAuthorProfile, "User"),
        avatarColor: color,
        avatarUrl: getProfileAvatarUrl(currentAuthorProfile),
        content: text,
        createdAt: serverTimestamp(),
        likes: 0,
        likedIds: [],
        reactions: {},
        pinned: false,
        isOP: currentUserId === post.authorId
      };

      await addDoc(collection(db, "forum_comments"), nc);
      console.log("[ForumPost] Comment saved to Firebase");
      fetchComments(); // Frissítés beküldés után




      // Értesítés a bejegyzés szerzőjének (ha nem saját magunknak írunk)
      if (post.authorId && post.authorId !== currentUserId) {
        const authorName = getProfileDisplayName(currentAuthorProfile, "Someone");
        createNotification(
          post.authorId,
          "comment",
          `${authorName} commented on your topic: "${post.title}".`
        );
      }
    } catch (e) {
      console.error("[ForumPost] Failed to save comment:", e);
    }
  };

  const handleAddReply = async (parentId, text) => {
    if (!requireCommunityAuth()) return;
    if (!post?.id || !parentId) return;

    try {
      const nr = {
        postId: post.id,
        parentId: parentId,
        author: getProfileDisplayName(currentAuthorProfile, "User"),
        authorId: currentUserId || null,
        avatar: getProfileInitial(currentAuthorProfile, "User"),
        avatarColor: color,
        avatarUrl: getProfileAvatarUrl(currentAuthorProfile),
        content: text,
        createdAt: serverTimestamp(),
        likes: 0,
        likedIds: [],
        reactions: {},
        isOP: currentUserId === post.authorId
      };

      await addDoc(collection(db, "forum_comments"), nr);
      console.log("[ForumPost] Reply saved to Firebase (parentId:", parentId, ")");
      fetchComments(); // Frissítés beküldés után




      // Értesítés a szülő comments szerzőjének
      // Megkeressük a szülő commentst a listában
      const parentComment = comments.find(c => c.id === parentId);
      if (parentComment && parentComment.authorId && parentComment.authorId !== currentUserId) {
        const authorName = getProfileDisplayName(currentAuthorProfile, "Someone");
        createNotification(
          parentComment.authorId,
          "reply",
          `${authorName} replied to your comment in "${post.title}".`
        );
      }
    } catch (e) {
      console.error("[ForumPost] Failed to save reply:", e);
    }
  };

  const handleLikeComment = useCallback(async (commentId) => {
    if (!requireCommunityAuth()) return;
    if (!currentUserId) return;
    try {
      const commentRef = doc(db, "forum_comments", commentId);
      const comm = allCommentsRef.current?.find(c => c.id === commentId);
      if (!comm) return;

      const isLikedNow = comm.likedIds?.includes(currentUserId);

      await updateDoc(commentRef, {
        likes: increment(isLikedNow ? -1 : 1),
        likedIds: isLikedNow ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
      });

      // Optimista helyi frissítés, hogy ne kelljen újra lekérni és ne ugráljon a sorrend
      setComments(prev => {
        return prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              likes: (c.likes || 0) + (isLikedNow ? -1 : 1),
              likedIds: isLikedNow ? c.likedIds.filter(id => id !== currentUserId) : [...(c.likedIds || []), currentUserId]
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r => {
                if (r.id === commentId) {
                  return {
                    ...r,
                    likes: (r.likes || 0) + (isLikedNow ? -1 : 1),
                    likedIds: isLikedNow ? r.likedIds.filter(id => id !== currentUserId) : [...(r.likedIds || []), currentUserId]
                  };
                }
                return r;
              })
            };
          }
          return c;
        });
      });
    } catch (e) {
      console.error("[ForumPost] Failed to like comment:", e);
    }
  }, [currentUserId, requireCommunityAuth]);




  // A commentsok listájának elérése a useCallback-ek számára
  const flatComments = useMemo(
    () => comments.flatMap(c => [c, ...(c.replies || [])]),
    [comments]
  );

  useEffect(() => {
    const signedInUser = auth.currentUser;
    if (!signedInUser) return undefined;

    const currentUid = currentUserId || globalUser?.uid;
    const missingAuthorIds = Array.from(
      new Set(flatComments.map(c => c.authorId).filter(Boolean))
    ).filter(uid => uid !== currentUid && !(uid in commentAuthorProfiles));

    if (missingAuthorIds.length === 0) return undefined;

    let cancelled = false;

    const loadCommentAuthorProfiles = async () => {
      try {
        const token = await signedInUser.getIdToken();
        const profiles = await Promise.all(
          missingAuthorIds.map(async (uid) => [
            uid,
            await fetchPublicProfile(API_BASE, uid, token).catch(() => null),
          ])
        );

        if (cancelled) return;

        setCommentAuthorProfiles(prev => {
          const next = { ...prev };
          profiles.forEach(([uid, profile]) => {
            next[uid] = profile;
          });
          return next;
        });
      } catch (e) {
        console.error("[ForumPost] Failed to load comment author profiles:", e);
      }
    };

    loadCommentAuthorProfiles();

    return () => {
      cancelled = true;
    };
  }, [commentAuthorProfiles, currentUserId, flatComments, globalUser?.uid]);

  const getCommentAuthorProfile = useCallback((authorId) => {
    if (!authorId) return null;
    if ((currentUserId && authorId === currentUserId) || (globalUser?.uid && authorId === globalUser.uid)) {
      return currentAuthorProfile;
    }
    return commentAuthorProfiles[authorId] || null;
  }, [commentAuthorProfiles, currentAuthorProfile, currentUserId, globalUser?.uid]);

  const hydrateComment = useCallback((comment) => {
    const hydrated = applyProfileToForumComment(comment, getCommentAuthorProfile(comment?.authorId));
    if (!hydrated?.replies?.length) return hydrated;
    return {
      ...hydrated,
      replies: hydrated.replies.map(reply => applyProfileToForumComment(reply, getCommentAuthorProfile(reply?.authorId))),
    };
  }, [getCommentAuthorProfile]);

  const profileAwareComments = useMemo(
    () => comments.map(comment => hydrateComment(comment)),
    [comments, hydrateComment]
  );

  const allCommentsRef = useRef([]);
  useEffect(() => {
    allCommentsRef.current = profileAwareComments.flatMap(c => [c, ...(c.replies || [])]);
  }, [profileAwareComments]);

  const totalComments = profileAwareComments.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0);


  const filteredComments = profileAwareComments.filter(c =>
    !commentSearch || c.content.toLowerCase().includes(commentSearch.toLowerCase()) || c.author.toLowerCase().includes(commentSearch.toLowerCase())
  );




  if (!post) return null;
  post && console.log(post);


  return (
    <div
      className="min-h-screen relative overflow-hidden text-white"
      style={{
        backgroundColor: "transparent",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
      }}
    >
      {/* ── Studio Background ── */}
      <ForumBackground />

      <div className="relative z-10 w-full">

        <ReadingProgress color={color} />
        <ScrollToTop />

        {/* Profil modal */}
        <UserProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          author={displayPost.author}
          authorId={post.authorId}
          authorAvatar={displayPost.avatar}
          authorAvatarUrl={displayPost.avatarUrl}
          authorColor={displayPost.avatarColor}
          authorPosts={authorPosts}
          onOpenPost={onOpenPost}
          isFollowing={isFollowing}
          onToggleFollow={handleToggleFollow}
          currentUserId={currentUserId}
          authorJoinedDate={authorJoinedDate}
          authorStats={authorStats}
        />

        {/* Delete megerősítő (lokális) */}
        <ConfirmDeleteModal
          isOpen={showDeleteConfirm}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete?.(post.id, post.authorId);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        <ReportModal
          isOpen={showPostReport}
          onClose={() => setShowPostReport(false)}
          title="Report post"
          onSubmit={handleReportPost}
        />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="relative z-10 max-w-[1200px] mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-10 overflow-x-hidden">
          {/* ── Breadcrumb ── */}
          <GlassCard className="mb-3 sm:mb-4" style={{ background: "rgba(20, 18, 32, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button onClick={onBack} className="cursor-pointer flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors group">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs font-medium">Forum</span>
              </button>
              <ChevronRight className="w-3 h-3 text-gray-700 flex-shrink-0" />
              <span className="text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap" style={{ color, background: `${color}10`, border: `1px solid ${color}18` }}>
                <CategoryLabel category={cat} />
              </span>
              <ChevronRight className="w-3 h-3 text-gray-700 flex-shrink-0" />
              <span className="text-gray-500 text-xs truncate max-w-[150px] sm:max-w-[400px]">{post.title}</span>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
            <div className="space-y-4">
              <GlassCard style={{ background: "rgba(20, 18, 32, 0.85)", backdropFilter: "blur(16px)", border: `1px solid ${color}40`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                      {post.pinned && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}><Pin className="w-2.5 h-2.5" />Pinned</span>}
                      {post.hot && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ background: "rgba(251,113,33,0.12)", color: "#fb923c", border: "1px solid rgba(251,113,33,0.2)" }}><Flame className="w-2.5 h-2.5" />Trending</span>}
                      {post.solved && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}><CheckCircle className="w-2.5 h-2.5" />Solved</span>}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex items-center gap-1" style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
                        <CategoryLabel category={cat} />
                      </span>
                    </div>
                    <span className="text-gray-600 text-xs flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" />{post.readTime} min
                    </span>
                  </div>

                  <h1 className="text-white font-extrabold text-xl sm:text-3xl md:text-4xl leading-tight mb-4 sm:mb-5" style={{ textShadow: "0 3px 8px rgba(0,0,0,0.6)" }}>{post.title}</h1>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 py-4 border-y border-white/10">
                    <div className="relative cursor-pointer group flex-shrink-0" onClick={() => setShowProfile(true)}>
                      {displayPost.avatarUrl ? (
                        <img src={displayPost.avatarUrl} alt="avatar" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-[color:var(--accent)] transition-all" style={{ '--accent': color }} />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg text-white group-hover:scale-105 transition-all"
                          style={{ background: `linear-gradient(135deg, ${displayPost.avatarColor}45, ${displayPost.avatarColor}25)`, border: `1px solid ${displayPost.avatarColor}35` }}>
                          {displayPost.avatar}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-[#0a0118]" title="Available" />
                    </div>

                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-white hover:underline cursor-pointer truncate" onClick={() => setShowProfile(true)} style={{ color: displayPost.avatarColor }}>{displayPost.author}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-medium uppercase tracking-wider whitespace-nowrap">Author</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-gray-500 text-xs flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.time}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-800" />
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views?.toLocaleString()} views</span>
                      </div>
                    </div>

                    <div className="flex sm:ml-auto items-center gap-1.5 flex-wrap w-full sm:w-auto">
                      {!isOwnAuthor && post?.authorId && (
                        <button onClick={handleToggleFollow}
                          className="cursor-pointer flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                          style={{ background: isFollowing ? `${color}20` : "rgba(255,255,255,0.04)", color: isFollowing ? color : "#9ca3af", border: `1px solid ${isFollowing ? color + "40" : "rgba(255,255,255,0.08)"}` }}>
                          <Rss className="w-3 h-3" /><span className="hidden sm:inline">{isFollowing ? "Following" : "Follow"}</span><span className="sm:hidden">{isFollowing ? "Following" : "+"}</span>
                        </button>
                      )}
                      <button onClick={() => onBookmark?.(post?.id)} className="cursor-pointer p-2 rounded-xl transition-all hover:bg-white/8"
                        style={{ color: isBookmarked ? "#fbbf24" : "#6b7280" }}>
                        <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                      </button>
                      <button onClick={handleShare} className="cursor-pointer flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition-all hover:bg-white/8"
                        style={{ color: copied ? "#4ade80" : "#6b7280" }}>
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
                      </button>
                      <button onClick={() => { if (!requireCommunityAuth()) return; setShowPostReport(true); }} className="cursor-pointer flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition-all hover:bg-red-400/10"
                        style={{ color: "#f87171" }}>
                        <Flag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Report</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-gray-300 text-sm leading-relaxed space-y-0.5 mb-5">
                    {renderMd(post.content)}
                  </div>

                  {post.poll && <PollWidget poll={post.poll} color={color} currentUserId={currentUserId} onRequireAuth={requireCommunityAuth} onVote={(newPoll) => {
                    if (!requireCommunityAuth()) return;
                    onToggle?.(post.id, "poll", newPoll);
                  }} />}

                  <div className="flex gap-1.5 flex-wrap mb-5">
                    {post.tags?.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>#{t}</span>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onLike?.(post.id)}
                          className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                          style={{ background: liked ? `${color}25` : "rgba(255,255,255,0.04)", border: `1px solid ${liked ? color + "45" : "rgba(255,255,255,0.08)"}`, color: liked ? color : "#9ca3af", boxShadow: liked ? `0 0 20px ${color}20` : "none" }}>
                          <ThumbsUp className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />{Math.max(0, likeCount)}
                        </button>
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-600"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <MessageSquare className="w-4 h-4" />{totalComments} comments
                        </div>
                      </div>
                    </div>

                    <HelpfulWidget color={color} currentUserId={currentUserId} onRequireAuth={requireCommunityAuth} />
                  </div>
                </div>
              </GlassCard>

              {!post.solved && !currentUserId && (
                <AuthRequiredCard
                  color={color}
                  title="Join the conversation"
                  text="As a guest, you can read topics and comments. Sign in to comment, like, follow, and vote."
                  onAction={requireCommunityAuth}
                />
              )}

              {!post.solved && currentUserId && (
                <GlassCard>
                  <div className="p-3 sm:p-5">
                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
                      <Sparkles className="w-3.5 h-3.5" style={{ color }} /> Add a comment
                    </h3>
                    <div className="flex gap-2 sm:gap-3">
                      {globalUser?.profilePicture ? <img src={globalUser.profilePicture} alt="avatar" className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover flex-shrink-0 mt-0.5" /> : <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 mt-0.5"
                        style={{ background: `${color}40`, border: `1px solid ${color}35` }}>{(globalUser?.displayName?.[0] || globalUser?.email?.[0] || "U").toUpperCase()}</div>}
                      <div className="flex-1 min-w-0">
                        <CommentEditor placeholder="Write your thoughts..." onSubmit={handleAddComment} color={color} />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}

              {post.solved && (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-green-300 text-sm">This topic has been solved. New comments are closed.</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" style={{ color }} />
                    Comments ({totalComments})
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {showCommentSearch && (
                      <div className="relative">
                        <input value={commentSearch} onChange={e => setCommentSearch(e.target.value)}
                          placeholder="Search..."
                          className="w-36 sm:w-48 px-3 py-1.5 rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30` }} />
                        {commentSearch && <button onClick={() => setCommentSearch("")} className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-gray-600"><X className="w-3 h-3" /></button>}
                      </div>
                    )}
                    <button onClick={() => { setShowCommentSearch(v => !v); setCommentSearch(""); }}
                      className="cursor-pointer p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-all"
                      style={{ color: showCommentSearch ? color : undefined }}>
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg"
                      style={{ background: "#13111c", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {[
                        { id: "top", label: "Top" },
                        { id: "new", label: "Newest" },
                      ].map(s => (
                        <button key={s.id} onClick={() => setSortComments(s.id)}
                          className="cursor-pointer px-2.5 py-1 rounded-md text-xs transition-all"
                          style={{ background: sortComments === s.id ? `${color}20` : "transparent", color: sortComments === s.id ? "white" : "#6b7280", fontWeight: sortComments === s.id ? 600 : 400 }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {filteredComments.length > 0
                    ? filteredComments.map(c => (
                      <CommentCard
                        key={c.id}
                        comment={c}
                        color={color}
                        onAddReply={handleAddReply}
                        onLikeComment={handleLikeComment}
                        onReportComment={handleReportComment}
                        currentUserId={currentUserId}
                      />
                    ))
                    : (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <MessageSquare className="w-10 h-10 text-gray-700" />
                        <p className="text-gray-500 text-sm">{commentSearch ? "No results" : "Be the first to comment!"}</p>
                      </div>
                    )}
                </div>
              </div>

              {relatedPosts.length > 0 && (
                <GlassCard>
                  <div className="px-5 pt-4 pb-4">
                    <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
                      <Sparkles className="w-3.5 h-3.5" style={{ color }} /> Related topics
                    </h3>
                    <div className="space-y-2">
                      {relatedPosts.map(p => {
                        const rc = CATEGORIES[p.category] || CATEGORIES.code;
                        return (
                          <button key={p.id} onClick={() => onOpenPost?.(p)}
                            className="cursor-pointer w-full text-left p-3 rounded-xl transition-all hover:bg-white/5 group"
                            style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-white text-xs font-semibold leading-snug group-hover:text-purple-200 transition-colors line-clamp-2">{p.title}</p>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" />
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-gray-600 text-xs">
                              <span className="inline-flex items-center gap-1" style={{ color: rc?.color }}><CategoryLabel category={rc} /></span>
                              <span>·</span>
                              <Heart className="w-2.5 h-2.5" />{p.likes}
                              <span>·</span>
                              <MessageSquare className="w-2.5 h-2.5" />{p.comments}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* ── SIDEBAR ── */}
            <div className="space-y-3 hidden lg:block">
              <TableOfContents content={post.content} color={color} />

              {/* Permalink */}
              {post.slug && post.category && (
                <PermalinkWidget
                  category={post.category}
                  slug={post.slug}
                  color={color}
                />
              )}

              <GlassCard>
                <div className="px-4 pt-4 pb-3">
                  <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Post info</h4>
                  {[
                    { label: "Author", value: displayPost.author, color: displayPost.avatarColor },
                    { label: "Category", value: <CategoryLabel category={cat} />, color },
                    { label: "Published", value: post.time },
                    { label: "Views", value: post.views?.toLocaleString() },
                    { label: "Comments", value: totalComments },
                    { label: "Likes", value: Math.max(0, likeCount) },
                    { label: "Read time", value: `${post.readTime} min` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-gray-600 text-xs">{item.label}</span>
                      <span className="text-xs font-semibold" style={{ color: item.color || "white" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard style={{ border: `1px solid ${displayPost.avatarColor}20` }}>
                <div className="px-4 pt-4 pb-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    {displayPost.avatarUrl ? <img src={displayPost.avatarUrl} alt="avatar" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                      style={{ background: displayPost.avatarColor + "45", border: `1px solid ${displayPost.avatarColor}35` }}>{displayPost.avatar}</div>}
                    <div>
                      <div className="text-white font-bold text-sm" style={{ color: displayPost.avatarColor }}>{displayPost.author}</div>
                      <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5 whitespace-nowrap">
                        Forum member - {authorJoinedDate}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setShowProfile(true)}
                    className="cursor-pointer w-full py-2 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${displayPost.avatarColor}50, ${displayPost.avatarColor}30)`, border: `1px solid ${displayPost.avatarColor}40` }}>
                    View profile
                  </button>
                </div>
              </GlassCard>

              {post.tags?.length > 0 && (
                <GlassCard>
                  <div className="px-4 pt-4 pb-3">
                    <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Tags</h4>
                    <div className="flex gap-1.5 flex-wrap">
                      {post.tags.map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>#{t}</span>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              )}

              {canManage && (
                <GlassCard>
                  <div className="px-4 pt-4 pb-3">
                    <h4 className="text-gray-500 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Shield className="w-3 h-3" /> {effectiveIsAdmin && !isOwn ? "Admin actions" : "My topic"}
                    </h4>
                    <div className="space-y-0.5">
                      {isOwn && (
                        <button onClick={() => onEdit?.(post)}
                          className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                          style={{ color: "#60a5fa" }}>
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      {isOwn && (
                        <button onClick={() => onToggle?.(post.id, "solved", !post.solved)}
                          className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                          style={{ color: post.solved ? "#6b7280" : "#4ade80" }}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          {post.solved ? "Reopen" : "Mark as solved"}
                        </button>
                      )}
                      {effectiveIsAdmin && (
                        <button onClick={() => onToggle?.(post.id, "pinned", !post.pinned)}
                          className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                          style={{ color: "#fbbf24" }}>
                          <Pin className="w-3.5 h-3.5" />
                          {post.pinned ? "Remove pin" : "Pin"}
                        </button>
                      )}
                      {effectiveIsAdmin && (
                        <button onClick={() => onToggle?.(post.id, "hot", !post.hot)}
                          className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                          style={{ color: "#fb923c" }}>
                          <Flame className="w-3.5 h-3.5" />
                          {post.hot ? "Remove trending" : "Mark as trending"}
                        </button>
                      )}
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button onClick={() => onDelete?.(post.id, post.authorId)}
                          className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-red-400/10"
                          style={{ color: "#f87171" }}>
                          <Trash2 className="w-3.5 h-3.5" /> Delete topic
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Mobile Post Sidebar Toggle */}
            <button
              onClick={() => setMobilePostSidebarOpen(true)}
              className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4c1d95)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}
            >
              <List className="w-5 h-5" />
            </button>

            {/* Mobile Post Sidebar Overlay */}
            <AnimatePresence>
              {mobilePostSidebarOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobilePostSidebarOpen(false)}
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
                      <h3 className="text-white font-bold text-sm">Topic info</h3>
                      <button onClick={() => setMobilePostSidebarOpen(false)} className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <TableOfContents content={post.content} color={color} />
                      {post.slug && post.category && (
                        <PermalinkWidget category={post.category} slug={post.slug} color={color} />
                      )}
                      <GlassCard>
                        <div className="px-4 pt-4 pb-3">
                          <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Post info</h4>
                          {[
                            { label: "Author", value: displayPost.author, color: displayPost.avatarColor },
                            { label: "Category", value: <CategoryLabel category={cat} />, color },
                            { label: "Published", value: post.time },
                            { label: "Views", value: post.views?.toLocaleString() },
                            { label: "Comments", value: totalComments },
                            { label: "Likes", value: Math.max(0, likeCount) },
                            { label: "Read time", value: `${post.readTime} min` },
                          ].map(item => (
                            <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                              <span className="text-gray-600 text-xs">{item.label}</span>
                              <span className="text-xs font-semibold" style={{ color: item.color || "white" }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                      <GlassCard style={{ border: `1px solid ${displayPost.avatarColor}20` }}>
                        <div className="px-4 pt-4 pb-4">
                          <div className="flex items-center gap-2.5 mb-3">
                            {displayPost.avatarUrl ? <img src={displayPost.avatarUrl} alt="avatar" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                              style={{ background: displayPost.avatarColor + "45", border: `1px solid ${displayPost.avatarColor}35` }}>{displayPost.avatar}</div>}
                            <div>
                              <div className="text-white font-bold text-sm" style={{ color: displayPost.avatarColor }}>{displayPost.author}</div>
                              <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5 whitespace-nowrap">
                                Forum member - {authorJoinedDate}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => setShowProfile(true)}
                            className="cursor-pointer w-full py-2 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90"
                            style={{ background: `linear-gradient(135deg, ${displayPost.avatarColor}50, ${displayPost.avatarColor}30)`, border: `1px solid ${displayPost.avatarColor}40` }}>
                            View profile
                          </button>
                        </div>
                      </GlassCard>
                      {post.tags?.length > 0 && (
                        <GlassCard>
                          <div className="px-4 pt-4 pb-3">
                            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Tags</h4>
                            <div className="flex gap-1.5 flex-wrap">
                              {post.tags.map(t => (
                                <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>#{t}</span>
                              ))}
                            </div>
                          </div>
                        </GlassCard>
                      )}
                      {canManage && (
                        <GlassCard>
                          <div className="px-4 pt-4 pb-3">
                            <h4 className="text-gray-500 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2">
                              <Shield className="w-3 h-3" /> {effectiveIsAdmin && !isOwn ? "Admin actions" : "My topic"}
                            </h4>
                            <div className="space-y-0.5">
                              {isOwn && (
                                <button onClick={() => onEdit?.(post)}
                                  className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                                  style={{ color: "#60a5fa" }}>
                                  <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                              )}
                              {isOwn && (
                                <button onClick={() => onToggle?.(post.id, "solved", !post.solved)}
                                  className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                                  style={{ color: post.solved ? "#6b7280" : "#4ade80" }}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {post.solved ? "Reopen" : "Mark as solved"}
                                </button>
                              )}
                              {effectiveIsAdmin && (
                                <button onClick={() => onToggle?.(post.id, "pinned", !post.pinned)}
                                  className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                                  style={{ color: "#fbbf24" }}>
                                  <Pin className="w-3.5 h-3.5" />
                                  {post.pinned ? "Remove pin" : "Pin"}
                                </button>
                              )}
                              {effectiveIsAdmin && (
                                <button onClick={() => onToggle?.(post.id, "hot", !post.hot)}
                                  className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                                  style={{ color: "#fb923c" }}>
                                  <Flame className="w-3.5 h-3.5" />
                                  {post.hot ? "Remove trending" : "Mark as trending"}
                                </button>
                              )}
                              <div className="border-t border-white/5 mt-1 pt-1">
                                <button onClick={() => onDelete?.(post.id, post.authorId)}
                                  className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-red-400/10"
                                  style={{ color: "#f87171" }}>
                                  <Trash2 className="w-3.5 h-3.5" /> Delete topic
                                </button>
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
