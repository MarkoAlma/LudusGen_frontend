import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { db } from "../firebase/firebaseApp";
import {
  collection, addDoc, query, orderBy, limit, limitToLast, getDocs,
  serverTimestamp, doc, setDoc, getDoc, writeBatch, startAfter,
} from "firebase/firestore";
import { DEFAULT_PRESETS, ALL_MODELS, findModelGroup } from "../ai_components/models";
import { API_BASE } from "../api/client";
import { useJobs } from "../context/JobsContext";
import { stripAssistantThinking } from "../utils/assistantContent";

// Legacy model IDs for migration
const CHAT_MODEL_IDS = ALL_MODELS.filter(m => m.panelType === 'chat').map(m => m.id);

export function useChatLogic(selectedModel, userId, getIdToken, onModelChange, isJobForeground) {
  const {
    addJob,
    updateJob,
    markJobDone,
    markJobDoneAndSeen,
    markJobError,
    registerCancelHandler,
    unregisterCancelHandler,
  } = useJobs();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [runningSessionIds, setRunningSessionIds] = useState(() => new Set());
  const [systemPrompt, setSystemPrompt] = useState(selectedModel.defaultSystemPrompt || "");
  const [temperature, setTemperature] = useState(selectedModel.defaultTemperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(selectedModel.defaultMaxTokens ?? 2048);
  const [topP, setTopP] = useState(selectedModel.defaultTopP ?? 0.9);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activePresetId, setActivePresetId] = useState("default_balanced");
  const [presets, setPresets] = useState(DEFAULT_PRESETS.chat);
  const [conversations, setConversations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingConversationList, setLoadingConversationList] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [shouldRestoreModel, setShouldRestoreModel] = useState(true);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    let sid = sessionStorage.getItem("chat_session_current");
    if (!sid) {
      sid = `session_${Date.now()}`;
      sessionStorage.setItem("chat_session_current", sid);
    }
    return sid;
  });

  const chatScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const activeChatRequestsRef = useRef(new Map());
  const runningSessionIdsRef = useRef(new Set());
  const userScrolledUp = useRef(false);
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const onModelChangeRef = useRef(onModelChange);
  onModelChangeRef.current = onModelChange;
  const isJobForegroundRef = useRef(isJobForeground);
  isJobForegroundRef.current = isJobForeground;
  const isFetchingRef = useRef(false);
  const lastVisibleDocRef = useRef(null);
  const hasMoreRef = useRef(true);
  const legacyLoadedRef = useRef(false);
  const liveChatRunsRef = useRef(new Map());
  const isTyping = runningSessionIds.has(sessionId);

  useEffect(() => {
    if (!attachedImage || selectedModel?.supportsVision) return;
    setAttachedImage(null);
    toast.error('This model does not accept images.');
  }, [attachedImage, selectedModel?.id, selectedModel?.supportsVision]);

  const setSessionRunning = useCallback((sid, isRunning) => {
    if (!sid) return;
    const next = new Set(runningSessionIdsRef.current);
    if (isRunning) {
      next.add(sid);
    } else {
      next.delete(sid);
    }
    runningSessionIdsRef.current = next;
    setRunningSessionIds(next);
  }, []);

  const getActiveRequestForSession = useCallback((sid) => {
    if (!sid) return null;
    for (const request of activeChatRequestsRef.current.values()) {
      if (request.sessionId === sid) return request;
    }
    return null;
  }, []);

  // ── Firestore refs — model-independent ────────────────────────────
  const getSessionRef = useCallback((sessionId) =>
    doc(db, "conversations", userId, "sessions", sessionId),
    [userId]);

  const getMessagesRef = useCallback((sessionId) =>
    collection(db, "conversations", userId, "sessions", sessionId, "messages"),
    [userId]);

  const mergeLiveMessages = useCallback((sid, baseMessages) => {
    const liveRuns = [...liveChatRunsRef.current.values()].filter((run) => run.sid === sid);
    if (liveRuns.length === 0) return baseMessages;

    const merged = [...baseMessages];
    for (const run of liveRuns) {
      for (const liveMsg of [run.userMsg, run.assistantMsg]) {
        if (!liveMsg?.id) continue;
        const index = merged.findIndex((msg) => msg.id === liveMsg.id);
        if (index >= 0) {
          merged[index] = { ...merged[index], ...liveMsg };
        } else {
          merged.push(liveMsg);
        }
      }
    }
    return merged;
  }, []);

  const updateLiveAssistant = useCallback((runId, patch) => {
    const run = liveChatRunsRef.current.get(runId);
    if (!run) return;

    run.assistantMsg = { ...run.assistantMsg, ...patch };
    liveChatRunsRef.current.set(runId, run);

    if (sessionIdRef.current !== run.sid) return;

    setMessages((prev) => {
      const hasMessage = prev.some((msg) => msg.id === run.assistantMsg.id);
      if (!hasMessage) return mergeLiveMessages(run.sid, prev);
      return prev.map((msg) => (msg.id === run.assistantMsg.id ? { ...msg, ...run.assistantMsg } : msg));
    });
  }, [mergeLiveMessages]);

  // ── Load History — model-independent with legacy fallback ─────────
  const loadConversationList = useCallback(async (isLoadMore = false) => {
    if (!userId || isFetchingRef.current) return;
    
    if (isLoadMore) {
      if (!hasMoreRef.current || !lastVisibleDocRef.current) return;
      setIsLoadingMore(true);
    } else {
      setLoadingConversationList(true);
      setHasMore(true);
      hasMoreRef.current = true;
      lastVisibleDocRef.current = null;
      setLastVisibleDoc(null);
    }

    isFetchingRef.current = true;

    try {
      const pageSize = isLoadMore ? 40 : 30;
      const sessionsRef = collection(db, "conversations", userId, "sessions");
      
      let q;
      if (isLoadMore && lastVisibleDocRef.current) {
        q = query(sessionsRef, orderBy("updatedAt", "desc"), startAfter(lastVisibleDocRef.current), limit(pageSize));
      } else {
        q = query(sessionsRef, orderBy("updatedAt", "desc"), limit(pageSize));
      }

      const snap = await getDocs(q);
      const newLastVisible = snap.docs[snap.docs.length - 1];
      let convs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (snap.docs.length < pageSize) {
        setHasMore(false);
        hasMoreRef.current = false;

        // END OF MODERN SESSIONS: Now load legacy "archived" sessions if not already done
        if (!legacyLoadedRef.current) {
          const legacyPromises = CHAT_MODEL_IDS.map(async (modelId) => {
            try {
              const ref = collection(db, "conversations", userId, modelId);
              const lq = query(ref, orderBy("updatedAt", "desc"), limit(40));
              const lsnap = await getDocs(lq);
              return lsnap.docs.map(d => ({ id: d.id, ...d.data(), _legacyModelId: modelId }));
            } catch { return []; }
          });

          const legacyConvs = (await Promise.all(legacyPromises)).flat();
          const existingIds = new Set(convs.map(c => c.id));
          const filteredLegacy = legacyConvs.filter(l => !existingIds.has(l.id));
          
          filteredLegacy.sort((a, b) => {
            const timeA = a.updatedAt?.seconds || a.timestamp?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
            const timeB = b.updatedAt?.seconds || b.timestamp?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
            return timeB - timeA;
          });

          convs = [...convs, ...filteredLegacy];
          legacyLoadedRef.current = true;
        }
      }

      if (!isLoadMore) {
        setConversations(convs);
      } else {
        setConversations(prev => {
          const merged = [...prev, ...convs];
          const seen = new Set();
          return merged.filter(c => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
        });
      }

      lastVisibleDocRef.current = newLastVisible;
      setLastVisibleDoc(newLastVisible);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConversationList(false);
      setIsLoadingMore(false);
      // Give some breathing room before next fetch allowed
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 800);
    }
  }, [userId]);


  const switchSession = useCallback((newSid) => {
    if (newSid === sessionId) return;
    sessionStorage.setItem("chat_session_current", newSid);
    setSessionId(newSid);
    setShouldRestoreModel(true);
    setMessages([]);
    setAttachedImage(null);
  }, [sessionId]);

  const newSessionIdsRef = useRef(new Set());

  const loadCurrentConversation = useCallback(async () => {
    if (!userId) return;
    const sid = sessionId;

    // Ha most hoztuk létre helyben a sessiont, nem kell lekérni az adatbázisból
    if (newSessionIdsRef.current.has(sid)) {
      setMessages([]);
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const sid = sessionId;

      // 1. Load Session Metadata to restore model if needed
      if (shouldRestoreModel) {
        const sessionSnap = await getDoc(getSessionRef(sid));
        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data();
          const sessionModelId = sessionData.modelId;

          // If the session has a modelId that differs from current selection, switch it
          if (sessionModelId && sessionModelId !== selectedModelRef.current?.id) {
            const foundModel = ALL_MODELS.find(m => m.id === sessionModelId);
            if (foundModel && onModelChangeRef.current) {
              console.log(`[Chat] Auto-restoring model for session ${sid}: ${sessionModelId}`);
              onModelChangeRef.current(foundModel);
            }
          }
        }
        // Once restored (or checked), don't force it again until next session switch
        setShouldRestoreModel(false);
      }

      // 2. Load Messages
      const newRef = getMessagesRef(sid);
      const q = query(newRef, orderBy("timestamp", "asc"), limitToLast(200));
      let snap = await getDocs(q);

      // If no data, try legacy model-keyed paths and migrate
      if (snap.empty) {
        for (const modelId of CHAT_MODEL_IDS) {
          try {
            const legacyRef = collection(db, "conversations", userId, modelId, sid, "messages");
            const lq = query(legacyRef, orderBy("timestamp", "asc"), limit(200));
            snap = await getDocs(lq);
            if (!snap.empty) {
              // Migrate: copy all messages to new path
              const batch = writeBatch(db);
              snap.docs.forEach(d => {
                const newDocRef = doc(newRef);
                batch.set(newDocRef, d.data());
              });
              // Also migrate session doc
              const legacySessionRef = doc(db, "conversations", userId, modelId, sid);
              const legacySessionSnap = await getDoc(legacySessionRef);
              if (legacySessionSnap.exists()) {
                const newSessionRef = getSessionRef(sid);
                batch.set(newSessionRef, legacySessionSnap.data());
              }
              await batch.commit();
              break;
            }
          } catch { /* continue to next model */ }
        }
      }

      const rawMsgs = snap.docs.map((d) => ({ ...d.data(), docId: d.id }));
      
      // Deduplicate messages by their unique 'id' field
      const seenIds = new Set();
      const msgs = [];
      
      for (let i = 0; i < rawMsgs.length; i++) {
        const m = rawMsgs[i];
        const prev = msgs[msgs.length - 1];
        
        // 1. Direct ID match
        const isDuplicateId = m.id && seenIds.has(m.id);
        
        // 2. Consecutive Assistant Duplicate (Fail-safe for backend ID mismatch)
        // Assistant messages should never be consecutive. If they are and content matches, it's a duplication.
        const isConsecutiveAssistantDuplicate = 
          m.role === 'assistant' && 
          prev && prev.role === 'assistant' && 
          (m.content === prev.content || (m.content?.length > 10 && m.content?.slice(0, 50) === prev.content?.slice(0, 50)));

        if (!isDuplicateId && !isConsecutiveAssistantDuplicate) {
          if (m.id) seenIds.add(m.id);
          msgs.push(m);
        }
      }

      setMessages(mergeLiveMessages(sid, msgs));
    } catch (e) { console.error('[History] Failed to load session:', e); }
    setLoadingHistory(false);
  }, [userId, sessionId, getMessagesRef, getSessionRef, mergeLiveMessages]);

  useEffect(() => {
    if (userId) {
      loadConversationList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadCurrentConversation();
  }, [sessionId, loadCurrentConversation]);

  // Track whether user intentionally scrolled up
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUp.current = distanceFromBottom > 10;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const isNewMessage = lastMsg?.role === 'user' || (lastMsg?.role === 'assistant' && lastMsg?.isStreaming && !lastMsg?.content);

    if (isNewMessage) {
      userScrolledUp.current = false;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else if (!userScrolledUp.current) {
      // User is at the bottom → keep following during streaming
      el.scrollTop = el.scrollHeight;
    }
    // User scrolled up (>10px) → do NOT auto-scroll, let them read
  }, [messages]);

  const saveMessage = async (msg, targetSessionId = sessionIdRef.current, modelOverride = null) => {
    if (!userId) return;
    try {
      const sessionId = targetSessionId;
      newSessionIdsRef.current.delete(sessionId);
      const contentToSave = Array.isArray(msg.content)
        ? msg.content.find((p) => p.type === "text")?.text || ""
        : msg.content;

      const model = modelOverride || selectedModelRef.current;

      const msgData = {
        role: msg.role,
        content: contentToSave,
        model: msg.model,
        id: msg.id,
        modelId: model.id,
        modelName: model.name,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        ...(msg.usage ? { usage: msg.usage } : {}),
      };

      await addDoc(getMessagesRef(sessionId), msgData);
      await setDoc(getSessionRef(sessionId), {
        sessionId,
        modelId: model.id,
        modelName: model.name,
        lastMessage: contentToSave.slice(0, 100),
        lastRole: msg.role,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) { console.error('[History] Failed to save message:', e); }
  };

  // Preset management
  const applyPreset = useCallback((presetId) => {
    const preset = DEFAULT_PRESETS.chat.find(p => p.id === presetId);
    if (!preset) return;
    setActivePresetId(presetId);
    setTemperature(preset.temperature);
    setMaxTokens(preset.maxTokens);
    setTopP(preset.topP);
    if (preset.systemPrompt) setSystemPrompt(preset.systemPrompt);
  }, []);

  // Enhance system prompt with technical directives
  const onEnhance = useCallback(() => {
    if (!systemPrompt.trim()) return;
    const enhanced = `${systemPrompt}

[Technical Directives]
- Structure responses with clear headings, lists, and code blocks
- Provide step-by-step reasoning for complex topics
- Cite sources or explain uncertainty when applicable
- Prioritize accuracy over speed`;
    setSystemPrompt(enhanced);
  }, [systemPrompt]);

  // Dechant — reset system prompt to model default
  const onDechant = useCallback(() => {
    setSystemPrompt(selectedModel.defaultSystemPrompt || "");
  }, [selectedModel]);

  const createNewSession = useCallback(() => {
    const newSid = `session_${Date.now()}`;
    newSessionIdsRef.current.add(newSid);
    sessionStorage.setItem("chat_session_current", newSid);
    setMessages([]);
    setInput("");
    setAttachedImage(null);
    setShouldRestoreModel(false);
    setSessionId(newSid);
  }, []);

  const deleteSession = useCallback(async (sid) => {
    if (!userId || !sid) return;

    // Preserve previous state for potential rollback
    const previousConversations = conversations;

    // 1. Optimistic UI update: remove item immediately
    setConversations(prev => prev.filter(c => c.id !== sid));

    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/chat/session/${sid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Törlés sikertelen');
      
      toast.success('Beszélgetés törölve');
      
      // 2. If we deleted the current session, start a new one
      if (sid === sessionId) {
        createNewSession();
      }
      
      // No loadConversationList() call here - we already handled it optimistically!
    } catch (e) {
      console.error('[Delete] Failed:', e);
      toast.error('Hiba a törlés során');
      // Rollback on failure
      setConversations(previousConversations);
    }
  }, [userId, getIdToken, sessionId, createNewSession, conversations]);

  const renameSession = useCallback(async (sid, newTitle) => {
    if (!userId || !sid || !newTitle.trim()) return;
    const trimmedTitle = newTitle.trim();

    // Optimistic UI update
    setConversations(prev => prev.map(c => c.id === sid ? { ...c, title: trimmedTitle } : c));

    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/chat/session/${sid}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ title: trimmedTitle })
      });
      if (!res.ok) throw new Error('Átnevezés sikertelen');
      
      toast.success('Átnevezve');
    } catch (e) {
      console.error('[Rename] Failed:', e);
      toast.error('Hiba az átnevezés során');
      // Rollback on failure
      loadConversationList();
    }
  }, [userId, getIdToken, loadConversationList]);

  // ── Trigger summary generation (fire-and-forget) ──────────────────
  // REMOVED — backend now handles context/summary

  const syncFinalMessage = useCallback(async (sid, msgId, content, isFirstMessage = false, modelOverride = null) => {
    if (!msgId || !sid || !userId) return;
    try {
      // 1. Direct Frontend Persistence (Bulletproof fallback)
      const model = modelOverride || selectedModelRef.current;
      const msgData = {
        role: "assistant",
        content: content,
        model: model.id,
        id: msgId,
        modelId: model.id,
        modelName: model.name,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };
      
      const msgRef = doc(db, "conversations", userId, "sessions", sid, "messages", msgId);
      await setDoc(msgRef, msgData, { merge: true });
      
      // Update session metadata too
      await setDoc(getSessionRef(sid), {
        modelId: model.id,
        modelName: model.name,
        lastMessage: content.slice(0, 100),
        lastRole: "assistant",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Backend Finalize (For token counting and server-side state)
      const token = await getIdToken();
      await fetch(`${API_BASE}/api/chat/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: sid, messageId: msgId, content })
      });
      
      console.log(`[Chat] Finalized message ${msgId} (Frontend + Backend sync)`);
      if (isFirstMessage) loadConversationList();
    } catch (err) {
      console.error('[Finalize] Sync failed:', err);
    }
  }, [getIdToken, userId, getSessionRef, loadConversationList]);

  const handleSend = async (overrideText = null) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : input;
    if ((!textToSend.trim() && !attachedImage) || runningSessionIdsRef.current.has(sessionIdRef.current)) return;

    const isFirstMessage = messages.length === 0;
    const model = selectedModelRef.current;
    const sessionId = sessionIdRef.current;

    if (attachedImage && !model?.supportsVision) {
      setAttachedImage(null);
      toast.error('This model does not accept images.');
      return;
    }

    const userMsg = {
      role: "user",
      content: attachedImage ? [
        { type: "image_url", image_url: { url: attachedImage.dataUrl } },
        { type: "text", text: textToSend.trim() },
      ] : textToSend.trim(),
      model: model.id,
      id: Date.now().toString(),
      attachedImagePreview: attachedImage?.dataUrl ?? null,
    };

    const aiMsgId = `ai_${Date.now()}`;
    const chatJobId = `chat_${sessionId}_${aiMsgId}`;
    const jobTitle = textToSend.trim().slice(0, 80) || 'Chat response';
    const jobPanelType = findModelGroup(model.id) === 'code' ? 'code' : 'chat';
    const assistantMsg = { role: "assistant", content: "", model: model.id, id: aiMsgId, isStreaming: true };
    const isChatJobForeground = () => {
      if (typeof isJobForegroundRef.current === 'function') {
        return isJobForegroundRef.current({ id: chatJobId, panelType: jobPanelType, sessionId });
      }
      return sessionIdRef.current === sessionId;
    };
    const finishChatJob = (patch = {}) => {
      const donePatch = { progress: 100, sessionId, messageId: aiMsgId, ...patch };
      if (isChatJobForeground()) {
        markJobDoneAndSeen(chatJobId, donePatch);
      } else {
        markJobDone(chatJobId, donePatch);
      }
    };

    liveChatRunsRef.current.set(chatJobId, { sid: sessionId, userMsg, assistantMsg });
    addJob({
      id: chatJobId,
      panelType: jobPanelType,
      modelId: model.id,
      modelName: model.name,
      title: jobTitle,
      status: 'running',
      progress: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sessionId,
      messageId: aiMsgId,
      targetTab: 'chat',
    });

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setAttachedImage(null);
    setSessionRunning(sessionId, true);

    let userMessageSaved = false;
    const persistUserMessage = async () => {
      if (userMessageSaved) return;
      await saveMessage(userMsg, sessionId, model);
      userMessageSaved = true;
    };

    let token;

    try {
      const controller = new AbortController();
      let summaryRefreshed = false;
      activeChatRequestsRef.current.set(chatJobId, { controller, accumulated: "", sessionId, jobId: chatJobId });
      registerCancelHandler(chatJobId, () => {
        controller.abort();
        getIdToken()
          .then((stopToken) => fetch(`${API_BASE}/api/chat/stop`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${stopToken}` },
            body: JSON.stringify({ sessionId }),
          }))
          .catch(() => {});
      });
      updateJob(chatJobId, { progress: 8 });

      token = await getIdToken();
      updateJob(chatJobId, { progress: 12 });

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId,
          message: textToSend.trim(),
          attachedImage: attachedImage?.dataUrl,
          modelId: model.id,
          modelName: model.name,
          messageId: aiMsgId,
          assistantMessageId: aiMsgId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error('[Chat] Server error:', res.status, errorBody);
        throw new Error(`Szerver hiba: ${res.status} - ${errorBody}`);
      }

      // Check if response is SSE streaming or JSON
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // SSE streaming (Cerebras, Mistral, Groq, Gemini, NVIDIA, OpenRouter)
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let lastJobProgress = 12;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              let parsed;
              try {
                parsed = JSON.parse(data);
              } catch {
                continue;
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.retry) {
                const attemptLabel = parsed.attempt && parsed.maxAttempts ? `${parsed.attempt}/${parsed.maxAttempts}` : "...";
                const providerLabel = parsed.provider?.includes('gemini')
                  ? 'Gemini'
                  : parsed.provider?.includes('modelscope')
                    ? 'ModelScope'
                    : 'AI provider';
                const retryProgress = Math.min(60, Math.max(lastJobProgress, 12 + ((parsed.attempt || 1) * 6)));
                lastJobProgress = retryProgress;
                updateLiveAssistant(chatJobId, {
                  content: `${providerLabel} hit a temporary rate limit. Retrying... (${attemptLabel})`
                });
                updateJob(chatJobId, { progress: retryProgress });
                continue;
              }
              if (parsed.summaryStarted) {
                setIsSummarizing(true);
                continue;
              }
              if (parsed.summaryRefreshed) {
                summaryRefreshed = true;
                setIsSummarizing(false);
                continue;
              }
              accumulated += parsed.delta || "";
              const visibleContent = stripAssistantThinking(accumulated);
              const activeRequest = activeChatRequestsRef.current.get(chatJobId);
              if (activeRequest) activeRequest.accumulated = accumulated;
              updateLiveAssistant(chatJobId, { content: visibleContent });

              const nextProgress = Math.min(92, 12 + Math.floor(visibleContent.length / 80));
              if (nextProgress > lastJobProgress) {
                lastJobProgress = nextProgress;
                updateJob(chatJobId, { progress: nextProgress });
              }
            }
          }
        }

        const finalContent = stripAssistantThinking(accumulated);
        const finalMsg = { role: "assistant", content: finalContent, model: model.id, id: aiMsgId, isStreaming: false };
        updateLiveAssistant(chatJobId, finalMsg);
        
        // Ensure the partial or complete content is saved to DB
        await persistUserMessage();
        await syncFinalMessage(sessionId, aiMsgId, finalContent, isFirstMessage, model);
        liveChatRunsRef.current.delete(chatJobId);
        finishChatJob();

        if (summaryRefreshed) {
          setIsSummarizing(false);
          toast.success("Összefoglaló frissítve");
        }
      } else {
        // JSON response (Anthropic, OpenAI)
        updateJob(chatJobId, { progress: 70 });
        const data = await res.json();
        if (data.success) {
          summaryRefreshed = Boolean(data.summaryRefreshed);
          const finalContent = stripAssistantThinking(data.content);
          const finalMsg = { role: "assistant", content: finalContent, model: model.id, id: aiMsgId, isStreaming: false };
          updateLiveAssistant(chatJobId, finalMsg);
          
          // Ensure the answer is saved to DB
          await persistUserMessage();
          await syncFinalMessage(sessionId, aiMsgId, finalContent, isFirstMessage, model);
          liveChatRunsRef.current.delete(chatJobId);
          finishChatJob();

          if (summaryRefreshed) {
            setIsSummarizing(false);
            toast.success("Összefoglaló frissítve");
          }
        } else {
          throw new Error(data.message || 'Ismeretlen hiba');
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        const accumulated = activeChatRequestsRef.current.get(chatJobId)?.accumulated || "";
        const finalContent = stripAssistantThinking(accumulated);
        const finalMsg = { role: "assistant", content: finalContent, model: model.id, id: aiMsgId, isStreaming: false };

        // Update local UI immediately
        updateLiveAssistant(chatJobId, finalMsg);

        // Sync with DB
        await persistUserMessage();
        await syncFinalMessage(sessionId, aiMsgId, finalContent, isFirstMessage, model);
        liveChatRunsRef.current.delete(chatJobId);
        finishChatJob();
      } else {
        console.error(e);
        updateLiveAssistant(chatJobId, { content: `Hiba: ${e.message}`, isStreaming: false });
        liveChatRunsRef.current.delete(chatJobId);
        markJobError(chatJobId, e.message);
        if (isChatJobForeground()) updateJob(chatJobId, { seenAt: Date.now() });
      }
    } finally {
      unregisterCancelHandler(chatJobId);
      activeChatRequestsRef.current.delete(chatJobId);
      setSessionRunning(sessionId, false);
      setIsSummarizing(false);
    }
  };

  // Stop streaming (called from UI)
  const handleStop = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    const activeRequest = getActiveRequestForSession(sessionId);
    if (!sessionId || !activeRequest) return;

    activeRequest?.controller?.abort();

    try {
      const token = await getIdToken();
      await fetch(`${API_BASE}/api/chat/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      console.log(`[Chat] Safe stop signal sent for session ${sessionId}`);
    } catch (e) {
      console.error('[Chat] Stop signal failed:', e);
    }
  }, [getActiveRequestForSession, getIdToken]);

  // ── Model switching ───────────────────────────────────────────────
  const switchModel = useCallback((newModel) => {
    if (onModelChange) {
      onModelChange(newModel);
    }
  }, [onModelChange]);

  return {
    messages, setMessages, input, setInput, isTyping, handleSend,
    systemPrompt, setSystemPrompt, temperature, setTemperature,
    maxTokens, setMaxTokens, topP, setTopP,
    frequencyPenalty, setFrequencyPenalty, presencePenalty, setPresencePenalty,
    attachedImage, setAttachedImage,
    loadingHistory, loadingConversationList, conversations, chatScrollRef, textareaRef,
    presets, activePresetId, applyPreset, onEnhance, onDechant,
    switchModel, createNewSession, handleStop, isSummarizing,
    switchSession, deleteSession, renameSession,
    loadConversationList, hasMore, isLoadingMore, sessionId,
  };
}
