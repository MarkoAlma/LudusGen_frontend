import { Sparkles, ArrowRight, Twitter, Linkedin, Github } from "lucide-react";

export default function Footer() {
  const footerLinks = {
    product: [
      { name: "Funkciók", href: "#features" },
      { name: "Árazás", href: "#pricing" },
      { name: "API", href: "#api" },
      { name: "Integráció", href: "#integration" },
      { name: "Changelog", href: "#changelog" },
    ],
    company: [
      { name: "Rólunk", href: "#about" },
      { name: "Blog", href: "#blog" },
      { name: "Karrier", href: "#careers" },
      { name: "Press Kit", href: "#press" },
      { name: "Kapcsolat", href: "#contact" },
    ],
    legal: [
      { name: "Adatvédelem", href: "#privacy" },
      { name: "Feltételek", href: "#terms" },
      { name: "Cookie", href: "#cookie" },
      { name: "Compliance", href: "#compliance" },
      { name: "GDPR", href: "#gdpr" },
    ],
    resources: [
      { name: "Dokumentáció", href: "#docs" },
      { name: "Súgó", href: "#help" },
      { name: "Közösség", href: "#community" },
      { name: "Státusz", href: "#status" },
      { name: "Partner", href: "#partner" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "#" },
    { icon: Linkedin, href: "#" },
    { icon: Github, href: "#" },
  ];

  return (
    <footer className="relative bg-bg-base pt-24 pb-12 px-6 sm:px-12 border-t border-white/5 overflow-hidden">
      {/* Background Soft Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[150px] rounded-[100%] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 pb-16">
          
          {/* Brand Info */}
          <div className="lg:col-span-4 flex flex-col items-start pr-0 lg:pr-8">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-bg-base rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-xl font-heading font-extrabold tracking-tight text-white">
                LudusGen
              </span>
            </div>
            
            <p className="font-body text-text-dim text-sm mb-8 leading-relaxed">
              A jövő prémium AI platformja. Elegáns, gyors integrációk, intelligens elemzések és zökkenőmentes adatáramlás.
            </p>

            <div className="flex gap-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a key={index} href={social.href} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-text-dim hover:text-white hover:bg-white/10 transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <FooterLinkColumn title="Termék" links={footerLinks.product} />
            <FooterLinkColumn title="Vállalat" links={footerLinks.company} />
            <FooterLinkColumn title="Jogi" links={footerLinks.legal} />
            <FooterLinkColumn title="Erőforrások" links={footerLinks.resources} />
          </div>
        </div>

        {/* Bottom Newsletter and Copyright */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <input
              type="email"
              placeholder="Iratkozz fel hírlevelünkre"
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 font-body text-sm text-white placeholder-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <button className="px-6 py-3 rounded-xl bg-white text-black font-body font-semibold text-sm hover:bg-white/90 transition-colors flex items-center justify-center whitespace-nowrap shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              Feliratkozás
            </button>
          </div>

          <div className="flex items-center gap-6">
            <p className="font-body text-sm text-text-dim">
              © 2026 LudusGen. Minden jog fenntartva.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkColumn({ title, links }) {
  return (
    <div className="flex flex-col space-y-5">
      <h4 className="font-body font-semibold text-white text-sm">{title}</h4>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.name}>
            <a
              href={link.href}
              className="font-body text-text-dim text-sm hover:text-white transition-colors"
            >
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}