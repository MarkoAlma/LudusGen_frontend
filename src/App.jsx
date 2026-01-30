import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import './App.css';

function App() {
  const { isAuthOpen, setIsAuthOpen } = useContext(MyUserContext);
  const {showNavbar, setShowNavbar} = useContext(MyUserContext)

  const bezar = ()=> {
    setIsAuthOpen(false)
    setShowNavbar(true)
  }

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

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Background />
      <Navbar/>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </main>

      <LudusGenAdmin />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => bezar()}
      />
      <Footer />
    </div>
  );
}

export default App;
