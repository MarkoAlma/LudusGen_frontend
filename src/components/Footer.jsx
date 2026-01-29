import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-black/40 backdrop-blur-2xl">
           <footer className="relative border-t border-white/5 bg-black/40 backdrop-blur-2xl">
              <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-3 mb-6">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        AI Nexus
                      </span>
                    </div>
                    <p className="text-gray-500 leading-relaxed mb-6">
                      A világ legfejlettebb AI platformja. Egyesítjük a legjobb technológiákat, 
                      hogy te mindig egy lépéssel előrébb járj.
                    </p>
                    <div className="flex space-x-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition cursor-pointer">
                        <span className="text-xs">𝕏</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition cursor-pointer">
                        <span className="text-xs">in</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition cursor-pointer">
                        <span className="text-xs">▶</span>
                      </div>
                    </div>
                  </div>
      
                  <div>
                    <h4 className="font-bold mb-6 text-white">Termék</h4>
                    <ul className="space-y-3 text-gray-500">
                      <li><a href="#" className="hover:text-white transition">Funkciók</a></li>
                      <li><a href="#" className="hover:text-white transition">Árazás</a></li>
                      <li><a href="#" className="hover:text-white transition">API</a></li>
                      <li><a href="#" className="hover:text-white transition">Integráció</a></li>
                      <li><a href="#" className="hover:text-white transition">Changelog</a></li>
                    </ul>
                  </div>
      
                  <div>
                    <h4 className="font-bold mb-6 text-white">Vállalat</h4>
                    <ul className="space-y-3 text-gray-500">
                      <li><a href="#" className="hover:text-white transition">Rólunk</a></li>
                      <li><a href="#" className="hover:text-white transition">Blog</a></li>
                      <li><a href="#" className="hover:text-white transition">Karrier</a></li>
                      <li><a href="#" className="hover:text-white transition">Press Kit</a></li>
                      <li><a href="#" className="hover:text-white transition">Kapcsolat</a></li>
                    </ul>
                  </div>
      
                  <div>
                    <h4 className="font-bold mb-6 text-white">Jogi</h4>
                    <ul className="space-y-3 text-gray-500">
                      <li><a href="#" className="hover:text-white transition">Adatvédelem</a></li>
                      <li><a href="#" className="hover:text-white transition">Feltételek</a></li>
                      <li><a href="#" className="hover:text-white transition">Cookie</a></li>
                      <li><a href="#" className="hover:text-white transition">Compliance</a></li>
                      <li><a href="#" className="hover:text-white transition">GDPR</a></li>
                    </ul>
                  </div>
                </div>
      
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center">
                  <p className="text-gray-600 text-sm mb-4 md:mb-0">
                    © 2026 AI Nexus Technologies Inc. Minden jog fenntartva.
                  </p>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>🇪🇺 GDPR Compliant</span>
                    <span>🔒 ISO 27001</span>
                    <span>✓ SOC 2 Type II</span>
                  </div>
                </div>
              </div>
            </footer>
    </footer>
  );
}

