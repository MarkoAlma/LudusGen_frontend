import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, MessageSquare, Clock, Search, X, ChevronRight, Pencil, Trash2, Check, AlertTriangle, Info, Loader2, MoreVertical } from 'lucide-react'; import { createPortal } from 'react-dom';
import { getModel } from '../../ai_components/models';

// ── Confirmation Modal ──────────────────────────────────────────────────────────
function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, isLoading }) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-md bg-[#0a0a14] border border-red-500/20 rounded-[2rem] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Icon */}
            <div className="pt-10 pb-6 flex flex-col items-center">
              <div className="w-20 h-20 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 group">
                <AlertTriangle className="w-10 h-10 animate-pulse group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-[0.2em]">{title}</h3>
            </div>

            {/* Content */}
            <div className="px-8 pb-10 text-center space-y-4">
              <p className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em] leading-relaxed">
                {message}
              </p>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4 text-left">
                <Info className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-wider">
                  All related messages and summaries will be permanently deleted. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 grid grid-cols-2 gap-3 bg-white/[0.02] border-t border-white/5">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="py-4 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="py-4 rounded-2xl bg-red-500 text-[10px] font-black text-white uppercase tracking-[0.3em] hover:bg-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function groupConversationsByDate(conversations) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const yesterdayStart = todayStart - 86400;
  const weekStart = todayStart - 7 * 86400;

  const groups = { today: [], yesterday: [], thisWeek: [], older: [] };

  conversations.forEach(conv => {
    const ts = conv.updatedAt?.seconds || conv.timestamp?.seconds || (conv.createdAt ? new Date(conv.createdAt).getTime() / 1000 : 0);
    if (ts >= todayStart) groups.today.push(conv);
    else if (ts >= yesterdayStart) groups.yesterday.push(conv);
    else if (ts >= weekStart) groups.thisWeek.push(conv);
    else groups.older.push(conv);
  });

  return groups;
}

