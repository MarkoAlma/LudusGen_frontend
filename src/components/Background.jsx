import React from 'react';
import { useLocation } from 'react-router-dom';
import HeroBg from '../assets/bg/hero_bg.png';
import ForumBg from '../assets/backgrounds/forum_bg.png';
import SettingsBg from '../assets/backgrounds/settings_bg.png';

export default function Background() {
  const location = useLocation();

  const isChat = location.pathname.startsWith('/chat');
  const isImage = location.pathname.startsWith('/image');
  const isAudio = location.pathname.startsWith('/audio');
  const isWorkspace = isChat || isImage || isAudio;
  const isForum = location.pathname.startsWith('/forum');
  const isSettings = location.pathname.startsWith('/settings');
  const isProfile = location.pathname.startsWith('/profile');
  const isAccountPage = isSettings || isProfile;
  const isHome = location.pathname === '/';

  const orbs = [
    { left: '10%', top: '20%', size: '40vw', color: 'rgba(124, 58, 237, 0.12)', duration: '20s', delay: '0s' },
    { left: '80%', top: '60%', size: '35vw', color: 'rgba(59, 130, 246, 0.12)', duration: '25s', delay: '-5s' },
    { left: '50%', top: '40%', size: '45vw', color: 'rgba(219, 39, 119, 0.08)', duration: '30s', delay: '-10s' },
  ];

  return (
    <>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-float {
            animation: float var(--duration) ease-in-out infinite;
            animation-delay: var(--delay);
          }
        `}
      </style>

      <div className="fixed inset-0 z-0 bg-[#03000a] overflow-hidden pointer-events-none">

        {/* Animated Orbs (Deep Layer) */}
        {orbs.map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-[120px] animate-float"
            style={{
              left: orb.left,
              top: orb.top,
              width: orb.size,
              height: orb.size,
              backgroundColor: orb.color,
              '--duration': orb.duration,
              '--delay': orb.delay,
            }}
          />
        ))}

        {/* Route-specific background images */}
        {!isWorkspace && (
          <div
            className="absolute inset-0 transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${isForum ? ForumBg : isAccountPage ? SettingsBg : HeroBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: isHome ? 0 : (isForum || isAccountPage ? 0.2 : 0.35),
              filter: isForum || isAccountPage ? 'blur(20px) saturate(0.4)' : 'none',
              transform: isForum || isAccountPage ? 'scale(1.1)' : 'scale(1)',
            }}
          />
        )}

        {/* Chat route: very subtle constellation pattern instead of image */}
        {isWorkspace && (
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%238b5cf6' stop-opacity='0.5'/%3E%3Cstop offset='100%25' stop-color='%233b82f6' stop-opacity='0.2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='80' r='1.5' fill='url(%23g)'/%3E%3Ccircle cx='150' cy='40' r='1' fill='url(%23g)'/%3E%3Ccircle cx='250' cy='120' r='1.5' fill='url(%23g)'/%3E%3Ccircle cx='350' cy='60' r='1' fill='url(%23g)'/%3E%3Ccircle cx='100' cy='200' r='1' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='180' r='1.5' fill='url(%23g)'/%3E%3Ccircle cx='300' cy='250' r='1' fill='url(%23g)'/%3E%3Ccircle cx='80' cy='300' r='1.5' fill='url(%23g)'/%3E%3Ccircle cx='180' cy='320' r='1' fill='url(%23g)'/%3E%3Ccircle cx='320' cy='350' r='1.5' fill='url(%23g)'/%3E%3Ccircle cx='380' cy='280' r='1' fill='url(%23g)'/%3E%3Ccircle cx='280' cy='150' r='1' fill='url(%23g)'/%3E%3Cline x1='50' y1='80' x2='150' y2='40' stroke='url(%23g)' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='150' y1='40' x2='250' y2='120' stroke='url(%23g)' stroke-width='0.5' opacity='0.3'/%3E%3Cline x1='250' y1='120' x2='350' y2='60' stroke='url(%23g)' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='50' y1='80' x2='100' y2='200' stroke='url(%23g)' stroke-width='0.5' opacity='0.3'/%3E%3Cline x1='100' y1='200' x2='200' y2='180' stroke='url(%23g)' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='200' y1='180' x2='280' y2='150' stroke='url(%23g)' stroke-width='0.5' opacity='0.3'/%3E%3Cline x1='280' y1='150' x2='350' y2='60' stroke='url(%23g)' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='100' y1='200' x2='80' y2='300' stroke='url(%23g)' stroke-width='0.5' opacity='0.3'/%3E%3Cline x1='80' y1='300' x2='180' y2='320' stroke='url(%23g)' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='180' y1='320' x2='320' y2='350' stroke='url(%23g)' stroke-width='0.5' opacity='0.3'/%3E%3Cline x1='320' y1='350' x2='380' y2='280' stroke='url(%23g)' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='380' y1='280' x2='300' y2='250' stroke='url(%23g)' stroke-width='0.5' opacity='0.3'/%3E%3Cline x1='300' y1='250' x2='200' y2='180' stroke='url(%23g)' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='250' y1='120' x2='280' y2='150' stroke='url(%23g)' stroke-width='0.5' opacity='0.3'/%3E%3Cline x1='200' y1='180' x2='300' y2='250' stroke='url(%23g)' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E")`,
              backgroundSize: '400px 400px',
            }}
          />
        )}

        {/* Noise Grid Layer (Micro-detail) */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Global Vignette & Depth Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#03000a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,#03000a_120%)]" />
      </div>
    </>
  );
}
