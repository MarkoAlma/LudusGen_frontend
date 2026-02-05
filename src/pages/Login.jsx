import React, { useState, useMemo } from 'react';
import { Mail, Lock, User, Eye, EyeOff, X, Sparkles, Chrome, Github, Apple, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { useContext } from 'react';
import { MyUserContext } from '../context/MyUserProvider';
import { IoCheckmarkDoneOutline } from 'react-icons/io5';
import { FaCheck } from 'react-icons/fa';
import { useEffect, useRef } from 'react';

export default function Login({ isOpen, onClose }) {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [isSwitching, setIsSwitching] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mouseDownTarget, setMouseDownTarget] = useState(null);
  const [emailKikuldese, setEmailKikuldese] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false
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

  const { signUpUser, signInUser, msg, user, setMsg, resetPassword } = useContext(MyUserContext);

  useEffect(() => {
  console.log("msg változott:", msg);
  if (mode == "forgot" && emailKikuldese){
  if (!msg?.incorrectResetPwEmail) {
          setEmailSent(true);}
        }
  console.log(emailKikuldese);
  
}, [msg, emailKikuldese]);

  
  const prevUserRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const savedNameRef = useRef('');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(formData.email);

  const passwordValidation = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /\p{Lu}/u.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  };

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUpperCase &&
    passwordValidation.hasSpecialChar;

  const doPasswordsMatch =
    formData.password === formData.confirmPassword &&
    formData.confirmPassword !== '';

  const isFormValid = mode === 'login'
    ? (formData.email !== '' && formData.password !== '' && isEmailValid)
    : mode === 'signup'
    ? (formData.name !== '' && formData.email !== '' && isEmailValid && formData.password !== '' && isPasswordValid && formData.confirmPassword !== '' && doPasswordsMatch)
    : (formData.email !== '' && isEmailValid); // forgot password

  useEffect(() => {
    if (isSubmittingRef.current && user && prevUserRef.current !== user) {
      isSubmittingRef.current = false;
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      savedNameRef.current = '';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || loading) return;
    
    setLoading(true);

    if (mode === 'forgot') {
      try {
      console.log("FORGOT HANDLER START");
      await resetPassword(formData.email);
      console.log("Alma1222");

        // setMsg({alma:"ALMALAML"})
       
        setEmailKikuldese(true)
        // if (!msg?.incorrectResetPwEmail && !msg?.incorrectResetPwEmail?.toLowerCase().includes("invalid-email")) {
        //   setEmailSent(true);
        // }
      } catch (error) {
        setMsg({err: error.message});
      } finally {
        setLoading(false);
      }
      return;
    }

    isSubmittingRef.current = true;
    
    try {
      if (mode === 'signup') {
        savedNameRef.current = formData.name;
        await signUpUser(formData.email, formData.password, formData.name, setLoading);
      } else {
        savedNameRef.current = '';
        await signInUser(formData.email, formData.password);
      }
    } catch (error) {
      isSubmittingRef.current = false;
      setMsg({err:"HIBA"})
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{
    if (msg?.katt) {
      switchMode('login')
    }
  },[msg])

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in"
        onMouseDown={(e) => {
          setMouseDownTarget(e.target);
        }}
        onMouseUp={(e) => {
          if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
            onClose();
          }
          setMouseDownTarget(null);
        }}
      >
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-inKetto"
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: 'scale(0.8)',
            background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
        >
          {/* Close/Back Button */}
          <button
            style={{cursor:'pointer'}}
            onClick={() => {
              if (isForgot) {
                switchMode('login');
                setFormData({...formData, password: '', confirmPassword: ''});
              } else {
                onClose();
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
                ${isSwitching
                  ? 'scale-100 opacity-100 -translate-x-1/2 -translate-y-1/2'
                  : 'scale-50 opacity-0 -translate-x-1/2 -translate-y-1/2'
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

                    {!isLogin && msg?.incorrectSignUp && msg.incorrectSignUp.toLowerCase().includes("email-already-in-use") && (
                      <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                        <XCircle className="w-3 h-3" />
                        <span>Az email cím már használatban van</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-purple-300 mb-2">
                      Jelszó
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
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
                    
                    {isLogin && msg?.incorrectSignIn && (
                      <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                        <XCircle className="w-3 h-3" />
                        <span>Hibás email/jelszó páros</span>
                      </div>
                    )}

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

                  {isLogin && (
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-3 cursor-pointer select-none group">
                        <input type="checkbox" className="peer hidden" />
                        <div className="w-6 h-6 rounded-md border border-purple-500/40 bg-black/40 flex items-center justify-center transition-all duration-200 ease-out group-hover:border-purple-400 p-1 peer-checked:bg-purple-600/80 peer-checked:border-purple-400 peer-checked:shadow-[0_0_6px_rgba(168,85,247,0.35)] peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100">
                          <FaCheck className="w-4 h-4 text-white opacity-0 scale-75 transition-all duration-200 ease-out" />
                        </div>
                        <span className="text-gray-400 group-hover:text-gray-300 transition-colors text-sm">
                          Maradjak bejelentkezve
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        style={{cursor:'pointer'}}
                        className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                      >
                        Elfelejtett jelszó?
                      </button>
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
                        <span>Feldolgozás...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        {isLogin ? 'Bejelentkezés' : 'Regisztráció'}
                      </>
                    )}
                  </button>

                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-purple-500/20" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 text-xs text-gray-500 font-semibold" style={{
                        background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
                      }}>
                        vagy folytatás ezekkel
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'Google', icon: <Chrome className="w-5 h-5" /> },
                      { name: 'GitHub', icon: <Github className="w-5 h-5" /> },
                      { name: 'Apple', icon: <Apple className="w-5 h-5" /> }
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

                {!isLogin && (
                  <p className="mt-5 text-center text-xs text-gray-500">
                    A regisztrációval elfogadod az{' '}
                    <a href="#" className="text-purple-400 hover:text-purple-300 font-semibold">
                      ÁSZF-et
                    </a>{' '}
                    és az{' '}
                    <a href="#" className="text-purple-400 hover:text-purple-300 font-semibold">
                      Adatvédelmi Nyilatkozatot
                    </a>
                    .
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
          to { opacity: 1; transform: scale(0.8); }
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
      `}</style>
    </>
  );
}