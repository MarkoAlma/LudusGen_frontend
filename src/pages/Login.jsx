import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, X, Sparkles, Chrome, Github, Apple, CheckCircle2, XCircle } from 'lucide-react';
import { useContext } from 'react';
import { MyUserContext } from '../context/MyUserProvider';

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [mouseDownTarget, setMouseDownTarget] = useState(null);
  const { isAuthOpen } = useContext(MyUserContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(null);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false
  });

  const { signUpUser, signInUser, msg } = useContext(MyUserContext);

  // Email validáció
  const isEmailValid = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Jelszó validációs szabályok
  const passwordValidation = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  };

  const isPasswordValid = passwordValidation.minLength && 
                          passwordValidation.hasUpperCase && 
                          passwordValidation.hasSpecialChar;

  const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';

  // Form validáció
  const isFormValid = () => {
    if (isLogin) {
      // Bejelentkezésnél csak email és jelszó kell
      return formData.email !== '' && formData.password !== '' && isEmailValid(formData.email);
    } else {
      // Regisztrációnál minden mező kell + validációk
      return (
        formData.name !== '' &&
        formData.email !== '' &&
        isEmailValid(formData.email) &&
        formData.password !== '' &&
        isPasswordValid &&
        formData.confirmPassword !== '' &&
        doPasswordsMatch
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return; // Ne küldje el ha nem valid
    
    if (!isLogin) {
      setLoading(true);
      await signUpUser(formData.email, formData.password, formData.name, setLoading);
    } else {
      await signInUser(formData.email, formData.password);
    }
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in `}
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
          className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}
        >
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 z-50 p-2 rounded-full cursor-pointer bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">
                {isLogin ? 'Üdvözlünk!' : 'Csatlakozz!'}
              </h2>
              <p className="text-gray-400">
                {isLogin ? 'Lépj be a fiókodba' : 'Hozz létre egy új fiókot'}
              </p>
            </div>

            {/* Toggle Tabs */}
            <div className="flex gap-2 mb-6 p-1 rounded-2xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                style={{ cursor: 'pointer' }}
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${isLogin
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300'
                  }`}
              >
                Bejelentkezés
              </button>
              <button
                style={{ cursor: 'pointer' }}
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${!isLogin
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300'
                  }`}
              >
                Regisztráció
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field (Register only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-purple-300 mb-2">
                    Teljes név
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Kovács János"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  Email cím
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onBlur={() => handleBlur('email')}
                    placeholder="pelda@email.com"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border ${touched.email && !isEmailValid(formData.email) && formData.email !== ''
                      ? 'border-red-500/50'
                      : 'border-purple-500/30'
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                  />
                </div>
                {touched.email && !isEmailValid(formData.email) && formData.email !== '' && (
                  <div className="flex items-center gap-1 mt-2 text-red-400 text-xs validation-message">
                    <XCircle className="w-3 h-3" />
                    <span>Érvénytelen email formátum</span>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  Jelszó
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onBlur={() => handleBlur('password')}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isLogin && formData.password !== '' && (
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

              {/* Confirm Password (Register only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-purple-300 mb-2">
                    Jelszó megerősítése
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border ${touched.confirmPassword && !doPasswordsMatch && formData.confirmPassword !== ''
                        ? 'border-red-500/50'
                        : 'border-purple-500/30'
                        } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                    />
                  </div>
                  {formData.confirmPassword !== '' && (
                    <div className={`flex items-center gap-1 mt-2 text-xs transition-all duration-300 validation-message ${doPasswordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                      {doPasswordsMatch ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{doPasswordsMatch ? 'A jelszavak egyeznek' : 'A jelszavak nem egyeznek'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Remember Me / Forgot Password */}
              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-2 border-purple-500/50 bg-black/30 text-purple-600 focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                    />
                    <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
                      Maradjak bejelentkezve
                    </span>
                  </label>
                  <a href="#" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                    Elfelejtett jelszó?
                  </a>
                </div>
              )}

              {/* Submit Button */}
              <button
                style={{ cursor: isFormValid() ? 'pointer' : 'not-allowed' }}
                type="submit"
                disabled={!isFormValid()}
                className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                  isFormValid()
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105'
                    : 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white/50 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                {isLogin ? 'Bejelentkezés' : 'Regisztráció'}
              </button>

              {/* Divider */}
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

              {/* Social Login Buttons */}
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

            {/* Terms */}
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
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
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
      `}</style>
    </>
  );
}