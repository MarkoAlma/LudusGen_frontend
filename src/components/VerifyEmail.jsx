import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Mail, Loader2 } from 'lucide-react';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../firebase/firebaseApp';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';

export default function VerifyEmail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [oobCode, setOobCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    console.log('URL params:', { mode, code: code ? 'exists' : 'missing' });

    // ✅ Ha nincs code, NE próbáld meg törölni a paramétereket
    if (!code) {
      // Csak akkor jelezz hibát, ha az oobCode state is üres (első betöltés)
      if (!oobCode) {
        setError('Érvénytelen vagy lejárt link');
        setLoading(false);
      }
      return;
    }

    if (mode !== 'verifyEmail') {
      setError('Érvénytelen link típus');
      setLoading(false);
      return;
    }

    // ✅ CSAK AKKOR mentsd el és futtasd le, ha még nincs oobCode elmentve
    if (!oobCode) {
      console.log('Applying action code:', code);
      setOobCode(code);
      
      // Email megerősítése - NE töröljük előtte a paramétereket
      applyActionCode(auth, code)
        .then(() => {
          console.log('Email successfully verified');
          // Most már törölhetjük a paramétereket
          setSearchParams({});
          setSuccess(true);
          setLoading(false);
          
          // 2 másodperc múlva átirányítás a főoldalra
          setTimeout(() => {
            navigate('/');
          }, 2000);
        })
        .catch((err) => {
          console.error('Verification error:', err);
          console.error('Error code:', err.code);
          console.error('Error message:', err.message);
          
          // Töröljük a paramétereket hiba esetén is
          setSearchParams({});
          
          if (err.code === 'auth/expired-action-code') {
            setError('A link lejárt. Kérj új megerősítő emailt.');
          } else if (err.code === 'auth/invalid-action-code') {
            setError('Érvénytelen link. Lehet, hogy már használtad.');
          } else if (err.code === 'auth/user-disabled') {
            setError('Ez a fiók le van tiltva.');
          } else if (err.code === 'auth/user-not-found') {
            setError('A felhasználó nem található.');
          } else {
            setError(`Hiba történt az email megerősítése során: ${err.message}`);
          }
          setLoading(false);
        });
    }
  }, [searchParams, setSearchParams, oobCode, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
      }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Email megerősítése...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
      }}>
        <div className="w-full max-w-md rounded-3xl p-8 text-center" style={{
          background: 'rgba(26, 26, 46, 0.8)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Hiba történt</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            style={{cursor: 'pointer'}}
            className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
          >
            Vissza a főoldalra
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
      }}>
        <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl" style={{
          background: 'rgba(26, 26, 46, 0.8)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6 animate-scale-check">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              
              <h2 className="text-2xl font-black text-white mb-3">
                Email megerősítve!
              </h2>
              <p className="text-gray-400 mb-2">
                Az email címed sikeresen megerősítettük.
              </p>
              <p className="text-sm text-gray-500">
                Átirányítás a főoldalra...
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes scale-check {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
          .animate-scale-check {
            animation: scale-check 0.6s ease-in-out;
          }
        `}</style>
      </div>
    );
  }

  return null;
}