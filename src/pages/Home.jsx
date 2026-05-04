import React from 'react';
import Hero from '../components/home/Hero';
import TrustStrip from '../components/home/TrustStrip';
import FeaturesGrid from '../components/home/FeaturesGrid';
import ToolsPreview from '../components/home/ToolsPreview';
import Pricing from '../components/home/Pricing';
import CTABanner from '../components/home/CTABanner';

export default function Home() {
  return (
    <div className="flex flex-col bg-[#03000a]">
       <div className="relative">
         <Hero />
         <div className="sm:absolute sm:inset-x-0 sm:bottom-4 sm:z-20 md:static lg:absolute lg:bottom-6">
           <TrustStrip />
         </div>
       </div>
       <FeaturesGrid />
       <ToolsPreview />
       <Pricing />
       <CTABanner />
    </div>
  );
}
