import React from 'react';
import { motion } from 'framer-motion';
import { Box, Image as ImageIcon, MessageSquare, Music } from 'lucide-react';
import Container from '../ui/Container';
import { ALL_MODELS } from '../../ai_components/models';

export default function TrustStrip() {
  const metrics = [
    {
      value: ALL_MODELS.filter((model) => model.panelType === 'chat').length,
      label: 'chat model',
      icon: MessageSquare,
      color: 'text-primary',
    },
    {
      value: ALL_MODELS.filter((model) => model.panelType === 'image').length,
      label: 'image tool',
      icon: ImageIcon,
      color: 'text-blue-400',
    },
    {
      value: ALL_MODELS.filter((model) => model.panelType === 'audio').length,
      label: 'audio model',
      icon: Music,
      color: 'text-emerald-400',
    },
    {
      value: ALL_MODELS.filter((model) => ['trellis', 'tripo'].includes(model.panelType)).length,
      label: '3D workflow',
      icon: Box,
      color: 'text-amber-500',
    },
  ];

  return (
    <section className="relative -mt-px pt-8 pb-14 sm:py-4 md:py-16 lg:m-0 lg:py-4 bg-[#03000a] sm:bg-transparent md:bg-[#03000a] lg:bg-transparent overflow-hidden">
      <div className="absolute inset-x-0 -top-24 h-56 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.22),rgba(3,0,10,0.35)_45%,transparent_72%)]" />
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-[-10%] hidden md:block w-[120%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-shimmer" />
        <div className="absolute bottom-0 right-[-10%] w-[120%] h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-shimmer-reverse" />
      </div>

      <Container>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-4 md:gap-16 items-center justify-center relative z-10">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 group"
              >
                <div className={`p-4 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-white/10 group-hover:scale-110 transition-all duration-500 ${metric.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-center md:text-left space-y-1">
                  <div className="text-3xl md:text-4xl font-black text-white italic tracking-tighter leading-none">
                    {metric.value}
                  </div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] opacity-60 group-hover:opacity-100 transition-opacity">
                    {metric.label}
                  </div>
                </div>

                {i < 3 && (
                  <div className="hidden lg:block w-px h-12 bg-gradient-to-b from-transparent via-white/5 to-transparent ml-8" />
                )}
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
