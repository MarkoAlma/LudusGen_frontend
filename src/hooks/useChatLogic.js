import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { db } from "../firebase/firebaseApp";
import {
  collection, addDoc, query, orderBy, limit, limitToLast, getDocs,
  serverTimestamp, doc, setDoc, getDoc, writeBatch,
} from "firebase/firestore";
import { DEFAULT_PRESETS, ALL_MODELS } from "../ai_components/models";
import { API_BASE } from "../api/client";

// Legacy model IDs for migration
const CHAT_MODEL_IDS = ALL_MODELS.filter(m => m.panelType === 'chat').map(m => m.id);

export function useChatLogic(selectedModel, userId, getIdToken, onModelChange) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
  const [attachedImage, setAttachedImage] = useState(null);
  const [shouldRestoreModel, setShouldRestoreModel] = useState(true);
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
  const abortControllerRef = useRef(null);
  const userScrolledUp = useRef(false);
  const selectedModelRef = useRef(selectedModel);
  // Update ref synchronously on every render so handleSend always has current model
  selectedModelRef.current = selectedModel;

  // ── Firestore refs — model-independent ────────────────────────────
  const getSessionRef = useCallback((sessionId) =>
    doc(db, "conversations", userId, "sessions", sessionId),
    [userId]);

  const getMessagesRef = useCallback((sessionId) =>
    collection(db, "conversations", userId, "sessions", sessionId, "messages"),
    [userId]);

  // ── Load History — model-independent with legacy fallback ─────────
  const loadConversationList = useCallback(async () => {
    if (!userId) return;
    try {
      // Try new path first
      const newRef = collection(db, "conversations", userId, "sessions");
      const q = query(newRef, orderBy("updatedAt", "desc"), limit(50));
      const snap = await getDocs(q);
      let convs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Also query legacy paths and merge
      const legacyPromises = CHAT_MODEL_IDS.map(async (modelId) => {
        try {
          const ref = collection(db, "conversations", userId, modelId);
          const lq = query(ref, orderBy("updatedAt", "desc"), limit(20));
          const lsnap = await getDocs(lq);
          return lsnap.docs.map(d => ({ id: d.id, ...d.data(), _legacyModelId: modelId }));
        } catch { return []; }
      });

      const legacyConvs = (await Promise.all(legacyPromises)).flat();
      const existingIds = new Set(convs.map(c => c.id));
      for (const legacy of legacyConvs) {
        if (!existingIds.has(legacy.id)) {
          convs.push(legacy);
        }
      }

      convs.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setConversations(convs.slice(0, 50));
    } catch (e) { console.error(e); }
  }, [userId]);


  const getCurrentSessionId = useCallback(() => sessionId, [sessionId]);

  const switchSession = useCallback((newSid) => {
    sessionStorage.setItem("chat_session_current", newSid);
    setSessionId(newSid);
    // Explicitly allow model restoration when switching from history
    setShouldRestoreModel(true);
    // Clearing messages before load creates a smoother visual transition
    setMessages([]);
    setAttachedImage(null);
  }, []);

  const loadCurrentConversation = useCallback(async () => {
    if (!userId) return;
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
            if (foundModel && onModelChange) {
              console.log(`[Chat] Auto-restoring model for session ${sid}: ${sessionModelId}`);
              onModelChange(foundModel);
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

      const msgs = snap.docs.map((d) => d.data());
      setMessages(msgs.length > 0 ? msgs : [{
        role: "assistant",
        content: `Szia! AI asszisztens itt. Miben segíthetek? 🚀`,
        model: "ai", id: "welcome",
      }]);
    } catch (e) { console.error('[History] Failed to load session:', e); }
    setLoadingHistory(false);
  }, [userId, sessionId, getMessagesRef, getSessionRef, onModelChange]);

  useEffect(() => {
    loadConversationList();
  }, [loadConversationList]);

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

  const saveMessage = async (msg) => {
    if (!userId) return;
    try {
      const sessionId = getCurrentSessionId();
      const contentToSave = Array.isArray(msg.content)
        ? msg.content.find((p) => p.type === "text")?.text || ""
        : msg.content;

      const model = selectedModelRef.current;

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
        ...(msg.role === "user" ? { title: contentToSave.slice(0, 60) } : {}),
        lastMessage: contentToSave.slice(0, 100),
        lastRole: msg.role,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) { console.error(e); }
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
    sessionStorage.setItem("chat_session_current", newSid);
    setMessages([]);
    setInput("");
    setAttachedImage(null);
    setIsTyping(false);
    // Reload conversation list and load the new empty session
    loadConversationList();
    loadCurrentConversation();
  }, [loadConversationList, loadCurrentConversation]);

  // ── Trigger summary generation (fire-and-forget) ──────────────────
  // REMOVED — backend now handles context/summary

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isTyping) return;

    const model = selectedModelRef.current;

    const userMsg = {
      role: "user",
      content: attachedImage ? [
        { type: "image_url", image_url: { url: attachedImage.dataUrl } },
        { type: "text", text: input.trim() },
      ] : input.trim(),
      model: model.id,
      id: Date.now().toString(),
      attachedImagePreview: attachedImage?.dataUrl ?? null,
    };

    const aiMsgId = `ai_${Date.now()}`;
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "", model: model.id, id: aiMsgId, isStreaming: true }]);
    setInput("");
    setAttachedImage(null);
    setIsTyping(true);

    // Save user message to Firestore
    await saveMessage(userMsg);

    const sessionId = getCurrentSessionId();

    let token;

    try {
      token = await getIdToken();
      const controller = new AbortController();
      let summaryRefreshed = false;
      abortControllerRef.current = { controller, accumulated: "" };

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId,
          message: input.trim(),
          attachedImage: attachedImage?.dataUrl,
          messageId: aiMsgId, // Pass the ID to the backend
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
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
                if (abortControllerRef.current) abortControllerRef.current.accumulated = accumulated;
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: accumulated } : m));
              } catch {
                continue;
              }
            }
          }
        }

        const finalMsg = { role: "assistant", content: accumulated, model: model.id, id: aiMsgId };
        // await saveMessage(finalMsg);
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...finalMsg, isStreaming: false } : m));
        if (summaryRefreshed) {
          setIsSummarizing(false);
          toast.success("Összefoglaló frissítve");
        }
      } else {
        // JSON response (Anthropic, OpenAI)
        const data = await res.json();
        if (data.success) {
          summaryRefreshed = Boolean(data.summaryRefreshed);
          const finalMsg = { role: "assistant", content: data.content, model: model.id, id: aiMsgId };
          // await saveMessage(finalMsg);
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...finalMsg, isStreaming: false } : m));
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
        const accumulated = abortControllerRef.current?.accumulated || "";
        const finalMsg = { role: "assistant", content: accumulated, model: model.id, id: aiMsgId, isStreaming: false };
        
        // Update local UI immediately
        setMessages(prev => prev.map(m => m.id === aiMsgId ? finalMsg : m));

        // Call finalize endpoint to sync DB with visible text and update tokens
        if (aiMsgId && sessionId) {
          fetch(`${API_BASE}/api/chat/finalize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              sessionId,
              messageId: aiMsgId,
              content: accumulated
            })
          }).catch(err => console.error('[Finalize] Sync failed:', err));
        }
      } else {
        console.error(e);
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: `Hiba: ${e.message}`, isStreaming: false } : m));
      }
    } finally {
      setIsTyping(false);
      setIsSummarizing(false);
      abortControllerRef.current = null;
    }
  };

  // Stop streaming (called from UI)
  const handleStop = useCallback(async () => {
    const sessionId = getCurrentSessionId();
    if (!sessionId) return;

    try {
      const token = await getIdToken();
      // Signal the backend to kill the upstream AI connection
      // We don't abort the local fetch here so that we can drain the buffer
      await fetch(`${API_BASE}/api/chat/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      console.log(`[Chat] Safe stop signal sent for session ${sessionId}`);
    } catch (e) {
      console.error('[Chat] Stop signal failed:', e);
      // Fallback: hard abort if signal fails
      if (abortControllerRef.current?.controller) {
        abortControllerRef.current.controller.abort();
      }
    }
  }, [getCurrentSessionId, getIdToken]);

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
    loadingHistory, conversations, chatScrollRef, textareaRef,
    presets, activePresetId, applyPreset, onEnhance, onDechant,
    switchModel, createNewSession, handleStop, isSummarizing,
    switchSession,
  };
}
