import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Background from './components/Background';
import Navbar from './components/Nav';
import Home from './pages/Home';
import Footer from './components/Footer';
import LudusGenAdmin from './pages/Admin';
import AIChat from './pages/Chat';
import AuthPage from './pages/Login';
import AuthModal from './pages/Login';
import { useContext } from 'react';
import { MyUserContext } from './context/MyUserProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { Toaster } from 'react-hot-toast';
import MyToastify from './components/MyToastify';
import ResetPassword from './components/ResetPassword';

function App() {
  const {showNavbar, setShowNavbar, user, isAuthOpen, setIsAuthOpen, msg, setMsg} = useContext(MyUserContext)
  const navigate = useNavigate()

  const bezar = ()=> {
    setIsAuthOpen(false)
    setShowNavbar(true)
  }

  useEffect(()=>{
    if (user?.emailVerified) {
      setIsAuthOpen(false)
      setShowNavbar(true)
    }
  },[user])

  // Scroll lock on modal open
  useEffect(() => {
    if (isAuthOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup when the component is unmounted or modal is closed
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAuthOpen]);

useEffect(() => {
  // Ha a gyökérúton van Firebase action
  if (location.pathname === '/') {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    
    if (mode === 'resetPassword') {
      // ✅ Átirányítás a reset oldalra PARAMÉTEREKKEL (a ResetPassword komponens majd kitörli őket)
      navigate(`/reset-password${location.search}`, { replace: true });
    }
  }
}, [location, navigate]);

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Background />
      <Navbar/>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </main>

      <LudusGenAdmin />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => bezar()}
      />
      <Footer />

      {msg && <MyToastify {...msg} />}
    </div>
  );
}

export default App;
