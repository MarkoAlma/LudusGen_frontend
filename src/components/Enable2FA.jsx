import { useEffect, useState } from "react";
import axios from "axios";
import { Shield, Smartphone, Key, Check, X, Sparkles, Copy, Download, AlertTriangle } from "lucide-react";

export default function Enable2FA({ isOpen, onClose }) {
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [mouseDownTarget, setMouseDownTarget] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQr();
    }
  }, [isOpen]);

  const fetchQr = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("http://localhost:3001/api/setup-mfa");
      setQr(res.data.qr);
      setSecret(res.data.secret);
      setBackupCodes(res.data.backupCodes || []);
    } catch (err) {
      console.error("QR fetch error:", err);
      setError("Hiba történt a QR kód betöltése során");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;

    try {
      setVerifying(true);
      setError(null);
      
      const res = await axios.post("http://localhost:3001/api/verify-mfa", { 
        code 
      });
      
      if (res.data.success) {
        setSuccess(true);
        setShowBackupCodes(true);
      }
    } catch (err) {
      console.error("Verify error:", err);
      setError(err.response?.data?.message || "Érvénytelen kód. Próbáld újra!");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const text = `MyApp - 2FA Visszaállítási Kódok\n\n${backupCodes.join('\n')}\n\nFigyelem: Ezeket a kódokat biztonságos helyen tárold!\nMinden kód csak egyszer használható.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    // Reset all states
    setQr(null);
    setSecret("");
    setBackupCodes([]);
    setCode("");
    setSuccess(false);
    setShowBackupCodes(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in"
        onMouseDown={(e) => setMouseDownTarget(e.target)}
        onMouseUp={(e) => {
          if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
            if (!showBackupCodes) {
              onClose();
            }
          }
          setMouseDownTarget(null);
        }}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-inKetto max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: "scale(0.8)",
            background: "linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
          }}
        >
          {/* Close Button */}
          {!showBackupCodes && (
            <button
              style={{ cursor: "pointer" }}
              onClick={onClose}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}

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
                Védd meg a fiókodat egy extra biztonsági réteggel
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-gray-400">QR kód betöltése...</p>
              </div>
            )}

            {/* Error State (initial load) */}
            {!loading && error && !qr && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchQr}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
                >
                  Újrapróbálkozás
                </button>
              </div>
            )}

            {/* Backup Codes Display */}
            {!loading && showBackupCodes && success && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4 animate-scale-check">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Sikeres aktiválás!</h3>
                  <p className="text-gray-400">A 2FA sikeresen be lett kapcsolva</p>
                </div>

                {/* Warning Box */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-200 font-semibold mb-1">
                        Fontos: Mentsd el a visszaállítási kódokat!
                      </p>
                      <p className="text-xs text-amber-300/80">
                        Ezekkel tudsz bejelentkezni, ha nincs hozzáférésed az autentikátor alkalmazásodhoz.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Backup Codes */}
                <div>
                  <h4 className="text-white font-semibold mb-3 text-center">Visszaállítási Kódok</h4>
                  <div className="grid grid-cols-2 gap-2 p-4 bg-black/30 rounded-xl border border-purple-500/20">
                    {backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 bg-purple-600/10 rounded-lg text-center font-mono text-sm text-purple-300 border border-purple-500/20"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleDownloadBackupCodes}
                    className="w-full py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Kódok letöltése (.txt)
                  </button>

                  <button
                    onClick={handleFinish}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Kész, bezárás
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Minden visszaállítási kód csak egyszer használható fel
                </p>
              </div>
            )}

            {/* Setup Steps */}
            {!loading && !showBackupCodes && qr && (
              <div className="space-y-6">
                {/* Steps */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Telepítsd az alkalmazást</h3>
                      <p className="text-gray-400 text-sm">
                        Töltsd le a Google Authenticator, Authy vagy hasonló alkalmazást
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-3">Szkenneld be a QR kódot</h3>
                      <div className="flex justify-center p-4 bg-white rounded-xl mb-3">
                        <img src={qr} alt="2FA QR Code" className="w-48 h-48" />
                      </div>
                      
                      {/* Manual Entry Option */}
                      <details className="group">
                        <summary className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer list-none flex items-center gap-2">
                          <span>Vagy add meg manuálisan a kódot</span>
                          <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="mt-3 p-3 bg-black/30 rounded-xl border border-purple-500/20">
                          <p className="text-xs text-gray-400 mb-2">Secret key:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-black/50 rounded-lg text-purple-300 text-sm font-mono break-all">
                              {secret}
                            </code>
                            <button
                              onClick={handleCopySecret}
                              className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 transition"
                              title="Másolás"
                            >
                              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Add meg a 6 jegyű kódot</h3>
                      <form onSubmit={handleVerify}>
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
                            className={`w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border ${
                              error ? "border-red-500/50 animate-shake" : "border-purple-500/30"
                            } text-white text-center text-xl tracking-widest placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all`}
                          />
                        </div>

                        {error && (
                          <div className="flex items-center gap-1 mt-2 text-red-400 text-xs animate-fadeIn">
                            <X className="w-3 h-3" />
                            <span>{error}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={code.length !== 6 || verifying}
                          style={{
                            cursor: code.length === 6 && !verifying ? "pointer" : "not-allowed",
                          }}
                          className={`w-full mt-4 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                            code.length === 6 && !verifying
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
                              : "bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white/50 cursor-not-allowed"
                          }`}
                        >
                          {verifying ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Ellenőrzés...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5" />
                              <span>Aktiválás</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Info box */}
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex gap-3">
                    <Smartphone className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold text-white">Tipp:</span> Az aktiválás után visszaállítási kódokat kapsz, amelyekkel bejelentkezhetsz, ha elveszíted a telefonodat.
                      </p>
                    </div>
                  </div>
                </div>
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

        @keyframes scale-check {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .animate-scale-check {
          animation: scale-check 0.6s ease-in-out;
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