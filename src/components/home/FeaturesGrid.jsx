import React from 'react';
import { motion } from 'framer-motion';
import { Box, History, Image as ImageIcon, MessageSquare, Music, ShoppingBag, Sparkles } from 'lucide-react';
import Container from '../ui/Container';
import HomeBackdrop from './HomeBackdrop';
import FeaturesBG from '../../assets/ludusgen_YZ6MbnvSCX5w1GewEIga.avif';

export default function FeaturesGrid() {
  const features = [
    {
      icon: MessageSquare,
      title: 'Image-aware chat',
      desc: 'Upload an image and supported chat models can read the visual context inside the same conversation.',
      gradient: 'from-purple-500/20 to-blue-500/20',
    },
    {
      icon: History,
      title: 'Chat memory and saves',
      desc: 'Conversations are saved, and long context is summarized so bigger sessions stay manageable.',
      gradient: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      icon: ImageIcon,
      title: 'Image workflow',
      desc: 'Generate, edit, and upscale images in one gallery with active model selection across providers.',
      gradient: 'from-cyan-500/20 to-emerald-500/20',
    },
    {
      icon: Music,
      title: 'Audio and music',
      desc: 'Create speech, clone voices, design voices, and generate music in a dedicated Audio Studio.',
      gradient: 'from-emerald-500/20 to-yellow-500/20',
    },
    {
      icon: Box,
      title: '3D asset pipeline',
      desc: 'Generate export-ready 3D assets with Tripo3D and Trellis, backed by an active task queue.',
      gradient: 'from-yellow-500/20 to-orange-500/20',
    },
    {
      icon: ShoppingBag,
      title: 'Marketplace and community',
      desc: 'Publish created assets to the marketplace and carry discussions or feedback into the community area.',
      gradient: 'from-orange-500/20 to-purple-500/20',
    },
  ];

  return (
    <section className="py-24 md:py-48 relative overflow-hidden" id="features">
      <HomeBackdrop
        image={FeaturesBG}
        className="opacity-40 transform scale-110 rotate-1"
        topFade
        bottomFade
      />

      <Container>
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-24">
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6"
            >
              <Sparkles className="w-3 h-3" /> Studio features
            </motion.div>

            <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-8 leading-none">
              Every core module has <br className="hidden lg:block" /> its own workflow.
            </h2>
            <p className="text-lg md:text-xl text-gray-500 max-w-xl font-bold leading-relaxed mb-6">
              Chat, image, audio, and 3D tools each use focused controls while staying connected to the same LudusGen workspace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] blur-xl`} />

                <div className="relative h-full glass-panel p-10 rounded-[2.5rem] border border-white/5 hover:border-white/20 transition-all duration-500 flex flex-col items-start gap-8 overflow-hidden bg-white/[0.02]">
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
