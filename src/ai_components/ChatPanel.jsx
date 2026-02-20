import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Settings2, Bookmark, Trash2, Plus, ChevronDown, ChevronUp,
  Sparkles, User, Bot, RefreshCw, Copy, Check, Sliders, X,
  MessageSquare, History, Zap,
} from "lucide-react";
import { db } from "../firebase/firebaseApp";
import {
  collection, addDoc, query, orderBy, limit, getDocs,
  serverTimestamp, deleteDoc, doc, setDoc, onSnapshot,
} from "firebase/firestore";
import { DEFAULT_PRESETS } from "./models";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Markdown-lite renderer ───────────────────────────
const renderContent = (text) => {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0] || "";
      const code = lines.slice(1).join("\n");
      return (
        <pre
          key={i}
          className="my-2 p-3 rounded-xl overflow-x-auto text-xs"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}
        >
          {lang && <div className="text-gray-500 text-xs mb-1">{lang}</div>}
          <code>{code}</code>
        </pre>
      );
    }
    const inlineParts = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {inlineParts.map((p, j) => {
          if (p.startsWith("`") && p.endsWith("`"))
            return <code key={j} className="px-1 py-0.5 rounded text-xs" style={{ background: "rgba(0,0,0,0.3)", color: "#67e8f9" }}>{p.slice(1, -1)}</code>;
          if (p.startsWith("**") && p.endsWith("**"))
            return <strong key={j} className="text-white">{p.slice(2, -2)}</strong>;
          return p.split("\n").map((line, k) => (
            <React.Fragment key={k}>{line}{k < p.split("\n").length - 1 && <br />}</React.Fragment>
          ));
        })}
      </span>
    );
  });
};

