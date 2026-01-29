import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Background from './components/Background';
import Navbar from './components/Nav';
import Home from './pages/Home';
import Footer from './components/Footer';
import Admin from './pages/Admin';
import LudusGenAdmin from './pages/Admin';
import AIChat from './pages/Chat';
import  "./App.css"


function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = e => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white relative">
        <Background  />
        <Navbar />

        <main>
          <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/chat" element={<AIChat/>} />
          </Routes>
        </main>
<LudusGenAdmin/>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
