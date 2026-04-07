import React, { useState, useRef, useEffect, useContext, useCallback } from "react";
import { MyUserContext } from "../context/MyUserProvider";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebaseApp";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  query, orderBy, serverTimestamp, getDoc, onSnapshot, where, limit, Timestamp, writeBatch,
} from "firebase/firestore";
import {
  ArrowLeft, ThumbsUp, Eye, MessageSquare, Clock, Pin, Flame,
  Share2, Bookmark, MoreHorizontal, Send, ChevronDown, ChevronUp,
  Check, Copy, Sparkles, Bot, User, Reply, Trash2, Flag,
  Hash, TrendingUp, Star, Heart, Smile, Lock, CheckCircle,
  AlertCircle, Award, Edit3, X, BarChart2, RefreshCw,
  ArrowUp, Zap, AtSign, Bold, Italic, Code,
  List, Quote, ChevronRight,
  PenSquare, Shield, Search, Rss, Link, Unlock,
} from "lucide-react";

// ─── Kategória map ────────────────────────────────────────────────
const CATEGORIES = {
  chat: { label: "Chat AI", emoji: "💬", color: "#a78bfa" },
  code: { label: "Code AI", emoji: "🧠", color: "#34d399" },
  image: { label: "Kép AI", emoji: "🖼️", color: "#f472b6" },
  audio: { label: "Hang AI", emoji: "🎵", color: "#fb923c" },
  threed: { label: "3D AI", emoji: "🧊", color: "#38bdf8" },
};

// ─── Mock related posts ───────────────────────────────────────────
const RELATED_MOCK = [
  { id: 101, title: "GPT-4o vs Gemini 2.5 Pro — melyik okosabb?", category: "chat", likes: 98, comments: 34 },
  { id: 102, title: "Hogyan csökkentsük a Claude API költségeket 70%-kal?", category: "chat", likes: 145, comments: 51 },
  { id: 103, title: "System prompt sablonok gyűjteménye 2025", category: "chat", likes: 312, comments: 87 },
];

// ─── Mock comments ────────────────────────────────────────────────
const INITIAL_COMMENTS = [
  {
    id: 1, parentId: null,
    author: "typescript_king", avatar: "T", avatarColor: "#34d399",
    content: "Teljesen egyetértek a hosszú fájloknál tapasztalt különbséggel. Nálam egy 800 soros React komponens refaktorálásnál Claude egyszerűen sokkal jobb volt. GPT-4o kb. a felénél \"elveszett\".",
    time: "1 órája", likes: 34, liked: false, pinned: true,
    reactions: { "🔥": 8, "👍": 12, "🤯": 3 },
    replies: [
      {
        id: 11, parentId: 1,
        author: "devmaster_hu", avatar: "D", avatarColor: "#7c3aed",
        content: "Igen, pontosan ez volt az én tapasztalatom is! A 200k token context ablak sokat számít ilyen esetekben.",
        time: "45 perce", likes: 12, liked: false, isOP: true,
        reactions: { "👍": 5 }, replies: [],
      },
      {
        id: 12, parentId: 1,
        author: "react_wizard", avatar: "R", avatarColor: "#f472b6",
        content: "Érdekes, én épp fordítva tapasztaltam... lehet hogy modell verzió kérdése? Melyik Claude-ot teszteltél?",
        time: "30 perce", likes: 5, liked: false,
        reactions: {}, replies: [],
      },
    ],
  },
  {
    id: 2, parentId: null,
    author: "pixel_witch", avatar: "P", avatarColor: "#db2777",
    content: "A unit teszt rész meglepett engem is. Gondoltam Claude lesz jobb ott is, de tényleg úgy tűnik a GPT jobban ismeri a Jest/Vitest szintaxist. Valaki próbálta már Cursor-ral mindkettőt?",
    time: "55 perce", likes: 21, liked: false, pinned: false,
    reactions: { "👍": 9, "🤔": 4 },
    replies: [],
  },
  {
    id: 3, parentId: null,
    author: "prompt_guru", avatar: "G", avatarColor: "#a78bfa",
    content: `Jó összehasonlítás! Én még annyit tennék hozzá: a **system prompt** minősége hatalmas különbséget tesz. Én ezzel a sablonnal dolgozom:

\`\`\`
You are an expert software engineer. When refactoring code:
1. Preserve all existing functionality
2. Improve readability and maintainability  
3. Add JSDoc comments to all functions
4. Point out potential bugs you notice
\`\`\`

Ezzel Claude teljesítménye még jobban kiemelkedik.`,
    time: "40 perce", likes: 67, liked: false, pinned: false,
    reactions: { "🔥": 15, "⭐": 8, "👍": 21 },
    replies: [
      {
        id: 31, parentId: 3,
        author: "beatmaker99", avatar: "B", avatarColor: "#ea580c",
        content: "Ez arany, köszönjük! Rögtön ki is próbálom.",
        time: "25 perce", likes: 8, liked: false,
        reactions: {}, replies: [],
      },
    ],
  },
  {
    id: 4, parentId: null,
    author: "3d_builder", avatar: "3", avatarColor: "#0284c7",
    content: "Érdemes lenne ugyanezt Gemini 2.5 Pro-val is elvégezni. Nemrég valaki azt mondta, hogy kódolásban már az is verheti a Claude-ot.",
    time: "20 perce", likes: 15, liked: false, pinned: false,
    reactions: { "🤔": 6, "👍": 3 },
    replies: [],
  },
];

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

const EMOJI_REACTIONS = ["👍", "🔥", "🤯", "😂", "❤️", "⭐", "🤔", "🎉"];

