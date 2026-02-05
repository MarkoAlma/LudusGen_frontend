import React, { useState } from "react";
import {
  Settings,
  X,
  Save,
  Eye,
  Plus,
  Trash2,
  Upload,
  Download,
  RotateCcw,
} from "lucide-react";

export default function LudusGenAdmin() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // Example state - replace with your actual state management
  const [content, setContent] = useState({
    heroTitle: "A jövő AI platformja",
    heroSubtitle: "már itt van",
    description: "Tapasztald meg a következő generációs AI technológiát...",
    ctaPrimary: "Próbáld ki ingyen",
    ctaSecondary: "Nézd meg működés közben",
  });

  return (
    <>
      {/* Floating Admin Button */}
      <button
        style={{ cursor: "pointer" }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-[9999] bg-gradient-to-br from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300"
      >
        {isOpen ? <X size={24} /> : <Settings size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Admin Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[500px] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] shadow-2xl z-[9999] transform transition-transform duration-500 ease-out border-l border-purple-500/20 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-6 border-b border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
              <p className="text-purple-300 text-sm">LudusGen Szerkesztő</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <X size={24} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm font-semibold">
              <Save size={16} />
              Mentés
            </button>
            <button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm font-semibold">
              <Eye size={16} />
              Előnézet
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-500/20 bg-[#0f0f1e]">
          {["Tartalom", "Média", "Beállítások"].map((tab, idx) => (
            <button
              key={tab}
              onClick={() =>
                setActiveTab(["content", "media", "settings"][idx])
              }
              className={`flex-1 py-3 text-sm font-semibold transition-all ${
                activeTab === ["content", "media", "settings"][idx]
                  ? "text-purple-400 border-b-2 border-purple-500 bg-purple-500/10"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="h-[calc(100vh-200px)] overflow-y-auto p-6">
          {activeTab === "content" && (
            <div className="space-y-5">
              {/* Input Fields */}
              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Főcím
                </label>
                <input
                  type="text"
                  value={content.heroTitle}
                  onChange={(e) =>
                    setContent({ ...content, heroTitle: e.target.value })
                  }
                  className="w-full bg-gray-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="Írd be a főcímet..."
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Alcím (kiemelve)
                </label>
                <input
                  type="text"
                  value={content.heroSubtitle}
                  onChange={(e) =>
                    setContent({ ...content, heroSubtitle: e.target.value })
                  }
                  className="w-full bg-gray-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="Kiemelendő rész..."
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Leírás
                </label>
                <textarea
                  value={content.description}
                  onChange={(e) =>
                    setContent({ ...content, description: e.target.value })
                  }
                  rows={4}
                  className="w-full bg-gray-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
                  placeholder="Leírás szövege..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-purple-300 text-sm font-semibold mb-2">
                    Elsődleges gomb
                  </label>
                  <input
                    type="text"
                    value={content.ctaPrimary}
                    onChange={(e) =>
                      setContent({ ...content, ctaPrimary: e.target.value })
                    }
                    className="w-full bg-gray-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 text-sm font-semibold mb-2">
                    Másodlagos gomb
                  </label>
                  <input
                    type="text"
                    value={content.ctaSecondary}
                    onChange={(e) =>
                      setContent({ ...content, ctaSecondary: e.target.value })
                    }
                    className="w-full bg-gray-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* List Manager Example */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-purple-300 text-sm font-semibold">
                    Funkciók
                  </label>
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors">
                    <Plus size={14} />
                    Hozzáad
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    "Globális AI Hálózat",
                    "Enterprise Biztonság",
                    "AI Orchestration",
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-gray-900/30 border border-purple-500/20 rounded-lg p-3"
                    >
                      <input
                        type="text"
                        value={item}
                        className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none"
                      />
                      <button className="text-red-400 hover:text-red-300 transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "media" && (
            <div className="space-y-5">
              <div className="border-2 border-dashed border-purple-500/30 rounded-lg p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-purple-400 mb-3" />
                <p className="text-white font-semibold mb-1">Kép feltöltése</p>
                <p className="text-gray-400 text-sm">
                  Kattints vagy húzd ide a fájlt
                </p>
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Kép URL
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-5">
              {/* Color Pickers */}
              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Elsődleges szín
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    defaultValue="#a855f7"
                    className="w-16 h-12 rounded-lg border-2 border-purple-500/30 cursor-pointer"
                  />
                  <input
                    type="text"
                    defaultValue="#a855f7"
                    className="flex-1 bg-gray-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Másodlagos szín
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    defaultValue="#ec4899"
                    className="w-16 h-12 rounded-lg border-2 border-purple-500/30 cursor-pointer"
                  />
                  <input
                    type="text"
                    defaultValue="#ec4899"
                    className="flex-1 bg-gray-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Export/Import */}
              <div className="pt-4 border-t border-purple-500/20">
                <h3 className="text-white font-semibold mb-3">Adatkezelés</h3>
                <div className="space-y-2">
                  <button className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold">
                    <Download size={16} />
                    Exportálás (JSON)
                  </button>
                  <button className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold">
                    <Upload size={16} />
                    Importálás
                  </button>
                  <button className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold">
                    <RotateCcw size={16} />
                    Alaphelyzet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