// ─── Preset modal ──────────────────────────────────────
const PresetModal = ({ isOpen, onClose, onSave, editingPreset, modelColor }) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
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
            <Slider label="Temperature" field="temperature" min={0} max={2} step={0.05} hint="0 = determinisztikus · 1 = kiegyensúlyozott · 2 = kreatív" />
            <Slider label="Max tokens" field="maxTokens" min={128} max={8192} step={128} hint="Maximális válaszhossz tokenekben" />
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
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(0.9);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [activePresetId, setActivePresetId] = useState("default_balanced");

  const [presets, setPresets] = useState(DEFAULT_PRESETS.chat);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const isLoadingConversation = useRef(false);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    const newCount = messages.length;
    const added = newCount > prevMessageCount.current;
    prevMessageCount.current = newCount;

    if (added && !isLoadingConversation.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!userId) return;
    loadConversationList();
    loadUserPresets();
  }, [userId, selectedModel.id]);

  useEffect(() => {
    if (!userId) return;
    loadCurrentConversation();
  }, [userId, selectedModel.id]);

  const loadConversationList = async () => {
    try {
      const ref = collection(db, "conversations", userId, selectedModel.id);
      const q = query(ref, orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(q);
      const sessions = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const sid = data.sessionId || "default";
        if (!sessions[sid]) sessions[sid] = { id: sid, messages: [], createdAt: data.createdAt };
        sessions[sid].messages.push(data);
      });
      setConversations(Object.values(sessions).slice(0, 10));
    } catch (e) { console.error("Load conversation list error:", e); }
  };

  const loadCurrentConversation = async () => {
    if (!userId) return;
    isLoadingConversation.current = true;
    setLoadingHistory(true);
    try {
      const sessionId = getCurrentSessionId();
      const ref = collection(db, "conversations", userId, selectedModel.id);
      const q = query(ref, orderBy("timestamp", "asc"), limit(100));
      const snap = await getDocs(q);
      const msgs = snap.docs.map((d) => d.data()).filter((m) => m.sessionId === sessionId);
      if (msgs.length > 0) {
        prevMessageCount.current = msgs.length;
        setMessages(msgs);
      } else {
        const welcome = [{
          role: "assistant",
          content: `Szia! ${selectedModel.name} itt. Miben segíthetek? 🚀`,
          model: selectedModel.id,
          id: "welcome",
        }];
        prevMessageCount.current = welcome.length;
        setMessages(welcome);
      }
    } catch (e) {
      const welcome = [{
        role: "assistant",
        content: `Szia! ${selectedModel.name} itt. Miben segíthetek? 🚀`,
        model: selectedModel.id,
        id: "welcome",
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

  // ── FIX: undefined mezők kiszűrése Firestore mentés előtt ──
  const removeUndefined = (obj) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
    );
  };

  const saveMessage = async (msg) => {
    if (!userId) return;
    try {
      const sessionId = getCurrentSessionId();
      const msgData = removeUndefined({
        role: msg.role,
        content: msg.content,
        model: msg.model,
        id: msg.id,
        sessionId,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        // usage csak akkor kerül be, ha ténylegesen megvan
        ...(msg.usage ? { usage: msg.usage } : {}),
        ...(msg.isError ? { isError: true } : {}),
      });
      await addDoc(collection(db, "conversations", userId, selectedModel.id), msgData);
    } catch (e) { console.error("Save message error:", e); }
  };

  const applyPreset = (preset) => {
    setSystemPrompt(preset.systemPrompt || selectedModel.defaultSystemPrompt || "");
    if (preset.temperature !== undefined) setTemperature(preset.temperature);
    if (preset.maxTokens !== undefined) setMaxTokens(preset.maxTokens);
    if (preset.topP !== undefined) setTopP(preset.topP);
    if (preset.frequencyPenalty !== undefined) setFrequencyPenalty(preset.frequencyPenalty);
    if (preset.presencePenalty !== undefined) setPresencePenalty(preset.presencePenalty);
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

  const handleSend = async () => {
    
    if (!input.trim() || isTyping) return;
    const userMsg = { role: "user", content: input.trim(), model: selectedModel.id, id: Date.now().toString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveMessage(userMsg);
    setInput("");
    setIsTyping(true);

    try {
      // ── FIX: mindig lekérjük a friss tokent ──
      const token = getIdToken ? await getIdToken() : null;

      if (!token) {
        throw new Error("Nincs érvényes autentikációs token. Jelentkezz be újra.");
      }
      console.log('elso');
      
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: selectedModel.apiModel,
          provider: selectedModel.provider,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            ...newMessages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
        }),
      });
      console.log('masodik');
      
      const data = await res.json();

console.log("📦 Backend válasz:", JSON.stringify(data, null, 2));
console.log("📝 content érték:", data.content);
console.log("✅ res.ok:", res.ok, "status:", res.status);
      if (!res.ok) {
        throw new Error(data.message || `Szerver hiba: ${res.status}`);
      }

      const aiMsg = {
        role: "assistant",
        content: data.content || "Hiba történt a válasz generálásakor.",
        model: selectedModel.id,
        id: (Date.now() + 1).toString(),
        ...(data.usage ? { usage: data.usage } : {}),
      };
      setMessages((p) => [...p, aiMsg]);
      await saveMessage(aiMsg);
    } catch (err) {
      // This is the key line — logs the real OpenRouter error message
      console.error("OpenRouter hiba:", JSON.stringify(err.response?.data, null, 2));
      console.error("Status:", err.response?.status);
      console.error("Message:", err.message);

      return res.status(500).json({
        success: false,
        message: err.response?.data?.error?.message || err.message || 'OpenRouter API hiba',
      });
    }finally {
      setIsTyping(false);
    }
  };

  const copyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearConversation = () => {
    sessionStorage.removeItem(`chat_session_${selectedModel.id}`);
    const welcome = [{
      role: "assistant",
      content: `Új beszélgetés kezdve! ${selectedModel.name} készen áll. 🚀`,
      model: selectedModel.id,
      id: Date.now().toString(),
    }];
    prevMessageCount.current = welcome.length;
    setMessages(welcome);
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
            onClick={() => setActiveTab(tab.id)}
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
          <div className="flex-1 overflow-y-auto px-3 md:px-5 py-3 space-y-3 scrollbar-thin">
            {messages.map((msg) => {
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
                      {renderContent(msg.content)}
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

            {isTyping && (
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
            <div ref={messagesEndRef} />
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
            <div className="flex gap-2 items-end">
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
                placeholder="Írj egy üzenetet..."
                rows={1}
                className="flex-1 px-4 py-3 rounded-2xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${input ? color + "40" : "rgba(255,255,255,0.08)"}`,
                  minHeight: "48px",
                  maxHeight: "160px",
                  overflowY: "auto",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="cursor-pointer p-3 rounded-2xl transition-all duration-200 flex-shrink-0 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !isTyping ? `linear-gradient(135deg, ${color}, ${color}bb)` : "rgba(255,255,255,0.05)",
                  opacity: input.trim() && !isTyping ? 1 : 0.4,
                  boxShadow: input.trim() && !isTyping ? `0 0 20px ${color}30` : "none",
                }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-xs text-gray-700 mt-1.5 px-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Enter = küldés · Shift+Enter = új sor
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
              rows={6}
              className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <p className="text-gray-600 text-xs mt-1">{systemPrompt.length} karakter</p>
          </div>

          {[
            { label: "Temperature", key: "temperature", min: 0, max: 2, step: 0.05, val: temperature, set: setTemperature, hint: "0 = determinisztikus · 0.7 = kiegyensúlyozott · 2 = random" },
            { label: "Max Tokens", key: "maxTokens", min: 128, max: 8192, step: 128, val: maxTokens, set: setMaxTokens, hint: "Maximális válaszhossz tokenekben (~1 token ≈ ¾ szó)" },
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
                <div
                  key={preset.id}
                  className="p-3 rounded-xl transition-all"
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
                      <button
                        onClick={() => applyPreset(preset)}
                        className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
                        style={isActive
                          ? { background: `${color}25`, color, border: `1px solid ${color}40` }
                          : { background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}
                      >
                        {isActive ? "✓" : "Alkalmaz"}
                      </button>
                      {!preset.isDefault && (
                        <>
                          <button
                            onClick={() => { setEditingPreset(preset); setPresetModalOpen(true); }}
                            className="cursor-pointer p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/10 transition-all"
                            style={{ background: "rgba(255,255,255,0.04)" }}
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletePreset(preset.id)}
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
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-all active:scale-[0.99]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <p className="text-white text-xs font-semibold">{conv.messages[0]?.content?.slice(0, 60)}...</p>
                  <p className="text-gray-600 text-xs mt-1">{conv.messages.length} üzenet · {conv.createdAt || ""}</p>
                </div>
              ))}
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