// ─── Markdown renderer ────────────────────────────────────────────
const renderMd = (text) => {
  if (!text) return null;
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
        <div key={i} className="my-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "rgba(18,18,40,0.97)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
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
          if (line.startsWith("## ")) return <h2 key={li} className="text-white font-bold text-base mt-5 mb-2 flex items-center gap-2"><span className="w-0.5 h-5 rounded-full bg-purple-500 inline-block" />{line.slice(3)}</h2>;
          if (line.startsWith("# ")) return <h1 key={li} className="text-white font-bold text-lg mt-4 mb-2">{line.slice(2)}</h1>;
          if (line.startsWith("> ")) return <blockquote key={li} className="my-2 pl-3 border-l-2 border-purple-500 text-gray-400 italic text-sm">{line.slice(2)}</blockquote>;
          const parsed = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((chunk, ci) => {
            if (chunk.startsWith("**") && chunk.endsWith("**")) return <strong key={ci} className="text-white font-semibold">{chunk.slice(2, -2)}</strong>;
            if (chunk.startsWith("*") && chunk.endsWith("*")) return <em key={ci} className="text-gray-300 italic">{chunk.slice(1, -1)}</em>;
            if (chunk.startsWith("`") && chunk.endsWith("`")) return <code key={ci} className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(0,0,0,0.35)", color: "#67e8f9" }}>{chunk.slice(1, -1)}</code>;
            return chunk;
          });
          if (line.match(/^\d+\. /)) return <div key={li} className="flex gap-2 my-0.5"><span className="text-purple-400 flex-shrink-0 font-bold text-xs mt-0.5">{line.match(/^\d+/)[0]}.</span><span className="text-gray-300 text-sm">{line.replace(/^\d+\. /, "")}</span></div>;
          if (line.startsWith("- ")) return <div key={li} className="flex gap-2 my-0.5"><span className="text-purple-400 flex-shrink-0 mt-1.5">•</span><span className="text-gray-300 text-sm">{parsed.slice(1)}</span></div>;
          return <React.Fragment key={li}>{parsed}{li < arr.length - 1 && <br />}</React.Fragment>;
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
      style={{ background: copied ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)", color: copied ? "#4ade80" : "#9ca3af", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}` }}>
      {copied ? <><Check className="w-3 h-3" /> Másolva</> : <><Copy className="w-3 h-3" /> Másolás</>}
    </button>
  );
};

// ─── Glass card ───────────────────────────────────────────────────
const GlassCard = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{
    background: "rgba(12,12,30,0.75)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1.25rem",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
    ...style,
  }}>{children}</div>
);

