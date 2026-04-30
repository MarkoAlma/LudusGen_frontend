import React from 'react';
import { ArrowLeft, Home, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="relative -mt-20 flex min-h-screen items-center justify-center overflow-hidden bg-[#03000a] px-6 py-32 text-white md:-mt-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(138,43,226,0.22),transparent_48%),radial-gradient(circle_at_72%_68%,rgba(34,211,238,0.12),transparent_34%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#03000a]/30 to-[#03000a]" />
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.03]" />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl text-center"
      >
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-primary/15 text-primary shadow-[0_0_50px_rgba(138,43,226,0.22)]">
          <SearchX className="h-9 w-9" />
        </div>

        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.35em] text-primary">404 - Page Not Found</p>
        <h1 className="text-4xl font-black italic tracking-tighter text-white sm:text-6xl">
          This page does not exist.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm font-bold leading-relaxed text-gray-400 sm:text-base">
          The link may be mistyped, moved, or no longer available. Check the URL or return to a valid LudusGen page.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => navigate('/')}>
            <Home className="h-5 w-5" />
            Go Home
          </Button>
          <Button variant="subtle" size="lg" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </Button>
        </div>
      </motion.section>
    </main>
  );
}
