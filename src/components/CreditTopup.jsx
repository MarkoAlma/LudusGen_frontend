import { useState, useEffect, useContext, useCallback } from "react";
import {
  X,
  Zap,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Star,
  Rocket,
  Crown,
} from "lucide-react";
import { MyUserContext } from "../context/MyUserProvider";
import { auth } from "../firebase/firebaseApp";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Kredit csomagok ───────────────────────────────────────────
const PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    amount: 100,
    price: "Ingyenes",
    priceNum: 0,
    icon: Sparkles,
    color: "from-slate-600 to-slate-500",
    glowColor: "rgba(100,116,139,0.4)",
    badge: null,
    perCredit: "–",
  },
  {
    id: "basic",
    name: "Basic",
    amount: 500,
    price: "$4.99",
    priceNum: 4.99,
    icon: Star,
    color: "from-purple-700 to-purple-500",
    glowColor: "rgba(168,85,247,0.5)",
    badge: null,
    perCredit: "$0.0100",
  },
  {
    id: "pro",
    name: "Pro",
    amount: 1000,
    price: "$9.99",
    priceNum: 9.99,
    icon: Rocket,
    color: "from-violet-700 to-pink-600",
    glowColor: "rgba(139,92,246,0.6)",
    badge: "Ajánlott",
    perCredit: "$0.0100",
  },
  {
    id: "ultra",
    name: "Ultra",
    amount: 5000,
    price: "$39.99",
    priceNum: 39.99,
    icon: Crown,
    color: "from-amber-600 to-orange-500",
    glowColor: "rgba(245,158,11,0.5)",
    badge: "Legjobb ár",
    perCredit: "$0.0080",
  },
];

