import { useState } from "react";
import { Check, Sparkles, Zap, Crown, Star, ArrowRight } from "lucide-react";

const packagesData = [
  {
    name: "Starter",
    price: "9.990 Ft",
    period: "hó",
    icon: Sparkles,
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
  const [activeTab, setActiveTab] = useState("monthly");

  return (
    <section id="pricing" className="min-h-screen relative py-20 px-6 sm:px-12 overflow-hidden flex flex-col justify-center items-center">
      <div className="max-w-[1200px] w-full mx-auto relative z-10 flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-16 max-w-2xl">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 tracking-tight text-white">
            Keresd meg a <br />
            <span className="text-gradient-primary">SZINTEDET</span>
          </h2>

          <p className="font-body text-lg text-text-dim leading-relaxed mb-10 text-balance">
            Rugalmas árazás minden igényre, <span className="text-white font-semibold">startup-tól enterprise-ig</span>. Válassz egy csomagot és aktiváld a rendszert.
          </p>

          {/* Elegant Pill Tab Switcher */}
          <div className="inline-flex items-center p-1.5 glass-panel rounded-full relative">
            <div 
              className="absolute inset-y-1.5 w-[140px] bg-white/10 rounded-full transition-transform duration-300 ease-in-out"
              style={{ transform: activeTab === 'monthly' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button
              onClick={() => setActiveTab("monthly")}
              className={`relative z-10 w-[140px] py-2.5 font-body font-semibold text-sm transition-colors ${
                activeTab === "monthly" ? "text-white" : "text-text-dim hover:text-white"
              }`}
            >
              Havi
            </button>
            <button
              onClick={() => setActiveTab("yearly")}
              className={`relative z-10 w-[140px] py-2.5 font-body font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === "yearly" ? "text-white" : "text-text-dim hover:text-white"
              }`}
            >
              Éves <span className="px-1.5 py-0.5 rounded-md bg-secondary/20 text-secondary text-[10px]">-20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards - Modern Bento Style Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch w-full">
          {packagesData.map((pkg, idx) => {
            const Icon = pkg.icon;

            return (
              <div
                key={idx}
                className={`group relative glass-panel p-8 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] ${
                  pkg.highlight ? "border-primary/50 shadow-[0_0_30px_rgba(138,43,226,0.15)] bg-white/[0.05]" : "border-white/10"
                }`}
              >
                {pkg.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-secondary rounded-full text-white font-body font-bold text-xs shadow-[0_0_15px_rgba(138,43,226,0.5)] whitespace-nowrap">
                    LEGNÉPSZERŰBB
                  </div>
                )}

                <div className="mb-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pkg.highlight ? "bg-primary/20 text-primary" : "bg-white/5 text-text-dim"}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-white">
                    {pkg.name}
                  </h3>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`text-4xl font-heading font-bold ${pkg.highlight ? 'text-white' : 'text-white/90'}`}>
                      {pkg.price}
                    </span>
                  </div>
                  <div className="font-body text-text-dim text-sm">
                    / {pkg.period} {activeTab === "yearly" && "(éves fizetés)"}
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-1 font-body text-sm font-medium text-white/80">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <div className={`mt-0.5 mr-3 flex-shrink-0 ${pkg.highlight ? "text-primary" : "text-secondary"}`}>
                        <Check className="w-4 h-4" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-3.5 rounded-xl font-body font-semibold transition-all duration-300 flex items-center justify-center group/btn relative overflow-hidden ${
                  pkg.highlight 
                    ? "bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                    : "glass-panel border-white/10 text-white hover:bg-white/10"
                }`}>
                  <span className="relative z-10 flex items-center">
                    Kiválaszt
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}