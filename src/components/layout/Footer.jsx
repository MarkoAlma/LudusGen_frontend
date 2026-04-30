import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, FileText, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import Container from '../ui/Container';
import { MyUserContext } from '../../context/MyUserProvider';

const LEGAL_UPDATED = 'April 28, 2026';

const columns = [
  {
    title: 'Platform',
    links: [
      { label: 'AI Code', to: '/chat?tab=chat', requiresAuth: true },
      { label: 'AI Images', to: '/chat?tab=image', requiresAuth: true },
      { label: 'AI Audio', to: '/chat?tab=audio', requiresAuth: true },
      { label: 'AI 3D', to: '/chat?tab=3d', requiresAuth: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Marketplace', to: '/marketplace' },
      { label: 'Community Lab', to: '/forum' },
      { label: 'Support', href: 'mailto:support@ludusgen.com' },
      { label: 'Report IP issue', href: 'mailto:legal@ludusgen.com?subject=LudusGen%20IP%20notice' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', to: '/legal/terms' },
      { label: 'Privacy Policy', to: '/legal/privacy' },
      { label: 'Cookie Policy', to: '/legal/cookies' },
    ],
  },
];

function FooterLink({ link, user, setIsAuthOpen }) {
  const className = 'text-sm font-bold text-gray-500 hover:text-primary transition-colors';

  if (link.requiresAuth && !user) {
    return (
      <button type="button" onClick={() => setIsAuthOpen(true)} className={`${className} text-left`}>
        {link.label}
      </button>
    );
  }

  if (link.to) {
    return (
      <Link to={link.to} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}

export default function Footer() {
  const { user, setIsAuthOpen } = useContext(MyUserContext);

  return (
    <footer className="relative py-20 border-t border-white/5 bg-[#03000a] overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[30vh] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20 relative z-10">
          {/* Brand Col */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary fill-primary/30" />
              </div>
              <span className="text-xl font-black tracking-tighter italic text-white">
                LudusGen.
              </span>
            </Link>
            <p className="text-sm font-bold text-gray-500 leading-relaxed max-w-xs">
              AI workspace for images, audio, 3D assets, community creation, and a digital asset marketplace.
            </p>
            <div className="flex gap-4">
              <a
                href="mailto:support@ludusgen.com"
                aria-label="Contact support"
                title="Contact support"
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <Mail className="w-4 h-4" />
              </a>
              <Link
                to="/legal/terms"
                aria-label="Terms of Service"
                title="Terms of Service"
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <FileText className="w-4 h-4" />
              </Link>
              <Link
                to="/legal/privacy"
                aria-label="Privacy Policy"
                title="Privacy Policy"
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <ShieldCheck className="w-4 h-4" />
              </Link>
              <Link
                to="/legal/cookies"
                aria-label="Cookie Policy"
                title="Cookie Policy"
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <Cookie className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-8">{column.title}</h4>
              <ul className="space-y-4">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} user={user} setIsAuthOpen={setIsAuthOpen} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            © {new Date().getFullYear()} LUDUSGEN. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Legal updated {LEGAL_UPDATED}</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
