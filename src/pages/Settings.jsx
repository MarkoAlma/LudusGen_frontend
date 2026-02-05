import { useState, useEffect, useContext } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit2,
  Save,
  X,
  Check,
  AlertCircle,
  Lock,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { MyUserContext } from "../context/MyUserProvider";
import { useNavigate } from "react-router-dom";
import Enable2FA from "../components/Enable2Fa";
import axios from "axios";

export default function Settings() {
  // ✅ FONTOS: is2FAEnabled, loading2FA és refresh2FAStatus a Context-ből jön
  const { user, updateUser, is2FAEnabled, loading2FA, refresh2FAStatus } = useContext(MyUserContext);
  const navigate = useNavigate();
  
  // Form states
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // 2FA modal state
  const [show2FA, setShow2FA] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
  });

  // Load user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        displayName: user.displayName || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  // Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post("http://localhost:3001/api/update-profile", formData);
      
      if (res.data.success) {
        // Update context
        updateUser(res.data.user);
        setSuccess(true);
        setEditMode(false);
        
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setError(err.response?.data?.message || "Hiba történt a mentés során");
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit
  const handleCancel = () => {
    setFormData({
      name: user.name || "",
      displayName: user.displayName || "",
      email: user.email || "",
      phone: user.phone || "",
      location: user.location || "",
      bio: user.bio || "",
    });
    setEditMode(false);
    setError(null);
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    const code = prompt("Add meg a 6 jegyű kódot a 2FA kikapcsolásához:");
    if (!code) return;

    try {
      const token = await user.getIdToken();
      
      const res = await axios.post(
        "http://localhost:3001/api/disable-2fa", 
        { code },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (res.data.success) {
        // ✅ Frissítsd a Context-ben a 2FA státuszt
        await refresh2FAStatus();
        alert("2FA sikeresen kikapcsolva");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Érvénytelen kód");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-950/50 to-black flex items-center justify-center">
        <p className="text-white">Bejelentkezés szükséges...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-950/50 to-black py-20 px-4">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-6 transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">Vissza</span>
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              Beállítások
            </h1>
            <p className="text-gray-400">Kezeld a fiókod és a biztonsági beállításaidat</p>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3 animate-slideDown">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-400 font-semibold">Változtatások sikeresen mentve!</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 animate-slideDown">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 backdrop-blur-xl overflow-hidden">
                {/* Card header */}
                <div className="p-6 border-b border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Profil Adatok</h2>
                      <p className="text-sm text-gray-400">Személyes információid kezelése</p>
                    </div>
                  </div>
                  
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold transition-all hover:scale-105"
                    >
                      <Edit2 className="w-4 h-4" />
                      Szerkesztés
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 transition-all hover:scale-105 disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 font-semibold transition-all hover:scale-105 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-green-300/30 border-t-green-300 rounded-full animate-spin" />
                            <span>Mentés...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Mentés</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                      <User className="w-4 h-4 text-purple-400" />
                      Teljes név
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={!editMode}
                      className={`w-full px-4 py-3 rounded-xl bg-black/30 border ${
                        editMode ? "border-purple-500/30" : "border-purple-500/10"
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                      placeholder="pl. Kovács János"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Megjelenítendő név
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      disabled={!editMode}
                      className={`w-full px-4 py-3 rounded-xl bg-black/30 border ${
                        editMode ? "border-purple-500/30" : "border-purple-500/10"
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                      placeholder="pl. János"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                      <Mail className="w-4 h-4 text-purple-400" />
                      Email cím
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!editMode}
                      className={`w-full px-4 py-3 rounded-xl bg-black/30 border ${
                        editMode ? "border-purple-500/30" : "border-purple-500/10"
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                      placeholder="pl. janos@example.com"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                      <Phone className="w-4 h-4 text-purple-400" />
                      Telefonszám
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!editMode}
                      className={`w-full px-4 py-3 rounded-xl bg-black/30 border ${
                        editMode ? "border-purple-500/30" : "border-purple-500/10"
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                      placeholder="pl. +36 30 123 4567"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      Tartózkodási hely
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      disabled={!editMode}
                      className={`w-full px-4 py-3 rounded-xl bg-black/30 border ${
                        editMode ? "border-purple-500/30" : "border-purple-500/10"
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                      placeholder="pl. Budapest, Magyarország"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                      <Edit2 className="w-4 h-4 text-purple-400" />
                      Bemutatkozás
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={!editMode}
                      rows={4}
                      className={`w-full px-4 py-3 rounded-xl bg-black/30 border ${
                        editMode ? "border-purple-500/30" : "border-purple-500/10"
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed resize-none`}
                      placeholder="Írj pár szót magadról..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Security Card */}
              <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-purple-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Biztonság</h3>
                      <p className="text-xs text-gray-400">Fiók védelme</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* 2FA Status */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-300">Kéttényezős azonosítás</span>
                      {/* ✅ loading2FA és is2FAEnabled a Context-ből */}
                      {loading2FA ? (
                        <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                      ) : (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          is2FAEnabled 
                            ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                            : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                        }`}>
                          {is2FAEnabled ? "Aktív" : "Inaktív"}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-4">
                      Extra biztonsági réteg a fiókod számára
                    </p>

                    {!is2FAEnabled ? (
                      <button
                        onClick={() => setShow2FA(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
                      >
                        <Lock className="w-4 h-4" />
                        2FA Bekapcsolása
                      </button>
                    ) : (
                      <button
                        onClick={handleDisable2FA}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-semibold transition-all hover:scale-105"
                      >
                        <X className="w-4 h-4" />
                        2FA Kikapcsolása
                      </button>
                    )}
                  </div>

                  {/* Password Change */}
                  <div className="pt-4 border-t border-purple-500/20">
                    <button
                      onClick={() => alert("Jelszó változtatás funkció hamarosan...")}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold transition-all hover:scale-105"
                    >
                      <Lock className="w-4 h-4" />
                      Jelszó Módosítása
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Info Card */}
              <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 backdrop-blur-xl overflow-hidden">
                <div className="p-6">
                  <h3 className="text-sm font-bold text-gray-300 mb-4">Fiók információk</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Létrehozva</span>
                      <div className="flex items-center gap-2 text-sm text-white font-semibold">
                        <Calendar className="w-3 h-3 text-purple-400" />
                        {new Date(user.createdAt || Date.now()).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Fiók típus</span>
                      <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                        {user.accountType || "Standard"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">User ID</span>
                      <span className="text-xs text-gray-500 font-mono">
                        {user.id?.substring(0, 8) || "N/A"}...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Modal */}
      <Enable2FA 
        isOpen={show2FA} 
        onClose={() => {
          setShow2FA(false);
          // ✅ A modal bezárásakor frissítjük a 2FA státuszt
          refresh2FAStatus();
        }} 
      />

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}