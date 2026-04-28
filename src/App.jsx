import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import PageTransition from './components/layout/PageTransition';
import Home from './pages/Home';
import LudusGenAdmin from './pages/Admin';
import AuthModal from './pages/Login';
import { useContext } from 'react';
import { MyUserContext } from './context/MyUserProvider';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { Toaster } from 'react-hot-toast';
import MyToastify from './components/MyToastify';
import ResetPassword from './components/ResetPassword';
import VerifyEmail from './components/VerifyEmail';
import Settings from './pages/Settings';
import { ProtectedRoute } from './ProtectedRoute';
import AIChat from './ai_components/AiChat';
import { auth } from './firebase/firebaseApp';
import Forum from './pages/Forum';
import Marketplace from './pages/Marketplace';
import { AnimatePresence } from 'framer-motion';
import CreditTopup from './components/CreditTopup';

function App() {
  const { showNavbar, setShowNavbar, user, isAuthOpen, setIsAuthOpen, msg, setMsg, is2FAEnabled, showCreditTopup, setShowCreditTopup } = useContext(MyUserContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isForumRoute = location.pathname.startsWith('/forum');

  useEffect(() => {
    if (isAuthOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAuthOpen]);

  useEffect(() => {
    if (location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      const mode = params.get('mode');
      if (mode === 'resetPassword') {
        navigate(`/reset-password${location.search}`, { replace: true });
      } else if (mode === 'verifyEmail') {
        navigate(`/verify-email${location.search}`, { replace: true });
      }
    }
  }, [location, navigate]);

  const closeAuth = () => {
    setIsAuthOpen(false);
    setShowNavbar(true);
  };
  
  const getAuthToken = useCallback((forceRefresh = false) => auth.currentUser?.getIdToken(forceRefresh), []);

  return (
    <div className="min-h-screen bg-black text-white relative">
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname.split('/')[1] || '/'}>

            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/chat" element={
              <PageTransition>
                <ProtectedRoute>
                  <AIChat user={user} getIdToken={getAuthToken} />
                </ProtectedRoute>
              </PageTransition>
            } />
            <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
            <Route path="/verify-email" element={<PageTransition><VerifyEmail /></PageTransition>} />
            <Route path="/forum/*" element={<PageTransition><Forum /></PageTransition>} />
            <Route path="/marketplace" element={<PageTransition><Marketplace /></PageTransition>} />
            <Route path="/profile" element={
              <PageTransition>
                <ProtectedRoute><Settings /></ProtectedRoute>
              </PageTransition>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Navigate to="/profile" replace />
              </ProtectedRoute>
            } />
          </Routes>
        </AnimatePresence>
      </AppLayout>

      <LudusGenAdmin />
      <AuthModal isOpen={isAuthOpen} onClose={closeAuth} />
      <CreditTopup isOpen={showCreditTopup} onClose={() => setShowCreditTopup(false)} />

      {msg && <MyToastify {...msg} />}
    </div>
  );
}

export default App;
