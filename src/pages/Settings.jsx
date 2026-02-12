import { useState, useEffect, useContext, useRef } from "react";
import {
  User,
  Mail,
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
  Camera,
  Upload,
  Trash2,
} from "lucide-react";
import { MyUserContext } from "../context/MyUserProvider";
import { useNavigate } from "react-router-dom";
import Enable2FA from "../components/Enable2Fa";
import axios from "axios";
import UpdatePassword from "../components/UpdatePassword";
import { auth } from "../firebase/firebaseApp";

export default function Settings() {
  const { user, updateUser, is2FAEnabled, loading2FA, refresh2FAStatus } =
    useContext(MyUserContext);
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const fileInputRef = useRef(null);
  
  // Form states
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Profile picture modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({
    name: "",
    displayName: "",
  });

  // 2FA modal states
  const [show2FA, setShow2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FACode, setDisable2FACode] = useState("");
  const [disable2FALoading, setDisable2FALoading] = useState(false);
  const [disable2FAError, setDisable2FAError] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    email: "",
    bio: "",
  });

  // Load user data
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

  // Capitalize first letter of each word
  const capitalizeWords = (str) => {
    return str
      .split(" ")
      .map((word) => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  };

  // Validate all fields
  const validateForm = () => {
    const errors = {
      name: "",
      displayName: "",
    };

    let isValid = true;

    setValidationErrors(errors);
    return isValid;
  };

  const handleUpdatePW = () => {
    setShowPasswordModal(true);
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Email mezőt NE lehessen változtatni
    if (name === "email") return;

    let processedValue = value;

    // Auto-capitalize name fields
    if (name === "name" || name === "displayName") {
      processedValue = capitalizeWords(value);
    }

    setFormData({
      ...formData,
      [name]: processedValue,
    });

    // Clear validation error for this field
    setValidationErrors({
      ...validationErrors,
      [name]: "",
    });

    setError(null);
  };

  const normalize = (value) => (value ?? "").trim();

  // Save changes
  const handleSave = async () => {
    if (!validateForm()) {
      setError("Kérlek javítsd a hibás mezőket!");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await auth.currentUser.getIdToken();
      const dataToSend = {};

      if (normalize(formData.name) !== normalize(user.name)) {
        dataToSend.name = normalize(formData.name);
      }

      if (normalize(formData.displayName) !== normalize(user.displayName)) {
        dataToSend.displayName = normalize(formData.displayName);
      }

      if (normalize(formData.bio) !== normalize(user.bio)) {
        dataToSend.bio = normalize(formData.bio);
      }

      if (Object.keys(dataToSend).length === 0) {
        setError("Nincs változás a profilban");
        setLoading(false);
        return;
      }

      console.log("📤 Sending update:", dataToSend);

      const res = await axios.post(
        "http://localhost:3001/api/update-profile",
        dataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("📥 Server response:", res.data);

      if (res.data.success) {
        if (res.data.user) {
          updateUser(res.data.user);
          console.log("✅ User context updated with:", res.data.user);
        } else {
          updateUser(dataToSend);
        }

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
      bio: user.bio || "",
    });
    setEditMode(false);
    setError(null);
    setValidationErrors({
      name: "",
      displayName: "",
    });
  };

  // Profile picture functions
  const openProfileModal = () => {
    setShowProfileModal(true);
    setImagePreview(null);
    setSelectedFile(null);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setImagePreview(null);
    setSelectedFile(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Csak képfájlokat tölthetsz fel!");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("A kép mérete maximum 5MB lehet!");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedFile) return;

    try {
      setUploadingImage(true);
      setError(null);

      const token = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append("profilePicture", selectedFile);

      const res = await axios.post(
        "http://localhost:3001/api/upload-profile-picture",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.success) {
        updateUser({ profilePicture: res.data.profilePictureUrl });
        setSuccess(true);
        closeProfileModal();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Profile picture upload error:", err);
      setError(
        err.response?.data?.message || "Hiba történt a kép feltöltése során"
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!user.profilePicture) return;

    if (!window.confirm("Biztosan törlöd a profilképedet?")) return;

    try {
      setUploadingImage(true);
      setError(null);

      const token = await auth.currentUser.getIdToken();

      const res = await axios.delete(
        "http://localhost:3001/api/delete-profile-picture",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        updateUser({ profilePicture: null });
        setSuccess(true);
        closeProfileModal();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Profile picture delete error:", err);
      setError(
        err.response?.data?.message || "Hiba történt a kép törlése során"
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // Open disable 2FA modal
  const openDisable2FA = () => {
    setShowDisable2FA(true);
    setDisable2FACode("");
    setDisable2FAError("");
  };

  // Close disable 2FA modal
  const closeDisable2FA = () => {
    setShowDisable2FA(false);
    setDisable2FACode("");
    setDisable2FAError("");
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (disable2FACode.length !== 6) {
      setDisable2FAError("6 jegyű kódot adj meg!");
      return;
    }

    try {
      setDisable2FALoading(true);
      setDisable2FAError("");

      const token = await auth.currentUser.getIdToken();

      const res = await axios.post(
        "http://localhost:3001/api/disable-2fa",
        { code: disable2FACode },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        await refresh2FAStatus();
        closeDisable2FA();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setDisable2FAError(err.response?.data?.message || "Érvénytelen kód");
    } finally {
      setDisable2FALoading(false);
    }
  };

  // Handle code input (only numbers, max 6 digits)
  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setDisable2FACode(value);
    setDisable2FAError("");
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
            className="flex cursor-pointer items-center gap-2 text-purple-300 hover:text-purple-200 mb-6 transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">Vissza</span>
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              Beállítások
            </h1>
            <p className="text-gray-400">
              Kezeld a fiókod és a biztonsági beállításaidat
            </p>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3 animate-slideDown">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-400 font-semibold">
                Változtatások sikeresen mentve!
              </p>
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
                    {/* Profile Picture - Clickable */}
                    <button
                      onClick={openProfileModal}
                      className="relative w-12 cursor-pointer h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden group hover:ring-4 hover:ring-purple-500/50 transition-all"
                    >
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Profil Adatok
                      </h2>
                      <p className="text-sm text-gray-400">
                        Személyes információid kezelése
                      </p>
                    </div>
                  </div>

                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center cursor-pointer gap-2 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold transition-all hover:scale-105"
                    >
                      <Edit2 className="w-4 h-4" />
                      Szerkesztés
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="p-2 rounded-xl cursor-pointer bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 transition-all hover:scale-105 disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center cursor-pointer gap-2 px-4 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 font-semibold transition-all hover:scale-105 disabled:opacity-50"
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
                        validationErrors.name
                          ? "border-red-500/50"
                          : editMode
                          ? "border-purple-500/30"
                          : "border-purple-500/10"
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                      placeholder="pl. Kovács János"
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.name}
                      </p>
                    )}
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
                        validationErrors.displayName
                          ? "border-red-500/50"
                          : editMode
                          ? "border-purple-500/30"
                          : "border-purple-500/10"
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                      placeholder="pl. János"
                    />
                    {validationErrors.displayName && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.displayName}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center justify-between text-sm font-semibold text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-purple-400" />
                        Email cím
                      </div>
                      <span className="text-xs text-gray-500 font-normal">
                        Nem módosítható
                      </span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled={true}
                      className="w-full px-4 py-3 rounded-xl bg-black/30 border border-purple-500/10 text-gray-500 placeholder-gray-500 focus:outline-none transition-all opacity-60 cursor-not-allowed"
                      placeholder="pl. janos@example.com"
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
                        editMode
                          ? "border-purple-500/30"
                          : "border-purple-500/10"
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
                      <h3 className="text-lg font-bold text-white">
                        Biztonság
                      </h3>
                      <p className="text-xs text-gray-400">Fiók védelme</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* 2FA Status */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-300">
                        Kéttényezős azonosítás
                      </span>
                      {loading2FA ? (
                        <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                      ) : (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            is2FAEnabled
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                          }`}
                        >
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
                        className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
                      >
                        <Lock className="w-4 h-4" />
                        2FA Bekapcsolása
                      </button>
                    ) : (
                      <button
                        onClick={openDisable2FA}
                        className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-semibold transition-all hover:scale-105"
                      >
                        <X className="w-4 h-4" />
                        2FA Kikapcsolása
                      </button>
                    )}
                  </div>

                  {/* Password Change */}
                  <div className="pt-4 border-t border-purple-500/20">
                    <button
                      onClick={() => handleUpdatePW()}
                      className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold transition-all hover:scale-105"
                    >
                      <Lock className="w-4 h-4" />
                      Jelszó Módosítása
                    </button>
                  </div>
                </div>
              </div>
              <UpdatePassword
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
              />

              {/* Account Info Card */}
              <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 backdrop-blur-xl overflow-hidden">
                <div className="p-6">
                  <h3 className="text-sm font-bold text-gray-300 mb-4">
                    Fiók információk
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Létrehozva</span>
                      <div className="flex items-center gap-2 text-sm text-white font-semibold">
                        <Calendar className="w-3 h-3 text-purple-400" />
                        {new Date(
                          user.createdAt || Date.now()
                        ).toLocaleDateString("hu-HU")}
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
                        {user.uid?.substring(0, 8) || "N/A"}...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Picture Modal */}
      {showProfileModal && (
        <div 
          onClick={closeProfileModal}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-purple-900/90 to-cyan-900/90 border border-purple-500/30 rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-fadeIn"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Profilkép</h2>
                  <p className="text-sm text-gray-400">
                    Nézd meg vagy módosítsd
                  </p>
                </div>
              </div>
              <button
                onClick={closeProfileModal}
                disabled={uploadingImage}
                className="p-2 cursor-pointer rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current/Preview Image */}
            <div className="mb-6">
              <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden border-4 border-purple-500/30">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-24 h-24 text-white" />
                )}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Actions */}
            <div className="space-y-3">
              {!imagePreview ? (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5" />
                    Új kép feltöltése
                  </button>

                  {user.profilePicture && (
                    <button
                      onClick={handleDeleteProfilePicture}
                      disabled={uploadingImage}
                      className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-semibold transition-all hover:scale-105 disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <>
                          <div className="w-5 h-5 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin" />
                          <span>Törlés...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-5 h-5" />
                          <span>Profilkép törlése</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedFile(null);
                    }}
                    disabled={uploadingImage}
                    className="flex-1 cursor-pointer px-4 py-3 rounded-xl bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 text-gray-300 font-semibold transition-all hover:scale-105 disabled:opacity-50"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={handleUploadProfilePicture}
                    disabled={uploadingImage}
                    className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Feltöltés...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Mentés</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Info */}
            <p className="mt-4 text-xs text-center text-gray-400">
              Támogatott formátumok: JPG, PNG, GIF (max. 5MB)
            </p>
          </div>
        </div>
      )}

      {/* 2FA Enable Modal */}
      <Enable2FA
        isOpen={show2FA}
        onClose={() => {
          setShow2FA(false);
          refresh2FAStatus();
        }}
      />

      {/* 2FA Disable Modal */}
      {showDisable2FA && (
        <div 
          onClick={closeDisable2FA}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-purple-900/90 to-cyan-900/90 border border-purple-500/30 rounded-2xl max-w-md w-full p-8 shadow-2xl animate-fadeIn"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    2FA Kikapcsolása
                  </h2>
                  <p className="text-sm text-gray-400">Biztonsági ellenőrzés</p>
                </div>
              </div>
              <button
                onClick={closeDisable2FA}
                disabled={disable2FALoading}
                className="p-2 cursor-pointer rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning */}
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400 mb-1">
                  Figyelem!
                </p>
                <p className="text-xs text-gray-300">
                  A 2FA kikapcsolásával csökken a fiókod biztonsága. Add meg az
                  autentikátor kódodat a folytatáshoz.
                </p>
              </div>
            </div>

            {/* Code Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                6 jegyű autentikátor kód
              </label>
              <input
                type="text"
                value={disable2FACode}
                onChange={handleCodeChange}
                maxLength={6}
                placeholder="000000"
                disabled={disable2FALoading}
                className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest rounded-xl bg-black/40 border border-purple-500/30 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50"
                autoFocus
              />
              {disable2FAError && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {disable2FAError}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeDisable2FA}
                disabled={disable2FALoading}
                className="flex-1 cursor-pointer px-4 py-3 rounded-xl bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 text-gray-300 font-semibold transition-all hover:scale-105 disabled:opacity-50"
              >
                Mégse
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={disable2FALoading || disable2FACode.length !== 6}
                className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold hover:shadow-2xl hover:shadow-red-500/50 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disable2FALoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Ellenőrzés...</span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5" />
                    <span>Kikapcsolás</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
}