export default function ChatSidebar({ conversations, loadingHistory, onSelectSession, onClose, onDeleteSession, onRenameSession, onLoadMore, hasMore, isLoadingMore }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const editInputRef = useRef(null);
  const scrollSentinelRef = useRef(null);
  const lastTriggerTimeRef = useRef(0);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore || loadingHistory) return;

    const observer = new IntersectionObserver((entries) => {
      const now = Date.now();
      // Strict guard + 0.8 second throttle
      if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loadingHistory && (now - lastTriggerTimeRef.current > 800)) {
        lastTriggerTimeRef.current = now;
        onLoadMore();
      }
    }, { 
      threshold: 0.5, // 50% visibility is enough
      rootMargin: '0px'
    });

    const currentSentinel = scrollSentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [onLoadMore, hasMore, isLoadingMore, loadingHistory]);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c =>
      (c.title || '').toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const grouped = useMemo(() =>
    groupConversationsByDate(filteredConversations),
    [filteredConversations]
  );

  const groupLabels = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'thisWeek', label: 'This week' },
    { key: 'older', label: 'Older' },
  ];

  const handleStartRename = (e, conv) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditValue(conv.title || 'Untitled_Session');
  };

  const handleSaveRename = (e, id) => {
    e.stopPropagation();
    if (editValue.trim()) {
      onRenameSession(id, editValue.trim());
    }
    setEditingId(null);
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    await onDeleteSession(confirmDeleteId);
    setConfirmDeleteId(null);
    setIsDeleting(false);
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveMenuId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  return (
    <div
      className="flex flex-col h-full bg-[#03000a] w-full relative overflow-hidden"
      style={{
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* Forum-Matched Atmospheric Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute bottom-[10%] right-[-20%] w-96 h-96 bg-primary/20 blur-[120px] rounded-full" />
      </div>

      {/* Cinematic Tech Grid Overlay (Subtle) */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '16px 16px' }}
      />


      {/* Sidebar Header */}
      <div className="relative z-10 bg-white/[0.04] backdrop-blur-2xl overflow-hidden border-b border-white/5">
        {/* Border Beam overlay */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="px-6 h-20 lg:h-24 flex items-center justify-between">
          <div className="relative">
            <h3 className="text-white text-[12px] font-black uppercase tracking-[0.4em] flex items-center gap-3 italic">
              <History className="w-4 h-4 text-primary" /> History
            </h3>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2 ml-7">Conversations</p>
          </div>
        </div>
      </div>


      {/* Search Bar */}
      <div className="px-6 py-5 relative z-10">
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500 group/search ${searchFocused
          ? 'bg-white/[0.04] border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.03)]'
          : 'bg-white/[0.02] border-white/5'
          }`}>
          <Search className={`w-4 h-4 transition-colors duration-500 ${searchFocused ? 'text-white' : 'text-gray-700'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search..."
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[12px] text-gray-300 placeholder-gray-700 font-bold"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-all duration-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 relative z-10 scrollbar-hide [overflow-anchor:none]">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-6 h-6 rounded-full border-2 border-white/5 border-t-primary animate-spin mb-4" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Loading...</span>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-8">
            {groupLabels.map(({ key, label }) => {
              const items = grouped[key];
              if (!items || items.length === 0) return null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] whitespace-nowrap">{label}</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="space-y-1.5">
                    {items.map((conv) => {
                      const isEditing = editingId === conv.id;
                      return (
                        <div key={conv.id} className={`relative group/container ${activeMenuId === conv.id || isEditing ? 'z-50' : 'z-10'}`}>
                          {isEditing ? (
                            <div className="w-full flex items-center gap-4 pl-5 pr-3 py-4 rounded-[1.2rem] border border-primary/50 bg-[#0a0a14] shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-300">
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <input
                                  ref={editInputRef}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(e, conv.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  className="flex-1 min-w-0 bg-transparent py-0.5 text-[13px] font-black italic text-white focus:outline-none placeholder-white/30 truncate"
                                  placeholder="Title..."
                                  autoFocus
                                />
                                <div className="flex items-center gap-1 shrink-0 px-2 border-l border-white/5 h-6">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveRename(e, conv.id);
                                    }}
                                    className="p-1 hover:bg-green-500/20 rounded-lg transition-colors text-green-500"
                                    title="Save"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingId(null);
                                    }}
                                    className="p-1 hover:bg-red-500/20 rounded-lg transition-colors text-red-500"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => onSelectSession(conv.id)}
                                className="w-full flex items-center gap-4 pl-5 pr-14 py-4 rounded-[1.2rem] text-left border border-white/5 bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-500 group/item relative overflow-hidden shadow-sm hover:shadow-xl"
                              >
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  <p className="text-[13px] font-black text-white/70 line-clamp-2 group-hover/item:text-white transition-colors duration-500 italic tracking-tight leading-snug break-words">
                                    {conv.title || 'Untitled_Session'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap overflow-hidden">
                                    {conv.modelName && (
                                      <span
                                        className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border truncate max-w-[80px] shrink-0"
                                        style={{
                                          color: (getModel(conv.modelId)?.color || '#8b5cf6') + '99',
                                          borderColor: (getModel(conv.modelId)?.color || '#8b5cf6') + '33',
                                          backgroundColor: (getModel(conv.modelId)?.color || '#8b5cf6') + '11',
                                        }}
                                        title={conv.modelName}
                                      >
                                        {conv.modelName}
                                      </span>
                                    )}
                                    <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest shrink-0 mt-0.5">
                                      {conv.updatedAt ? new Date(conv.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'}
                                    </span>
                                  </div>
                                </div>
                              </button>

                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                <div className="relative">
                                  <button
                                    onClick={(e) => toggleMenu(e, conv.id)}
                                    className="p-2 opacity-50 hover:bg-white/10 hover:opacity-100 rounded-lg text-white transition-all"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  <AnimatePresence>
                                    {activeMenuId === conv.id && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -5, transformOrigin: 'top right' }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-full mt-1 w-36 bg-[#1a1a24]/90 backdrop-blur-xl border border-white/10 rounded-[1rem] shadow-2xl z-50 overflow-hidden py-1.5"
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            handleStartRename(e, conv);
                                          }}
                                          className="w-full text-left px-4 py-2 text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3 uppercase tracking-wider"
                                        >
                                          <Pencil className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <div className="h-px bg-white/5 my-1 mx-2" />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            handleDeleteClick(e, conv.id);
                                          }}
                                          className="w-full text-left px-4 py-2 text-[11px] font-bold text-red-500/80 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3 uppercase tracking-wider group-hover"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Infinite Scroll Footer — Stable height to prevent jumps */}
            {(hasMore || isLoadingMore) && (
              <div className="min-h-[60px] flex items-center justify-center">
                {isLoadingMore ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/5 border-t-primary animate-spin" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Loading...</span>
                  </div>
                ) : (
                  <div ref={scrollSentinelRef} className="w-full h-full" />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-12 flex flex-col items-center gap-4 border border-dashed border-white/5 rounded-[2rem]">
            <div className="w-12 h-12 rounded-[1.5rem] bg-white/[0.02] flex items-center justify-center border border-white/5 text-gray-800">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Empty</p>
              <p className="text-[9px] text-gray-700 font-bold uppercase tracking-tighter">
                {searchQuery ? 'No results' : 'New conversations will appear here'}
              </p>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete conversation"
        message="Are you sure you want to delete this conversation?"
        isLoading={isDeleting}
      />
    </div>
  );
}
