import { Sparkles, ChevronRight } from "lucide-react";

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
      { name: "Súgó központ", href: "#help" },
      { name: "Közösség", href: "#community" },
      { name: "API státusz", href: "#status" },
      { name: "Partnerprogramm", href: "#partner" },
    ],
  };

  const complianceBadges = [
    { icon: "🇪🇺", title: "GDPR", subtitle: "Compliant", gradient: "from-purple-500/20 to-pink-500/20" },
    { icon: "🔒", title: "ISO 27001", subtitle: "Certified", gradient: "from-cyan-500/20 to-blue-500/20" },
    { icon: "✓", title: "SOC 2", subtitle: "Type II", gradient: "from-emerald-500/20 to-teal-500/20" },
  ];

  const socialLinks = [
    { symbol: "𝕏", gradient: "from-purple-500/10", border: "border-purple-500/20", hover: "hover:border-purple-500/50", color: "text-purple-400 group-hover:text-purple-300", glow: "bg-purple-500/20" },
    { symbol: "in", gradient: "from-pink-500/10", border: "border-pink-500/20", hover: "hover:border-pink-500/50", color: "text-pink-400 group-hover:text-pink-300", glow: "bg-pink-500/20" },
    { symbol: "▶", gradient: "from-cyan-500/10", border: "border-cyan-500/20", hover: "hover:border-cyan-500/50", color: "text-cyan-400 group-hover:text-cyan-300", glow: "bg-cyan-500/20" },
  ];

  return (
    <footer className="relative border-t border-purple-500/10 bg-black/60 backdrop-blur-3xl overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        
        {/* Brand & Newsletter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-12 lg:mb-16">
          
          {/* Brand Info */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center space-x-3 group">
              <div className="relative">
                <Sparkles className="w-8 h-8 lg:w-9 lg:h-9 text-purple-400 group-hover:text-cyan-400 transition-all duration-500 group-hover:rotate-180" />
                <div className="absolute inset-0 bg-purple-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                LudusGen
              </span>
            </div>
            
            {/* Description */}
            <p className="text-gray-400 text-sm lg:text-base leading-relaxed max-w-md">
              A világ legfejlettebb AI platformja. Egyesítjük a legjobb
              technológiákat, hogy te mindig egy lépéssel előrébb járj.
            </p>

            {/* Social Links */}
            <div className="flex gap-2.5 lg:gap-3">
              {socialLinks.map((social, index) => (
                <a key={index} href="#" className="group relative">
                  <div className={`relative z-10 w-11 h-11 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br ${social.gradient} to-transparent border ${social.border} flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${social.hover} hover:scale-110`}>
                    <span className={`${social.color} transition-colors text-base lg:text-lg font-bold`}>
                      {social.symbol}
                    </span>
                  </div>
                  <div className={`absolute inset-0 rounded-xl lg:rounded-2xl ${social.glow} blur-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-2xl lg:rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl lg:rounded-3xl p-5 lg:p-8 backdrop-blur-sm">
                <h3 className="text-base lg:text-xl font-bold text-white mb-2 lg:mb-3 flex items-center gap-2">
                  <span className="text-lg lg:text-2xl">✨</span>
                  <span className="lg:hidden">Hírlevél</span>
                  <span className="hidden lg:inline">Iratkozz fel hírlevelünkre</span>
                </h3>
                <p className="text-gray-400 text-xs lg:text-sm mb-4 lg:mb-6">
                  <span className="lg:hidden">Friss hírek és exkluzív tartalmak.</span>
                  <span className="hidden lg:inline">Legfrissebb fejlesztések és exkluzív tartalmak.</span>
                </p>
                <div className="flex flex-col lg:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    className="flex-1 px-4 py-2.5 lg:py-3 bg-white/5 border border-white/10 rounded-xl text-sm lg:text-base text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <button className="px-5 lg:px-6 py-2.5 lg:py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-sm lg:text-base text-white hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 whitespace-nowrap">
                    Feliratkozás
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Links Grid - Mobile: 2 columns, Desktop: 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8 lg:gap-12 mb-10 lg:mb-12">
          {/* Product Links */}
          <div className="justify-self-start w-full">
            <FooterLinkColumn
              title="Termék"
              links={footerLinks.product}
              barColor="from-purple-500 to-pink-500"
              iconColor="text-purple-400"
            />
          </div>

          {/* Company Links */}
          <div className="justify-self-end lg:justify-self-start w-full">
            <FooterLinkColumn
              title="Vállalat"
              links={footerLinks.company}
              barColor="from-pink-500 to-rose-500"
              iconColor="text-pink-400"
            />
          </div>

          {/* Legal Links */}
          <div className="justify-self-start w-full">
            <FooterLinkColumn
              title="Jogi"
              links={footerLinks.legal}
              barColor="from-cyan-500 to-blue-500"
              iconColor="text-cyan-400"
            />
          </div>

          {/* Resources Links */}
          <div className="justify-self-end lg:justify-self-start w-full">
            <FooterLinkColumn
              title="Erőforrások"
              links={footerLinks.resources}
              barColor="from-amber-500 to-orange-500"
              iconColor="text-amber-400"
            />
          </div>
        </div>

        {/* Compliance Badges */}
        <div className="mb-8 lg:mb-12">
          <div className="grid grid-cols-3 gap-2 lg:gap-3 max-w-2xl mx-auto">
            {complianceBadges.map((badge, index) => (
              <ComplianceBadge key={index} {...badge} />
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 lg:pt-8 border-t border-white/5">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-3 lg:gap-4">
            <p className="text-gray-600 text-[11px] lg:text-sm text-center lg:text-left">
              © 2026 <span className="text-gray-500 font-semibold">LudusGen</span>. Minden jog fenntartva.
            </p>
            
            <div className="flex items-center gap-4 lg:gap-6 text-[11px] lg:text-xs text-gray-600">
              <a href="#" className="hover:text-gray-400 transition-colors">Adatvédelem</a>
              <span className="text-gray-700">•</span>
              <a href="#" className="hover:text-gray-400 transition-colors">Feltételek</a>
              <span className="text-gray-700">•</span>
              <a href="#" className="hover:text-gray-400 transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Footer Link Column Component
function FooterLinkColumn({ title, links, barColor, iconColor }) {
  return (
    <div className="space-y-3 lg:space-y-4 text-left">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-1 lg:w-1.5 h-5 lg:h-6 bg-gradient-to-b ${barColor} rounded-full`} />
        <h4 className="font-bold text-white text-xs lg:text-base">{title}</h4>
      </div>
      <ul className="space-y-2.5 lg:space-y-3">
        {links.map((link) => (
          <li key={link.name}>
            <a
              href={link.href}
              className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-200 text-xs lg:text-sm"
            >
              <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 -ml-5 group-hover:ml-0 transition-all duration-200 ${iconColor}`} />
              <span className="break-words">{link.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Compliance Badge Component
function ComplianceBadge({ icon, title, subtitle, gradient }) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-xl lg:rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex flex-col lg:flex-row items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
        <span className="text-lg lg:text-xl">{icon}</span>
        <div className="text-center lg:text-left">
          <div className="text-[10px] lg:text-xs font-semibold text-white whitespace-nowrap">
            {title}
          </div>
          <div className="text-[9px] lg:text-[10px] text-gray-500">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}