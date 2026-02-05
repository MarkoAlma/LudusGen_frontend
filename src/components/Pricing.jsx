import { useState, useEffect } from "react";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Star,
  TrendingUp,
  ArrowRight,
  Gift,
  Shield,
} from "lucide-react";

// Ha van saját packages importod, használd azt így:
// import { packages } from '../data/packages';
// És kommenteld ki a packagesData-t

// Példa adat struktúra - cseréld le a sajátodra
const packagesData = [
  {
    name: "Starter",
    price: "9.990 Ft",
    period: "hó",
    icon: Sparkles,
    gradient: "from-blue-500 to-cyan-500",
    highlight: false,
    features: [
      "10,000 AI kérés/hó",
      "GPT-4 hozzáférés",
      "Email support",
      "Alap analytics",
    ],
  },
  {
    name: "Professional",
    price: "29.990 Ft",
    period: "hó",
    icon: Star,
    gradient: "from-purple-500 to-pink-500",
    highlight: true,
    features: [
      "100,000 AI kérés/hó",
      "Összes AI modell",
      "Priority support",
      "Advanced analytics",
      "API hozzáférés",
    ],
  },
  {
    name: "Business",
    price: "79.990 Ft",
    period: "hó",
    icon: Crown,
    gradient: "from-pink-500 to-rose-500",
    highlight: false,
    features: [
      "Unlimited AI kérés",
      "Dedikált szerver",
      "24/7 support",
      "Custom integráció",
      "Team management",
    ],
  },
  {
    name: "Enterprise",
    price: "Egyedi",
    period: "ár",
    icon: Zap,
    gradient: "from-cyan-500 to-blue-500",
    highlight: false,
    features: [
      "Teljes testreszabás",
      "SLA garancia",
      "Dedicated account manager",
      "On-premise opció",
      "Training & onboarding",
    ],
  },
];

