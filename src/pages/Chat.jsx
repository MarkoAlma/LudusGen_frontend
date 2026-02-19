import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  Brain,
  Cpu,
  Crown,
  Star,
  CircleDot,
  Wand2,
  MessageSquare,
} from "lucide-react";


export default function AIChat() {
  const [selectedAI, setSelectedAI] = useState("gpt4");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Szia! Válassz egy AI modellt és kezdjük el a beszélgetést! 🚀",
      model: "system",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const aiModels = [
    {
      id: "gpt4",
      name: "GPT-4 Turbo",
      icon: <Sparkles className="w-5 h-5" />,
      color: "#10b981",
      gradient: "from-emerald-500 to-teal-500",
      description: "OpenAI legújabb modellje",
      badge: "Népszerű",
    },
    {
      id: "claude",
      name: "Claude Opus",
      icon: <Brain className="w-5 h-5" />,
      color: "#f59e0b",
      gradient: "from-amber-500 to-orange-500",
      description: "Anthropic csúcsmodellje",
      badge: "Ajánlott",
    },
    {
      id: "gemini",
      name: "Gemini Ultra",
      icon: <Zap className="w-5 h-5" />,
      color: "#3b82f6",
      gradient: "from-blue-500 to-indigo-500",
      description: "Google MultiModal AI",
      badge: "Új",
    },
    {
      id: "llama",
      name: "Llama 3.1",
      icon: <Crown className="w-5 h-5" />,
      color: "#8b5cf6",
      gradient: "from-violet-500 to-purple-500",
      description: "Meta nyílt forráskódú",
      badge: "Open Source",
    },
    {
      id: "mistral",
      name: "Mistral Large",
      icon: <Cpu className="w-5 h-5" />,
      color: "#ec4899",
      gradient: "from-pink-500 to-rose-500",
      description: "Európai AI innováció",
      badge: "EU",
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input, model: selectedAI };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Érdekes kérdés! Hadd gondolkodjak ezen egy kicsit... 🤔",
        "Remek, hogy ezt kérdezed! Szerintem ez így működik...",
        "Ez egy komplex téma, de megpróbálom egyszerűen elmagyarázni.",
        "Nagyszerű! Erről sokáig tudnék beszélni. Kezdjük azzal, hogy...",
        "Aha, értem mire gondolsz. A válaszom erre a következő:",
      ];

      const aiMessage = {
        role: "assistant",
        content:
          responses[Math.floor(Math.random() * responses.length)] +
          " " +
          "Ez egy példa válasz a kiválasztott AI modelltől. A valóságban itt lennének az igazi válaszok, de ez most csak egy demo. 😊",
        model: selectedAI,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const getModelInfo = (modelId) => {
    return aiModels.find((m) => m.id === modelId) || aiModels[0];
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, #1a0b2e 0%, #0a0118 50%, #000000 100%)",
        fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
      }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-float-slow" />
      </div>

      {/* Main Container */}
      <div className="relative w-full h-[90vh] flex gap-4 mt-auto z-10">
        {/* AI Model Selector Sidebar */}
        <div
          className="w-80 h-full rounded-3xl backdrop-blur-2xl border border-white/10 p-6 overflow-y-auto"
          style={{
            background: "rgba(15, 15, 35, 0.6)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-purple-400" />
              AI Modellek
            </h2>
            <p className="text-gray-400 text-sm">Válassz egyet az indításhoz</p>
          </div>

          <div className="space-y-3">
            {aiModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedAI(model.id)}
                className={`w-full p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                  selectedAI === model.id
                    ? "scale-105 shadow-2xl"
                    : "hover:scale-102 hover:shadow-xl"
                }`}
                style={{
                  cursor: "pointer",
                  background:
                    selectedAI === model.id
                      ? `linear-gradient(135deg, ${model.color}30, ${model.color}10)`
                      : "rgba(255, 255, 255, 0.03)",
                  border:
                    selectedAI === model.id
                      ? `2px solid ${model.color}60`
                      : "2px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {/* Glow effect */}
                {selectedAI === model.id && (
                  <div
                    className="absolute inset-0 opacity-50 blur-xl"
                    style={{ background: model.color }}
                  />
                )}

                <div className="relative flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl bg-gradient-to-br ${model.gradient} text-white flex-shrink-0 shadow-lg`}
                  >
                    {model.icon}
                  </div>

                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-sm">
                        {model.name}
                      </h3>
                      {selectedAI === model.id && (
                        <div className="flex items-center gap-1">
                          <CircleDot className="w-3 h-3 text-green-400 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      {model.description}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${model.gradient} text-white`}
                    >
                      {model.badge}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div
            className="mt-6 p-4 rounded-2xl"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Star className="w-4 h-4" />
              <span className="text-sm font-semibold">Mai statisztikák</span>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Üzenetek:</span>
                <span className="text-white font-semibold">
                  {messages.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Aktív modell:</span>
                <span className="text-white font-semibold">
                  {getModelInfo(selectedAI).name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div
          className="flex-1 h-full rounded-3xl backdrop-blur-2xl border border-white/10 flex flex-col overflow-hidden"
          style={{
            background: "rgba(15, 15, 35, 0.6)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Chat Header */}
          <div
            className="px-6 py-4 border-b border-white/10 backdrop-blur-xl flex items-center justify-between"
            style={{ background: "rgba(255, 255, 255, 0.02)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${
                  getModelInfo(selectedAI).gradient
                } shadow-lg`}
              >
                {getModelInfo(selectedAI).icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  {getModelInfo(selectedAI).name}
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <CircleDot className="w-2 h-2 text-green-400 animate-pulse" />
                  Aktív
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300 font-semibold">
                {messages.length} üzenet
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.map((msg, idx) => {
              const modelInfo = getModelInfo(msg.model);
              const isUser = msg.role === "user";

              return (
                <div
                  key={idx}
                  className={`flex gap-3 animate-slide-up ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                  style={{
                    animationDelay: `${idx * 0.05}s`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                      isUser
                        ? "bg-gradient-to-br from-cyan-500 to-blue-500"
                        : `bg-gradient-to-br ${modelInfo.gradient}`
                    }`}
                  >
                    {isUser ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      modelInfo.icon
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-xl ${
                      isUser ? "items-end" : "items-start"
                    } flex flex-col gap-1`}
                  >
                    <div
                      className={`px-5 py-3 rounded-2xl backdrop-blur-sm ${
                        isUser
                          ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-tr-sm"
                          : "bg-white/5 border border-white/10 rounded-tl-sm"
                      }`}
                    >
                      <p className="text-white text-sm leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 px-2">
                      {new Date().toLocaleTimeString("hu-HU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 animate-slide-up">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                    getModelInfo(selectedAI).gradient
                  } flex items-center justify-center shadow-lg`}
                >
                  {getModelInfo(selectedAI).icon}
                </div>
                <div className="px-5 py-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className="p-4 border-t border-white/10 backdrop-blur-xl"
            style={{ background: "rgba(255, 255, 255, 0.02)" }}
          >
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Írj egy üzenetet..."
                  rows={1}
                  className="w-full px-5 py-4 rounded-2xl text-white placeholder-gray-500 resize-none focus:outline-none transition-all"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(10px)",
                  }}
                />
              </div>

              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={`p-4 rounded-2xl transition-all duration-300 shadow-lg ${
                  input.trim()
                    ? `bg-gradient-to-br ${
                        getModelInfo(selectedAI).gradient
                      } hover:scale-105 hover:shadow-2xl`
                    : "bg-gray-700/30 cursor-not-allowed opacity-50"
                }`}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 px-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Sparkles className="w-3 h-3" />
                <span>Enter = küldés, Shift+Enter = új sor</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes float-delayed {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-30px, 30px) scale(0.9);
          }
          66% {
            transform: translate(20px, -20px) scale(1.1);
          }
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(0, 30px) scale(1.05);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 30s ease-in-out infinite;
        }

        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        textarea {
          min-height: 56px;
          max-height: 200px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
