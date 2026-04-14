import { useState, useEffect, useContext, useRef } from "react";
import { User, Mail, Calendar, Shield, Edit2, Save, X, Check, AlertCircle, Lock, Sparkles, ChevronLeft, Camera, Upload, Trash2, XCircle, Zap } from "lucide-react";
import { MyUserContext } from "../context/MyUserProvider";
import { useNavigate } from "react-router-dom";
import Enable2FA from "../components/Enable2Fa";
import axios from "axios";
import { API_BASE } from "../api/client";
import UpdatePassword from "../components/UpdatePassword";
import { auth } from "../firebase/firebaseApp";
import { motion, AnimatePresence } from "framer-motion";
import { tokens } from "../styles/tokens";
import CreditTopup from "../components/CreditTopup";

// UI Components
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Divider from "../components/ui/Divider";
import Modal from "../components/ui/Modal";
import PageTransition from "../components/layout/PageTransition";

import settings_bg from "../assets/backgrounds/settings_bg.png";

export default function Settings() {
  const { user, updateUser, is2FAEnabled, loading2FA, refresh2FAStatus } = useContext(MyUserContext);
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const fileInputRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [show2FA, setShow2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState("");
  const [disable2FALoading, setDisable2FALoading] = useState(false);
  const [disable2FAError, setDisable2FAError] = useState("");

  const [showCreditTopup, setShowCreditTopup] = useState(false);

  const [formData, setFormData] = useState({ name: "", displayName: "", email: "", bio: "" });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        displayName: user.displayName || "",
        email: user.email || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  const handleUpdatePW = () => setShowPasswordModal(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") return;
    setFormData({ ...formData, [name]: value });
    setError(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await auth.currentUser.getIdToken();
      const res = await axios.post(`${API_BASE}/api/update-profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        updateUser(formData);
        setSuccess(true);
        setEditMode(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: user.name || "", displayName: user.displayName || "", email: user.email || "", bio: user.bio || "" });
    setEditMode(false);
    setError(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedFile) return;
    try {
      setUploadingImage(true);
      const token = await auth.currentUser.getIdToken();
      const fd = new FormData();
      fd.append("profilePicture", selectedFile);
      const res = await axios.post(`${API_BASE}/api/upload-profile-picture`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        updateUser({ profilePicture: res.data.profilePictureUrl });
        setShowProfileModal(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  if (!user) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#03000a] text-white pb-20 px-4 md:px-6 lg:px-8 relative overflow-hidden">
        {/* Cinematic Backgrounds */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <img 
            src={settings_bg} 
            className="absolute inset-0 w-full h-full object-cover opacity-[0.06] grayscale scale-110" 
            alt="" 
          />
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10 pt-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <button 
                onClick={() => navigate("/")} 
                className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] mb-4 hover:opacity-70 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Vissza a központba
              </button>
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter mb-2">Beállítások.</h1>
              <p className="text-gray-500 font-medium">Személyre szabott élmény és biztonság.</p>
            </div>
            {!editMode ? (
              <Button variant="primary" onClick={() => setEditMode(true)} className="cursor-pointer">
                <Edit2 className="w-4 h-4 mr-2" /> Profil szerkesztése
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="subtle" onClick={handleCancel} className="cursor-pointer">Mégse</Button>
                <Button variant="primary" onClick={handleSave} loading={loading} className="cursor-pointer">Mentés</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Area */}
            <div className="lg:col-span-8 space-y-8">
              {/* Profile Card */}
              <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div 
                    className="relative group cursor-pointer"
                    onClick={() => setShowProfileModal(true)}
                  >
                    <div className="w-32 h-32 rounded-[2.5rem] border-2 border-primary/30 p-1 group-hover:border-primary/60 transition-all">
                      <img 
                        src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-[2.2rem]"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-black italic tracking-tight text-white mb-1">{user.displayName || "Ludus Genius"}</h2>
                    <p className="text-sm text-gray-400 font-medium mb-4">{user.email}</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      <Badge variant="primary">{user.accountType || "Standard"}</Badge>
                      {is2FAEnabled && <Badge variant="success">2FA Aktív</Badge>}
                    </div>
                  </div>
                </div>

                <div className="mt-12 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SettingsInput 
                      label="Megjelenített név" 
                      name="displayName" 
                      value={formData.displayName} 
                      onChange={handleChange} 
                      disabled={!editMode} 
                    />
                    <SettingsInput 
                      label="Teljes név" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      disabled={!editMode} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Bemutatkozás</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={!editMode}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-6 text-sm font-medium focus:outline-none focus:border-primary/50 transition-all min-h-[120px] resize-none disabled:opacity-50"
                      placeholder="Mesélj magadról..."
                    />
                  </div>
                </div>
              </div>

              {/* Security Card */}
              <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tight">Biztonsági központ.</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Lock className="w-4 h-4 text-primary" />
                      <Badge variant="subtle">Jelszó</Badge>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Jelszó módosítása</p>
                    <p className="text-[10px] text-gray-500 mb-6 font-medium">Ajánlott legalább 6 havonta frissíteni.</p>
                    <Button variant="subtle" size="sm" onClick={handleUpdatePW} className="w-full cursor-pointer">Megnyitás</Button>
                  </div>

                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Shield className="w-4 h-4 text-primary" />
                      <Badge variant={is2FAEnabled ? "success" : "danger"}>{is2FAEnabled ? "Védett" : "Sebezhető"}</Badge>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Kétlépcsős azonosítás</p>
                    <p className="text-[10px] text-gray-500 mb-6 font-medium">Extra védelmi réteg a fiókodhoz.</p>
                    {!is2FAEnabled ? (
                      <Button variant="primary" size="sm" onClick={() => setShow2FA(true)} className="w-full cursor-pointer">Beállítás</Button>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => setShowDisable2FA(true)} className="w-full cursor-pointer">Kikapcsolás</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-panel p-6 rounded-[2.5rem] border border-white/10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6 px-2">Fiók Adatok</h4>
                <div className="space-y-4">
                  <InfoRow label="Létrehozva" value={user.createdAt?._seconds ? new Date(user.createdAt._seconds * 1000).toLocaleDateString("hu-HU") : "Ismeretlen"} icon={Calendar} />
                  <InfoRow label="Profil Típus" value={user.accountType || "Standard"} icon={Sparkles} color="text-primary" />
                  <InfoRow label="Unique ID" value={user.uid?.substring(0, 10) + "..."} icon={Shield} />
                </div>
              </div>

              {/* Credits Card addition */}
              <div className="glass-panel p-6 rounded-[2.5rem] border border-white/10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tight">Kreditek.</h3>
                </div>

                <div className="rounded-2xl mb-4 bg-white/[0.02] border border-white/5 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Jelenlegi</p>
                    <p className="font-black text-white text-3xl italic tracking-tighter">
                      {(user.credits ?? 0).toLocaleString("hu-HU")}
                      <span className="text-primary text-sm ml-1 not-italic tracking-normal">kr</span>
                    </p>
                  </div>
                  <Zap className="w-6 h-6 text-primary" />
                </div>

                <Button variant="primary" onClick={() => setShowCreditTopup(true)} className="w-full cursor-pointer">
                  Kredit feltöltése
                </Button>
              </div>

            </div>
          </div>
        </div>

        {/* Modals */}
        <UpdatePassword isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
        <Enable2FA isOpen={show2FA} onClose={() => { setShow2FA(false); refresh2FAStatus();  }} />
        <CreditTopup isOpen={showCreditTopup} onClose={() => setShowCreditTopup(false)} />
        
        <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Profilkép frissítése">
          <div className="flex flex-col items-center p-6">
            <div className="w-40 h-40 rounded-[2.5rem] border-4 border-primary/20 overflow-hidden mb-8">
              <img src={imagePreview || user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} className="w-full h-full object-cover" />
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
            <div className="grid grid-cols-2 gap-4 w-full">
              <Button variant="subtle" onClick={() => fileInputRef.current.click()} className="cursor-pointer">Választás</Button>
              <Button variant="primary" onClick={handleUploadProfilePicture} loading={uploadingImage} className="cursor-pointer">Feltöltés</Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

function SettingsInput({ label, value, onChange, name, disabled }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl h-12 px-6 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all disabled:opacity-50"
      />
    </div>
  );
}

function InfoRow({ label, value, icon: Icon, color = "text-white" }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.02] transition-colors group cursor-pointer">
      <div className="flex items-center gap-3">
        <Icon className="w-3.5 h-3.5 text-gray-600 group-hover:text-primary transition-colors" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</span>
      </div>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}
