import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, X } from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase/firebaseApp';

export default function UpdatePassword({ isOpen, onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mouseDownTarget, setMouseDownTarget] = useState(null);

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

  const isFormValid = oldPassword !== '' && isPasswordValid && doPasswordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || verifying) return;

    setVerifying(true);
    setError('');

    try {
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        setError('Nem vagy bejelentkezve');
        setVerifying(false);
        return;
      }

      // Felhasználó újrahitelesítése a régi jelszóval
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      
      try {
        await reauthenticateWithCredential(user, credential);
      } catch (reauthError) {
        console.error('Reauthentication error:', reauthError);
        if (reauthError.code === 'auth/wrong-password' || reauthError.code === 'auth/invalid-credential') {
          setError('A megadott régi jelszó hibás');
        } else if (reauthError.code === 'auth/too-many-requests') {
          setError('Túl sok sikertelen próbálkozás. Próbáld újra később.');
        } else {
          setError('Hitelesítési hiba történt');
        }
        setVerifying(false);
        return;
      }

      // Ha a régi jelszó helyes, új jelszó beállítása
      await updatePassword(user, newPassword);
      setSuccess(true);
      
      // 1.5 másodperc múlva bezárás és reset
      setTimeout(() => {
        onClose();
        // Reset form
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess(false);
        setError('');
      }, 1500);
    } catch (err) {
      console.error('Password update error:', err);
      if (err.code === 'auth/weak-password') {
        setError('A jelszó túl gyenge');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('A művelethez újra be kell jelentkezned');
      } else {
        setError('Hiba történt a jelszó megváltoztatása során');
      }
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
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
            transform: "scale(0.8)",
            background: "linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
          }}
        >
          {/* Close Button */}
          <button
            style={{cursor:'pointer'}}
            onClick={onClose}
            className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 p-8">
            {!success ? (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2">
                    Jelszó megváltoztatása
                  </h2>
                  <p className="text-gray-400">
                    Add meg a jelenlegi és az új jelszavadat
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Régi jelszó */}
                  <div>
                    <label className="block text-sm font-semibold text-purple-300 mb-2">
                      Jelenlegi jelszó
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-xl bg-black/40 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                        autoFocus
                      />
                      <button
                        type="button"
                        style={{cursor:'pointer'}}
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors z-10"
                      >
                        {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Új jelszó */}
                  <div>
                    <label className="block text-sm font-semibold text-purple-300 mb-2">
                      Új jelszó
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 rounded-xl bg-black/40 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                      <button
                        type="button"
                        style={{cursor:'pointer'}}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors z-10"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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

                  {/* Jelszó megerősítése */}
                  <div>
                    <label className="block text-sm font-semibold text-purple-300 mb-2">
                      Új jelszó megerősítése
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
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
                  Bezárás...
                </p>
              </div>
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