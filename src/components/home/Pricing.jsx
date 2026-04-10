import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Shield, Crown } from 'lucide-react';
import Container from '../ui/Container';
import FloatingCore from '../ui/FloatingCore';
import PricingBG from '../../assets/pricing_cinematic_bg_1775576404424.png';

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  const tiers = [
    {
      name: 'Starter',
      icon: Zap,
      priceMonthly: '0',
      priceYearly: '0',
      description: 'Tökéletes a platform felfedezéséhez.',
      popular: false,
      features: ['100 AI Generálási Kredit', 'Alap Szöveges Modellek', 'Standard Támogatás', 'Közösségi Hozzáférés'],
      color: 'gray'
    },
    {
      name: 'Pro',
      icon: Sparkles,
      priceMonthly: '29',
      priceYearly: '24',
      description: 'Szakembereknek napi alkotáshoz.',
      popular: true,
      features: ['Korlátlan Szöveg Generálás', 'Minden Prémium Modell (GPT-4, Claude 3)', 'Kép & Hang Generálás', 'Prioritási Támogatás', 'API Hozzáférés'],
      color: 'purple'
    },
    {
      name: 'Enterprise',
      icon: Shield,
      priceMonthly: '99',
      priceYearly: '79',
      description: 'Csapatoknak, maximális erővel.',
      popular: false,
      features: ['Minden a Pro csomagból', 'Egyedi Modell Fine-tuning', 'Dedikált Account Manager', '24/7 SLA Garancia', 'SSO & Speciális Biztonság'],
      color: 'blue'
    }
  ];

  return (
    <section className="py-24 md:py-48 relative overflow-hidden" id="pricing">
      {/* Cinematic Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 transform scale-105">
         <img src={PricingBG} alt="bg" className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-b from-[#03000a] via-[#03000a]/20 to-[#03000a]" />
         <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#03000a] to-transparent" />
         <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#03000a] to-transparent" />
      </div>

      <Container>
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-24">
           {/* 3D Value Ring */}
           <div className="w-full max-w-[400px] aspect-square relative z-10 hidden lg:flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500/10 blur-[100px] rounded-full animate-pulse" />
              <FloatingCore type="torus" size={0.9} color="#f59e0b" speed={1.2} />
           </div>

           <div className="flex-1 text-center lg:text-left relative z-10">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6"
              >
                <Crown className="w-3 h-3" /> Exkluzív Hozzáférés
              </motion.div>
              <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-8 leading-none">
                Egyszerű Árak. <br />
                <span className="text-amber-500">Maximális Erő.</span>
              </h2>
              
              {/* Custom Toggle */}
              <div className="inline-flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md mb-8">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${!isYearly ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Havi
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${isYearly ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Éves <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">-20%</span>
                </button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {tiers.map((tier, i) => {
            const Icon = tier.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative group"
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
                      Kiemelt ajánlat
                    </div>
                  </div>
                )}

                <div className={`h-full glass-panel p-10 rounded-[3rem] border ${tier.popular ? 'border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.15)] bg-amber-500/[0.03]' : 'border-white/5 bg-white/[0.02]'} flex flex-col items-start transition-all duration-700 group-hover:translate-y-[-12px]`}>
                  <div className={`p-5 rounded-2xl mb-8 ${tier.popular ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-gray-500'}`}>
                    <Icon className="w-8 h-8" />
                  </div>

                  <h3 className="text-2xl font-black text-white italic mb-2 tracking-tight">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-6xl font-black text-white tracking-tighter">$</span>
                    <span className="text-6xl font-black text-white tracking-tighter">{isYearly ? tier.priceYearly : tier.priceMonthly}</span>
                    <span className="text-gray-500 font-bold ml-2">/hó</span>
                  </div>
                  <p className="text-sm font-bold text-gray-500 leading-relaxed mb-10 min-h-[48px]">
                    {tier.description}
                  </p>
                  
                  <div className="w-full h-px bg-white/5 mb-10" />
                  
                  <ul className="space-y-5 mb-12 flex-1 w-full">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-4 group/item">
                         <div className={`mt-1.5 p-0.5 rounded-full ${tier.popular ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'}`}>
                           <Check className="w-3.5 h-3.5" />
                         </div>
                         <span className="text-sm font-bold text-gray-400 group-hover/item:text-gray-200 transition-colors uppercase tracking-[0.05em]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    tier.popular 
                    ? 'bg-amber-500 text-white shadow-[0_20px_50px_rgba(245,158,11,0.3)] hover:scale-105' 
                    : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}>
                    {tier.priceMonthly === '0' ? 'Kezdés ingyen' : 'Csatlakozás Most'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
