import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Settings2, Bookmark, Trash2, Plus, ChevronDown, ChevronUp,
  Sparkles, User, Bot, RefreshCw, Copy, Check, Sliders, X,
  MessageSquare, History, Zap, ImagePlus,
} from "lucide-react";
import { db } from "../firebase/firebaseApp";
import {
  collection, addDoc, query, orderBy, limit, getDocs,
  serverTimestamp, deleteDoc, doc, setDoc, getDoc, onSnapshot,
} from "firebase/firestore";
import { DEFAULT_PRESETS } from "./models";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Kódblokk copy gombbal — sticky header ──────────────────────────────────
const CodeBlock = ({ lang, code, isStreaming }) => {
  const [copied, setCopied] = React.useState(false);
  const [isStuck, setIsStuck] = React.useState(false);
  const sentinelRef = React.useRef(null);

  // IntersectionObserver: ha a sentinel (1px-es div a header felett)
  // kigörget → sticky módban vagyunk → border-radius eltűnik
  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 1.0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const handleCopy = () => {
    if (isStreaming) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative my-2"
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "0.75rem",
        // overflow: hidden SZÁNDÉKOSAN NINCS — az blokkolná a sticky-t
      }}
    >
      {/* Sentinel: 1px láthatatlan div, ha ez kigörget → isStuck=true */}
      <div ref={sentinelRef} style={{ height: "1px", marginTop: "-1px" }} />

      {/* Sticky header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{
          position: "sticky",
          top: "-0.75rem",
          zIndex: 10,
          background: "rgba(18,18,40,0.97)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          // sticky módban nincs felső border-radius
          borderRadius: isStuck ? "0" : "0.75rem 0.75rem 0 0",
        }}
      >
        <span className="text-gray-500 text-xs font-mono">{lang || "code"}</span>
        <button
          onClick={handleCopy}
          disabled={isStreaming}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-all active:scale-95"
          style={{
            background: copied
              ? "rgba(34,197,94,0.15)"
              : isStreaming
              ? "rgba(255,255,255,0.03)"
              : "rgba(255,255,255,0.08)",
            color: copied ? "#4ade80" : isStreaming ? "#4b5563" : "#9ca3af",
            border: `1px solid ${
              copied
                ? "rgba(34,197,94,0.3)"
                : isStreaming
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.1)"
            }`,
            cursor: isStreaming ? "not-allowed" : "pointer",
            opacity: isStreaming ? 0.5 : 1,
          }}
          title={isStreaming ? "Várd meg amíg a kód elkészül..." : "Másolás"}
        >
          {copied ? (
            <><Check className="w-3 h-3" />&nbsp;Másolva</>
          ) : isStreaming ? (
            <><Copy className="w-3 h-3" />&nbsp;Generálás...</>
          ) : (
            <><Copy className="w-3 h-3" />&nbsp;Másolás</>
          )}
        </button>
      </div>

      <pre
        className="p-3 overflow-x-auto text-xs"
        style={{
          background: "rgba(0,0,0,0.4)",
          color: "#e2e8f0",
          margin: 0,
          borderRadius: "0 0 0.75rem 0.75rem",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

// ─── Markdown-lite renderer (streaming-safe) ───────────────────────
const renderContent = (text, isStreaming = false) => {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  const lastPart = parts[parts.length - 1];
  const openBlockMatch = lastPart.match(/^([\s\S]*?)(```[\s\S]*)$/);

  let processedParts = parts;
  let openBlock = null;

  if (openBlockMatch) {
    const beforeCode = openBlockMatch[1];
    const incompleteCode = openBlockMatch[2];
    processedParts = [...parts.slice(0, -1), beforeCode];
    openBlock = incompleteCode;
  }

  const renderCodeBlock = (raw, key) => {
    let content = raw.startsWith("```") ? raw.slice(3) : raw;
    if (content.endsWith("```")) content = content.slice(0, -3);

    const lines = content.split("\n");
    const firstLine = lines[0].trim().toLowerCase();
    let lang = "";
    let code = content;

    const knownLangs = ["python", "py", "javascript", "js", "typescript", "ts",
                        "jsx", "tsx", "html", "css", "bash", "sh", "json",
                        "sql", "java", "c", "cpp", "c++", "rust", "go"];
    if (knownLangs.includes(firstLine)) {
      lang = firstLine === "py" ? "python" : firstLine;
      code = lines.slice(1).join("\n");
    }

    code = code.replace(/```$/, "").replace(/"""$/, "");
    return <CodeBlock key={key} lang={lang} code={code} isStreaming={isStreaming} />;
  };

  const renderInline = (part, key) => {
    const inlineParts = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return (
      <span key={key}>
        {inlineParts.map((p, j) => {
          if (p.startsWith("`") && p.endsWith("`"))
            return (
              <code
                key={j}
                className="px-1 py-0.5 rounded text-xs"
                style={{ background: "rgba(0,0,0,0.3)", color: "#67e8f9" }}
              >
                {p.slice(1, -1)}
              </code>
            );
          if (p.startsWith("**") && p.endsWith("**"))
            return <strong key={j} className="text-white">{p.slice(2, -2)}</strong>;
          return p.split("\n").map((line, k, arr) => (
            <React.Fragment key={k}>
              {line}
              {k < arr.length - 1 && <br />}
            </React.Fragment>
          ));
        })}
      </span>
    );
  };

  return (
    <>
      {processedParts.map((part, i) => {
        if (part.startsWith("```")) return renderCodeBlock(part, i);
        return renderInline(part, i);
      })}
      {openBlock && renderCodeBlock(openBlock, "streaming-open")}
    </>
  );
};

// ─── Üzenet tartalom renderer (kezeli az array content-et is) ────────
const renderMessageContent = (content, isStreaming = false) => {
  if (Array.isArray(content)) {
    const textPart = content.find((p) => p.type === "text")?.text || "";
    return renderContent(textPart, isStreaming);
  }
  return renderContent(content, isStreaming);
};

// ─── Preset modal ──────────────────────────────────────
const PresetModal = ({ isOpen, onClose, onSave, editingPreset, modelColor }) => {
  const [form, setForm] = useState({
    name: "", description: "", systemPrompt: "",
    temperature: 0.7, maxTokens: 2048, topP: 0.9,
    frequencyPenalty: 0, presencePenalty: 0,
  });

  useEffect(() => {
    if (editingPreset) setForm({ ...form, ...editingPreset });
    else setForm({ name: "", description: "", systemPrompt: "", temperature: 0.7, maxTokens: 2048, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 });
  }, [editingPreset, isOpen]);

  if (!isOpen) return null;

  const Slider = ({ label, field, min, max, step, hint }) => (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-gray-300 text-xs">{label}</label>
        <span className="text-xs font-bold" style={{ color: modelColor }}>{form[field]}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={form[field]}
        onChange={(e) => setForm((p) => ({ ...p, [field]: parseFloat(e.target.value) }))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: modelColor }}
      />
      {hint && <p className="text-gray-600 text-xs mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: "rgba(15,15,35,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Bookmark className="w-4 h-4" style={{ color: modelColor }} />
            {editingPreset ? "Preset szerkesztése" : "Új preset"}
          </h3>
          <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Preset neve *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="pl. Kreatív írás, Kód review..."
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${form.name ? modelColor + "50" : "rgba(255,255,255,0.1)"}` }}
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">Leírás</label>
            <input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Mire való ez a preset?"
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">System prompt</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
              placeholder="Add meg az AI személyiségét, szerepét, utasításait..."
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <p className="text-gray-600 text-xs mt-1">{form.systemPrompt.length} karakter</p>
          </div>
          <div className="p-4 rounded-xl space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-3.5 h-3.5" style={{ color: modelColor }} />
              <span className="text-xs font-semibold text-gray-300">Modell paraméterek</span>
            </div>
            <Slider label="Max tokens" field="maxTokens" min={128} max={32768*8} step={128} hint="Maximális válaszhossz tokenekben" />
            <Slider label="Temperature" field="temperature" min={0} max={2} step={0.05} hint="0 = determinisztikus · 1 = kiegyensúlyozott · 2 = kreatív" />
            <Slider label="Top P" field="topP" min={0} max={1} step={0.05} hint="Nucleus sampling — általában ne módosítsd a temperature-rel együtt" />
            <Slider label="Frequency penalty" field="frequencyPenalty" min={-2} max={2} step={0.1} hint="Negatív: ismétlés ↑ · Pozitív: ismétlés ↓" />
            <Slider label="Presence penalty" field="presencePenalty" min={-2} max={2} step={0.1} hint="Pozitív: új témák bevezetése ↑" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm text-gray-400 transition-all hover:text-white hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Mégse
          </button>
          <button
            onClick={() => { if (form.name.trim()) onSave(form); }}
            disabled={!form.name.trim()}
            className="cursor-pointer flex-1 py-2.5 rounded-xl text-sm text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed"
            style={{
              background: form.name.trim() ? `linear-gradient(135deg, ${modelColor}, ${modelColor}99)` : "rgba(255,255,255,0.04)",
              opacity: form.name.trim() ? 1 : 0.4,
            }}
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ChatPanel ────────────────────────────────────
export default function ChatPanel({ selectedModel, userId, getIdToken }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  const [systemPrompt, setSystemPrompt] = useState(selectedModel.defaultSystemPrompt || "");
  const [temperature, setTemperature] = useState(selectedModel.defaultTemperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(selectedModel.defaultMaxTokens ?? 2048);
  const [topP, setTopP] = useState(selectedModel.defaultTopP ?? 0.9);
  const [thinking, setThinking] = useState(false);

  const THINKING_MODELS = [
    "deepseek-ai/deepseek-v3.2",
    "z-ai/glm4.7",
    "moonshotai/kimi-k2.5",
    "qwen/qwen3.5-397b-a17b",
  ];
  const supportsThinking = THINKING_MODELS.includes(selectedModel.apiModel);

  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [activePresetId, setActivePresetId] = useState("default_balanced");

  const [presets, setPresets] = useState(DEFAULT_PRESETS.chat);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // ── Képfeltöltés state ──
  const [attachedImage, setAttachedImage] = useState(null);
  const fileInputRef = useRef(null);

  const chatScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const isLoadingConversation = useRef(false);
  const prevMessageCount = useRef(0);
  const streamingMsgIdRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Smart scroll state
  const userScrolledUp = useRef(false);
  const isProgrammaticScroll = useRef(false);

  // ── Firestore helper ──────────────────────────────────────────────────────
  const getSessionRef = useCallback((sessionId) =>
    doc(db, "conversations", userId, selectedModel.id, sessionId),
  [userId, selectedModel.id]);

  const getMessagesRef = useCallback((sessionId) =>
    collection(db, "conversations", userId, selectedModel.id, sessionId, "messages"),
  [userId, selectedModel.id]);

  // ── Wheel + Touch scroll detektálás ──
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.deltaY < 0) {
        userScrolledUp.current = true;
      } else if (e.deltaY > 0) {
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom < 60) {
          userScrolledUp.current = false;
        }
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e) => { touchStartY = e.touches[0].clientY; };
    const handleTouchMove = (e) => {
      const deltaY = touchStartY - e.touches[0].clientY;
      if (deltaY < 0) {
        userScrolledUp.current = true;
      } else if (deltaY > 0) {
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom < 60) {
          userScrolledUp.current = false;
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: true });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // ── Scroll segédfüggvények ──
  const scrollToBottomInstant = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    isProgrammaticScroll.current = true;
    el.scrollTop = el.scrollHeight;
    setTimeout(() => { isProgrammaticScroll.current = false; }, 50);
  }, []);

  const scrollToBottomSmooth = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    isProgrammaticScroll.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setTimeout(() => { isProgrammaticScroll.current = false; }, 500);
  }, []);

  const scrollToBottomIfNeeded = useCallback(() => {
    if (!userScrolledUp.current) {
      scrollToBottomInstant();
    }
  }, [scrollToBottomInstant]);

  // ── Modellváltáskor alapértékek visszaállítása ──
  useEffect(() => {
    setTemperature(selectedModel.defaultTemperature ?? 0.7);
    setMaxTokens(selectedModel.defaultMaxTokens ?? 2048);
    setTopP(selectedModel.defaultTopP ?? 0.9);
    setSystemPrompt(selectedModel.defaultSystemPrompt || "");
  }, [selectedModel.id]);

  useEffect(() => {
    if (!userId) return;
    loadConversationList();
    loadUserPresets();
  }, [userId, selectedModel.id]);

  useEffect(() => {
    if (!userId) return;
    loadCurrentConversation();
  }, [userId, selectedModel.id]);

  // ─── Session lista betöltése ─────────────────────────────────────────────
  const loadConversationList = async () => {
    try {
      const ref = collection(db, "conversations", userId, selectedModel.id);
      const q = query(ref, orderBy("updatedAt", "desc"), limit(20));
      const snap = await getDocs(q);
      const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setConversations(sessions);
    } catch (e) {
      console.error("Load conversation list error:", e);
    }
  };

  // ─── Aktív session üzeneteinek betöltése ────────────────────────
  const loadCurrentConversation = async () => {
    if (!userId) return;
    isLoadingConversation.current = true;
    setLoadingHistory(true);
    try {
      const sessionId = getCurrentSessionId();
      const messagesRef = getMessagesRef(sessionId);
      const q = query(messagesRef, orderBy("timestamp", "asc"), limit(200));
      const snap = await getDocs(q);
      const msgs = snap.docs.map((d) => d.data());

      if (msgs.length > 0) {
        prevMessageCount.current = msgs.length;
        setMessages(msgs);
        setTimeout(() => scrollToBottomInstant(), 50);
      } else {
        const welcome = [{
          role: "assistant",
          content: `Szia! ${selectedModel.name} itt. Miben segíthetek? 🚀`,
          model: selectedModel.id, id: "welcome",
        }];
        prevMessageCount.current = welcome.length;
        setMessages(welcome);
      }
    } catch (e) {
      const welcome = [{
        role: "assistant",
        content: `Szia! ${selectedModel.name} itt. Miben segíthetek? 🚀`,
        model: selectedModel.id, id: "welcome",
      }];
      prevMessageCount.current = welcome.length;
      setMessages(welcome);
    } finally {
      setLoadingHistory(false);
      setTimeout(() => { isLoadingConversation.current = false; }, 50);
    }
  };

  const loadUserPresets = async () => {
    if (!userId) return;
    try {
      const ref = collection(db, "presets", userId, "chat");
      const snap = await getDocs(ref);
      const userPresets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (userPresets.length > 0) setPresets([...DEFAULT_PRESETS.chat, ...userPresets]);
    } catch (e) { console.error("Load presets error:", e); }
  };

  const getCurrentSessionId = () => {
    let sid = sessionStorage.getItem(`chat_session_${selectedModel.id}`);
    if (!sid) {
      sid = `session_${Date.now()}`;
      sessionStorage.setItem(`chat_session_${selectedModel.id}`, sid);
    }
    return sid;
  };

  const removeUndefined = (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

  // ─── Üzenet mentése ─────────────────────────────────────────────────────
  const saveMessage = async (msg) => {
    if (!userId) return;
    try {
      const sessionId = getCurrentSessionId();

      const contentToSave = Array.isArray(msg.content)
        ? msg.content.find((p) => p.type === "text")?.text || ""
        : msg.content;

      const msgData = removeUndefined({
        role: msg.role,
        content: contentToSave,
        model: msg.model,
        id: msg.id,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        ...(msg.usage ? { usage: msg.usage } : {}),
        ...(msg.isError ? { isError: true } : {}),
      });

      await addDoc(getMessagesRef(sessionId), msgData);

      await setDoc(
        getSessionRef(sessionId),
        removeUndefined({
          sessionId,
          modelId: selectedModel.id,
          modelName: selectedModel.name,
          ...(msg.role === "user" && contentToSave
            ? { title: contentToSave.slice(0, 60) }
            : {}),
          lastMessage: contentToSave.slice(0, 100),
          lastRole: msg.role,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    } catch (e) {
      console.error("Save message error:", e);
    }
  };

  const applyPreset = (preset) => {
    setSystemPrompt(preset.systemPrompt || selectedModel.defaultSystemPrompt || "");
    if (preset.temperature !== undefined) setTemperature(preset.temperature);
    if (preset.maxTokens !== undefined) setMaxTokens(preset.maxTokens);
    if (preset.topP !== undefined) setTopP(preset.topP);
    if (preset.frequencyPenalty !== undefined) setFrequencyPenalty(preset.frequencyPenalty);
    if (preset.presencePenalty !== undefined) setPresencePenalty(preset.presencePenalty);
    if (preset.thinking !== undefined) setThinking(preset.thinking);
    setActivePresetId(preset.id);
  };

  const savePreset = async (form) => {
    const preset = { ...form, createdAt: new Date().toISOString(), modelId: selectedModel.id };
    try {
      if (userId) {
        const ref = collection(db, "presets", userId, "chat");
        const docRef = await addDoc(ref, preset);
        preset.id = docRef.id;
      } else {
        preset.id = Date.now().toString();
      }
      setPresets((p) => [...p, preset]);
      setPresetModalOpen(false);
      setEditingPreset(null);
      applyPreset(preset);
    } catch (e) { console.error("Save preset error:", e); }
  };

  const deletePreset = async (presetId) => {
    if (userId) {
      try { await deleteDoc(doc(db, "presets", userId, "chat", presetId)); } catch (e) {}
    }
    setPresets((p) => p.filter((x) => x.id !== presetId));
    if (activePresetId === presetId) setActivePresetId("default_balanced");
  };

  // ─── Képválasztás kezelő ──────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Maximum 10 MB méretű képet csatolhatsz!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage({ dataUrl: ev.target.result, mimeType: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── FŐ KÜLDÉS — streaming támogatással ───────────────
  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isTyping) return;

    const userContent = attachedImage
      ? [
          { type: "image_url", image_url: { url: attachedImage.dataUrl } },
          { type: "text", text: input.trim() },
        ]
      : input.trim();

    const userMsg = {
      role: "user",
      content: userContent,
      model: selectedModel.id,
      id: Date.now().toString(),
      attachedImagePreview: attachedImage?.dataUrl ?? null,
    };

    const aiMsgId = `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    streamingMsgIdRef.current = aiMsgId;

    const placeholder = {
      role: "assistant", content: "",
      model: selectedModel.id, id: aiMsgId, isStreaming: true,
    };

    setMessages((prev) => {
      const withUser = prev.some((m) => m.id === userMsg.id)
        ? prev
        : [...prev, userMsg];
      const withPlaceholder = withUser.some((m) => m.id === aiMsgId)
        ? withUser
        : [...withUser, placeholder];
      return withPlaceholder;
    });

    setInput("");
    setAttachedImage(null);
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    userScrolledUp.current = false;
    setTimeout(() => scrollToBottomSmooth(), 30);

    const currentMessages = [...messages, userMsg];
    await saveMessage(userMsg);

    try {
      const token = getIdToken ? await getIdToken() : null;
      if (!token) throw new Error("Nincs érvényes autentikációs token. Jelentkezz be újra.");

      const apiMessages = currentMessages
        .filter((m) => m.role !== "system")
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let streamAccumulated = "";

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: selectedModel.apiModel,
          provider: selectedModel.provider,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            ...apiMessages,
          ],
          temperature, max_tokens: maxTokens, top_p: topP,
          frequency_penalty: frequencyPenalty, presence_penalty: presencePenalty,
          ...(supportsThinking && {
            extra_body: { chat_template_kwargs: { thinking } },
          }),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Szerver hiba: ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";

      // ── SSE streaming ──────────────────────────────────────
      if (contentType.includes("text/event-stream")) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulated = "";
        let leftover = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = leftover + decoder.decode(value, { stream: true });
          const lines = text.split("\n");
          leftover = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const raw = trimmed.slice(6);
            if (raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.error) throw new Error(parsed.error);
              const delta = parsed.delta || "";
              if (delta) {
                accumulated += delta;
                streamAccumulated = accumulated;
                setMessages((prev) =>
                  prev.map((m) => m.id === aiMsgId ? { ...m, content: accumulated } : m)
                );
                scrollToBottomIfNeeded();
              }
            } catch { /* csonka JSON — kihagyjuk */ }
          }
        }

        const finalMsg = {
          role: "assistant", content: accumulated,
          model: selectedModel.id, id: aiMsgId,
        };
        setIsTyping(false);
        setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...finalMsg, isStreaming: false } : m));
        if (accumulated) await saveMessage(finalMsg);

      // ── Normál JSON válasz ─────────────────────────────────
      } else {
        const data = await res.json();
        const finalMsg = {
          role: "assistant",
          content: data.content || "Hiba történt a válasz generálásakor.",
          model: selectedModel.id, id: aiMsgId,
          ...(data.usage ? { usage: data.usage } : {}),
        };
        setIsTyping(false);
        setMessages((prev) => prev.map((m) => m.id === aiMsgId ? finalMsg : m));
        await saveMessage(finalMsg);
        setTimeout(() => scrollToBottomIfNeeded(), 50);
      }

    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Generálás leállítva.");
        setMessages((prev) =>
          prev.map((m) => m.id === aiMsgId ? { ...m, isStreaming: false } : m)
        );
        if (streamAccumulated) {
          await saveMessage({
            role: "assistant",
            content: streamAccumulated,
            model: selectedModel.id,
            id: aiMsgId,
          });
        }
      } else {
        console.error("Chat hiba:", err.message);
        setMessages((prev) =>
          prev.map((m) => m.id === aiMsgId
            ? { role: "assistant", content: `❌ Hiba: ${err.message}`, model: selectedModel.id, id: aiMsgId, isError: true }
            : m)
        );
      }
    } finally {
      setIsTyping(false);
      streamingMsgIdRef.current = null;
      abortControllerRef.current = null;
    }
  };

  const copyMessage = (id, text) => {
    const textToCopy = Array.isArray(text)
      ? text.find((p) => p.type === "text")?.text || ""
      : text;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Új beszélgetés ──────────────────────────────────
  const clearConversation = () => {
    sessionStorage.removeItem(`chat_session_${selectedModel.id}`);
    const welcome = [{
      role: "assistant",
      content: `Új beszélgetés kezdve! ${selectedModel.name} készen áll. 🚀`,
      model: selectedModel.id, id: "welcome",
    }];
    prevMessageCount.current = welcome.length;
    setMessages(welcome);
    userScrolledUp.current = false;
  };

  // ─── History-ból session betöltése ───────────────────
  const loadSessionFromHistory = async (sessionId) => {
    sessionStorage.setItem(`chat_session_${selectedModel.id}`, sessionId);
    await loadCurrentConversation();
    setActiveTab("chat");
  };

  // ── Generálás leállítása ──
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const color = selectedModel.color;

  return (
    <div className="flex flex-col h-full">
      {/* ── Tabs ── */}
      <div className="flex gap-1 px-3 pt-2 flex-shrink-0">
        {[
          { id: "chat", icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Chat" },
          { id: "settings", icon: <Settings2 className="w-3.5 h-3.5" />, label: "Beállítások" },
          { id: "presets", icon: <Bookmark className="w-3.5 h-3.5" />, label: `Presetek (${presets.length})` },
          { id: "history", icon: <History className="w-3.5 h-3.5" />, label: "Előzmények" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "history") loadConversationList();
            }}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-90 active:scale-95"
            style={{
              background: activeTab === tab.id ? `${color}20` : "transparent",
              color: activeTab === tab.id ? "white" : "#6b7280",
              border: activeTab === tab.id ? `1px solid ${color}40` : "1px solid transparent",
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        {activeTab === "chat" && (
          <button
            onClick={clearConversation}
            className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all active:scale-95"
            title="Új beszélgetés"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Új</span>
          </button>
        )}
      </div>

      {/* ── Tab: CHAT ── */}
      {activeTab === "chat" && (
        <>
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-3 md:px-5 py-3 space-y-3 scrollbar-thin"
          >
            {messages.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i).map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id || Math.random()}
                  className={`flex gap-2.5 group ${isUser ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-md mt-0.5"
                    style={{
                      background: isUser ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : `${color}40`,
                      border: isUser ? "none" : `1px solid ${color}30`,
                    }}
                  >
                    {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                  </div>

                  <div className={`max-w-[80%] md:max-w-2xl flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={
                        isUser
                          ? { background: `${color}25`, border: `1px solid ${color}35`, borderRadius: "1rem 0.5rem 1rem 1rem", color: "white" }
                          : {
                              background: msg.isError ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                              border: msg.isError ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "0.5rem 1rem 1rem 1rem",
                              color: "white",
                            }
                      }
                    >
                      {msg.attachedImagePreview && (
                        <img
                          src={msg.attachedImagePreview}
                          alt="csatolt kép"
                          className="max-w-xs rounded-xl mb-2 block"
                          style={{ border: `1px solid ${color}30`, maxHeight: "300px", objectFit: "contain" }}
                        />
                      )}

                      {msg.isStreaming && !msg.content ? (
                        <div className="flex gap-1 py-1">
                          {[0, 0.15, 0.3].map((d, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ animationDelay: `${d}s`, background: color }} />
                          ))}
                        </div>
                      ) : (
                        <>
                          {renderMessageContent(msg.content, msg.isStreaming)}
                          {msg.isStreaming && (
                            <span
                              className="inline-block w-[2px] h-[1em] ml-0.5 align-middle rounded-sm animate-pulse"
                              style={{ background: color }}
                            />
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <span className="text-gray-700 text-xs">
                        {new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {!isUser && (
                        <button
                          onClick={() => copyMessage(msg.id, msg.content)}
                          className="cursor-pointer opacity-0 group-hover:opacity-100 transition-all text-gray-600 hover:text-gray-300 p-1 rounded hover:bg-white/10"
                          title="Másolás"
                        >
                          {copiedId === msg.id
                            ? <Check className="w-3 h-3 text-green-400" />
                            : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                      {msg.usage && (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-700 text-xs">
                          {msg.usage.total_tokens} tok
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && !messages.some((m) => m.isStreaming) && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}40`, border: `1px solid ${color}30` }}>
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex gap-1">
                    {[0, 0.2, 0.4].map((d, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: `${d}s`, background: color }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="px-3 md:px-4 py-3 border-t border-white/5 flex-shrink-0">
            {activePresetId && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <Zap className="w-3 h-3" style={{ color }} />
                <span className="text-xs text-gray-600">
                  {presets.find((p) => p.id === activePresetId)?.name || "Egyéni beállítás"}
                </span>
                <span className="text-gray-700 text-xs">· T:{temperature} · {maxTokens} tok</span>
              </div>
            )}

            {attachedImage && (
              <div className="relative inline-block mb-2 ml-1">
                <img
                  src={attachedImage.dataUrl}
                  alt="preview"
                  className="h-20 w-auto rounded-xl object-cover"
                  style={{ border: `1px solid ${color}40` }}
                />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: "rgba(239,68,68,0.9)" }}
                  title="Kép eltávolítása"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              {selectedModel.supportsVision && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer p-3 rounded-2xl transition-all flex-shrink-0 hover:opacity-90 active:scale-95"
                    style={{
                      background: attachedImage ? `${color}30` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${attachedImage ? color + "50" : "rgba(255,255,255,0.08)"}`,
                    }}
                    title="Kép csatolása"
                  >
                    <ImagePlus className="w-4 h-4" style={{ color: attachedImage ? color : "#6b7280" }} />
                  </button>
                </>
              )}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={attachedImage ? "Írj a képről..." : "Írj egy üzenetet..."}
                rows={1}
                className="flex-1 px-4 py-3 rounded-2xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${input || attachedImage ? color + "40" : "rgba(255,255,255,0.08)"}`,
                  minHeight: "48px", maxHeight: "160px", overflowY: "auto",
                }}
              />
              {isTyping ? (
                <button
                  onClick={handleAbort}
                  className="cursor-pointer p-3 rounded-2xl transition-all duration-200 flex-shrink-0 hover:opacity-90 active:scale-95"
                  title="Generálás leállítása"
                  style={{
                    background: "rgba(239,68,68,0.85)",
                    boxShadow: "0 0 20px rgba(239,68,68,0.3)",
                    border: "1px solid rgba(239,68,68,0.5)",
                  }}
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && !attachedImage}
                  className="cursor-pointer p-3 rounded-2xl transition-all duration-200 flex-shrink-0 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed"
                  style={{
                    background: (input.trim() || attachedImage) ? `linear-gradient(135deg, ${color}, ${color}bb)` : "rgba(255,255,255,0.05)",
                    opacity: (input.trim() || attachedImage) ? 1 : 0.4,
                    boxShadow: (input.trim() || attachedImage) ? `0 0 20px ${color}30` : "none",
                  }}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-700 mt-1.5 px-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Enter = küldés · Shift+Enter = új sor
              {selectedModel.supportsVision && (
                <span className="ml-2 text-gray-600">· Képcsatolás támogatott</span>
              )}
            </p>
          </div>
        </>
      )}

      {/* ── Tab: SETTINGS ── */}
      {activeTab === "settings" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin">
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-2">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Az AI személyisége, szerepe, utasítások..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <p className="text-gray-600 text-xs mt-1">{systemPrompt.length} karakter</p>
          </div>

          {[
            { label: "Max Tokens", key: "maxTokens", min: 128, max: 32768*8, step: 128, val: maxTokens, set: setMaxTokens, hint: "Maximális válaszhossz tokenekben (~1 token ≈ ¾ szó)" },
            { label: "Temperature", key: "temperature", min: 0, max: 2, step: 0.05, val: temperature, set: setTemperature, hint: "0 = determinisztikus · 0.7 = kiegyensúlyozott · 2 = random" },
            { label: "Top P", key: "topP", min: 0, max: 1, step: 0.05, val: topP, set: setTopP, hint: "Nucleus sampling — ne módosítsd temperature-rel együtt" },
            { label: "Frequency Penalty", key: "freq", min: -2, max: 2, step: 0.1, val: frequencyPenalty, set: setFrequencyPenalty, hint: "Pozitív: ismétlések csökkentése" },
            { label: "Presence Penalty", key: "pres", min: -2, max: 2, step: 0.1, val: presencePenalty, set: setPresencePenalty, hint: "Pozitív: új témák bevezetése" },
          ].map(({ label, key, min, max, step, val, set, hint }) => (
            <div key={key} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex justify-between mb-2">
                <label className="text-white text-sm font-semibold">{label}</label>
                <span className="text-sm font-bold" style={{ color }}>{val}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={val}
                onChange={(e) => set(parseFloat(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: color }}
              />
              <p className="text-gray-600 text-xs mt-1">{hint}</p>
            </div>
          ))}

          {supportsThinking && (
            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white text-sm font-semibold">Reasoning (Thinking)</label>
                  <p className="text-gray-600 text-xs mt-0.5">Belső gondolkodási lánc engedélyezése</p>
                </div>
                <button
                  onClick={() => setThinking((v) => !v)}
                  className="cursor-pointer relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
                  style={{
                    background: thinking ? `linear-gradient(135deg, ${color}, ${color}bb)` : "rgba(255,255,255,0.1)",
                    boxShadow: thinking ? `0 0 12px ${color}50` : "none",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: thinking ? "calc(100% - 1.375rem)" : "0.125rem" }}
                  />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setPresetModalOpen(true)}
            className="cursor-pointer w-full py-3 rounded-xl text-sm text-white font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: `linear-gradient(135deg, ${color}50, ${color}30)`, border: `1px solid ${color}40` }}
          >
            <Bookmark className="w-4 h-4" />
            Beállítások mentése presetként
          </button>
        </div>
      )}

      {/* ── Tab: PRESETS ── */}
      {activeTab === "presets" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Presetek ({presets.length})</p>
            <button
              onClick={() => { setEditingPreset(null); setPresetModalOpen(true); }}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: `${color}25`, border: `1px solid ${color}40` }}
            >
              <Plus className="w-3 h-3" /> Új preset
            </button>
          </div>
          <div className="space-y-2">
            {presets.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <div key={preset.id} className="p-3 rounded-xl transition-all"
                  style={{
                    background: isActive ? `${color}15` : "rgba(255,255,255,0.02)",
                    border: isActive ? `1px solid ${color}45` : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-semibold text-sm">{preset.name}</span>
                        {preset.isDefault && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full text-gray-500" style={{ background: "rgba(255,255,255,0.06)" }}>Alap</span>
                        )}
                        {isActive && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${color}25`, color }}>Aktív</span>
                        )}
                      </div>
                      {preset.description && <p className="text-gray-500 text-xs mb-2">{preset.description}</p>}
                      <div className="flex gap-2 flex-wrap">
                        {preset.temperature !== undefined && <span className="text-xs text-gray-600">T:{preset.temperature}</span>}
                        {preset.maxTokens && <span className="text-xs text-gray-600">{preset.maxTokens} tok</span>}
                        {preset.systemPrompt && <span className="text-xs text-gray-600">System: {preset.systemPrompt.slice(0, 40)}...</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => applyPreset(preset)}
                        className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
                        style={isActive
                          ? { background: `${color}25`, color, border: `1px solid ${color}40` }
                          : { background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}
                      >
                        {isActive ? "✓" : "Alkalmaz"}
                      </button>
                      {!preset.isDefault && (
                        <>
                          <button onClick={() => { setEditingPreset(preset); setPresetModalOpen(true); }}
                            className="cursor-pointer p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/10 transition-all"
                            style={{ background: "rgba(255,255,255,0.04)" }}
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deletePreset(preset.id)}
                            className="cursor-pointer p-1.5 rounded-lg text-red-600 hover:text-red-400 transition-all"
                            style={{ background: "rgba(239,68,68,0.08)" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab: HISTORY ── */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: color }} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <History className="w-10 h-10 text-gray-700" />
              <p className="text-gray-500 text-sm">Még nincs mentett beszélgetés</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const isActive = sessionStorage.getItem(`chat_session_${selectedModel.id}`) === (conv.sessionId || conv.id);
                return (
                  <div
                    key={conv.sessionId || conv.id}
                    onClick={() => loadSessionFromHistory(conv.sessionId || conv.id)}
                    className="cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-all active:scale-[0.99]"
                    style={{
                      background: isActive ? `${color}12` : "rgba(255,255,255,0.03)",
                      border: isActive ? `1px solid ${color}35` : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate">
                          {conv.title || conv.lastMessage || "Névtelen beszélgetés"}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5 truncate">
                          {conv.lastRole === "assistant" ? "🤖" : "👤"} {conv.lastMessage?.slice(0, 55)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {isActive && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${color}25`, color }}>
                            Aktív
                          </span>
                        )}
                        <span className="text-gray-700 text-xs">
                          {conv.updatedAt?.toDate?.()?.toLocaleDateString("hu-HU", { month: "short", day: "numeric" }) || ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <PresetModal
        isOpen={presetModalOpen}
        onClose={() => { setPresetModalOpen(false); setEditingPreset(null); }}
        onSave={savePreset}
        editingPreset={editingPreset}
        modelColor={color}
      />
    </div>
  );
}