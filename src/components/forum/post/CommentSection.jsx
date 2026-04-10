import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, User, MessageSquare, Heart, Reply, MoreHorizontal, 
  Zap, Smile, Quote, Trash2, CheckCircle2,
  Bold, Italic, Code, List, Pin, Clock, ChevronRight, BarChart2
} from 'lucide-react';

const REACTION_EMOJIS = ["👍", "🔥", "🤯", "😂", "❤️", "⭐", "🤔", "🎉"];

const ReactionBar = ({ reactions = {}, color }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const h = e => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeReactions = Object.entries(reactions).filter(([_, count]) => count > 0);

  return (
    <div className="flex items-center gap-2 flex-wrap mt-5">
      {activeReactions.map(([emoji, count]) => (
        <button 
          key={emoji} 
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all border backdrop-blur-md bg-white/5 border-white/10 text-gray-400 hover:text-gray-200"
        >
          {emoji} <span>{count}</span>
        </button>
      ))}
      <div ref={pickerRef} className="relative">
        <button 
          onClick={() => setShowPicker(!showPicker)}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all border ${showPicker ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(138,43,226,0.5)]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`}
        >
          <Smile className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {showPicker && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full mb-3 left-0 flex gap-1.5 p-2 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
              style={{ background: "rgba(10,10,25,0.95)", backdropFilter: "blur(24px)" }}
            >
              {REACTION_EMOJIS.map(e => (
                <button 
                  key={e} 
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-xl hover:bg-white/10 transition-all active:scale-90"
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const CommentEditor = ({ placeholder, onSubmit, onCancel, color, isReply = false, submitLabel = "Küldés" }) => {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  const insertMd = (wrap, endWrap = wrap) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = text.slice(start, end) || "szöveg";
    const before = text.slice(0, start);
    const after = text.slice(end);
    setText(before + wrap + sel + endWrap + after);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + wrap.length, start + wrap.length + sel.length);
    }, 10);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (text.trim()) {
        onSubmit(text);
        setText("");
      }
    }
  };

  return (
    <div className={`space-y-4 ${isReply ? 'mt-6' : ''}`}>
       <div className="flex items-center gap-1.5 mb-1 px-1">
          {[
            { icon: <Bold className="w-3.5 h-3.5" />, action: () => insertMd("**"), title: "Bold" },
            { icon: <Italic className="w-3.5 h-3.5" />, action: () => insertMd("*"), title: "Italic" },
            { icon: <Code className="w-3.5 h-3.5" />, action: () => insertMd("`"), title: "Inline Code" },
            { icon: <Quote className="w-3.5 h-3.5" />, action: () => setText(t => t + "\n> "), title: "Quote" },
            { icon: <List className="w-3.5 h-3.5" />, action: () => setText(t => t + "\n- "), title: "List" },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} title={btn.title}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-all">
              {btn.icon}
            </button>
          ))}
       </div>

       <div className="relative group">
          <textarea 
            ref={textareaRef}
            value={text}
            onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full bg-white/[0.03] border border-white/8 rounded-[1.5rem] p-6 text-gray-200 text-sm focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all font-mono resize-none leading-relaxed shadow-inner ${isReply ? 'min-h-[100px]' : 'min-h-[160px]'}`}
          />
       </div>

       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[9px] font-black uppercase text-gray-700 tracking-widest italic flex items-center gap-2">
             <Zap className="w-3 h-3 text-primary" /> Ctrl+Enter a gyors küldéshez
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
             {onCancel && (
                <button onClick={onCancel} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all bg-white/5 border border-white/5 hover:border-white/10">
                   Mégse
                </button>
             )}
             <button 
               onClick={() => { if (text.trim()) { onSubmit(text); setText(""); } }}
               disabled={!text.trim()}
               className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all bg-primary shadow-[0_8px_20px_rgba(138,43,226,0.4)] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
             >
                <Send className="w-3.5 h-3.5" /> {submitLabel}
             </button>
          </div>
       </div>
    </div>
  );
};

const CommentItem = ({ comment, color, onReply, onDelete, currentUser, isAdmin, depth = 0 }) => {
  const [isReplying, setIsReplying] = useState(false);
  const isOwner = currentUser && comment.authorId === currentUser.uid;
  
  const processMarkdown = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black italic">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-white/5 text-primary text-[0.9em] font-mono border border-white/5">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline transition-all" target="_blank">$1</a>');
  };

  const handleReplySubmit = (text) => {
    onReply(text, comment.id);
    setIsReplying(false);
  };

  return (
    <div className={`group relative ${depth > 0 ? 'ml-6 md:ml-12 mt-6' : 'mt-12'}`}>
      {/* Thread Line Extension */}
      {depth > 0 && (
        <div className="absolute left-[-24px] md:left-[-36px] top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-white/5 to-transparent shadow-[0_0_10px_rgba(138,43,226,0.1)]" />
      )}
      
      <div className={`relative p-8 md:p-10 rounded-[2.5rem] border transition-all duration-500 overflow-visible ${
        comment.pinned 
          ? 'bg-primary/5 border-primary/20 shadow-[0_0_30px_rgba(138,43,226,0.1)]' 
          : 'bg-white/[0.02] border-white/5 hover:border-white/10 shadow-2xl'
      }`}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl border-2 transition-all shadow-xl flex items-center justify-center font-black italic text-lg" 
                  style={{ backgroundColor: `${color}10`, borderColor: `${color}25`, color }}>
                {comment.authorAvatar ? (
                  <img src={comment.authorAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{comment.authorName?.[0] || 'U'}</span>
                )}
             </div>
             <div>
                <div className="flex items-center gap-3">
                   <p className="text-white font-black text-base italic tracking-tight">{comment.authorName}</p>
                   {isOwner && <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Te</span>}
                   {comment.pinned && <span className="text-[8px] font-black uppercase tracking-[0.2em] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1"><Pin className="w-2.5 h-2.5 fill-current" /> Pinned</span>}
                </div>
                <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.25em] mt-1.5 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> {comment.createdAt?.toDate ? new Date(comment.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Most'}
                </p>
             </div>
          </div>
          {(isOwner || isAdmin) && (
             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { if(window.confirm("Biztosan törlöd ezt a hozzászólást?")) onDelete(comment.id); }}
                  className="p-2.5 rounded-xl hover:bg-red-500/10 text-gray-700 hover:text-red-400 transition-all"
                  title="Törlés"
                >
                   <Trash2 className="w-4 h-4" />
                </button>
             </div>
          )}
        </div>

        <div className="text-gray-300 font-medium text-base md:text-lg leading-relaxed mb-8 pl-1"
             dangerouslySetInnerHTML={{ __html: processMarkdown(comment.content) }} />

        <div className="flex items-center gap-8 pl-1 border-t border-white/5 pt-8">
           <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-red-400 transition-all group/stat">
             <Heart className="w-4 h-4 group-hover/stat:fill-current" /> {comment.likes || 0}
           </button>
           
           {depth < 4 && (
             <button 
               onClick={() => setIsReplying(!isReplying)}
               className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isReplying ? 'text-primary' : 'text-gray-600 hover:text-white'}`}
             >
               <Reply className={`w-4 h-4 ${isReplying ? 'fill-current' : ''}`} /> Válasz
             </button>
           )}
           
           <ReactionBar reactions={comment.reactions} color={color} />
        </div>

        <AnimatePresence>
          {isReplying && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-8 overflow-hidden"
            >
               <CommentEditor 
                 placeholder={`Válasz @${comment.authorName} részére...`}
                 onSubmit={handleReplySubmit}
                 onCancel={() => setIsReplying(false)}
                 color={color}
                 isReply
                 submitLabel="Válasz Küldése"
               />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-6">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              color={color} 
              onReply={onReply}
              onDelete={onDelete}
              currentUser={currentUser}
              isAdmin={isAdmin}
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CommentSection({ comments, color, onAddComment, onDeleteComment, currentUser, isAdmin }) {
  const buildTree = (list) => {
    const map = {};
    const tree = [];
    
    list.forEach(node => {
      map[node.id] = { ...node, replies: [] };
    });

    list.forEach(node => {
      if (node.parentId && map[node.parentId]) {
        map[node.parentId].replies.push(map[node.id]);
      } else {
        tree.push(map[node.id]);
      }
    });

    return tree;
  };

  const commentTree = buildTree(comments);

  return (
    <div className="mt-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center shadow-xl">
                <MessageSquare className="w-7 h-7 text-primary" />
             </div>
             <div>
                <h3 className="text-3xl font-black text-white italic tracking-tighter">Közösségi Beszélgetés</h3>
                <p className="text-[10px] font-black uppercase text-gray-700 tracking-[0.3em] mt-1">Összesen {comments.length} Gondolat</p>
             </div>
          </div>
          <div className="h-px bg-white/5 flex-1 mx-12 bg-gradient-to-r from-white/10 via-white/5 to-transparent hidden lg:block" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/[0.02]">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
             <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Live Feedback Active</span>
          </div>
      </div>

      <div className="glass-panel p-10 md:p-12 rounded-[3.5rem] border border-white/5 mb-24 relative overflow-hidden group shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity duration-1000">
           <BarChart2 className="w-32 h-32 text-white" />
        </div>
        
        <CommentEditor 
          placeholder="Oszd meg szakértői véleményedet vagy kérdezz bátran..."
          onSubmit={onAddComment}
          color={color}
          submitLabel="Hozzászólás Közzététele"
        />
      </div>

      <div className="space-y-16 pb-20">
        {commentTree.length > 0 ? (
          commentTree.map((comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              color={color} 
              onReply={onAddComment}
              onDelete={onDeleteComment}
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          ))
        ) : (
          <div className="py-24 text-center glass-panel rounded-[4rem] border-2 border-dashed border-white/5 transition-all hover:bg-white/[0.02]">
             <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <MessageSquare className="w-8 h-8 text-gray-800" />
             </div>
             <p className="font-black uppercase tracking-[0.5em] text-sm text-gray-600">Néma Csend</p>
             <p className="text-[10px] font-bold text-gray-800 uppercase tracking-[0.2em] mt-4 max-w-xs mx-auto leading-relaxed">Ez a téma még várja az első szikrát. Indítsd el te a beszélgetést!</p>
          </div>
        )}
      </div>
    </div>
  );
}
