import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import PageTransition from './components/layout/PageTransition';
import Home from './pages/Home';
import LudusGenAdmin from './pages/Admin';
import AuthModal from './pages/Login';
import { useContext } from 'react';
import { MyUserContext } from './context/MyUserProvider';
import { ToastContainer } from 'react-toastify';
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
import { AnimatePresence } from 'framer-motion';

function App() {
  const {showNavbar, setShowNavbar, user, isAuthOpen, setIsAuthOpen, msg, setMsg, is2FAEnabled} = useContext(MyUserContext);
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

  return (
    <div className="min-h-screen bg-black text-white relative">
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/chat" element={
              <PageTransition>
                <ProtectedRoute>
                  <AIChat user={user} getIdToken={() => auth.currentUser?.getIdToken(true)} />
                </ProtectedRoute>
              </PageTransition>
            } />
            <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
            <Route path="/verify-email" element={<PageTransition><VerifyEmail /></PageTransition>} />
            <Route path="/forum/*" element={<PageTransition><Forum /></PageTransition>} />
            <Route path="/settings" element={
              <PageTransition>
                <ProtectedRoute><Settings /></ProtectedRoute>
              </PageTransition>
            } />
          </Routes>
        </AnimatePresence>
      </AppLayout>

      <LudusGenAdmin />
      <AuthModal isOpen={isAuthOpen} onClose={closeAuth} />

      {msg && <MyToastify {...msg} />}
    </div>
  );
}

export default App;