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
import axios from "axios";
import { API_BASE } from "../api/client";
import TwoFactorLogin from "../components/TwoFactorLogin";
import AuthShell from '../components/auth/AuthShell';
import AuthTabs from '../components/auth/AuthTabs';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PasswordStrength from '../components/auth/PasswordStrength';
import OAuthButtons from '../components/auth/OAuthButtons';

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
    }else{
      setMode("login")
    }
  },[isOpen])

  useEffect(()=>{
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  },[mode])


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
    if (msg?.incorrectSignUp!=null) {
      setMsg({ incorrectSignUp: null });
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
        // await resetPassword(formData.email);

        await axios.post(`${API_BASE}/api/forgot-password`, {
          email: formData.email
        });

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
      setIsAuthOpen(false)
    }
  }, [msg]);

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  if (!isOpen && !show2FAModal) return null; // ⚠️ NE zárjuk be, ha a 2FA modal nyitva van!

  return (
    <>
      <AuthShell isOpen={isOpen || show2FAModal} onClose={() => { if (!show2FAModal) { onClose(); setLoading(false); } }}>
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
          
          <TwoFactorLogin
            isOpen={show2FAModal}
            onClose={handle2FAClose}
            onSuccess={handle2FASuccess}
            email={email || pending2FAEmail}
            sessionId={sessionId}
            provider={provider}
          /> 

          {!show2FAModal && (
            <>
              {isForgot ? (
                <>
                  {!emailSent ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                         <button type="button" onClick={() => { switchMode('login'); setFormData({...formData, password: '', confirmPassword: ''}); }} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
                           <ArrowLeft size={20} />
                         </button>
                         <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Forgot Password</h2>
                      </div>
                      <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>Enter your email to receive a reset link.</p>
                      
                      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Input
                          label="Email Address"
                          icon={Mail}
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="hello@example.com"
                          error={(!isEmailValid && formData.email !== '') || (msg?.incorrectSignUp && msg.incorrectSignUp.includes('email')) ? 'Invalid email address' : null}
                        />
                        <Button type="submit" variant="primary" size="lg" disabled={!isFormValid || loading} loading={loading} style={{ width: '100%', marginTop: '8px' }}>
                          Send Reset Link
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', marginBottom: '8px' }}>
                        <CheckCircle2 size={32} />
                      </div>
                      <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Email Sent!</h2>
                      <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>
                        We sent a password reset link to <br/> <strong style={{ color: '#F9FAFB' }}>{formData.email}</strong>
                      </p>
                      <Button style={{ width: '100%', marginTop: '16px' }} variant="subtle" size="lg" onClick={() => switchMode('login')}>
                        Back to login
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <AuthTabs activeTab={mode} onTabChange={switchMode} />

                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {!isLogin && (
                      <Input
                        label="Full Name"
                        icon={User}
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    )}

                    <Input
                      label="Email Address"
                      icon={Mail}
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onBlur={() => handleBlur('email')}
                      placeholder="hello@example.com"
                      error={(!isEmailValid && formData.email !== '') ? 'Invalid email address' : msg?.incorrectSignUp && msg.incorrectSignUp.includes('email') ? 'Email already in use' : null}
                    />

                    <div>
                      <Input
                        label="Password"
                        icon={Lock}
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        onBlur={() => handleBlur('password')}
                        placeholder="••••••••"
                        suffix={() => (
                           <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
                             {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                           </button>
                        )}
                        error={isLogin && msg?.incorrectSignIn ? 'Incorrect email or password' : null}
                      />
                      {!isLogin && formData.password !== '' && !isPasswordValid && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '12px' }}>
                           <span style={{ color: passwordValidation.minLength ? '#10B981' : '#EF4444' }}>• Minimum 8 characters</span>
                           <span style={{ color: passwordValidation.hasUpperCase ? '#10B981' : '#EF4444' }}>• At least one uppercase letter</span>
                           <span style={{ color: passwordValidation.hasSpecialChar ? '#10B981' : '#EF4444' }}>• At least one special character</span>
                        </div>
                      )}
                      {!isLogin && formData.password !== '' && isPasswordValid && (
                        <PasswordStrength password={formData.password} />
                      )}
                    </div>

                    {!isLogin && (
                      <Input
                        label="Confirm Password"
                        icon={Lock}
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="••••••••"
                        error={touched.confirmPassword && !doPasswordsMatch && formData.confirmPassword !== '' ? 'Passwords do not match' : null}
                      />
                    )}

                    {isLogin && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" id="remember" style={{ cursor: 'pointer' }} />
                          <label htmlFor="remember" style={{ fontSize: '14px', color: '#9CA3AF', cursor: 'pointer' }}>Remember me</label>
                        </div>
                        <button type="button" onClick={() => switchMode('forgot')} style={{ background: 'transparent', border: 'none', color: '#3B82F6', fontSize: '14px', cursor: 'pointer', padding: 0 }}>
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <Button type="submit" variant="primary" size="lg" disabled={!isFormValid || loading} loading={loading} style={{ width: '100%', marginTop: '8px' }}>
                      {isLogin ? 'Log In' : 'Create Account'}
                    </Button>
                  </form>

                  <OAuthButtons onGoogleSignIn={handleGoogleSignIn} disabled={loading} />
                  
                  {!isLogin && (
                    <p style={{ textAlign: 'center', fontSize: '12px', color: '#9CA3AF', marginTop: '16px' }}>
                      By registering, you agree to our <a href="#" style={{ color: '#3B82F6', textDecoration: 'none' }}>Terms</a> and <a href="#" style={{ color: '#3B82F6', textDecoration: 'none' }}>Privacy Policy</a>.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </AuthShell>
    </>
  );
}