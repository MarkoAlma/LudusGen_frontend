import { useState, useRef, useEffect, useCallback } from "react";
import { db } from "../firebase/firebaseApp";
import {
  collection, addDoc, query, orderBy, limit, getDocs,
  serverTimestamp, deleteDoc, doc, setDoc, getDoc, onSnapshot,
  writeBatch,
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
  const [activePresetId, setActivePresetId] = useState("default_balanced");
  const [presets, setPresets] = useState(DEFAULT_PRESETS.chat);
  const [conversations, setConversations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);

  const chatScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const userScrolledUp = useRef(false);

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


  const getCurrentSessionId = useCallback(() => {
    let sid = sessionStorage.getItem("chat_session_current");
    if (!sid) {
      sid = `session_${Date.now()}`;
      sessionStorage.setItem("chat_session_current", sid);
    }
    return sid;
  }, []);

  const loadCurrentConversation = useCallback(async () => {
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const sessionId = getCurrentSessionId();

      // Try new path first
      const newRef = getMessagesRef(sessionId);
      const q = query(newRef, orderBy("timestamp", "asc"), limit(200));
      let snap = await getDocs(q);

      // If no data, try legacy model-keyed paths and migrate
      if (snap.empty) {
        for (const modelId of CHAT_MODEL_IDS) {
          try {
            const legacyRef = collection(db, "conversations", userId, modelId, sessionId, "messages");
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
              const legacySessionRef = doc(db, "conversations", userId, modelId, sessionId);
              const sessionSnap = await getDoc(legacySessionRef);
              if (sessionSnap.exists()) {
                const newSessionRef = getSessionRef(sessionId);
                batch.set(newSessionRef, sessionSnap.data());
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
        content: `Szia! ${selectedModel.name} itt. Miben segíthetek? 🚀`,
        model: selectedModel.id, id: "welcome",
      }]);
    } catch (e) { console.error(e); }
    setLoadingHistory(false);
  }, [userId, getCurrentSessionId, getMessagesRef, getSessionRef, selectedModel]);

  useEffect(() => {
    loadConversationList();
    loadCurrentConversation();
  }, [loadConversationList, loadCurrentConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current && messages.length > 0) {
      const el = chatScrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom || messages[messages.length - 1]?.role === 'user') {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  const saveMessage = async (msg) => {
    if (!userId) return;
    try {
      const sessionId = getCurrentSessionId();
      const contentToSave = Array.isArray(msg.content)
        ? msg.content.find((p) => p.type === "text")?.text || ""
        : msg.content;

      const msgData = {
        role: msg.role,
        content: contentToSave,
        model: msg.model,
        id: msg.id,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        ...(msg.usage ? { usage: msg.usage } : {}),
      };

      await addDoc(getMessagesRef(sessionId), msgData);
      await setDoc(getSessionRef(sessionId), {
        sessionId,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
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

  // ── Trigger summary generation (fire-and-forget) ──────────────────
  const triggerSummaryGeneration = useCallback(async (sessionId, currentMessages) => {
    if (!userId || !sessionId || currentMessages.length < 15) return;
    try {
      const token = await getIdToken();
      fetch(`${API_BASE}/api/chat/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId,
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          modelId: selectedModel.id,
        }),
      }).catch(e => console.warn('[Summary] Fire-and-forget failed:', e));
    } catch (e) { /* silent */ }
  }, [userId, getIdToken, selectedModel.id]);

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isTyping) return;

    const userMsg = {
      role: "user",
      content: attachedImage ? [
        { type: "image_url", image_url: { url: attachedImage.dataUrl } },
        { type: "text", text: input.trim() },
      ] : input.trim(),
      model: selectedModel.id,
      id: Date.now().toString(),
      attachedImagePreview: attachedImage?.dataUrl ?? null,
    };

    const aiMsgId = `ai_${Date.now()}`;
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "", model: selectedModel.id, id: aiMsgId, isStreaming: true }]);
    setInput("");
    setAttachedImage(null);
    setIsTyping(true);

    await saveMessage(userMsg);

    const sessionId = getCurrentSessionId();

    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model: selectedModel.apiModel,
          provider: selectedModel.provider,
          sessionId,
          messages: [...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []), ...messages.map(m => ({ role: m.role, content: m.content })), { role: userMsg.role, content: userMsg.content }],
          temperature, max_tokens: maxTokens, top_p: topP, frequency_penalty: frequencyPenalty, presence_penalty: presencePenalty,
        }),
      });

      if (!res.ok) throw new Error("Szerver hiba");

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
              accumulated += parsed.delta || "";
              setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: accumulated } : m));
            } catch (e) { }
          }
        }
      }

      const finalMsg = { role: "assistant", content: accumulated, model: selectedModel.id, id: aiMsgId };
      await saveMessage(finalMsg);
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...finalMsg, isStreaming: false } : m));
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Model switching (keeps conversation intact, generates summary) ──
  const switchModel = useCallback((newModel) => {
    // Generate summary before switching so the new model gets context
    const sessionId = getCurrentSessionId();
    if (userId && sessionId && messages.length >= 5) {
      triggerSummaryGeneration(sessionId, messages);
    }
    if (onModelChange) {
      onModelChange(newModel);
    }
  }, [onModelChange, userId, messages, getCurrentSessionId, triggerSummaryGeneration]);

  return {
    messages, setMessages, input, setInput, isTyping, handleSend,
    systemPrompt, setSystemPrompt, temperature, setTemperature,
    maxTokens, setMaxTokens, topP, setTopP,
    frequencyPenalty, setFrequencyPenalty, presencePenalty, setPresencePenalty,
    attachedImage, setAttachedImage,
    loadingHistory, conversations, chatScrollRef, textareaRef,
    presets, activePresetId, applyPreset, onEnhance, onDechant,
    switchModel,
  };
}
