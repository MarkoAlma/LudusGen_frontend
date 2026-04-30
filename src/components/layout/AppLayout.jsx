import React from 'react';
import Background from '../Background';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

export default function AppLayout({ children, hideNav = false, hideFooter = false }) {
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

  const isHome = location.pathname === '/';
  const isForum = location.pathname.startsWith('/forum');
  const isMarketplace = location.pathname.startsWith('/marketplace');

  return (
    <>
      {!isForum && <Background />}
      {!hideNav && <Navbar />}
      <main className={`relative z-10 ${
        isChat 
          ? 'h-screen flex flex-col overflow-hidden' 
          : `min-h-screen ${isHome || isMarketplace ? '' : 'pt-20 md:pt-24'}`
      }`}>
        {isChat ? (
          <div className="flex-1 min-h-0 w-full relative flex flex-col">
            {children}
          </div>
        ) : children}
      </main>
      {!isChat && !hideFooter && <Footer />}
    </>
  );
}