export default function Pricing() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("monthly");

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Ha van saját packages importod, töröld ezt a sort:
  const packages = packagesData;

  return (
    <section id="pricing" className="relative py-32 px-4 overflow-hidden">
      {/* MEGA Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse-slow" />
        <div
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[150px] animate-pulse-slow"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[150px] animate-pulse-slow"
          style={{ animationDelay: "6s" }}
        />

        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)",
            backgroundSize: "100px 100px",
          }}
        />

        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float-random"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 20}s`,
            }}
          >
            <div className="w-1 h-1 bg-purple-400 rounded-full opacity-60" />
          </div>
        ))}

        <div
          className="absolute w-[800px] h-[800px] pointer-events-none transition-all duration-300 ease-out opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)",
            left: mousePosition.x - 400,
            top: mousePosition.y - 400,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-block mb-8 relative group cursor-pointer animate-float-subtle">
            <div className="relative px-8 py-3 bg-gradient-to-r from-purple-900/60 via-pink-900/60 to-cyan-900/60 backdrop-blur-2xl border-2 border-white/30 rounded-full shadow-[0_0_40px_rgba(168,85,247,0.6)]">
              <div className="flex items-center space-x-3">
                <Crown className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-sm font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-cyan-200 bg-clip-text text-transparent">
                  💎 Prémium árazás - Korlátozott ajánlat!
                </span>
                <Sparkles className="w-5 h-5 text-cyan-400 animate-spin-slow" />
              </div>
            </div>
          </div>

          <h2 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            <span className="block bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              Válaszd a te
            </span>
            <span className="block relative mt-2">
              <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 bg-clip-text text-transparent blur-2xl opacity-50 animate-gradient-x">
                csomagodat
              </span>
              <span className="relative bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient-x">
                csomagodat
              </span>
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
            Rugalmas árazás minden igényre,{" "}
            <span className="font-bold text-white">
              startup-tól enterprise-ig
            </span>
          </p>

          <div className="inline-flex items-center p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
            <button
              onClick={() => setActiveTab("monthly")}
              className={`relative px-8 py-3 rounded-full cursor-pointer font-bold transition-all duration-300 ${
                activeTab === "monthly"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {activeTab === "monthly" && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-full animate-gradient-x" />
              )}
              <span className="relative z-10">Havi</span>
            </button>
            <button
              onClick={() => setActiveTab("yearly")}
              className={`relative px-8 py-3 rounded-full cursor-pointer font-bold transition-all duration-300 ${
                activeTab === "yearly"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {activeTab === "yearly" && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-full animate-gradient-x" />
              )}
              <span className="relative z-10 flex items-center">
                Éves
                <span className="ml-2 px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-lg text-xs text-green-400">
                  -20%
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 items-stretch">
          {packages.map((pkg, idx) => {
            const Icon = pkg.icon;
            const isHovered = hoveredCard === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`relative group rounded-3xl backdrop-blur-2xl transition-all duration-500 transform
          ${
            pkg.highlight
              ? "lg:-mt-8 lg:mb-8 scale-105"
              : "scale-100 hover:scale-105"
          }
          h-full min-h-[480px]`}
              >
                <div
                  className={`absolute inset-0 rounded-3xl blur-2xl transition-opacity duration-500 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: pkg.gradient.includes("purple")
                      ? "linear-gradient(135deg, rgba(168,85,247,0.4), transparent)"
                      : pkg.gradient.includes("blue")
                      ? "linear-gradient(135deg, rgba(59,130,246,0.4), transparent)"
                      : pkg.gradient.includes("pink")
                      ? "linear-gradient(135deg, rgba(236,72,153,0.4), transparent)"
                      : "linear-gradient(135deg, rgba(34,211,238,0.4), transparent)",
                  }}
                />

                <div
                  className={`relative p-8 rounded-3xl transition-all duration-500 h-full flex flex-col justify-between ${
                    pkg.highlight
                      ? "bg-gradient-to-b from-white/15 to-white/5 border-2 border-purple-500/50"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                  style={
                    pkg.highlight
                      ? {
                          boxShadow: isHovered
                            ? "0 0 80px rgba(168,85,247,0.6), 0 0 40px rgba(236,72,153,0.4)"
                            : "0 0 40px rgba(168,85,247,0.3)",
                        }
                      : {}
                  }
                >
                  {pkg.highlight && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-full blur-xl opacity-70 animate-pulse-slow" />
                        <div className="relative px-6 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-full text-sm font-black shadow-2xl flex items-center space-x-2">
                          <Star className="w-4 h-4 text-yellow-300 animate-spin-slow" />
                          <span>LEGJOBB VÁLASZTÁS</span>
                          <Star
                            className="w-4 h-4 text-yellow-300 animate-spin-slow"
                            style={{ animationDirection: "reverse" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {isHovered && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-purple-400 rounded-full animate-particle-float"
                          style={{
                            left: `${i * 12.5 + 10}%`,
                            animationDelay: `${i * 0.2}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="mb-8 relative">
                    <div
                      className={`inline-flex p-5 rounded-2xl bg-gradient-to-br ${
                        pkg.gradient
                      } shadow-2xl transform transition-all duration-500 ${
                        isHovered ? "scale-110 rotate-6" : "scale-100 rotate-0"
                      }`}
                    >
                      <Icon className="w-10 h-10 text-white" />
                      {isHovered && (
                        <div className="absolute inset-0 animate-ping">
                          <div
                            className={`w-full h-full rounded-2xl bg-gradient-to-br ${pkg.gradient} opacity-50`}
                          />
                        </div>
                      )}
                    </div>
                    {isHovered && (
                      <>
                        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
                        <Zap className="absolute -bottom-2 -left-2 w-5 h-5 text-cyan-400 animate-bounce" />
                      </>
                    )}
                  </div>

                  <h3
                    className={`text-3xl font-black mb-6 transition-all duration-300 ${
                      isHovered
                        ? "text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text"
                        : "text-white"
                    }`}
                  >
                    {pkg.name}
                  </h3>

                  <div className="mb-8">
                    <div className="flex items-baseline mb-2">
                      <span className="text-6xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        {pkg.price}
                      </span>
                      {pkg.highlight && (
                        <TrendingUp className="ml-2 w-6 h-6 text-green-400 animate-bounce" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">
                        /{pkg.period}
                      </span>
                      {activeTab === "yearly" && (
                        <span className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-lg text-xs text-green-400 font-bold animate-pulse">
                          20% megtakarítás
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-4 mb-10">
                    {pkg.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start group/item transition-all duration-300 hover:translate-x-2"
                      >
                        <div
                          className={`relative p-1 rounded-full bg-gradient-to-br ${pkg.gradient} mr-3 flex-shrink-0 mt-0.5 transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-12`}
                        >
                          <Check className="w-4 h-4 text-white" />
                          <div
                            className={`absolute inset-0 rounded-full bg-gradient-to-br ${pkg.gradient} blur-md opacity-0 group-hover/item:opacity-100 transition-opacity animate-pulse`}
                          />
                        </div>
                        <span className="text-gray-300 text-sm leading-relaxed group-hover/item:text-white transition-all">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`relative w-full cursor-pointer py-4 rounded-2xl font-black text-lg transition-all duration-500 overflow-hidden group/btn ${
                      pkg.highlight ? "" : "border border-white/30"
                    }`}
                  >
                    {pkg.highlight ? (
                      <>
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${pkg.gradient} animate-gradient-x`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 animate-gradient-x" />
                        <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700">
                          <div className="absolute inset-0 translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />
                        </div>
                        <div
                          className={`absolute inset-[-2px] rounded-2xl bg-gradient-to-r ${pkg.gradient} opacity-0 group-hover/btn:opacity-100 blur-lg transition-opacity`}
                        />
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-white/10 group-hover/btn:bg-white/20 transition-colors" />
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${pkg.gradient} opacity-0 group-hover/btn:opacity-20 transition-opacity`}
                        />
                      </>
                    )}
                    <span className="relative z-10 flex items-center justify-center space-x-2 uppercase tracking-wider">
                      <span>Kezdés</span>
                      <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                      {pkg.highlight && (
                        <Zap className="w-5 h-5 animate-pulse" />
                      )}
                    </span>
                    {pkg.highlight && (
                      <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping-slow opacity-0 group-hover/btn:opacity-20" />
                    )}
                  </button>

                  {pkg.highlight && (
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-full">
                        <Gift className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-bold text-green-400">
                          +30 nap INGYEN próbaidő!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {[
            {
              icon: Shield,
              text: "SSL Titkosítás",
              color: "from-green-400 to-emerald-400",
            },
            {
              icon: Zap,
              text: "99.9% Uptime",
              color: "from-yellow-400 to-orange-400",
            },
            {
              icon: Crown,
              text: "Prémium Support",
              color: "from-purple-400 to-pink-400",
            },
            {
              icon: Star,
              text: "10,000+ Elégedett Ügyfél",
              color: "from-cyan-400 to-blue-400",
            },
          ].map((badge, idx) => {
            const BadgeIcon = badge.icon;
            return (
              <div
                key={idx}
                className="group flex items-center space-x-3 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full hover:border-white/30 hover:bg-white/10 transition-all duration-300 cursor-pointer"
              >
                <BadgeIcon
                  className={`w-5 h-5 text-${badge.color.split("-")[1]}-400`}
                />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  {badge.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Money back guarantee */}
        <div className="relative group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-pink-600/20 to-cyan-600/0 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative text-center p-8 bg-gradient-to-r from-white/5 via-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Shield className="w-8 h-8 text-green-400 animate-pulse" />
              <h3 className="text-2xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                30 Napos Pénzvisszafizetési Garancia
              </h3>
              <Shield
                className="w-8 h-8 text-green-400 animate-pulse"
                style={{ animationDelay: "1s" }}
              />
            </div>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Nem vagy elégedett?{" "}
              <span className="text-white font-bold">
                Visszafizetjük a teljes összeget
              </span>{" "}
              - kérdések nélkül!
            </p>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">
            Kérdésed van az árazással kapcsolatban?
          </p>
          <button className="group relative px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/20 rounded-full hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300">
            <span className="flex items-center space-x-2">
              <span className="font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-cyan-300 group-hover:bg-clip-text transition-all">
                Nézd meg a gyakori kérdéseket
              </span>
              <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-2 transition-transform" />
            </span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-random {
          0%,
          100% {
            transform: translate(0, 0);
            opacity: 0.3;
          }
          25% {
            transform: translate(20px, -20px);
            opacity: 0.7;
          }
          50% {
            transform: translate(-15px, -40px);
            opacity: 0.5;
          }
          75% {
            transform: translate(30px, -25px);
            opacity: 0.8;
          }
        }
        @keyframes float-subtle {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes particle-float {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }
        @keyframes gradient-x {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-float-random {
          animation: float-random 15s ease-in-out infinite;
        }
        .animate-float-subtle {
          animation: float-subtle 3s ease-in-out infinite;
        }
        .animate-particle-float {
          animation: particle-float 2s ease-out infinite;
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </section>
  );
}
