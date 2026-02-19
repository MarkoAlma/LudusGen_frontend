import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { Shield, Smartphone, Key, Check, X, Sparkles, Copy, Download, AlertTriangle } from "lucide-react";
import { MyUserContext } from "../context/MyUserProvider";
import { auth } from "../firebase/firebaseApp";

export default function Enable2FA({ isOpen, onClose }) {
  const { user, refresh2FAStatus } = useContext(MyUserContext);
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
    if (isOpen && user) {
      fetchQr();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, user]);

 const getAuthHeaders = async () => {
  const token = await auth.currentUser.getIdToken(); // Firebase Auth instance → OK
  return { Authorization: `Bearer ${token}` };
};

  const fetchQr = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = await getAuthHeaders();
      const res = await axios.get("http://localhost:3001/api/setup-mfa", { headers });
      
      console.log('📥 QR Setup Response:', res.data);
      
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
    
    // Debug információk
    console.log('🔐 Verifying 2FA Code:');
    console.log('Code:', code);
    console.log('Code type:', typeof code);
    console.log('Code length:', code.length);
    console.log('Secret:', secret);
    
    if (code.length !== 6) {
      console.warn('❌ Invalid code length:', code.length);
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      
      const headers = await getAuthHeaders();
      
      // Küldd el a kódot string-ként
      const payload = { 
        code: code.toString().trim() 
      };
      
      console.log('📤 Sending payload:', payload);
      
      const res = await axios.post(
        "http://localhost:3001/api/verify-mfa", 
        payload,
        { headers }
      );
      
      console.log('✅ Verification response:', res.data);
      
      if (res.data.success) {
        setSuccess(true);
        setShowBackupCodes(true);
        
        // Frissítsd a 2FA státuszt a Context-ben
        await refresh2FAStatus();
      }
    } catch (err) {
      console.error("❌ Verify error:", err);
      console.error("Error response:", err.response?.data);
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
    const text = `LudusGen - 2FA Visszaállítási Kódok\n\n${backupCodes.join('\n')}\n\nFigyelem: Ezeket a kódokat biztonságos helyen tárold!\nMinden kód csak egyszer használható.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
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
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
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
          className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1e 100%)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.25)",
            maxHeight: "95vh",
          }}
        >
          {/* Close Button */}
          {!showBackupCodes && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all duration-200 text-gray-400 hover:text-white group"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[95vh] custom-scrollbar">
            <div className="relative z-10 p-8">
              {/* Logo & Title */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4 shadow-lg shadow-purple-500/30">
                  <Shield className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-3xl font-black text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Kétlépcsős Azonosítás
                </h2>
                <p className="text-gray-400 text-sm">
                  Védd meg a fiókodat egy extra biztonsági réteggel
                </p>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
                  <p className="text-gray-400 text-sm">QR kód betöltése...</p>
                </div>
              )}

              {/* Error State */}
              {!loading && error && !qr && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={fetchQr}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30"
                  >
                    Újrapróbálkozás
                  </button>
                </div>
              )}

              {/* Backup Codes Display */}
              {!loading && showBackupCodes && success && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4 animate-scale-check">
                      <Check className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Sikeres aktiválás!</h3>
                    <p className="text-gray-400 text-sm">A 2FA sikeresen be lett kapcsolva</p>
                  </div>

                  {/* Warning Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
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
                    <h4 className="text-white font-semibold mb-3 text-center text-sm">Visszaállítási Kódok</h4>
                    <div className="grid grid-cols-2 gap-2 p-4 bg-black/30 rounded-xl border border-purple-500/20">
                      {backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="px-3 py-2.5 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-lg text-center font-mono text-sm text-purple-300 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={handleDownloadBackupCodes}
                      className="w-full py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Kódok letöltése (.txt)
                    </button>

                    <button
                      onClick={handleFinish}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      Kész, bezárás
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 text-center pt-1">
                    Minden visszaállítási kód csak egyszer használható fel
                  </p>
                </div>
              )}

              {/* Setup Steps */}
              {!loading && !showBackupCodes && qr && (
                <div className="space-y-5">
                  {/* Steps */}
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1 text-sm">Telepítsd az alkalmazást</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          Töltsd le a Google Authenticator, Authy vagy hasonló alkalmazást
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                        2
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-3 text-sm">Szkenneld be a QR kódot</h3>
                        <div className="flex justify-center p-3 bg-white rounded-xl mb-3 shadow-lg">
                          <img src={qr} alt="2FA QR Code" className="w-40 h-40" />
                        </div>
                        
                        {/* Manual Entry Option */}
                        <details className="group">
                          <summary className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer list-none flex items-center gap-2 transition-colors">
                            <span>Vagy add meg manuálisan a kódot</span>
                            <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="mt-3 p-3 bg-black/30 rounded-xl border border-purple-500/20">
                            <p className="text-xs text-gray-400 mb-2">Secret key:</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 px-3 py-2 bg-black/50 rounded-lg text-purple-300 text-xs font-mono break-all">
                                {secret}
                              </code>
                              <button
                                onClick={handleCopySecret}
                                className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 transition-all duration-200 hover:scale-105"
                                title="Másolás"
                              >
                                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                        3
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-3 text-sm">Add meg a 6 jegyű kódot</h3>
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
                              className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-black/30 border ${
                                error ? "border-red-500/50 animate-shake" : "border-purple-500/30 focus:border-purple-500"
                              } text-white text-center text-xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
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
                            className={`w-full mt-4 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                              code.length === 6 && !verifying
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] cursor-pointer"
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
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex gap-3">
                      <Smartphone className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-300 leading-relaxed">
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
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scale-check {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .animate-scale-check {
          animation: scale-check 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.5);
        }
      `}</style>
    </>
  );
}