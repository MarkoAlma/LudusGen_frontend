import React, { useState, useMemo } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  Sparkles,
  Chrome,
  Github,
  Apple,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useContext } from "react";
import { MyUserContext } from "../context/MyUserProvider";
import { IoCheckmarkDoneOutline } from "react-icons/io5";
import { FaCheck } from "react-icons/fa";
import { useEffect, useRef } from "react";
import TwoFactorLogin from "../components/TwoFactorLogin";

export default function Login({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mouseDownTarget, setMouseDownTarget] = useState(null);
  
  // ✅ 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [pending2FAEmail, setPending2FAEmail] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    // Töröljük a hibaüzenetet, ha a felhasználó gépelni kezd
    if (msg?.incorrectSignIn) {
      setMsg({ incorrectSignIn: null });
    }
  }, [formData.email, formData.password]);

  useEffect(() => {
    // Töröljük a hibaüzenetet, ha a felhasználó gépelni kezd
    if (msg?.incorrectSignUp) {
      setMsg({ incorrectSignUp: null });
      console.log("ALMALMALAMLAMLMAL");
    }
  }, [formData.email]);

  const { signUpUser, signInUser, msg, user, setMsg } =
    useContext(MyUserContext);

  // Ref-ek a sikeres művelet detektálásához
  const prevUserRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const savedNameRef = useRef("");

  // Email validáció
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(formData.email);

  // Jelszó validációs szabályok
  const passwordValidation = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /\p{Lu}/u.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUpperCase &&
    passwordValidation.hasSpecialChar;

  // Jelszavak egyeznek-e
  const doPasswordsMatch =
    formData.password === formData.confirmPassword &&
    formData.confirmPassword !== "";

  // Form validáció
  const isFormValid = isLogin
    ? formData.email !== "" && formData.password !== "" && isEmailValid
    : formData.name !== "" &&
      formData.email !== "" &&
      isEmailValid &&
      formData.password !== "" &&
      isPasswordValid &&
      formData.confirmPassword !== "" &&
      doPasswordsMatch;

  // ✅ SIKERES BEJELENTKEZÉS/REGISZTRÁCIÓ DETEKTÁLÁSA
  useEffect(() => {
    // Ha éppen van folyamatban lévő submit és a user megváltozott (bejelentkezett)
    if (isSubmittingRef.current && user && prevUserRef.current !== user) {
      isSubmittingRef.current = false;

      // Form reset és modal bezárása
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      savedNameRef.current = "";
      
      // Zárjuk be a login modalt
      onClose();
    }

    prevUserRef.current = user;
  }, [user, onClose]);

  const switchMode = (toLogin) => {
    if (toLogin === isLogin) return;

    setIsSwitching(true);
    setIsLogin(toLogin);

    setTimeout(() => {
      setIsSwitching(false);
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    setLoading(true);
    isSubmittingRef.current = true;

    try {
      if (!isLogin) {
        // REGISZTRÁCIÓ
        savedNameRef.current = formData.name;
        await signUpUser(
          formData.email,
          formData.password,
          formData.name,
          setLoading
        );
      } else {
        // ✅ BEJELENTKEZÉS - 2FA ELLENŐRZÉSSEL
        savedNameRef.current = "";
        
        // Először megpróbáljuk bejelentkeztetni
        const result = await signInUser(formData.email, formData.password);
        
        // Ha 2FA szükséges, megnyitjuk a 2FA modalt
        if (result?.requires2FA) {
          setPending2FAEmail(formData.email);
          setShow2FAModal(true);
          setLoading(false);
          isSubmittingRef.current = false;
          return;
        }
      }
    } catch (error) {
      isSubmittingRef.current = false;
      setMsg({ err: "HIBA" });
    } finally {
      if (!show2FAModal) {
        setLoading(false);
      }
    }
  };

  // ✅ 2FA Sikeres validáció
  const handle2FASuccess = async () => {
    setShow2FAModal(false);
    
    try {
      // Firebase bejelentkezés a tárolt adatokkal
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("../firebase/firebaseApp");
      
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      setMsg({ signIn: true, kijelentkezes: "Sikeres bejelentkezés 2FA-val!" });
      
      // Form reset
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      
      setPending2FAEmail("");
      
      // Modal bezárása kis késleltetéssel
      setTimeout(() => {
        onClose();
      }, 300);
      
    } catch (error) {
      console.error("Firebase login after 2FA error:", error);
      setMsg({ err: "Hiba történt a bejelentkezés során" });
      setPending2FAEmail("");
    }
  };

  // ✅ 2FA Modal bezárása
  const handle2FAClose = () => {
    setShow2FAModal(false);
    setPending2FAEmail("");
    setLoading(false);
  };

  useEffect(() => {
    if (msg?.katt) {
      switchMode(true);
    }
  }, [msg]);

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in"
        onMouseDown={(e) => {
          setMouseDownTarget(e.target);
        }}
        onMouseUp={(e) => {
          if (
            e.target === e.currentTarget &&
            mouseDownTarget === e.currentTarget
          ) {
            onClose();
          }
          setMouseDownTarget(null);
        }}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-inKetto"
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: "scale(0.8)",
            background: "linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
          }}
        >
          {/* Close Button */}
          <button
            style={{ cursor: "pointer" }}
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 🫧 Bubis switch overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className={`absolute left-1/2 top-1/2 w-96 h-96 rounded-full
                bg-purple-500/20 blur-3xl
                transition-all duration-[400ms] ease-in-out
                ${
                  isSwitching
                    ? "scale-100 opacity-100 -translate-x-1/2 -translate-y-1/2"
                    : "scale-50 opacity-0 -translate-x-1/2 -translate-y-1/2"
                }
              `}
            />
          </div>

          <div className="relative z-10 p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              {/* Animated title */}
              <div className="relative h-10 mb-2">
                <h2
                  className="absolute inset-0 text-3xl font-black text-white transition-all duration-400 ease-out flex items-center justify-center"
                  style={{
                    opacity: isLogin ? 1 : 0,
                    transform: isLogin
                      ? "translate3d(0, 0, 0)"
                      : "translate3d(-20px, 0, 0)",
                    willChange: "opacity, transform",
                  }}
                >
                  Üdvözlünk!
                </h2>
                <h2
                  className="absolute inset-0 text-3xl font-black text-white transition-all duration-400 ease-out flex items-center justify-center"
                  style={{
                    opacity: isLogin ? 0 : 1,
                    transform: isLogin
                      ? "translate3d(20px, 0, 0)"
                      : "translate3d(0, 0, 0)",
                    willChange: "opacity, transform",
                  }}
                >
                  Csatlakozz!
                </h2>
              </div>

              {/* Animated subtitle */}
              <div className="relative h-6">
                <p
                  className="absolute inset-0 text-gray-400 transition-all duration-400 ease-out flex items-center justify-center"
                  style={{
                    opacity: isLogin ? 1 : 0,
                    transform: isLogin
                      ? "translate3d(0, 0, 0)"
                      : "translate3d(-20px, 0, 0)",
                    willChange: "opacity, transform",
                  }}
                >
                  Lépj be a fiókodba
                </p>
                <p
                  className="absolute inset-0 text-gray-400 transition-all duration-400 ease-out flex items-center justify-center"
                  style={{
                    opacity: isLogin ? 0 : 1,
                    transform: isLogin
                      ? "translate3d(20px, 0, 0)"
                      : "translate3d(0, 0, 0)",
                    willChange: "opacity, transform",
                  }}
                >
                  Hozz létre egy új fiókot
                </p>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className="relative flex gap-2 mb-6 p-1 rounded-2xl bg-white/5 border border-white/10">
              {/* Animated background slider */}
              <div
                className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-400 ease-out"
                style={{
                  left: isLogin ? "4px" : "calc(50% + 4px)",
                  right: isLogin ? "calc(50% + 4px)" : "4px",
                  willChange: "left, right",
                }}
              />

              <button
                style={{ cursor: "pointer" }}
                onClick={() => switchMode(true)}
                className={`relative z-10 flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300
                  ${
                    isLogin ? "text-white" : "text-gray-400 hover:text-gray-300"
                  }
                `}
              >
                Bejelentkezés
              </button>
              <button
                style={{ cursor: "pointer" }}
                onClick={() => switchMode(false)}
                className={`relative z-10 flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300
                  ${
                    !isLogin
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }
                `}
              >
                Regisztráció
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 🔼 Teljes név – lentről felfelé */}
              <div
                className="overflow-hidden transition-all duration-[400ms] ease-out"
                style={{
                  maxHeight: isLogin ? "0px" : "128px",
                  opacity: isLogin ? 0 : 1,
                  transform: isLogin
                    ? "translate3d(0, 24px, 0)"
                    : "translate3d(0, 0, 0)",
                  willChange: "max-height, opacity, transform",
                }}
              >
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  Teljes név
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Kiss János"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Email – FIX KÖZÉPPONT */}
              <div>
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  Email cím
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    onBlur={() => handleBlur("email")}
                    placeholder="pelda@email.com"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border ${
                      !isEmailValid && formData.email !== ""
                        ? "border-red-500/50"
                        : "border-purple-500/30"
                    } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                  />
                </div>
                {!isEmailValid && formData.email !== "" && (
                  <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                    <XCircle className="w-3 h-3" />
                    <span>Érvénytelen email formátum</span>
                  </div>
                )}

                {!isLogin &&
                  msg?.incorrectSignUp &&
                  msg.incorrectSignUp
                    .toLowerCase()
                    .includes("invalid-email") && (
                    <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                      <XCircle className="w-3 h-3" />
                      <span>Helytelen email cím</span>
                    </div>
                  )}

                {!isLogin &&
                  msg?.incorrectSignUp &&
                  msg.incorrectSignUp
                    .toLowerCase()
                    .includes("email-already-in-use") && (
                    <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                      <XCircle className="w-3 h-3" />
                      <span>Az email cím már használatban van</span>
                    </div>
                  )}
              </div>

              {/* Password – FIX KÖZÉPPONT */}
              <div>
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  Jelszó
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    onBlur={() => handleBlur("password")}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                  <button
                    type="button"
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* ✅ BEJELENTKEZÉS - Hibás email/jelszó üzenet */}
                {isLogin && msg?.incorrectSignIn && (
                  <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                    <XCircle className="w-3 h-3" />
                    <span>Hibás email/jelszó páros</span>
                  </div>
                )}

                {/* Jelszó validáció - csak akkor jelenik meg, ha nem minden teljesül */}
                {!isLogin && formData.password !== "" && !isPasswordValid && (
                  <div className="mt-2 space-y-1">
                    <div
                      className={`flex items-center gap-1 text-xs transition-all duration-300 validation-message ${
                        passwordValidation.minLength
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {passwordValidation.minLength ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>Minimum 8 karakter</span>
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs transition-all duration-300 validation-message ${
                        passwordValidation.hasUpperCase
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {passwordValidation.hasUpperCase ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>Legalább egy nagybetű</span>
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs transition-all duration-300 validation-message ${
                        passwordValidation.hasSpecialChar
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {passwordValidation.hasSpecialChar ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>Legalább egy speciális karakter (!@#$%^&*...)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 🔽 Confirm password – fentről lefelé */}
              <div
                className="overflow-hidden transition-all duration-[400ms] ease-out"
                style={{
                  maxHeight: isLogin ? "0px" : "128px",
                  opacity: isLogin ? 0 : 1,
                  transform: isLogin
                    ? "translate3d(0, -24px, 0)"
                    : "translate3d(0, 0, 0)",
                  willChange: "max-height, opacity, transform",
                }}
              >
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  Jelszó megerősítése
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    onBlur={() => handleBlur("confirmPassword")}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border ${
                      touched.confirmPassword &&
                      !doPasswordsMatch &&
                      formData.confirmPassword !== ""
                        ? "border-red-500/50"
                        : "border-purple-500/30"
                    } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                  />
                </div>
                {formData.confirmPassword !== "" && !doPasswordsMatch && (
                  <div className="flex items-center gap-1 mt-2 text-xs transition-all duration-300 validation-message text-red-400">
                    <XCircle className="w-3 h-3" />
                    <span>A jelszavak nem egyeznek</span>
                  </div>
                )}
              </div>

              {/* Remember Me / Forgot Password */}
              <div
                className="overflow-hidden transition-all duration-[400ms] ease-out"
                style={{
                  maxHeight: isLogin ? "60px" : "0px",
                  opacity: isLogin ? 1 : 0,
                  transform: isLogin
                    ? "translate3d(0, 0, 0)"
                    : "translate3d(0, 24px, 0)",
                  willChange: "max-height, opacity, transform",
                }}
              >
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <input type="checkbox" className="peer hidden" />

                    <div
                      className="
w-6 h-6 rounded-md
border border-purple-500/40
bg-black/40
flex items-center justify-center
transition-all duration-200 ease-out
group-hover:border-purple-400
p-1
peer-checked:bg-purple-600/80
peer-checked:border-purple-400
peer-checked:shadow-[0_0_6px_rgba(168,85,247,0.35)]

peer-checked:[&>svg]:opacity-100
peer-checked:[&>svg]:scale-100
"
                    >
                      <FaCheck
                        className="
w-4 h-4 text-white
opacity-0 scale-75
transition-all duration-200 ease-out
"
                      />
                    </div>

                    <span className="text-gray-400 group-hover:text-gray-300 transition-colors text-sm">
                      Maradjak bejelentkezve
                    </span>
                  </label>

                  <a
                    href="#"
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                  >
                    Elfelejtett jelszó?
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <button
                style={{
                  cursor: isFormValid && !loading ? "pointer" : "not-allowed",
                }}
                type="submit"
                disabled={!isFormValid || loading}
                className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${
                  isFormValid && !loading
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
                    : "bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white/50 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Feldolgozás...</span>
                  </>
                ) : (
                  <>
                    {/* Animated text container */}
                    <div className="relative h-6 w-32">
                      {/* "Bejelentkezés" text */}
                      <span
                        className="absolute inset-0 flex  gap-2 items-center justify-center transition-all duration-400 ease-out"
                        style={{
                          opacity: isLogin ? 1 : 0,
                          transform: isLogin
                            ? "translate3d(0, 0, 0)"
                            : "translate3d(-20px, 0, 0)",
                          willChange: "opacity, transform",
                        }}
                      >
                        <Sparkles className="w-5 h-5" />
                        Bejelentkezés
                      </span>

                      {/* "Regisztráció" text */}
                      <span
                        className="absolute inset-0 flex gap-2 items-center justify-center transition-all duration-400 ease-out"
                        style={{
                          opacity: isLogin ? 0 : 1,
                          transform: isLogin
                            ? "translate3d(20px, 0, 0)"
                            : "translate3d(0, 0, 0)",
                          willChange: "opacity, transform",
                        }}
                      >
                        <Sparkles className="w-5 h-5" />
                        Regisztráció
                      </span>
                    </div>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-purple-500/20" />
                </div>
                <div className="relative flex justify-center">
                  <span
                    className="px-3 text-xs text-gray-500 font-semibold"
                    style={{
                      background:
                        "linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)",
                    }}
                  >
                    vagy folytatás ezekkel
                  </span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "Google", icon: <Chrome className="w-5 h-5" /> },
                  { name: "GitHub", icon: <Github className="w-5 h-5" /> },
                  { name: "Apple", icon: <Apple className="w-5 h-5" /> },
                ].map((social) => (
                  <button
                    key={social.name}
                    type="button"
                    className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 flex items-center justify-center text-gray-400 hover:text-white group"
                    title={social.name}
                  >
                    <div className="group-hover:scale-110 transition-transform">
                      {social.icon}
                    </div>
                  </button>
                ))}
              </div>
            </form>

            {/* Terms */}
            <div
              className="overflow-hidden transition-all duration-[400ms] ease-out"
              style={{
                maxHeight: isLogin ? "0px" : "100px",
                opacity: isLogin ? 0 : 1,
                transform: isLogin
                  ? "translate3d(0, -24px, 0)"
                  : "translate3d(0, 0, 0)",
                willChange: "max-height, opacity, transform",
              }}
            >
              <p className="mt-5 text-center text-xs text-gray-500">
                A regisztrációval elfogadod az{" "}
                <a
                  href="#"
                  className="text-purple-400 hover:text-purple-300 font-semibold"
                >
                  ÁSZF-et
                </a>{" "}
                és az{" "}
                <a
                  href="#"
                  className="text-purple-400 hover:text-purple-300 font-semibold"
                >
                  Adatvédelmi Nyilatkozatot
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 2FA Login Modal */}
      <TwoFactorLogin
        isOpen={show2FAModal}
        onClose={handle2FAClose}
        onSuccess={handle2FASuccess}
        email={pending2FAEmail}
      />

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        @keyframes enter {
          from {
            opacity: 0;
            transform: translateX(400px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes leave {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(400px) scale(0.9);
          }
        }

        .animate-enter {
          animation: enter 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
        }

        .animate-leave {
          animation: leave 0.3s cubic-bezier(0.06, 0.71, 0.55, 1) forwards;
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-progress {
          animation: progress linear forwards;
        }

        @keyframes scale-check {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        .animate-scale-check {
          animation: scale-check 0.6s ease-in-out;
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .validation-message {
          opacity: 0;
          animation: fadeIn 0.4s ease-out forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        input::placeholder {
          color: #6b7280;
        }

        input[type="checkbox"]:checked {
          background-color: #a855f7;
          border-color: #a855f7;
        }

        @keyframes scale-inKetto {
          from {
            opacity: 0;
            transform: scale(0.72);
          }
          to {
            opacity: 1;
            transform: scale(0.8);
          }
        }

        .animate-scale-inKetto {
          animation: scale-inKetto 0.3s ease-out;
        }
      `}</style>
    </>
  );
}