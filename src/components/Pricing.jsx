import { packages } from '../data/packages';
import { Check } from 'lucide-react';

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-32 px-4">
      <section id="pricing" className="relative py-32 px-4">
              <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-20">
                  <div className="inline-block mb-6 px-6 py-2 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 backdrop-blur-xl border border-white/10 rounded-full">
                    <span className="text-sm font-medium bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                      💎 Prémium árazás
                    </span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black mb-6">
                    <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                      Válaszd a te 
                    </span>
                    <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                      csomagodat
                    </span>
                  </h2>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Rugalmas árazás minden igényre, startup-tól enterprise-ig
                  </p>
                </div>
      
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {packages.map((pkg, idx) => {
                    const Icon = pkg.icon;
                    return (
                      <div
                        key={idx}
                        className={`relative group rounded-3xl p-8 backdrop-blur-2xl transition-all duration-500 hover:scale-105 ${
                          pkg.highlight
                            ? 'bg-gradient-to-b from-white/10 to-white/5 border-2 border-transparent bg-clip-padding'
                            : 'bg-white/5 border border-white/10'
                        }`}
                        style={pkg.highlight ? {
                          backgroundImage: `linear-gradient(black, black), linear-gradient(135deg, #a855f7, #ec4899, #06b6d4)`,
                          backgroundOrigin: 'border-box',
                          backgroundClip: 'padding-box, border-box'
                        } : {}}
                      >
                        {pkg.highlight && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-full text-sm font-bold shadow-2xl">
                            ⭐ Legjobb választás
                          </div>
                        )}
                        
                        <div className="mb-8">
                          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${pkg.gradient} mb-6 shadow-2xl`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <h3 className="text-3xl font-bold mb-4">{pkg.name}</h3>
                          <div className="flex items-baseline mb-2">
                            <span className="text-5xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                              {pkg.price}
                            </span>
                          </div>
                          <span className="text-gray-500 text-sm">/{pkg.period}</span>
                        </div>
      
                        <ul className="space-y-4 mb-10">
                          {pkg.features.map((feature, i) => (
                            <li key={i} className="flex items-start group/item">
                              <div className={`p-1 rounded-full bg-gradient-to-br ${pkg.gradient} mr-3 flex-shrink-0 mt-0.5`}>
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-gray-300 text-sm leading-relaxed group-hover/item:text-white transition">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
      
                        <button
                          className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 ${
                            pkg.highlight
                              ? `bg-gradient-to-r ${pkg.gradient} hover:shadow-2xl hover:scale-105`
                              : 'bg-white/10 hover:bg-white/20 border border-white/20'
                          }`}
                        >
                          Kezdés →
                        </button>
                      </div>
                    );
                  })}
                </div>
      
                <p className="text-center mt-12 text-gray-500">
                  Minden csomag tartalmaz <span className="text-white font-semibold">30 napos pénzvisszafizetési garanciát</span>
                </p>
              </div>
            </section>
    </section>
  );
}
