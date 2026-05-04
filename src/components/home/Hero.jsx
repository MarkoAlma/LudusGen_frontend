import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Container from '../ui/Container';
import { ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';
import { MyUserContext } from '../../context/MyUserProvider';
import HomeBackdrop from './HomeBackdrop';
import HeroRender from '../../assets/ludusgen_WqbSkeD7zYPnJkdmdmtR.avif';

export default function Hero() {
  const navigate = useNavigate();
  const { user, setIsAuthOpen } = useContext(MyUserContext);

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  const openStudio = () => {
    if (user) {
      navigate('/chat?tab=chat');
      return;
    }
    setIsAuthOpen(true);
  };

  return (
    <section className="relative pt-24 pb-6 sm:min-h-screen sm:pt-32 sm:pb-28 md:min-h-0 md:pt-40 md:pb-36 lg:min-h-screen overflow-hidden">
      <HomeBackdrop
        image={HeroRender}
        className="opacity-40 transform scale-110"
        overlayClassName="bg-gradient-to-b from-transparent via-[#03000a]/30 to-[#03000a]"
      />

      <Container>
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 sm:gap-16 lg:gap-24">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="flex-1 text-center lg:text-left"
          >
            <motion.div variants={itemVariants} className="mb-5 sm:mb-8 inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em] sm:tracking-[0.3em]">
              <Sparkles className="w-4 h-4" /> Chat, image, audio and 3D
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-[2.85rem] sm:text-5xl md:text-7xl lg:text-8xl font-black text-white italic tracking-tighter leading-[0.9] mb-6 sm:mb-10"
            >
              LudusGen <br />
              <span className="text-primary italic">AI Studio.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg md:text-xl text-gray-500 mb-8 sm:mb-12 max-w-lg sm:max-w-xl font-bold leading-7 sm:leading-relaxed"
            >
              One workspace for chat, image understanding, image generation, audio, music, and 3D assets. Switch studios, models, and workflows without leaving the same interface.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center lg:justify-start">
              <button
                onClick={openStudio}
                className="px-7 sm:px-10 py-4 sm:py-5 rounded-[1.75rem] sm:rounded-[2rem] bg-primary text-white font-black text-base sm:text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(138,43,226,0.3)] flex items-center justify-center gap-3 group"
              >
                Open AI Studio <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="px-7 sm:px-10 py-4 sm:py-5 rounded-[1.75rem] sm:rounded-[2rem] bg-white/5 border border-white/10 text-white font-bold text-base sm:text-lg backdrop-blur-md transition-all hover:bg-white/10 flex items-center justify-center gap-3"
              >
                <ShoppingBag className="w-4 h-4 text-primary" /> Marketplace
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="hidden lg:block flex-1 w-full max-w-none aspect-square relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full scale-75 animate-pulse" />

            <div className="absolute -top-10 -right-10 hidden xl:block p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">Active modules</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                <span>Chat</span>
                <span>Image</span>
                <span>Audio</span>
                <span>3D</span>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
