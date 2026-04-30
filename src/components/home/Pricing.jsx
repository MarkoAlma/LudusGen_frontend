import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import Container from '../ui/Container';
import FloatingCore from '../ui/FloatingCore';
import { MyUserContext } from '../../context/MyUserProvider';
import { packages as creditPackages } from '../../data/packages';
import PricingBG from '../../assets/ludusgen_YZ6MbnvSCX5w1GewEIga.avif';

export default function Pricing() {
  const { user, setIsAuthOpen, setShowCreditTopup } = useContext(MyUserContext);

  const openCredits = () => {
    if (user) {
      setShowCreditTopup(true);
      return;
    }
    setIsAuthOpen(true);
  };

  return (
    <section className="py-24 md:py-48 relative overflow-hidden" id="pricing">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 transform scale-105">
        <img src={PricingBG} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#03000a] via-[#03000a]/20 to-[#03000a]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#03000a] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#03000a] to-transparent" />
      </div>

      <Container>
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-24">
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
              <Zap className="w-3 h-3" /> Kredit alapú használat
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-8 leading-none">
              Csak az kerül kreditbe, <br />
              <span className="text-amber-500">amit tényleg használsz.</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-500 max-w-xl font-bold leading-relaxed">
              Tölts fel kreditet, majd használd ugyanazt az egyenleget chathez, képekhez, hanghoz, zenéhez és 3D generáláshoz.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 relative z-10">
          {creditPackages.map((pkg, i) => {
            const Icon = pkg.icon;
            const creditLabel = Number(pkg.credits).toLocaleString('en-US');
            return (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative group"
              >
                {pkg.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
                      Ajánlott
                    </div>
                  </div>
                )}

                <div className={`h-full glass-panel p-8 rounded-[3rem] border ${pkg.highlight ? 'border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.15)] bg-amber-500/[0.03]' : 'border-white/5 bg-white/[0.02]'} flex flex-col items-start transition-all duration-700 group-hover:translate-y-[-12px]`}>
                  <div className={`p-5 rounded-2xl mb-8 ${pkg.highlight ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-gray-500'}`}>
                    <Icon className="w-8 h-8" />
                  </div>

                  <h3 className="text-2xl font-black text-white italic mb-2 tracking-tight">{pkg.name}</h3>
                  <div className="mb-4">
                    <div className="text-5xl font-black text-white tracking-tighter">{creditLabel}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">kredit</div>
                  </div>
                  <div className="text-2xl font-black text-white mb-6">{pkg.price}</div>
                  <p className="text-sm font-bold text-gray-500 leading-relaxed mb-8 min-h-[64px]">
                    {pkg.description}
                  </p>

                  <div className="w-full h-px bg-white/5 mb-8" />

                  <ul className="space-y-5 mb-10 flex-1 w-full">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-4 group/item">
                        <div className={`mt-1.5 p-0.5 rounded-full ${pkg.highlight ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'}`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-bold text-gray-400 group-hover/item:text-gray-200 transition-colors uppercase tracking-[0.05em]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={openCredits}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest transition-all active:scale-95 ${pkg.highlight
                      ? 'bg-amber-500 text-white shadow-[0_20px_50px_rgba(245,158,11,0.3)] hover:scale-105'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                      }`}
                  >
                    {user ? 'Kreditek megnyitása' : 'Belépés a kreditekhez'}
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
