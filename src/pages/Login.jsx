import React, { useState, useMemo } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { useContext } from "react";
import { MyUserContext } from "../context/MyUserProvider";
import { IoCheckmarkDoneOutline } from "react-icons/io5";
import { FaCheck } from "react-icons/fa";
import { useEffect, useRef } from "react";
import TwoFactorLogin from "../components/TwoFactorLogin";

export default function Login({ isOpen, onClose }) {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [isSwitching, setIsSwitching] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mouseDownTarget, setMouseDownTarget] = useState(null);
  const [emailKikuldese, setEmailKikuldese] = useState(false);
  
  // ✅ 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [pending2FAEmail, setPending2FAEmail] = useState("");
  const [pending2FAPassword, setPending2FAPassword] = useState(""); // ✅ Tároljuk a jelszót is

  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [provider, setProvider] = useState(null); // 'email' vagy 'google'
  
  useEffect(()=>{
    if (isOpen) {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      });
    }
  },[isOpen])

  // ✅ Másolás/Beillesztés megakadályozása a jelszó mezőbe
  const handlePasswordCopyPaste = (e) => {
    e.preventDefault();
    return false;
  };
  // Debug: követjük a 2FA modal állapotát
  useEffect(() => {
    console.log("🔍 2FA Modal state changed:", show2FAModal);
    console.log("📧 Pending 2FA email:", pending2FAEmail);
  }, [show2FAModal, pending2FAEmail]);
  
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
  const [emailSent, setEmailSent] = useState(false);

  // Hogy Login és Signup között könnyebb legyen a logika
  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot';

  useEffect(() => {
    if (msg?.incorrectSignIn!=null) {
      setMsg({ incorrectSignIn: null });
    }
  }, [formData.email, formData.password]);

  useEffect(() => {
    if (msg?.incorrectSignUp!=null) {
      setMsg({incorrectSignUp: null})
    }
  }, [formData.email]);

  useEffect(() => {
    if (msg?.incorrectResetPwEmail!=null) {
      setMsg({incorrectResetPwEmail: null})
      setEmailKikuldese(false)
    }
  }, [formData.email]);

  const { signUpUser, signInUser, msg, user, setMsg, resetPassword, signInWithGoogle, setIsAuthOpen,setShowNavbar } = useContext(MyUserContext);

  useEffect(() => {
    console.log("msg változott:", msg);
    if (mode == "forgot" && emailKikuldese){
      if (!msg?.incorrectResetPwEmail) {
        setEmailSent(true);
      }
    }
    console.log(emailKikuldese);
  }, [msg, emailKikuldese]);

  
  const prevUserRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const savedNameRef = useRef("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(formData.email);

  const passwordValidation = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /\p{Lu}/u.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUpperCase &&
    passwordValidation.hasSpecialChar;

  const doPasswordsMatch =
    formData.password === formData.confirmPassword &&
    formData.confirmPassword !== "";

  const isFormValid = mode === 'login'
    ? (formData.email !== '' && formData.password !== '' && isEmailValid)
    : mode === 'signup'
    ? (formData.name !== '' && formData.email !== '' && isEmailValid && formData.password !== '' && isPasswordValid && formData.confirmPassword !== '' && doPasswordsMatch)
    : (formData.email !== '' && isEmailValid); // forgot password

  useEffect(() => {
    // Csak sikeres bejelentkezés után töröljük a formot
    if (isSubmittingRef.current && user && prevUserRef.current !== user) {
      isSubmittingRef.current = false;
      // setFormData({
      //   name: "",
      //   email: "",
      //   password: "",
      //   confirmPassword: "",
      // });
      savedNameRef.current = '';
      
      // Bezárjuk a modalt sikeres bejelentkezés után
     
        onClose();
        setLoading(false)
  
    }
    prevUserRef.current = user;
  }, [user, onClose]);

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    setIsSwitching(true);
    setMode(newMode);
    setEmailSent(false);
    setTimeout(() => {
      setIsSwitching(false);
    }, 400);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    const result = await signInWithGoogle();
    
    // ✅ GOOGLE 2FA KEZELÉS
    if (result.requires2FA) {
    
      console.log("2FA required for Google login");
      setEmail(result.email);
      setSessionId(result.sessionId);
      setProvider('google');
      setShow2FAModal(true);
    }
    
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    setLoading(true);

    if (mode === 'forgot') {
      try {
        console.log("FORGOT HANDLER START");
        await resetPassword(formData.email);
        console.log("Alma1222");
        setEmailKikuldese(true)
      } catch (error) {
        setMsg({err: error.message});
      } finally {
        setLoading(false);
      }
      return;
    }

    // ⚠️ NE állítsuk be az isSubmittingRef-et 2FA esetén
    // isSubmittingRef.current = true; // ← TÖRÖLVE

    try {
      if (mode === 'signup') {
        // REGISZTRÁCIÓ
        isSubmittingRef.current = true; // ← IDE TETTÜK
        savedNameRef.current = formData.name;
        await signUpUser(
          formData.email,
          formData.password,
          formData.name,
          setLoading
        );
      } else if (mode === 'login'){
        // ✅ BEJELENTKEZÉS - 2FA ELLENŐRZÉSSEL
        savedNameRef.current = "";
        
        // Először megpróbáljuk bejelentkeztetni (ez ellenőrzi a jelszót is)
        const result = await signInUser(formData.email, formData.password, setLoading);
        
        // Ha 2FA szükséges, megnyitjuk a 2FA modalt
        if (result?.requires2FA) {
          console.log("🔐 2FA required, opening 2FA modal...");
          console.log("📧 Email:", formData.email);
          console.log("🔑 Password saved:", !!formData.password);
          
          setPending2FAEmail(formData.email);
          setPending2FAPassword(formData.password);
          
          console.log("⏳ Setting show2FAModal to TRUE...");
          setProvider('email');
          setShow2FAModal(true);
          
          // Ellenőrizzük, hogy tényleg beállítódott-e
          setTimeout(() => {
            console.log("✅ show2FAModal should be true now");
          }, 100);
          
          setLoading(false);
          // ⚠️ NEM állítjuk be az isSubmittingRef-et, hogy a useEffect ne zárja be a modalt
          return;
        }
        
        // Ha nincs 2FA és sikeres volt a bejelentkezés
        isSubmittingRef.current = true; // ← IDE TETTÜK (csak ha NINCS 2FA)
        // if (msg?.signIn) {
        //   // Form reset csak sikeres bejelentkezés után
        //   setFormData({
        //     name: "",
        //     email: "",
        //     password: "",
        //     confirmPassword: "",
        //   });
        // }
        // ⚠️ Ha hiba volt (rossz jelszó), NE töröljük a formot!
      }
    } catch (error) {
      isSubmittingRef.current = false;
      setMsg({ err: "HIBA" });
      setLoading(false)
    }
  };

  // ✅ 2FA Sikeres validáció
  const handle2FASuccess = async () => {
    console.log("✅ 2FA Success handler called");
    setShow2FAModal(false);
    setIsAuthOpen(false);
    setShowNavbar(true)
    setMsg({signIn:true, kijelentkezes: 'Sikeres bejelentkezés!'})
    // setLoading(false)
    try {

      console.log("🔐 Logging in with Firebase after 2FA...");
      if (provider == 'google') {
              // ✅ GOOGLE 2FA - Custom token-nel már be van jelentkezve
      console.log("✅ Google 2FA login successful with custom token");
      
      // A signInWith2FA már megtörtént a TwoFactorLogin komponensben
      // Csak bezárjuk a modalt és tisztítjuk a state-et
    // setMsg({signIn:true, kijelentkezes: 'Sikeres bejelentkezés!'})
      
      // // Form reset
      // setFormData({
      //   name: "",
      //   email: "",
      //   password: "",
      //   confirmPassword: "",
      // });
      
      setEmail("");
      setSessionId(null);
      setProvider(null);
      
      // ✅ Most beállítjuk az isSubmittingRef-et
      isSubmittingRef.current = true;
      }
      else {
              // Firebase bejelentkezés a tárolt adatokkal
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("../firebase/firebaseApp");
            await signInWithEmailAndPassword(auth, pending2FAEmail, pending2FAPassword);
      
    // setMsg({signIn:true, kijelentkezes: 'Sikeres bejelentkezés!'})

      // ✅ Most beállítjuk az isSubmittingRef-et, hogy a useEffect bezárja a modalt
      isSubmittingRef.current = true;
      
      // // Form reset
      // setFormData({
      //   name: "",
      //   email: "",
      //   password: "",
      //   confirmPassword: "",
      // });
      
      setPending2FAEmail("");
      setPending2FAPassword("");
      
      console.log("✅ 2FA login successful, waiting for auth state change...");
      
      // ⚠️ A modal bezárását az useEffect végzi, amikor a user state megváltozik
      
      }

      
    } catch (error) {
      console.error("❌ Firebase login after 2FA error:", error);
      setMsg({ err: "Hiba történt a bejelentkezés során" });
      setPending2FAEmail("");
      setPending2FAPassword("");
      setEmail("");
      setSessionId(null);
      setProvider(null);
    }
  };

  // ✅ 2FA Modal bezárása
  const handle2FAClose = () => {
    setShow2FAModal(false);
    setPending2FAEmail("");
    setPending2FAPassword(""); // ✅ Töröljük a jelszót
    setLoading(false);
  };

  useEffect(() => {
    if (msg?.katt) {
      switchMode('login')
    }
  }, [msg]);

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  if (!isOpen && !show2FAModal) return null; // ⚠️ NE zárjuk be, ha a 2FA modal nyitva van!

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in"
        onMouseDown={(e) => {
          setMouseDownTarget(e.target);
        }}
        onMouseUp={(e) => {
          // ⚠️ NE zárjuk be, ha a 2FA modal folyamatban van
          if (show2FAModal) {
            setMouseDownTarget(null);
            return;
          }
          
          if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
            onClose();
            setLoading(false)
            console.log("ALMA2324");
          }
          setMouseDownTarget(null);
        }}
      >
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-inKetto"
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: "scale(0.88)",
            background: "linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            // ⚠️ Elrejtjük, ha a 2FA modal látszik
            opacity: show2FAModal ? 0 : 1,
            pointerEvents: show2FAModal ? 'none' : 'auto',
            transition: 'opacity 0.2s ease-out',
          }}
        >
          {/* Close/Back Button */}
          <button
            style={{cursor:'pointer'}}
            onClick={() => {
              // ⚠️ Ha 2FA folyamatban van, ne engedjük bezárni
              if (show2FAModal) {
                return;
              }
              
              if (isForgot) {
                switchMode('login');
                setFormData({...formData, password: '', confirmPassword: ''});
              } else {
                onClose();
                setLoading(false)
                console.log("ALMA2324");
              }
            }}
            className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white"
          >
            {isForgot ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>

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
            {/* FORGOT PASSWORD VIEW */}
            {isForgot ? (
              <>
                {!emailSent ? (
                  <>
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4">
                        <Mail className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-3xl font-black text-white mb-2">
                        Elfelejtett jelszó
                      </h2>
                      <p className="text-gray-400">
                        Add meg az email címedet és küldünk egy visszaállító linket
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="pelda@email.com"
                            className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border ${!isEmailValid && formData.email !== ''
                              ? 'border-red-500/50'
                              : 'border-purple-500/30'
                              } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                          />
                        </div>
                        {!isEmailValid && formData.email !== '' && (
                          <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                            <XCircle className="w-3 h-3" />
                            <span>Érvénytelen email formátum</span>
                          </div>
                        )}
                      </div>
                      {msg?.incorrectResetPwEmail && msg.incorrectResetPwEmail.toLowerCase().includes("invalid-email") && (
                        <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                          <XCircle className="w-3 h-3" />
                          <span>Helytelen email cím</span>
                        </div>
                      )}
                      <button
                        style={{ cursor: (isFormValid && !loading) ? 'pointer' : 'not-allowed' }}
                        type="submit"
                        disabled={!isFormValid || loading}
                        className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                          (isFormValid && !loading)
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105'
                            : 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white/50 cursor-not-allowed'
                        }`}
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Küldés...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-5 h-5" />
                            Visszaállító link küldése
                          </>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6 animate-scale-check">
                      <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">
                      Email elküldve!
                    </h2>
                    <p className="text-gray-400 mb-2">
                      Küldtünk egy jelszó-visszaállító linket a következő címre:
                    </p>
                    <p className="text-purple-400 font-semibold mb-6">
                      <a href={`mailto:${formData.email}`}>{formData.email}</a>
                      <a
                        href={`https://mail.google.com/mail/u/0/#search/from%3A${formData.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: "8px", color: "#2563eb", textDecoration: "underline" }}
                      >
                        Megnyitás Gmail-ben
                      </a>
                    </p>
                    <p className="text-sm text-gray-500 mb-8">
                      Ellenőrizd a spam mappát is, ha nem találod az emailt.
                    </p>
                    <button
                      onClick={() => switchMode('login')}
                      style={{ cursor: 'pointer' }}
                      className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      Vissza a bejelentkezéshez
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* LOGIN / SIGNUP VIEW */
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="relative h-10 mb-2">
                    <h2 
                      className="absolute inset-0 text-3xl font-black text-white transition-all duration-400 ease-out flex items-center justify-center"
                      style={{
                        opacity: isLogin ? 1 : 0,
                        transform: isLogin ? 'translate3d(0, 0, 0)' : 'translate3d(-20px, 0, 0)',
                        willChange: 'opacity, transform',
                      }}
                    >
                      Üdvözlünk!
                    </h2>
                    <h2 
                      className="absolute inset-0 text-3xl font-black text-white transition-all duration-400 ease-out flex items-center justify-center"
                      style={{
                        opacity: isLogin ? 0 : 1,
                        transform: isLogin ? 'translate3d(20px, 0, 0)' : 'translate3d(0, 0, 0)',
                        willChange: 'opacity, transform',
                      }}
                    >
                      Csatlakozz!
                    </h2>
                  </div>
                  
                  <div className="relative h-6">
                    <p 
                      className="absolute inset-0 text-gray-400 transition-all duration-400 ease-out flex items-center justify-center"
                      style={{
                        opacity: isLogin ? 1 : 0,
                        transform: isLogin ? 'translate3d(0, 0, 0)' : 'translate3d(-20px, 0, 0)',
                        willChange: 'opacity, transform',
                      }}
                    >
                      Lépj be a fiókodba
                    </p>
                    <p 
                      className="absolute inset-0 text-gray-400 transition-all duration-400 ease-out flex items-center justify-center"
                      style={{
                        opacity: isLogin ? 0 : 1,
                        transform: isLogin ? 'translate3d(20px, 0, 0)' : 'translate3d(0, 0, 0)',
                        willChange: 'opacity, transform',
                      }}
                    >
                      Hozz létre egy új fiókot
                    </p>
                  </div>
                </div>

                {/* Toggle Tabs */}
                <div className="relative flex gap-2 mb-6 p-1 rounded-2xl bg-white/5 border border-white/10">
                  <div 
                    className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-400 ease-out"
                    style={{
                      left: isLogin ? '4px' : 'calc(50% + 4px)',
                      right: isLogin ? 'calc(50% + 4px)' : '4px',
                      willChange: 'left, right',
                    }}
                  />
                  
                  <button
                    style={{cursor:'pointer'}}
                    onClick={() => switchMode('login')}
                    className={`relative z-10 flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300
                      ${isLogin ? 'text-white' : 'text-gray-400 hover:text-gray-300'}
                    `}
                  >
                    Bejelentkezés
                  </button>
                  <button
                    style={{cursor:'pointer'}}
                    onClick={() => switchMode('signup')}
                    className={`relative z-10 flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300
                      ${!isLogin ? 'text-white' : 'text-gray-400 hover:text-gray-300'}
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
                      maxHeight: isLogin ? '0px' : '128px',
                      opacity: isLogin ? 0 : 1,
                      transform: isLogin ? 'translate3d(0, 24px, 0)' : 'translate3d(0, 0, 0)',
                      willChange: 'max-height, opacity, transform',
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
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        onBlur={() => handleBlur('email')}
                        placeholder="pelda@email.com"
                        className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border ${!isEmailValid && formData.email !== ''
                          ? 'border-red-500/50'
                          : 'border-purple-500/30'
                          } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                      />
                    </div>
                    {!isEmailValid && formData.email !== '' && (
                      <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                        <XCircle className="w-3 h-3" />
                        <span>Érvénytelen email formátum</span>
                      </div>
                    )}
                    
                    {!isLogin && msg?.incorrectSignUp && msg.incorrectSignUp.toLowerCase().includes("invalid-email") && (
                      <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                        <XCircle className="w-3 h-3" />
                        <span>Helytelen email cím</span>
                      </div>
                    )}

                    {msg?.incorrectSignUp && msg.incorrectSignUp.toLowerCase().includes("ez az email cím már regisztrálva van") && (
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
                        onCopy={handlePasswordCopyPaste}
                        onCut={handlePasswordCopyPaste}
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        onBlur={() => handleBlur('password')}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                      <button
                        type="button"
                        style={{cursor:'pointer'}}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    {!isLogin && formData.password !== '' && !isPasswordValid && (
                      <div className="mt-2 space-y-1">
                        <div className={`flex items-center gap-1 text-xs transition-all duration-300 validation-message ${passwordValidation.minLength ? 'text-green-400' : 'text-red-400'}`}>
                          {passwordValidation.minLength ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>Minimum 8 karakter</span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs transition-all duration-300 validation-message ${passwordValidation.hasUpperCase ? 'text-green-400' : 'text-red-400'}`}>
                          {passwordValidation.hasUpperCase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>Legalább egy nagybetű</span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs transition-all duration-300 validation-message ${passwordValidation.hasSpecialChar ? 'text-green-400' : 'text-red-400'}`}>
                          {passwordValidation.hasSpecialChar ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>Legalább egy speciális karakter (!@#$%^&*...)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 🔽 Confirm password – fentről lefelé */}
                  <div
                    className="overflow-hidden transition-all duration-[400ms] ease-out"
                    style={{
                      maxHeight: isLogin ? '0px' : '128px',
                      opacity: isLogin ? 0 : 1,
                      transform: isLogin ? 'translate3d(0, -24px, 0)' : 'translate3d(0, 0, 0)',
                      willChange: 'max-height, opacity, transform',
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
                        onCopy={handlePasswordCopyPaste}
                        onCut={handlePasswordCopyPaste}
                        onPaste={handlePasswordCopyPaste}
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="••••••••"
                        className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border ${touched.confirmPassword && !doPasswordsMatch && formData.confirmPassword !== ''
                          ? 'border-red-500/50'
                          : 'border-purple-500/30'
                          } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                      />
                    </div>
                    {formData.confirmPassword !== '' && !doPasswordsMatch && (
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
                  style={{cursor:'pointer'}}
                    onClick={() => switchMode('forgot')}
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                  >
                    Elfelejtett jelszó?
                  </a>
                </div>
              </div>

                  <button
                    style={{ cursor: (isFormValid && !loading) ? 'pointer' : 'not-allowed' }}
                    type="submit"
                    disabled={!isFormValid || loading}
                    className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden ${
                      (isFormValid && !loading)
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105'
                        : 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white/50 cursor-not-allowed'
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
                            className="absolute inset-0 flex gap-2 items-center justify-center transition-all duration-400 ease-out"
                            style={{
                              opacity: isLogin ? 1 : 0,
                              transform: isLogin ? 'translate3d(0, 0, 0)' : 'translate3d(-20px, 0, 0)',
                              willChange: 'opacity, transform',
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
                              transform: isLogin ? 'translate3d(20px, 0, 0)' : 'translate3d(0, 0, 0)',
                              willChange: 'opacity, transform',
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
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-purple-500/20" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-4 text-xs text-gray-500 font-semibold uppercase tracking-wider" style={{
                        background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
                      }}>
                        Vagy
                      </span>
                    </div>
                  </div>

                  {/* Ultra Premium Google Login Button */}
                  <button
                    onClick={handleGoogleSignIn}
                    type="button"
                    className="google-sign-in-button group"
                  >
                    {/* Glow effect background */}
                    <div className="google-glow"></div>
                    
                    {/* Glass morphism background */}
                    <div className="google-glass"></div>
                    
                    {/* Content */}
                    <div className="google-content">
                      <div className="google-icon-wrapper">
                        <svg className="google-icon" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                      </div>
                      <span className="google-button-text">Folytatás Google-lel</span>
                    </div>
                    
                    {/* Animated border */}
                    <div className="google-border"></div>
                  </button>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* ✅ 2FA Login Modal - MAGASABB Z-INDEX! */}
      <TwoFactorLogin
        isOpen={show2FAModal}
        onClose={handle2FAClose}
        onSuccess={handle2FASuccess}
        email={email || pending2FAEmail}
        sessionId={sessionId}
        provider={provider}
      /> 

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        @keyframes scale-inKetto {
          from { opacity: 0; transform: scale(0.72); }
          to { opacity: 1; transform: scale(0.88); }
        }
        
        .animate-scale-inKetto {
          animation: scale-inKetto 0.3s ease-out;
        }

        @keyframes scale-check {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .animate-scale-check {
          animation: scale-check 0.6s ease-in-out;
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

        /* Ultra Premium Google Sign-In Button - Dark Glassmorphism Theme */
        .google-sign-in-button {
          position: relative;
          width: 100%;
          height: 60px;
          background: transparent;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        /* Animated outer glow effect */
        .google-glow {
          position: absolute;
          inset: -3px;
          background: linear-gradient(
            135deg,
            rgba(168, 85, 247, 0.5),
            rgba(236, 72, 153, 0.4),
            rgba(168, 85, 247, 0.5)
          );
          background-size: 200% 200%;
          border-radius: 17px;
          opacity: 0;
          filter: blur(12px);
          transition: opacity 0.5s ease;
          animation: gradient-shift 4s ease infinite;
        }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .google-sign-in-button:hover .google-glow {
          opacity: 1;
        }

        /* Glassmorphism background layer */
        .google-glass {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.07) 0%,
            rgba(255, 255, 255, 0.03) 100%
          );
          border-radius: 16px;
          backdrop-filter: blur(16px);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .google-sign-in-button:hover .google-glass {
          background: linear-gradient(
            135deg,
            rgba(168, 85, 247, 0.15) 0%,
            rgba(236, 72, 153, 0.1) 100%
          );
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 12px 48px rgba(168, 85, 247, 0.3),
            0 0 0 1px rgba(168, 85, 247, 0.2) inset;
        }

        /* Animated gradient border */
        .google-border {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px;
          background: linear-gradient(
            135deg,
            rgba(168, 85, 247, 0.4),
            rgba(236, 72, 153, 0.3),
            rgba(168, 85, 247, 0.4)
          );
          background-size: 200% 200%;
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          transition: all 0.5s ease;
          animation: border-flow 3s linear infinite;
        }

        @keyframes border-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .google-sign-in-button:hover .google-border {
          background: linear-gradient(
            135deg,
            rgba(168, 85, 247, 0.7),
            rgba(236, 72, 153, 0.6),
            rgba(168, 85, 247, 0.7)
          );
          background-size: 200% 200%;
          padding: 2.5px;
        }

        /* Content container */
        .google-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          height: 100%;
          padding: 0 24px;
        }

        /* Icon with white background and shadow */
        .google-icon-wrapper {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #ffffff, #f0f0f0);
          border-radius: 9px;
          padding: 6px;
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .google-sign-in-button:hover .google-icon-wrapper {
          transform: scale(1.15) rotate(-8deg);
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.3),
            0 0 30px rgba(168, 85, 247, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .google-sign-in-button:active .google-icon-wrapper {
          transform: scale(1.08) rotate(-5deg);
        }

        .google-icon {
          width: 22px;
          height: 22px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
        }

        /* Premium button text with gradient on hover */
        .google-button-text {
          position: relative;
          font-size: 15.5px;
          font-weight: 700;
          letter-spacing: 0.4px;
          color: rgba(255, 255, 255, 0.95);
          text-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(168, 85, 247, 0.2);
          transition: all 0.4s ease;
        }

        .google-sign-in-button:hover .google-button-text {
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            #f0abff 30%,
            #e879f9 60%,
            #ffffff 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: none;
          animation: text-shine 2s linear infinite;
        }

        @keyframes text-shine {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        /* Hover scale effect for entire button */
        .google-sign-in-button:hover {
          transform: translateY(-3px);
        }

        .google-sign-in-button:active {
          transform: translateY(-1px);
        }

        /* Diagonal shine sweep on hover */
        .google-sign-in-button::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(255, 255, 255, 0.15) 40%,
            rgba(255, 255, 255, 0.25) 50%,
            rgba(255, 255, 255, 0.15) 60%,
            transparent
          );
          transform: translateX(-100%) translateY(-100%) rotate(30deg);
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .google-sign-in-button:hover::after {
          transform: translateX(100%) translateY(100%) rotate(30deg);
        }

        /* Ambient light pulse */
        .google-sign-in-button::before {
          content: '';
          position: absolute;
          inset: -20px;
          background: radial-gradient(
            circle at center,
            rgba(168, 85, 247, 0.15) 0%,
            transparent 70%
          );
          opacity: 0;
          transition: opacity 0.6s ease;
          pointer-events: none;
        }

        .google-sign-in-button:hover::before {
          opacity: 1;
          animation: pulse-light 2s ease-in-out infinite;
        }

        @keyframes pulse-light {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}