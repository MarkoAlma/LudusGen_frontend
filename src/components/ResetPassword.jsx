import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase/firebaseApp';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
    const [searchParams, setSearchParams] = useSearchParams();
  const [oobCode, setOobCode] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();


  // ✅ Másolás/Beillesztés megakadályozása a jelszó mezőbe
  const handlePasswordCopyPaste = (e) => {
    e.preventDefault();
    return false;
  };

  // Jelszó validáció
  const passwordValidation = {
    minLength: newPassword.length >= 8,
    hasUpperCase: /\p{Lu}/u.test(newPassword),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  };

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUpperCase &&
    passwordValidation.hasSpecialChar;

  const doPasswordsMatch = 
    newPassword !== '' && 
    confirmPassword !== '' && 
    newPassword === confirmPassword;

  const isFormValid = isPasswordValid && doPasswordsMatch;

useEffect(() => {
  const code = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  console.log('URL params:', { mode, code: code ? 'exists' : 'missing' });

  // ✅ Ha nincs code, NE próbáld meg törölni a paramétereket
  if (!code) {
    // Csak akkor jelezz hibát, ha az oobCode state is üres (első betöltés)
    if (!oobCode) {
      setError('Érvénytelen vagy lejárt link');
      setLoading(false);
    }
    return;
  }

  if (mode !== 'resetPassword') {
    setError('Érvénytelen vagy lejárt link');
    setLoading(false);
    return;
  }

  // ✅ CSAK AKKOR mentsd el, ha még nincs
  if (!oobCode) {
    setOobCode(code);
    
    // ✅ Paraméterek törlése UTÁN, hogy a verifyPasswordResetCode futhasson
    setSearchParams({});

    // Kód ellenőrzése és email lekérése
    verifyPasswordResetCode(auth, code)
      .then((emailAddress) => {
        console.log('Email verified:', emailAddress);
        setEmail(emailAddress);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Verification error:', err);
        if (err.code === 'auth/expired-action-code') {
          setError('A link lejárt. Kérj új jelszó-visszaállító emailt.');
        } else if (err.code === 'auth/invalid-action-code') {
          setError('Érvénytelen link. Lehet, hogy már használtad.');
        } else {
          setError('Hiba történt a link ellenőrzése során.');
        }
        setLoading(false);
      });
  }
}, [searchParams, setSearchParams, oobCode]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || verifying) return;

    setVerifying(true);
    setError('');

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      
      // 3 másodperc múlva átirányítás a főoldalra
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/weak-password') {
        setError('A jelszó túl gyenge');
      } else if (err.code === 'auth/expired-action-code') {
        setError('A link lejárt');
      } else {
        setError('Hiba történt a jelszó visszaállítása során');
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
      }}>
        <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
      }}>
        <div className="w-full max-w-md rounded-3xl p-8 text-center" style={{
          background: 'rgba(26, 26, 46, 0.8)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Hiba történt</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            style={{cursor: 'pointer'}}
            className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
          >
            Vissza a főoldalra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
    }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl" style={{
        background: 'rgba(26, 26, 46, 0.8)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <div className="p-8">
          {!success ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">
                  Új jelszó beállítása
                </h2>
                <p className="text-gray-400 mb-2">
                  Fiók: <span className="text-purple-400 font-semibold">{email}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-purple-300 mb-2">
                    Új jelszó
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      onCopy={handlePasswordCopyPaste}
                      onCut={handlePasswordCopyPaste}
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3 rounded-xl bg-black/40 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                      autoFocus
                    />
                    <button
                      type="button"
                      style={{cursor:'pointer'}}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {newPassword !== '' && !isPasswordValid && (
                    <div className="mt-2 space-y-1 validation-message">
                      <div className={`flex items-center gap-1 text-xs transition-all duration-300 ${passwordValidation.minLength ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordValidation.minLength ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>Minimum 8 karakter</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs transition-all duration-300 ${passwordValidation.hasUpperCase ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordValidation.hasUpperCase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>Legalább egy nagybetű</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs transition-all duration-300 ${passwordValidation.hasSpecialChar ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordValidation.hasSpecialChar ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>Legalább egy speciális karakter (!@#$%^&*...)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-300 mb-2">
                    Jelszó megerősítése
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                        onCopy={handlePasswordCopyPaste}
                        onCut={handlePasswordCopyPaste}
                        onPaste={handlePasswordCopyPaste}
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/40 border ${
                        confirmPassword !== '' && !doPasswordsMatch
                          ? 'border-red-500/50'
                          : 'border-purple-500/30'
                      } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                    />
                  </div>
                  {confirmPassword !== '' && !doPasswordsMatch && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-red-400 validation-message">
                      <XCircle className="w-3 h-3" />
                      <span>A jelszavak nem egyeznek</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 validation-message">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isFormValid || verifying}
                  style={{ cursor: (isFormValid && !verifying) ? 'pointer' : 'not-allowed' }}
                  className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                    (isFormValid && !verifying)
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105'
                      : 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white/50 cursor-not-allowed'
                  }`}
                >
                  {verifying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mentés...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Jelszó mentése
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
                Sikeres mentés!
              </h2>
              <p className="text-gray-400 mb-2">
                A jelszavad sikeresen megváltozott.
              </p>
              <p className="text-sm text-gray-500">
                Átirányítás a főoldalra...
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
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
    </div>
  );
}