import { useState, useEffect } from "react";
import { Shield, Key, X, Sparkles, AlertCircle } from "lucide-react";
import axios from "axios";

export default function TwoFactorLogin({ isOpen, onClose, onSuccess, email }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mouseDownTarget, setMouseDownTarget] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCode("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;

    try {
      setLoading(true);
      setError(null);

      const res = await axios.post("http://localhost:3001/api/login-with-2fa", {
        code,
      });

      if (res.data.success) {
        // Sikeres 2FA validáció - meghívjuk az onSuccess callback-et
        // A Firebase bejelentkezést a Login komponens fogja kezelni
        onSuccess();
      }
    } catch (err) {
      console.error("2FA login error:", err);
      setError(err.response?.data?.message || "Érvénytelen kód. Próbáld újra!");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleUseBackupCode = () => {
    // Egyszerű prompt backup kódhoz (később lehet finomítani)
    const backupCode = prompt("Add meg a visszaállítási kódot:");
    if (!backupCode) return;

    setCode(backupCode);
    // Auto submit
    handleSubmitWithCode(backupCode);
  };

  const handleSubmitWithCode = async (codeValue) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.post("http://localhost:3001/api/login-with-2fa", {
        code: codeValue,
      });

      if (res.data.success) {
        onSuccess();
      }
    } catch (err) {
      setError("Érvénytelen visszaállítási kód");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
        onMouseDown={(e) => setMouseDownTarget(e.target)}
        onMouseUp={(e) => {
          if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
            onClose();
          }
          setMouseDownTarget(null);
        }}
      >
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-3xl font-black text-white mb-2">
                Kéttényezős Azonosítás
              </h2>
              <p className="text-gray-400">
                Add meg az autentikátor alkalmazásodban látható 6 jegyű kódot
              </p>
            </div>

            {/* User Info */}
            <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 text-sm text-purple-300">
                <AlertCircle className="w-4 h-4" />
                <span>Bejelentkezés: <span className="font-semibold text-white">{email}</span></span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-purple-300 mb-3">
                  6 jegyű biztonsági kód
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Key className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setCode(val);
                      setError(null);
                    }}
                    placeholder="123456"
                    maxLength={6}
                    autoComplete="off"
                    autoFocus
                    className={`w-full pl-12 pr-4 py-4 rounded-xl bg-black/30 border ${
                      error ? "border-red-500/50 animate-shake" : "border-purple-500/30"
                    } text-white text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-1 mt-3 text-red-400 text-sm animate-fadeIn">
                    <X className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={code.length !== 6 || loading}
                style={{
                  cursor: code.length === 6 && !loading ? "pointer" : "not-allowed",
                }}
                className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                  code.length === 6 && !loading
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
                    : "bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white/50 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Ellenőrzés...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Bejelentkezés</span>
                  </>
                )}
              </button>

              {/* Backup Code Link */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleUseBackupCode}
                  className="text-sm text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                >
                  Visszaállítási kód használata
                </button>
              </div>
            </form>

            {/* Help Text */}
            <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-gray-400 text-center">
                Nyisd meg az autentikátor alkalmazásodat (Google Authenticator, Authy, stb.) 
                és írd be a 6 jegyű kódot.
              </p>
            </div>
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
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
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
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}