import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Background from './components/Background';
import Navbar from './components/Nav';
import Home from './pages/Home';
import Footer from './components/Footer';
import Admin from './pages/Admin';
import LudusGenAdmin from './pages/Admin';
import AIChat from './pages/Chat';
import AuthPage from './pages/Login';
import AuthModal from './pages/Login';
import { useContext } from 'react';
import { MyUserContext } from './context/MyUserProvider';


function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const {isAuthOpen, setIsAuthOpen} = useContext(MyUserContext)

  useEffect(() => {
    const handleMouseMove = e => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
  if (isAuthOpen) {
    document.body.classList.add("overflow-hidden");
  } else {
    document.body.classList.remove("overflow-hidden");
  }

  return () => document.body.classList.remove("overflow-hidden");
}, [isAuthOpen]);

  return (

      <div className="min-h-screen bg-black text-white relative">
        <Background  />
        <Navbar />

        <main>
          <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/chat" element={<AIChat/>} />
            <Route path="/login" element={<AuthPage/>} />
          </Routes>
        </main>
        <LudusGenAdmin/>
        <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />
        <Footer />
      </div>

  );
}

export default App;
