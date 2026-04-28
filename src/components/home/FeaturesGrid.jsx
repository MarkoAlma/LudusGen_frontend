import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Shield, Globe, Layers, BarChart, Sparkles } from 'lucide-react';
import Container from '../ui/Container';
import FloatingCore from '../ui/FloatingCore';
import FeaturesBG from '../../assets/ludusgen_YZ6MbnvSCX5w1GewEIga.avif';

export default function FeaturesGrid() {
  const features = [
    { 
      icon: Cpu, 
      title: "Multi-Model AI", 
      desc: "Hozzáférés a GPT-4, Claude 3 és egyedi LLM modellekhez egyetlen közös workspace-ben.",
      gradient: "from-purple-500/20 to-blue-500/20"
    },
    { 
      icon: Zap, 
      title: "Villámgyors", 
      desc: "Edge-optimalizált infrastruktúra biztosítja a szinte azonnali válaszokat minden eszközön.",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    { 
      icon: Shield, 
      title: "Vállalati Biztonság", 
      desc: "SOC2 megfelelőség, végpontok közötti titkosítás és zéró adatmegőrzési politika.",
      gradient: "from-cyan-500/20 to-emerald-500/20"
    },
    { 
      icon: Globe, 
      title: "Globális CDN", 
      desc: "Asset kiszolgálás világszerte elosztott edge csomópontokon keresztül a nulla késleltetésért.",
      gradient: "from-emerald-500/20 to-yellow-500/20"
    },
    { 
      icon: Layers, 
      title: "Egyedi Workflow-k", 
      desc: "Fűzd össze az AI modelleket komplex, automatizált tartalomgyártási folyamatokká.",
      gradient: "from-yellow-500/20 to-orange-500/20"
    },
    { 
      icon: BarChart, 
      title: "Fejlett Analitika", 
      desc: "Kövesd nyomon a felhasználást, a költségeket és a teljesítményt valós idejű dashboardon.",
      gradient: "from-orange-500/20 to-purple-500/20"
    }
  ];

  return (
    <section className="py-24 md:py-48 relative overflow-hidden" id="features">
      {/* Cinematic Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 transform scale-110 rotate-1">
         <img src={FeaturesBG} alt="bg" className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-b from-[#03000a] via-[#03000a]/20 to-[#03000a]" />
         <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#03000a] to-transparent" />
         <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#03000a] to-transparent" />
      </div>

      {/* Floating Decorative 3D Elements */}
      <div className="absolute top-1/4 -right-20 opacity-30 z-0">
          <FloatingCore type="box" size={1.5} color="#8b5cf6" speed={1.2} />
      </div>

      <Container>
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-24">
           <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6"
              >
                <Sparkles className="w-3 h-3" /> Magtechnológia
              </motion.div>
              
              <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-8 leading-none">
                Power User-eknek <br className="hidden lg:block" /> Tervezve.
              </h2>
              <p className="text-lg md:text-xl text-gray-500 max-w-xl font-bold leading-relaxed mb-6">
                Minden, amire szükséged van a következő generációs alkalmazások építéséhez, egyetlen, zökkenőmentes környezetbe integrálva.
              </p>
           </div>

           {/* 3D Section Element (Floating Chip) */}
           <div className="w-full max-w-[400px] aspect-square relative z-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full animate-pulse" />
              <FloatingCore type="box" size={0.8} color="#3B82F6" speed={0.8} />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative"
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] blur-xl`} />
                
                <div className="relative h-full glass-panel p-10 rounded-[2.5rem] border border-white/5 hover:border-white/20 transition-all duration-500 flex flex-col items-start gap-8 overflow-hidden bg-white/[0.02]">
                  {/* Icon Container */}
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-primary/20 group-hover:border-primary/50 transition-all duration-700">
                    <Icon className="w-7 h-7" />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-white italic tracking-tighter">
                      {feature.title}
                    </h3>
                    <p className="text-gray-500 text-sm font-bold leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
