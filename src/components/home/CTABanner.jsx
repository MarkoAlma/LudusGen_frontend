import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Container from '../ui/Container';
import { MyUserContext } from '../../context/MyUserProvider';
import HomeBackdrop from './HomeBackdrop';
import CTABG from '../../assets/ludusgen_XVCGbiWdME0qkh5OzkEb.avif';

export default function CTABanner() {
  const navigate = useNavigate();
  const { user, setIsAuthOpen } = useContext(MyUserContext);

  const openStudio = () => {
    if (user) {
      navigate('/chat?tab=chat');
      return;
    }
    setIsAuthOpen(true);
  };

  return (
    <section className="py-24 md:py-48 relative overflow-hidden">
      <HomeBackdrop
        image={CTABG}
        className="opacity-50 transform scale-105"
        topFade
      />

      <Container>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative glass-panel p-12 md:p-32 rounded-[4rem] border border-white/5 overflow-hidden text-center flex flex-col items-center gap-12 shadow-[0_50px_100px_rgba(0,0,0,0.8)] bg-white/[0.01]"
        >
          <div className="relative z-10 space-y-8 max-w-4xl">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-primary/40 mx-auto"
            >
              <Zap className="w-4 h-4 fill-white text-white" /> Ready to create
            </motion.div>

            <h2 className="text-4xl md:text-7xl lg:text-8xl font-black text-white italic leading-[0.85] tracking-tighter">
              Open the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-emerald-400 italic">AI Studio.</span>
            </h2>

            <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto font-bold leading-relaxed">
              Start in chat, switch to image, audio, or 3D, then take finished assets into the marketplace and community spaces.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-6">
            <button
              onClick={openStudio}
              className="px-12 py-6 rounded-[2.5rem] bg-white text-black font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-[0_25px_60px_rgba(255,255,255,0.2)] flex items-center gap-4 group"
            >
              AI Studio <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/forum')}
              className="px-12 py-6 rounded-[2.5rem] bg-white/5 border border-white/10 text-white font-black text-xl backdrop-blur-3xl transition-all hover:bg-white/10 flex items-center gap-4"
            >
              <Sparkles className="w-5 h-5 text-primary" /> Community
            </button>
          </div>

          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 blur-[100px] opacity-30" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] opacity-20" />
        </motion.div>
      </Container>
    </section>
  );
}
