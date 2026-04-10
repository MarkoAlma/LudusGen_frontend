import React from 'react';
import { Sparkles, Twitter, Github, Linkedin, Mail } from 'lucide-react';
import Container from '../ui/Container';

export default function Footer() {
  return (
    <footer className="relative py-20 border-t border-white/5 bg-[#03000a] overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[30vh] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20 relative z-10">
          {/* Brand Col */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary fill-primary/30" />
              </div>
              <span className="text-xl font-black tracking-tighter italic text-white">
                LudusGen.
              </span>
            </div>
            <p className="text-sm font-bold text-gray-500 leading-relaxed max-w-xs">
              A jövő AI ökoszisztémája. Alkoss, fejlessz és innoválj a legfejlettebb neurális hálózatokkal.
            </p>
            <div className="flex gap-4">
              {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
                <button key={i} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Links 1: Platform */}
          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-8">Platform</h4>
            <ul className="space-y-4">
              {['AI Chat Studio', 'Neural Images', 'Audio Engine', '3D Forge Foundry'].map(link => (
                <li key={link}><a href="#" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          {/* Links 2: Resources */}
          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-8">Resources</h4>
            <ul className="space-y-4">
              {['Documentation', 'API Reference', 'Community Lab', 'Changelog'].map(link => (
                <li key={link}><a href="#" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          {/* Links 3: Company */}
          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-8">Company</h4>
            <ul className="space-y-4">
              {['About Lab', 'Mission Control', 'Privacy Policy', 'Terms of Service'].map(link => (
                <li key={link}><a href="#" className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            © {new Date().getFullYear()} LUDUSGEN LABORATORY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">All Systems Operational</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
