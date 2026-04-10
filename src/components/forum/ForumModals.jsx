import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PenSquare, MessageSquare, Hash, Zap, Sparkles, Plus, BarChart2, Eye, Layout } from 'lucide-react';

const CATEGORIES = [
  { id: "chat", label: "Chat AI", emoji: "💬", color: "#a78bfa" },
  { id: "code", label: "Code AI", emoji: "🧠", color: "#34d399" },
  { id: "image", label: "Kép AI", emoji: "🖼️", color: "#f472b6" },
  { id: "audio", label: "Hang AI", emoji: "🎵", color: "#fb923c" },
  { id: "threed", label: "3D AI", emoji: "🧊", color: "#38bdf8" },
];

export default function ForumModals({ isOpen, onClose, onSubmit, editPost, defaultCategory }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCat, setSelectedCat] = useState(defaultCategory || "chat");
  const [tags, setTags] = useState("");
  const [preview, setPreview] = useState(false);
  
  // Poll state
  const [addPoll, setAddPoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);

  useEffect(() => {
    if (isOpen) {
      if (editPost) {
        setTitle(editPost.title || "");
        setContent(editPost.content || "");
        setSelectedCat(editPost.category || "chat");
        setTags(editPost.tags?.join(", ") || "");
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
  }, [isOpen, editPost, defaultCategory]);

  if (!isOpen) return null;

  const currentCat = CATEGORIES.find(c => c.id === selectedCat) || CATEGORIES[0];

  const handleFormSubmit = () => {
    if (title.length < 5) return;
    const data = {
      title: title.trim(),
      content: content.trim(),
      category: selectedCat,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      poll: addPoll && pollQ.trim() 
        ? { 
            question: pollQ.trim(), 
            options: pollOpts.filter(o => o.trim()).map((o, i) => ({ id: String.fromCharCode(97 + i), label: o.trim(), votes: 0 })) 
          } 
        : null,
    };
    onSubmit(data, editPost?.id);
  };

  const addPollOpt = () => { if (pollOpts.length < 6) setPollOpts([...pollOpts, ""]); };
  const updatePollOpt = (i, val) => {
    const next = [...pollOpts];
    next[i] = val;
    setPollOpts(next);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md" 
          onClick={onClose} 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-[#0a0a14] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${currentCat.color}20` }}>
                   <PenSquare className="w-5 h-5" style={{ color: currentCat.color }} />
                </div>
                <div>
                   <h3 className="text-xl font-black text-white italic tracking-tighter">
                     {editPost ? 'Téma Szerkesztése' : 'Új Téma Indítása'}
                   </h3>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Osszd meg tudásod a közösséggel</p>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPreview(!preview)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${preview ? 'bg-primary text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                >
                   {preview ? <Layout className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                   {preview ? 'Szerkesztés' : 'Előnézet'}
                </button>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-all">
                   <X className="w-6 h-6" />
                </button>
             </div>
          </div>

          {/* Form Content */}
          <div className="p-8 overflow-y-auto space-y-8 scrollbar-thin flex-1">
             
             {/* Category Grid */}
             <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 block">Selected Category</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
                   {CATEGORIES.map(cat => (
                     <button
                       key={cat.id}
                       onClick={() => setSelectedCat(cat.id)}
                       className={`flex flex-col items-center gap-2 p-3 md:p-4 rounded-3xl border transition-all ${
                         selectedCat === cat.id ? 'bg-primary/20 border-primary/40 text-white opacity-100 grayscale-0' : 'bg-white/5 border-white/5 text-gray-500 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 hover:border-white/20'
                       }`}
                     >
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="text-[9px] font-black uppercase text-center">{cat.label}</span>
                     </button>
                   ))}
                </div>
             </div>

             {/* Title Input */}
             <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">Téma Címe</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Hogyan tudok tökéletes promptot írni MJ-ben?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-gray-700 focus:outline-none focus:border-primary/50 transition-all font-bold"
                />
             </div>

             {/* Content Area */}
             <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">Tartalom (Markdown támogatott)</label>
                {preview ? (
                   <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[160px] text-sm text-gray-300 font-medium leading-relaxed">
                      {content || <span className="text-gray-700 italic">Nincs megjelenítendő tartalom...</span>}
                   </div>
                ) : (
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Írd le a részleteket..."
                    rows={6}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-primary/50 transition-all resize-none font-medium leading-relaxed"
                  />
                )}
             </div>

             {/* Tags */}
             <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">Tagek (Vesszővel elválasztva)</label>
                <div className="relative">
                   <input 
                     type="text"
                     value={tags}
                     onChange={(e) => setTags(e.target.value)}
                     placeholder="prompting, midjourney, tutorial"
                     className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-primary/30 transition-all font-bold"
                   />
                   <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                </div>
             </div>

             {/* Poll Builder Section */}
             <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Szavazás hozzáadása</span>
                   </div>
                   <button 
                     onClick={() => setAddPoll(!addPoll)}
                     className={`w-12 h-6 rounded-full relative transition-all duration-300 ${addPoll ? 'bg-primary' : 'bg-white/10 border border-white/5'}`}
                   >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-lg ${addPoll ? 'left-7' : 'left-1'}`} />
                   </button>
                </div>

                <AnimatePresence>
                   {addPoll && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                         <input 
                           type="text"
                           value={pollQ}
                           onChange={(e) => setPollQ(e.target.value)}
                           placeholder="Mi a kérdésed?"
                           className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-gray-700 focus:outline-none"
                         />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {pollOpts.map((opt, i) => (
                               <input 
                                 key={i}
                                 type="text"
                                 value={opt}
                                 onChange={(e) => updatePollOpt(i, e.target.value)}
                                 placeholder={`${i+1}. opció`}
                                 className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-gray-300 placeholder-gray-700 focus:outline-none focus:border-white/20"
                               />
                            ))}
                            {pollOpts.length < 6 && (
                               <button 
                                 onClick={addPollOpt}
                                 className="bg-white/5 border border-white/10 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] text-gray-600 hover:text-white transition-all"
                               >
                                  <Plus className="w-3 h-3" /> Opció hozzáadása
                               </button>
                            )}
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
          </div>

          {/* Footer */}
          <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
             <button 
               onClick={onClose}
               className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-bold hover:text-white hover:bg-white/10 transition-all"
             >
                Mégse
             </button>
             <button
               onClick={handleFormSubmit}
               disabled={title.length < 5}
               className="flex-[2] py-4 rounded-2xl bg-white text-black font-black flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:grayscale"
             >
                {editPost ? 'Változtatások Mentése' : 'Téma Közzététele'} <Zap className="w-5 h-5 fill-current" />
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