// ─── Animált szám ─────────────────────────────────────────────
function AnimatedNumber({ value }) {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const start = displayed;
    const end = value;
    if (start === end) return;
    const diff = end - start;
    const duration = 600;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplayed(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span>{displayed.toLocaleString("hu-HU")}</span>;
}

// ─── Fő komponens ─────────────────────────────────────────────
export default function CreditTopup({ isOpen, onClose }) {
  const { user, updateUser } = useContext(MyUserContext);

  const [credits, setCredits] = useState(user?.credits ?? 0);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [successPkg, setSuccessPkg] = useState(null);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [mouseDownTarget, setMouseDownTarget] = useState(null);
  const [hasClaimedFree, setHasClaimedFree] = useState(
    user?.hasClaimedFreeCredits ?? false
  );

  // Szinkronizál ha a user context frissül
  useEffect(() => {
    setCredits(user?.credits ?? 0);
    setHasClaimedFree(user?.hasClaimedFreeCredits ?? false);
  }, [user?.credits, user?.hasClaimedFreeCredits]);


  // Egyenleg + előzmények betöltése megnyíláskor
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(`${API_BASE}/api/get-credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setCredits(res.data.credits);
        updateUser({ credits: res.data.credits });
      }
    } catch (err) {
      console.error("get-credits error:", err);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedPkg(null);
      setSuccessPkg(null);
      setError(null);
      setShowHistory(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Teljes history betöltése
  const loadHistory = async () => {
    if (fetchingHistory) return;
    setFetchingHistory(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(`${API_BASE}/api/credit-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setTransactions(res.data.transactions);
    } catch (err) {
      console.error("credit-history error:", err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const toggleHistory = async () => {
    if (!showHistory && transactions.length === 0) await loadHistory();
    setShowHistory((v) => !v);
  };

  // Kredit hozzáadása
  const handleAddCredits = async () => {
    if (!selectedPkg || loading) return;
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.post(
        `${API_BASE}/api/add-credits`,
        { packageId: selectedPkg },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        const pkg = PACKAGES.find((p) => p.id === selectedPkg);
        setSuccessPkg(pkg);
        setCredits(res.data.credits);
        updateUser({ credits: res.data.credits });
        // Ha starter volt, jelzük a frontend state-ben is
        if (selectedPkg === 'starter') {
          setHasClaimedFree(true);
          updateUser({ credits: res.data.credits, hasClaimedFreeCredits: true });
        }
        setTransactions([]);
        // 2.5s után reset
        setTimeout(() => {
          setSuccessPkg(null);
          setSelectedPkg(null);
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Hiba történt a feltöltés során");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedPkgData = PACKAGES.find((p) => p.id === selectedPkg);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onMouseDown={(e) => setMouseDownTarget(e.target)}
      onMouseUp={(e) => {
        if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget)
          onClose();
        setMouseDownTarget(null);
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: "24px",
          background:
            "linear-gradient(145deg, rgba(15,10,30,0.98) 0%, rgba(10,5,25,0.99) 100%)",
          border: "1px solid rgba(168,85,247,0.25)",
          boxShadow:
            "0 0 60px rgba(168,85,247,0.15), 0 25px 80px rgba(0,0,0,0.6)",
          animation: "creditModalIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div
          style={{
            padding: "28px 28px 0",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#7c3aed,#db2777)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 20px rgba(168,85,247,0.5)",
                }}
              >
                <Zap size={20} color="#fff" />
              </div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#fff",
                  margin: 0,
                  letterSpacing: "-0.5px",
                }}
              >
                Kredit Feltöltés
              </h2>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>
              Válassz egy csomagot a kredit egyenleged bővítéséhez
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: 8,
              borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              color: "#9ca3af",
              transition: "all 0.2s",
              flexShrink: 0,
              marginLeft: 12,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Egyenleg panel ────────────────────────────────── */}
        <div style={{ padding: "20px 28px" }}>
          <div
            style={{
              borderRadius: 16,
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(219,39,119,0.1) 100%)",
              border: "1px solid rgba(168,85,247,0.2)",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background glow */}
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "radial-gradient(rgba(168,85,247,0.3), transparent)",
                pointerEvents: "none",
              }}
            />
            <div>
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Jelenlegi egyenleg
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 900,
                    color: "#fff",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <AnimatedNumber value={credits} />
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#a78bfa",
                  }}
                >
                  kredit
                </span>
              </div>
            </div>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(219,39,119,0.3))",
                border: "2px solid rgba(168,85,247,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={26} color="#a78bfa" />
            </div>
          </div>
        </div>

        {/* ── Success overlay ───────────────────────────────── */}
        {successPkg && (
          <div style={{ padding: "0 28px 16px" }}>
            <div
              style={{
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))",
                border: "1px solid rgba(16,185,129,0.3)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                animation: "creditModalIn 0.3s both",
              }}
            >
              <CheckCircle size={22} color="#34d399" />
              <div>
                <p
                  style={{
                    color: "#34d399",
                    fontWeight: 700,
                    fontSize: 15,
                    margin: 0,
                  }}
                >
                  Sikeres feltöltés!
                </p>
                <p
                  style={{
                    color: "#6ee7b7",
                    fontSize: 13,
                    margin: 0,
                  }}
                >
                  +{successPkg.amount.toLocaleString("hu-HU")} kredit hozzáadva
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {error && (
          <div style={{ padding: "0 28px 16px" }}>
            <div
              style={{
                borderRadius: 14,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                padding: "14px 18px",
                color: "#f87171",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* ── Csomagok grid ─────────────────────────────────── */}
        <div style={{ padding: "0 28px" }}>
          <p
            style={{
              color: "#9ca3af",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 14,
            }}
          >
            Válassz csomagot
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const isSelected = selectedPkg === pkg.id;
              // Letiltott: ingyenes csomag, ha már igénybe vették
              const isDisabled = pkg.id === 'starter' && hasClaimedFree;

              return (
                <button
                  key={pkg.id}
                  onClick={() => {
                    if (isDisabled) return;
                    setSelectedPkg(isSelected ? null : pkg.id);
                    setError(null);
                  }}
                  style={{
                    position: "relative",
                    borderRadius: 16,
                    padding: "18px 16px",
                    border: isSelected
                      ? `2px solid ${pkg.glowColor.replace("0.", "0.9")}`
                      : "2px solid rgba(255,255,255,0.06)",
                    background: isDisabled
                      ? "rgba(255,255,255,0.02)"
                      : isSelected
                      ? `linear-gradient(135deg, ${pkg.glowColor.replace("0.", "0.15")}, rgba(0,0,0,0.3))`
                      : "rgba(255,255,255,0.03)",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                    boxShadow: isSelected
                      ? `0 0 24px ${pkg.glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`
                      : "none",
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                    opacity: isDisabled ? 0.45 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.border =
                        "2px solid rgba(168,85,247,0.25)";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.border =
                        "2px solid rgba(255,255,255,0.06)";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.03)";
                    }
                  }}
                >
                  {/* "Már igénybe vett" badge az ingyenes csomaghoz */}
                  {isDisabled && (
                    <div
                      style={{
                        position: "absolute",
                        top: -10,
                        right: 12,
                        padding: "2px 10px",
                        borderRadius: 20,
                        background: "rgba(107,114,128,0.6)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#d1d5db",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      Már igénybe vetted
                    </div>
                  )}

                  {/* Badge */}
                  {pkg.badge && !isDisabled && (
                    <div
                      style={{
                        position: "absolute",
                        top: -10,
                        right: 12,
                        padding: "2px 10px",
                        borderRadius: 20,
                        background:
                          pkg.id === "ultra"
                            ? "linear-gradient(90deg,#f59e0b,#ef4444)"
                            : "linear-gradient(90deg,#7c3aed,#db2777)",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#fff",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      {pkg.badge}
                    </div>
                  )}

                  {/* Icon */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `linear-gradient(135deg, ${pkg.glowColor.replace("0.", "0.6")}, ${pkg.glowColor.replace("0.", "0.3")})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                      border: `1px solid ${pkg.glowColor}`,
                    }}
                  >
                    <Icon size={18} color="#fff" />
                  </div>

                  {/* Name */}
                  <p
                    style={{
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 15,
                      margin: "0 0 2px",
                    }}
                  >
                    {pkg.name}
                  </p>

                  {/* Amount */}
                  <p
                    style={{
                      color: "#a78bfa",
                      fontWeight: 700,
                      fontSize: 20,
                      margin: "0 0 4px",
                      lineHeight: 1,
                    }}
                  >
                    {pkg.amount.toLocaleString("hu-HU")}
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 500,
                        marginLeft: 4,
                      }}
                    >
                      kr
                    </span>
                  </p>

                  {/* Price */}
                  <p
                    style={{
                      color:
                        pkg.price === "Ingyenes" ? "#34d399" : "#9ca3af",
                      fontSize: 13,
                      fontWeight: pkg.price === "Ingyenes" ? 700 : 500,
                      margin: 0,
                    }}
                  >
                    {pkg.price}
                  </p>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg,#7c3aed,#db2777)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M1.5 5l2.5 2.5L8.5 2"
                          stroke="#fff"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Confirm gomb ──────────────────────────────────── */}
        <div style={{ padding: "18px 28px" }}>
          <button
            onClick={handleAddCredits}
            disabled={!selectedPkg || loading}
            style={{
              width: "100%",
              padding: "15px 24px",
              borderRadius: 14,
              border: "none",
              background:
                selectedPkg && !loading
                  ? "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)"
                  : "rgba(255,255,255,0.06)",
              color: selectedPkg && !loading ? "#fff" : "#6b7280",
              fontWeight: 800,
              fontSize: 15,
              cursor: selectedPkg && !loading ? "pointer" : "not-allowed",
              transition: "all 0.25s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow:
                selectedPkg && !loading
                  ? "0 4px 24px rgba(124,58,237,0.4)"
                  : "none",
              transform: selectedPkg && !loading ? "scale(1)" : "scale(0.99)",
            }}
            onMouseEnter={(e) => {
              if (selectedPkg && !loading) {
                e.currentTarget.style.boxShadow =
                  "0 8px 32px rgba(124,58,237,0.6)";
                e.currentTarget.style.transform = "scale(1.02)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPkg && !loading) {
                e.currentTarget.style.boxShadow =
                  "0 4px 24px rgba(124,58,237,0.4)";
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span>Feltöltés folyamatban...</span>
              </>
            ) : selectedPkgData ? (
              <>
                <Zap size={18} />
                <span>
                  {selectedPkgData.amount.toLocaleString("hu-HU")} kredit
                  hozzáadása –{" "}
                  <span style={{ opacity: 0.8 }}>{selectedPkgData.price}</span>
                </span>
              </>
            ) : (
              <span>Válassz egy csomagot</span>
            )}
          </button>
        </div>

        {/* ── Tranzakció előzmények ─────────────────────────── */}
        <div style={{ padding: "0 28px 24px" }}>
          <button
            onClick={toggleHistory}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#9ca3af",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "#d1d5db";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} />
              <span>Tranzakció előzmények</span>
            </div>
            {fetchingHistory ? (
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "2px solid rgba(168,85,247,0.3)",
                  borderTopColor: "#a78bfa",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            ) : showHistory ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          {/* History lista */}
          {showHistory && (
            <div
              style={{
                marginTop: 8,
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
                animation: "creditModalIn 0.2s both",
              }}
            >
              {transactions.length === 0 ? (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: "#4b5563",
                    fontSize: 14,
                  }}
                >
                  Nincs tranzakció előzmény
                </div>
              ) : (
                transactions.map((tx, i) => (
                  <div
                    key={tx.id}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom:
                        i < transactions.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background:
                            "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.2))",
                          border: "1px solid rgba(168,85,247,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Zap size={14} color="#a78bfa" />
                      </div>
                      <div>
                        <p
                          style={{
                            color: "#e5e7eb",
                            fontWeight: 600,
                            fontSize: 13,
                            margin: 0,
                          }}
                        >
                          {tx.packageName} csomag
                        </p>
                        <p
                          style={{
                            color: "#6b7280",
                            fontSize: 11,
                            margin: 0,
                          }}
                        >
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleDateString(
                                "hu-HU",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "–"}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          color: "#34d399",
                          fontWeight: 700,
                          fontSize: 14,
                          margin: 0,
                        }}
                      >
                        +{tx.amount?.toLocaleString("hu-HU")}
                      </p>
                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: 11,
                          margin: 0,
                        }}
                      >
                        {tx.price}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CSS animációk ─────────────────────────────────────── */}
      <style>{`
        @keyframes creditModalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