// ─── Poll widget ──────────────────────────────────────────────────
const PollWidget = ({ poll, color }) => {
  const [voted, setVoted] = useState(null);
  const total = poll.options.reduce((s, o) => s + o.votes, 0) + (voted ? 1 : 0);
  return (
    <div className="my-4 p-4 rounded-2xl space-y-2" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4" style={{ color }} />
        <span className="text-white font-semibold text-sm">{poll.question}</span>
      </div>
      {poll.options.map(opt => {
        const v = opt.votes + (voted === opt.id ? 1 : 0);
        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
        const isWinner = v === Math.max(...poll.options.map(o => o.votes + (voted === o.id ? 1 : 0)));
        return (
          <button key={opt.id} onClick={() => !voted && setVoted(opt.id)}
            className="cursor-pointer w-full text-left relative overflow-hidden rounded-xl transition-all active:scale-[0.99]"
            style={{ border: `1px solid ${voted === opt.id ? color + "60" : "rgba(255,255,255,0.1)"}` }}
            disabled={!!voted}>
            <div className="absolute inset-0 transition-all duration-700 rounded-xl"
              style={{ width: voted ? `${pct}%` : "0%", background: voted === opt.id ? `${color}30` : `${color}12`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
            <div className="relative flex items-center justify-between px-3 py-2.5">
              <span className="text-white text-sm flex items-center gap-2">
                {voted === opt.id && <Check className="w-3.5 h-3.5" style={{ color }} />}
                {isWinner && voted && voted !== opt.id && <span className="w-3.5 h-3.5" />}
                {opt.label}
              </span>
              {voted && <span className="text-xs font-bold" style={{ color: voted === opt.id ? color : "#6b7280" }}>{pct}%</span>}
            </div>
          </button>
        );
      })}
      <p className="text-gray-600 text-xs text-right">{total} szavazat{!voted && " · Szavazz!"}</p>
    </div>
  );
};

// ─── Reaction bar ─────────────────────────────────────────────────
const ReactionBar = ({ reactions: initReactions, color, commentId }) => {
  const [reactions, setReactions] = useState(initReactions || {});
  const [myReactions, setMyReactions] = useState(new Set());
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const h = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleReaction = (emoji) => {
    setMyReactions(prev => {
      const n = new Set(prev);
      if (n.has(emoji)) { n.delete(emoji); setReactions(r => ({ ...r, [emoji]: Math.max(0, (r[emoji] || 1) - 1) })); }
      else { n.add(emoji); setReactions(r => ({ ...r, [emoji]: (r[emoji] || 0) + 1 })); }
      return n;
    });
    setShowPicker(false);
  };

  const nonZero = Object.entries(reactions).filter(([, v]) => v > 0);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {nonZero.map(([emoji, count]) => (
        <button key={emoji} onClick={() => toggleReaction(emoji)}
          className="cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all active:scale-90"
          style={{ background: myReactions.has(emoji) ? `${color}22` : "rgba(255,255,255,0.06)", border: `1px solid ${myReactions.has(emoji) ? color + "45" : "rgba(255,255,255,0.1)"}`, color: myReactions.has(emoji) ? color : "#9ca3af" }}>
          {emoji} <span className="font-medium">{count}</span>
        </button>
      ))}
      <div ref={pickerRef} className="relative">
        <button onClick={() => setShowPicker(v => !v)}
          className="cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-gray-600 hover:text-gray-300 transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Smile className="w-3 h-3" /> +
        </button>
        {showPicker && (
          <div className="absolute bottom-full mb-1 left-0 flex gap-1 p-2 rounded-xl"
            style={{ zIndex: 9999, background: "rgba(10,10,28,0.98)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            {EMOJI_REACTIONS.map(e => (
              <button key={e} onClick={() => toggleReaction(e)}
                className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg text-sm hover:bg-white/10 transition-all active:scale-90"
                style={{ background: myReactions.has(e) ? `${color}20` : "transparent" }}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Comment editor ───────────────────────────────────────────────
const CommentEditor = ({ placeholder, onSubmit, onCancel, color, isReply = false, defaultValue = "", submitLabel = "Közzétesz" }) => {
  const [text, setText] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef(null);

  const insertMd = (wrap) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = text.slice(start, end) || "szöveg";
    const before = text.slice(0, start), after = text.slice(end);
    setText(before + wrap + sel + wrap + after);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + wrap.length, start + wrap.length + sel.length); }, 10);
  };

  return (
    <div>
      {!isReply && (
        <div className="flex items-center gap-1 mb-2">
          {[
            { icon: <Bold className="w-3 h-3" />, action: () => insertMd("**"), title: "Félkövér" },
            { icon: <Italic className="w-3 h-3" />, action: () => insertMd("*"), title: "Dőlt" },
            { icon: <Code className="w-3 h-3" />, action: () => insertMd("`"), title: "Kód" },
            { icon: <Quote className="w-3 h-3" />, action: () => setText(t => t + "\n> "), title: "Idézet" },
            { icon: <List className="w-3 h-3" />, action: () => setText(t => t + "\n- "), title: "Lista" },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} title={btn.title}
              className="cursor-pointer p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-all">
              {btn.icon}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setPreview(v => !v)}
            className="cursor-pointer px-2.5 py-1 rounded-lg text-xs transition-all"
            style={{ background: preview ? `${color}20` : "rgba(255,255,255,0.05)", color: preview ? color : "#6b7280", border: `1px solid ${preview ? color + "40" : "rgba(255,255,255,0.08)"}` }}>
            {preview ? "Szerkesztés" : "Előnézet"}
          </button>
        </div>
      )}

      {!preview ? (
        <textarea ref={textareaRef} value={text}
          onChange={e => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"; }}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (text.trim()) { onSubmit(text); setText(""); } } }}
          placeholder={placeholder}
          rows={isReply ? 2 : 4}
          className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none transition-all font-mono"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${text ? color + "40" : "rgba(255,255,255,0.08)"}`, minHeight: isReply ? "56px" : "100px" }} />
      ) : (
        <div className="w-full px-3 py-2.5 rounded-xl text-gray-300 text-sm leading-relaxed min-h-[80px]"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {text ? renderMd(text) : <span className="text-gray-600 italic">Előnézet...</span>}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-gray-700 text-xs">Ctrl+Enter = küldés{!isReply && " · Markdown támogatott"}</span>
        <div className="flex gap-2">
          {onCancel && (
            <button onClick={onCancel} className="cursor-pointer px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-all">
              Mégse
            </button>
          )}
          <button onClick={() => { if (text.trim()) { onSubmit(text); setText(""); } }}
            disabled={!text.trim()}
            className="cursor-pointer flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-30"
            style={{ background: text.trim() ? `linear-gradient(135deg, ${color}, ${color}99)` : "rgba(255,255,255,0.05)", boxShadow: text.trim() ? `0 4px 16px ${color}25` : "none" }}>
            <Send className="w-3 h-3" /> {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Report Modal ─────────────────────────────────────────────────
const ReportModal = ({ isOpen, onClose }) => {
  const [reason, setReason] = useState("");
  if (!isOpen) return null;
  const reasons = ["Spam vagy hirdetés", "Sértő vagy zaklató tartalom", "Félrevezető információ", "Szerzői jog megsértése", "Egyéb"];
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "rgba(10,10,28,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-white font-bold text-sm flex items-center gap-2"><Flag className="w-4 h-4 text-red-400" /> Bejelentés</h3>
          <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-gray-400 text-xs mb-3">Miért szeretnéd bejelenteni ezt a tartalmat?</p>
          {reasons.map(r => (
            <label key={r} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{ background: reason === r ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${reason === r ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)"}` }}>
              <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{ borderColor: reason === r ? "#f87171" : "#4b5563", background: reason === r ? "#f87171" : "transparent" }}>
                {reason === r && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <input type="radio" className="hidden" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span className="text-xs" style={{ color: reason === r ? "#fca5a5" : "#9ca3af" }}>{r}</span>
            </label>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-white/8 flex gap-2">
          <button onClick={onClose} className="cursor-pointer flex-1 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>Mégse</button>
          <button disabled={!reason} onClick={onClose}
            className="cursor-pointer flex-1 py-2 rounded-xl text-sm text-white font-semibold transition-all disabled:opacity-30"
            style={{ background: "linear-gradient(135deg,#dc2626,#991b1b)" }}>
            Bejelentés küldése
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Comment card ─────────────────────────────────────────────────
const CommentCard = ({ comment, color, isReply = false, onAddReply, currentUser = "én" }) => {
  const [liked, setLiked] = useState(comment.liked);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [showReplies, setShowReplies] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [content, setContent] = useState(comment.content);
  const [showReport, setShowReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const menuRef = useRef(null);
  const isOwn = comment.author === currentUser;

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
    const quoted = `> *${comment.author} írta:*\n> ${comment.content.slice(0, 100).replace(/\n/g, "\n> ")}${comment.content.length > 100 ? "..." : ""}\n\n${text}`;
    onAddReply?.(comment.id, quoted);
    setQuoting(false);
  };

  const copyCommentLink = () => {
    navigator.clipboard.writeText(`${window.location.href}#comment-${comment.id}`);
    setShowMenu(false);
  };

  return (
    <div id={`comment-${comment.id}`} className={isReply ? "ml-6 mt-2" : ""}>
      <div className="group transition-all duration-150 relative"
        style={{
          background: comment.pinned ? "rgba(167,139,250,0.06)" : isReply ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
          border: comment.pinned ? "1px solid rgba(167,139,250,0.25)" : `1px solid ${isReply ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: "0.875rem", padding: isReply ? "0.75rem 0.875rem" : "1rem 1.125rem",
          zIndex: showMenu ? 50 : "auto",
          position: "relative",
        }}>

        {comment.pinned && (
          <div className="flex items-center gap-1 mb-2 text-purple-400">
            <Pin className="w-2.5 h-2.5" />
            <span className="text-xs font-semibold">Moderátor által kiemelve</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {comment.avatarUrl ? <img src={comment.avatarUrl} alt="avatar" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" /> : <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
              style={{ background: comment.avatarColor + "45", border: `1px solid ${comment.avatarColor}35` }}>
              {comment.avatar}
            </div>}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs" style={{ color: comment.avatarColor }}>{comment.author}</span>
                {comment.isOP && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>OP</span>}
                {isOwn && !comment.isOP && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>Te</span>}
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
                style={{ zIndex: 9999, background: "rgba(10,10,28,0.98)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
                <button onClick={copyCommentLink} className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Link másolása
                </button>
                <button onClick={() => { setQuoting(true); setShowMenu(false); }} className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
                  <Quote className="w-3.5 h-3.5" /> Idézett válasz
                </button>
                {isOwn && (
                  <button onClick={() => { setEditing(true); setShowMenu(false); }} className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/8 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Szerkesztés
                  </button>
                )}
                <button onClick={() => { setShowReport(true); setShowMenu(false); }} className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-colors">
                  <Flag className="w-3.5 h-3.5" /> Bejelentés
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-gray-300 text-sm leading-relaxed pl-9">
          {editing ? (
            <div>
              <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${color}40` }} />
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setContent(editedContent); setEditing(false); }}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs text-white font-semibold transition-all"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>Mentés</button>
                <button onClick={() => { setEditing(false); setEditedContent(content); }}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all">Mégse</button>
              </div>
            </div>
          ) : renderMd(content)}
        </div>

        <div className="pl-9 mt-2">
          <ReactionBar reactions={comment.reactions} color={color} commentId={comment.id} />
        </div>

        <div className="flex items-center gap-3 pl-9 mt-2.5">
          <button onClick={() => { setLiked(v => !v); setLikeCount(c => liked ? c - 1 : c + 1); }}
            className="cursor-pointer flex items-center gap-1 text-xs transition-all active:scale-90 px-2 py-1 rounded-lg hover:bg-white/8"
            style={{ color: liked ? "#f472b6" : "#6b7280" }}>
            <Heart className={`w-3 h-3 ${liked ? "fill-current" : ""}`} />{likeCount}
          </button>

          {!isReply && (
            <button onClick={() => { setReplyOpen(v => !v); setQuoting(false); }}
              className="cursor-pointer flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/8">
              <Reply className="w-3 h-3" /> Válasz
            </button>
          )}

          {!isReply && comment.replies?.length > 0 && (
            <button onClick={() => setShowReplies(v => !v)}
              className="cursor-pointer flex items-center gap-1 text-xs transition-all px-2 py-1 rounded-lg hover:bg-white/8"
              style={{ color }}>
              {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {comment.replies.length} válasz
            </button>
          )}
        </div>

        {(replyOpen || quoting) && !isReply && (
          <div className="pl-9 mt-3">
            <CommentEditor
              placeholder={quoting ? `Idézett válasz ${comment.author}-nak...` : `Válasz ${comment.author}-nak...`}
              onSubmit={quoting ? handleQuoteReply : handleReply}
              onCancel={() => { setReplyOpen(false); setQuoting(false); }}
              color={color} isReply submitLabel="Válasz küldése"
            />
          </div>
        )}
      </div>

      {!isReply && showReplies && comment.replies?.length > 0 && (
        <div className="space-y-2 mt-2">
          {comment.replies.map(reply => (
            <CommentCard key={reply.id} comment={reply} color={color} isReply />
          ))}
        </div>
      )}

      <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} />
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
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
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
      style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>
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
const HelpfulWidget = ({ color }) => {
  const [voted, setVoted] = useState(null);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-gray-500 text-xs">Hasznos volt ez a bejegyzés?</span>
      {["Igen 👍", "Nem 👎"].map((label, i) => (
        <button key={label} onClick={() => setVoted(i)}
          className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={{
            background: voted === i ? (i === 0 ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.15)") : "rgba(255,255,255,0.05)",
            border: `1px solid ${voted === i ? (i === 0 ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.35)") : "rgba(255,255,255,0.08)"}`,
            color: voted === i ? (i === 0 ? "#4ade80" : "#f87171") : "#9ca3af",
          }}>
          {voted === i ? <Check className="w-3 h-3 inline mr-1" /> : null}{label}
        </button>
      ))}
      {voted !== null && <span className="text-green-400 text-xs">Köszönjük a visszajelzést!</span>}
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
          <Link className="w-3.5 h-3.5" style={{ color }} /> Permalink
        </h4>
        <div className="flex items-center gap-2 p-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-gray-500 text-xs font-mono truncate flex-1">{displayPath}</span>
          <button onClick={handleCopy}
            className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all flex-shrink-0"
            style={{ background: copied ? "rgba(74,222,128,0.15)" : `${color}20`, color: copied ? "#4ade80" : color, border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : color + "40"}` }}>
            {copied ? <><Check className="w-3 h-3" /> Másolva!</> : <><Copy className="w-3 h-3" /> Másolás</>}
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

// ─── User Profile Modal ───────────────────────────────────────────
const UserProfileModal = ({ isOpen, onClose, author, authorAvatar, authorAvatarUrl, authorColor, authorPosts = [], onOpenPost }) => {
  if (!isOpen) return null;
  const totalLikes = authorPosts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalViews = authorPosts.reduce((s, p) => s + (p.views || 0), 0);
  const totalComments = authorPosts.reduce((s, p) => s + (p.comments || 0), 0);
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "rgba(10,10,28,0.98)", border: `1px solid ${authorColor}30`, maxHeight: "85vh", boxShadow: `0 30px 80px rgba(0,0,0,0.8), 0 0 60px ${authorColor}12` }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between flex-shrink-0">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: authorColor }} /> Felhasználó profil
          </h3>
          <button onClick={onClose} className="cursor-pointer p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
        </div>
        {/* Profile info */}
        <div className="px-5 py-4 border-b border-white/6">
          <div className="flex items-center gap-3 mb-4">
            {authorAvatarUrl
              ? <img src={authorAvatarUrl} alt="avatar" className="w-14 h-14 rounded-2xl object-cover" />
              : <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white"
                  style={{ background: authorColor + "45", border: `1px solid ${authorColor}35` }}>{authorAvatar}</div>
            }
            <div>
              <div className="text-white font-bold text-base" style={{ color: authorColor }}>{author}</div>
              <div className="text-gray-500 text-xs">Fórum tag</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Bejegyzés", value: authorPosts.length, color: authorColor },
              { label: "Like", value: totalLikes.toLocaleString(), color: "#f472b6" },
              { label: "Megtekintés", value: totalViews.toLocaleString(), color: "#38bdf8" },
              { label: "Hozzászólás", value: totalComments.toLocaleString(), color: "#4ade80" },
            ].map(s => (
              <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
                <div className="text-gray-600 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Posts list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <PenSquare className="w-3.5 h-3.5" style={{ color: authorColor }} /> Bejegyzései ({authorPosts.length})
          </h4>
          {authorPosts.length > 0 ? (
            <div className="space-y-2">
              {authorPosts.map(p => {
                const pc = CATEGORIES[p.category];
                return (
                  <button key={p.id} onClick={() => { onClose(); onOpenPost?.(p); }}
                    className="cursor-pointer w-full text-left p-3 rounded-xl transition-all hover:bg-white/5 group"
                    style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {p.pinned && <span className="text-xs px-1 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontSize: "0.6rem" }}>📌</span>}
                      {p.hot && <span className="text-xs px-1 py-0.5 rounded-full" style={{ background: "rgba(251,113,33,0.15)", color: "#fb923c", fontSize: "0.6rem" }}>🔥</span>}
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${pc?.color || authorColor}15`, color: pc?.color || authorColor, fontSize: "0.65rem" }}>{pc?.emoji} {pc?.label}</span>
                    </div>
                    <p className="text-white text-xs font-semibold leading-snug group-hover:text-purple-200 transition-colors">{p.title}</p>
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
              <p className="text-gray-600 text-xs">Még nincs bejegyzése</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Törlés megerősítő dialog (lokális, poszt nézetben) ───────────
const ConfirmDeleteModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl p-6 max-w-sm w-full"
        style={{ background: "rgba(10,10,28,0.99)", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-sm">Biztosan törlöd?</h3>
        </div>
        <p className="text-gray-400 text-xs mb-5 leading-relaxed">A poszt véglegesen törlődik. Ez a művelet nem vonható vissza.</p>
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

// ─── FŐ KOMPONENS ─────────────────────────────────────────────────
// JAVÍTÁS: currentUserId, isAdmin, onDelete, onEdit, onToggle propok hozzáadva
export default function ForumPost({
  post,
  allPosts = [],
  onBack,
  onOpenPost,
  currentUserId,
  isAdmin,
  onDelete,
  onEdit,
  onToggle,
}) {
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortComments, setSortComments] = useState("top");
  const [commentSearch, setCommentSearch] = useState("");
  const [showCommentSearch, setShowCommentSearch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const { user: globalUser } = useContext(MyUserContext);
  const navigate = useNavigate();
  const cat = CATEGORIES[post?.category] || CATEGORIES.chat;
  const color = cat.color;

  // JAVÍTÁS: jogosultság-számítás
  // Ha nincs authorId (mock poszt) → mindenki kezelheti; ha van → csak a saját uid
  const isOwn = !post?.authorId || (!!currentUserId && currentUserId === post?.authorId);
  const canManage = isOwn || isAdmin;

  const relatedPosts = (allPosts.length > 1
    ? allPosts.filter(p => p.id !== post?.id && p.category === post?.category)
    : RELATED_MOCK
  ).slice(0, 3);

  const handleShare = () => {
    const permalink = post?.slug && post?.category
      ? `${window.location.origin}/forum/${post.category}/${post.slug}`
      : window.location.href;
    navigator.clipboard.writeText(permalink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Értesítés létrehozása ──────────────────────────────────────────
  const createNotification = useCallback(async (recipientId, type, text) => {
    if (!recipientId || recipientId === currentUserId) return; // ne értesítsd magad
    try {
      await addDoc(collection(db, "forum_notifications"), {
        recipientId,
        type,
        text,
        read: false,
        createdAt: serverTimestamp(),
        // Opcionálisan hozzátesszük a bejegyzés adatait a kattinthatósághoz
        postId: post.id,
        category: post.category,
        slug: post.slug
      });
      console.log("[ForumPost] Értesítés létrehozva:", { recipientId, type, text });
    } catch (e) {
      console.error("[ForumPost] Hiba az értesítés létrehozásakor:", e);
    }
  }, [currentUserId, post?.id, post?.category, post?.slug]);

  // ── Firebase Figyelő ─────────────────────────────────────────────
  useEffect(() => {
    if (!post?.id) return;

    console.log("[ForumPost] Hozzászólások betöltése a bejegyzéshez:", post.id);
    setIsLoadingComments(true);

    const q = query(
      collection(db, "forum_comments"),
      where("postId", "==", post.id),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const allComms = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        time: formatFirebaseTime(d.data().createdAt)
      }));

      // Csoportosítás parentId alapján
      const rootComments = allComms.filter(c => !c.parentId);
      const replies = allComms.filter(c => c.parentId);

      const assembled = rootComments.map(rc => ({
        ...rc,
        replies: replies.filter(r => r.parentId === rc.id)
      }));

      console.log(`[ForumPost] ${assembled.length} fő hozzászólás betöltve (+ ${replies.length} válasz)`);
      
      // Ha nincs még adat, és ez egy mock post id (szám), használjuk az inicialis mockokat
      if (assembled.length === 0 && (typeof post.id === 'number' || String(post.id).length < 5)) {
        setComments(INITIAL_COMMENTS);
      } else {
        setComments(assembled);
      }
      
      setIsLoadingComments(false);
    }, (err) => {
      console.error("[ForumPost] Firebase hiba:", err);
      setIsLoadingComments(false);
      // Hiba esetén fallback a mockokra ha mock post
      if (typeof post.id === 'number' || String(post.id).length < 5) setComments(INITIAL_COMMENTS);
    });

    return unsub;
  }, [post?.id]);

  const handleAddComment = async (text) => {
    if (!post?.id) return;

    try {
      const nc = {
        postId: post.id,
        parentId: null,
        author: globalUser?.displayName || globalUser?.email?.split("@")[0] || "Felhasználó",
        authorId: currentUserId || null,
        avatar: (globalUser?.displayName?.[0] || globalUser?.email?.[0] || "F").toUpperCase(),
        avatarColor: color,
        avatarUrl: globalUser?.profilePicture || null,
        content: text,
        createdAt: serverTimestamp(),
        likes: 0,
        likedIds: [],
        reactions: {},
        pinned: false,
        isOP: currentUserId === post.authorId
      };

      await addDoc(collection(db, "forum_comments"), nc);
      console.log("[ForumPost] Hozzászólás mentve a Firebase-be");

      // Értesítés a bejegyzés szerzőjének (ha nem saját magunknak írunk)
      if (post.authorId && post.authorId !== currentUserId) {
        const authorName = globalUser?.displayName || "Valaki";
        createNotification(
          post.authorId,
          "comment",
          `${authorName} hozzászólt a(z) "${post.title}" témádhoz.`
        );
      }
    } catch (e) {
      console.error("[ForumPost] Hiba a hozzászólás mentésekor:", e);
    }
  };

  const handleAddReply = async (parentId, text) => {
    if (!post?.id || !parentId) return;

    try {
      const nr = {
        postId: post.id,
        parentId: parentId,
        author: globalUser?.displayName || globalUser?.email?.split("@")[0] || "Felhasználó",
        authorId: currentUserId || null,
        avatar: (globalUser?.displayName?.[0] || globalUser?.email?.[0] || "F").toUpperCase(),
        avatarColor: color,
        avatarUrl: globalUser?.profilePicture || null,
        content: text,
        createdAt: serverTimestamp(),
        likes: 0,
        likedIds: [],
        reactions: {},
        isOP: currentUserId === post.authorId
      };

      await addDoc(collection(db, "forum_comments"), nr);
      console.log("[ForumPost] Válasz mentve a Firebase-be (parentId:", parentId, ")");

      // Értesítés a szülő hozzászólás szerzőjének
      // Megkeressük a szülő hozzászólást a listában
      const parentComment = comments.find(c => c.id === parentId);
      if (parentComment && parentComment.authorId && parentComment.authorId !== currentUserId) {
        const authorName = globalUser?.displayName || "Valaki";
        createNotification(
          parentComment.authorId,
          "reply",
          `${authorName} válaszolt a hozzászólásodra itt: "${post.title}".`
        );
      }
    } catch (e) {
      console.error("[ForumPost] Hiba a válasz mentésekor:", e);
    }
  };

  const totalComments = comments.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0);

  const filteredComments = comments.filter(c =>
    !commentSearch || c.content.toLowerCase().includes(commentSearch.toLowerCase()) || c.author.toLowerCase().includes(commentSearch.toLowerCase())
  ).sort((a, b) => {
    if (sortComments === "top") return b.likes - a.likes;
    if (sortComments === "new") return b.id - a.id;
    if (sortComments === "pinned") return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    return 0;
  });

  if (!post) return null;
  post && console.log(post);


  return (
    <div className="min-h-screen relative"
      style={{ background: "radial-gradient(ellipse at top, #1a0b2e 0%, #0a0118 50%, #000000 100%)", fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif" }}>
      <ReadingProgress color={color} />
      <ScrollToTop />

      {/* Profil modal */}
      <UserProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        author={post.author}
        authorAvatar={post.avatar}
        authorAvatarUrl={post.avatarUrl}
        authorColor={post.avatarColor}
        authorPosts={allPosts.filter(p => p.author === post.author)}
        onOpenPost={onOpenPost}
      />

      {/* Törlés megerősítő (lokális) */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete?.(post.id, post.authorId);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: `${color}08`, animation: "floatB 22s ease-in-out infinite" }} />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl" style={{ animation: "floatB 30s ease-in-out infinite reverse" }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-3 md:px-5 py-5">
        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button onClick={onBack} className="cursor-pointer flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm">Fórum</span>
          </button>
          <ChevronRight className="w-3 h-3 text-gray-700" />
          <span className="text-xs" style={{ color }}>{cat.emoji} {cat.label}</span>
          <ChevronRight className="w-3 h-3 text-gray-700" />
          <span className="text-gray-600 text-xs truncate max-w-[180px]">{post.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
          <div className="space-y-4">
            <GlassCard style={{ border: `1px solid ${color}20` }}>
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {post.pinned && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}><Pin className="w-2.5 h-2.5" />Kitűzve</span>}
                  {post.hot && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(251,113,33,0.15)", color: "#fb923c", border: "1px solid rgba(251,113,33,0.25)" }}><Flame className="w-2.5 h-2.5" />Trending</span>}
                  {post.locked && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}><Lock className="w-2.5 h-2.5" />Lezárva</span>}
                  {post.solved && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}><CheckCircle className="w-2.5 h-2.5" />Megoldva</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>{cat.emoji} {cat.label}</span>
                  <span className="ml-auto text-gray-600 text-xs flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />{post.readTime} perc olvasás
                  </span>
                </div>

                <h1 className="text-white font-bold text-xl md:text-2xl leading-tight mb-4">{post.title}</h1>

                <div className="flex items-center gap-4 mb-6 py-4 border-y border-white/5">
                  <div className="relative cursor-pointer group" onClick={() => setShowProfile(true)}>
                    {post.avatarUrl ? (
                      <img src={post.avatarUrl} alt="avatar" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-[color:var(--accent)] transition-all" style={{ '--accent': color }} />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white group-hover:scale-105 transition-all"
                        style={{ background: `linear-gradient(135deg, ${post.avatarColor}45, ${post.avatarColor}25)`, border: `1px solid ${post.avatarColor}35` }}>
                        {post.avatar}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0a0118]" title="Online" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-base text-white hover:underline cursor-pointer" onClick={() => setShowProfile(true)} style={{ color: post.avatarColor }}>{post.author}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-medium uppercase tracking-wider">Szerző</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500 text-xs">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.time}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-800" />
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views?.toLocaleString()} megtekintés</span>
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => setFollowing(v => !v)}
                      className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                      style={{ background: following ? `${color}20` : "rgba(255,255,255,0.05)", color: following ? color : "#9ca3af", border: `1px solid ${following ? color + "40" : "rgba(255,255,255,0.1)"}` }}>
                      <Rss className="w-3 h-3" />{following ? "Követed" : "Követés"}
                    </button>
                    <button onClick={() => setBookmarked(v => !v)} className="cursor-pointer p-2 rounded-xl transition-all hover:bg-white/8"
                      style={{ color: bookmarked ? "#fbbf24" : "#6b7280" }}>
                      <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
                    </button>
                    <button onClick={handleShare} className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all hover:bg-white/8"
                      style={{ color: copied ? "#4ade80" : "#6b7280" }}>
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{copied ? "Másolva!" : "Megosztás"}</span>
                    </button>
                  </div>
                </div>

                <div className="text-gray-300 text-sm leading-relaxed space-y-0.5 mb-5">
                  {renderMd(post.content)}
                </div>

                {post.poll && <PollWidget poll={post.poll} color={color} />}

                <div className="flex gap-1.5 flex-wrap mb-5">
                  {post.tags?.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>#{t}</span>
                  ))}
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-white/6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setLiked(v => !v); setLikeCount(c => liked ? c - 1 : c + 1); }}
                        className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
                        style={{ background: liked ? `${color}25` : "rgba(255,255,255,0.05)", border: `1px solid ${liked ? color + "45" : "rgba(255,255,255,0.08)"}`, color: liked ? color : "#9ca3af", boxShadow: liked ? `0 0 20px ${color}20` : "none" }}>
                        <ThumbsUp className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />{likeCount}
                      </button>
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-600"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <MessageSquare className="w-4 h-4" />{totalComments} hozzászólás
                      </div>
                    </div>
                    <ReactionBar reactions={{ "🔥": 12, "⭐": 5 }} color={color} commentId="post" />
                  </div>
                  <HelpfulWidget color={color} />
                </div>
              </div>
            </GlassCard>

            {!post.locked && (
              <GlassCard>
                <div className="p-4 md:p-5">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color }} /> Szólj hozzá
                  </h3>
                  <div className="flex gap-3">
                    {globalUser?.profilePicture ? <img src={globalUser.profilePicture} alt="avatar" className="w-8 h-8 rounded-xl object-cover flex-shrink-0 mt-0.5" /> : <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 mt-0.5"
                      style={{ background: `${color}40`, border: `1px solid ${color}35` }}>{(globalUser?.displayName?.[0] || globalUser?.email?.[0] || "É").toUpperCase()}</div>}
                    <div className="flex-1">
                      <CommentEditor placeholder="Írd meg a véleményed..." onSubmit={handleAddComment} color={color} />
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {post.locked && (
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">Ez a téma le van zárva. Nem lehet új hozzászólást írni.</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" style={{ color }} />
                  Hozzászólások ({totalComments})
                </h3>

                <div className="flex items-center gap-2">
                  {showCommentSearch && (
                    <div className="relative">
                      <input value={commentSearch} onChange={e => setCommentSearch(e.target.value)}
                        placeholder="Keresés a hozzászólásokban..."
                        className="w-48 px-3 py-1.5 rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${color}30` }} />
                      {commentSearch && <button onClick={() => setCommentSearch("")} className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-gray-600"><X className="w-3 h-3" /></button>}
                    </div>
                  )}
                  <button onClick={() => { setShowCommentSearch(v => !v); setCommentSearch(""); }}
                    className="cursor-pointer p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-all"
                    style={{ color: showCommentSearch ? color : undefined }}>
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-0.5 p-0.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {[
                      { id: "top", label: "Legjobb" },
                      { id: "new", label: "Legújabb" },
                      { id: "pinned", label: "Kiemelt" },
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
                    <CommentCard key={c.id} comment={c} color={color} onAddReply={handleAddReply} />
                  ))
                  : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <MessageSquare className="w-10 h-10 text-gray-700" />
                      <p className="text-gray-500 text-sm">{commentSearch ? "Nincs találat" : "Légy az első hozzászóló!"}</p>
                    </div>
                  )}
              </div>
            </div>

            {relatedPosts.length > 0 && (
              <GlassCard>
                <div className="px-5 pt-4 pb-4">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color }} /> Kapcsolódó témák
                  </h3>
                  <div className="space-y-2">
                    {relatedPosts.map(p => {
                      const rc = CATEGORIES[p.category];
                      return (
                        <button key={p.id} onClick={() => onOpenPost?.(p)}
                          className="cursor-pointer w-full text-left p-3 rounded-xl transition-all hover:bg-white/5 group"
                          style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-white text-xs font-semibold leading-snug group-hover:text-purple-200 transition-colors line-clamp-2">{p.title}</p>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors" />
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-gray-600 text-xs">
                            <span style={{ color: rc?.color }}>{rc?.emoji} {rc?.label}</span>
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
          <div className="space-y-3">
            <TableOfContents content={post.content} color={color} />



            <GlassCard>
              <div className="px-4 pt-4 pb-3">
                <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Bejegyzés infó</h4>
                {[
                  { label: "Szerző", value: post.author, color: post.avatarColor },
                  { label: "Kategória", value: `${cat.emoji} ${cat.label}`, color },
                  { label: "Közzétéve", value: post.time },
                  { label: "Megtekintés", value: post.views?.toLocaleString() },
                  { label: "Hozzászólások", value: totalComments },
                  { label: "Like-ok", value: likeCount },
                  { label: "Olvasási idő", value: `${post.readTime} perc` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-600 text-xs">{item.label}</span>
                    <span className="text-xs font-semibold" style={{ color: item.color || "white" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard style={{ border: `1px solid ${post.avatarColor}20` }}>
              <div className="px-4 pt-4 pb-4">
                <div className="flex items-center gap-2.5 mb-3">
                  {post.avatarUrl ? <img src={post.avatarUrl} alt="avatar" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                    style={{ background: post.avatarColor + "45", border: `1px solid ${post.avatarColor}35` }}>{post.avatar}</div>}
                  <div>
                    <div className="text-white font-bold text-sm" style={{ color: post.avatarColor }}>{post.author}</div>
                    <div className="text-gray-600 text-xs">Rangidős tag · 4.8k pont</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {[{ label: "Témák", value: "42" }, { label: "Hozzász.", value: "312" }, { label: "Like-ok", value: "2.1k" }].map(s => (
                    <div key={s.label} className="text-center py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="text-white font-bold text-sm">{s.value}</div>
                      <div className="text-gray-600 text-xs">{s.label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowProfile(true)}
                  className="cursor-pointer w-full py-2 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${post.avatarColor}50, ${post.avatarColor}30)`, border: `1px solid ${post.avatarColor}40` }}>
                  Profil megtekintése
                </button>
              </div>
            </GlassCard>

            {post.tags?.length > 0 && (
              <GlassCard>
                <div className="px-4 pt-4 pb-3">
                  <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Tagek</h4>
                  <div className="flex gap-1.5 flex-wrap">
                    {post.tags.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>#{t}</span>
                    ))}
                  </div>
                </div>
              </GlassCard>
            )}

            {/* ── MODERÁCIÓ PANEL — JAVÍTVA ── */}
            {/* Csak akkor jelenik meg, ha a felhasználónak van jogosultsága */}
            {canManage && (
              <GlassCard>
                <div className="px-4 pt-4 pb-3">
                  <h4 className="text-gray-500 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Shield className="w-3 h-3" /> {isAdmin && !isOwn ? "Admin műveletek" : "Saját téma"}
                  </h4>
                  <div className="space-y-0.5">

                    {/* Szerkesztés — csak saját poszthoz */}
                    {isOwn && (
                      <button
                        onClick={() => onEdit?.(post)}
                        className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                        style={{ color: "#60a5fa" }}>
                        <Edit3 className="w-3.5 h-3.5" /> Szerkesztés
                      </button>
                    )}

                    {/* Megoldottnak jelöl — csak saját poszthoz */}
                    {isOwn && (
                      <button
                        onClick={() => onToggle?.(post.id, "solved", !post.solved)}
                        className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                        style={{ color: post.solved ? "#6b7280" : "#4ade80" }}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        {post.solved ? "Megoldás visszavon" : "Megoldottnak jelöl"}
                      </button>
                    )}

                    {/* Zárolás — saját vagy admin */}
                    {canManage && (
                      <button
                        onClick={() => onToggle?.(post.id, "locked", !post.locked)}
                        className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                        style={{ color: post.locked ? "#60a5fa" : "#fb923c" }}>
                        {post.locked
                          ? <><Unlock className="w-3.5 h-3.5" /> Zárolás feloldása</>
                          : <><Lock className="w-3.5 h-3.5" /> Téma zárolása</>
                        }
                      </button>
                    )}

                    {/* Kitűzés — csak admin */}
                    {isAdmin && (
                      <button
                        onClick={() => onToggle?.(post.id, "pinned", !post.pinned)}
                        className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                        style={{ color: "#fbbf24" }}>
                        <Pin className="w-3.5 h-3.5" />
                        {post.pinned ? "Kitűzés eltávolítása" : "Kitűzés"}
                      </button>
                    )}

                    {/* Trending — csak admin */}
                    {isAdmin && (
                      <button
                        onClick={() => onToggle?.(post.id, "hot", !post.hot)}
                        className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-white/8"
                        style={{ color: "#fb923c" }}>
                        <Flame className="w-3.5 h-3.5" />
                        {post.hot ? "Trending eltávolítása" : "Trending jelölés"}
                      </button>
                    )}

                    {/* Törlés — saját vagy admin */}
                    <div className="border-t border-white/8 mt-1 pt-1">
                      <button
                        onClick={() => onDelete?.(post.id, post.authorId)}
                        className="cursor-pointer w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-all hover:bg-red-400/10"
                        style={{ color: "#f87171" }}>
                        <Trash2 className="w-3.5 h-3.5" /> Téma törlése
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatB { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-20px) scale(1.05)} 66%{transform:translate(-15px,15px) scale(0.95)} }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>
    </div>
  );
}