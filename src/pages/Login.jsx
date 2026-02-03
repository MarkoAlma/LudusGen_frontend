import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, X, Sparkles, Chrome, Github, Apple } from 'lucide-react';
import { useContext } from 'react';
import { MyUserContext } from '../context/MyUserProvider';
import { AnimatePresence, motion } from "motion/react"
import { AnimatedText } from '../components/AnimatedText';
export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
    const [mouseDownTarget, setMouseDownTarget] = useState(null);
const {isAuthOpen} = useContext(MyUserContext)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();


    
    // if (isLogin) {
    //   console.log('Login:', { email: formData.email, password: formData.password });
    //   alert('✅ Sikeres bejelentkezés!');
    // } else {
    //   console.log('Register:', formData);
    //   alert('✅ Sikeres regisztráció!');
    // }
    // onClose();
  };

  if (!isOpen) return null;
const switchMode = (toLogin) => {
  if (toLogin === isLogin) return;

  setIsSwitching(true);
  setIsLogin(toLogin);

  setTimeout(() => {
    setIsSwitching(false);
  }, 400);
};
const handleLoginButton = ()=>{
  setIsLogin(true);
  switchMode(true);
}

const handleRegisterButton = ()=>{
  setIsLogin(false);
  switchMode(true);
}

  return (
    <>
  {/* Overlay */}
<div 
  className={`fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in ` }
      onMouseDown={(e) => {
        // Jegyezzük meg, hol történt a mousedown
        setMouseDownTarget(e.target);
      }}
      onMouseUp={(e) => {
        // Csak akkor zárjuk, ha a mousedown és mouseup is az overlay-en történt
        if (
          e.target === e.currentTarget && // mouseup az overlay-en
          mouseDownTarget === e.currentTarget // mousedown is az overlay-en
        ) {
          onClose();
        }
        setMouseDownTarget(null);
      }}
>
  {/* Modal */}
  <div 
    className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
    onClick={(e) => e.stopPropagation()} // a modalon belüli click ne zárja
    style={{
      background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)',
      border: '1px solid rgba(168, 85, 247, 0.3)'
    }}
  >
    {/* Close Button */}
    <button
      className="absolute top-4 right-4 z-50 p-2 rounded-full cursor-pointer bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
      onClick={onClose} // bezárja a modalt
    >
      <X className="w-5 h-5" />
    </button>



          {/* Decorative Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">
                {isLogin ? 'Üdvözlünk!' : 'Csatlakozz!'}
              </h2>
              <p className="text-gray-400">
                {isLogin ? 'Lépj be a fiókodba' : 'Hozz létre egy új fiókot'}
              </p>
            </div>

            {/* Toggle Tabs */}
            {/* Bubis switch overlay */}
<div className="absolute inset-0 pointer-events-none overflow-hidden">
  <div
    className={`absolute left-1/2 top-1/2 w-96 h-96 rounded-full
      bg-purple-500/20 blur-3xl
      transition-all duration-[400ms] ease-in-out
      ${isSwitching
        ? 'scale-100 opacity-100 -translate-x-1/2 -translate-y-1/2'
        : 'scale-50 opacity-0 -translate-x-1/2 -translate-y-1/2'
      }
    `}
  />
</div>

            <div className="flex gap-2 mb-6 p-1 rounded-2xl" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
              style={{cursor:'pointer'}}
                onClick={handleLoginButton}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${
                  isLogin 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Bejelentkezés
              </button>
              <button
              style={{cursor:'pointer'}}
                onClick={handleRegisterButton}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${
                  !isLogin 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Regisztráció
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field (Register only) */}
              {!isLogin && (
                <div
  className={`transition-all duration-[400ms] ease-in-out overflow-hidden
    ${!isLogin
      ? 'max-h-40 opacity-100 translate-y-0'
      : 'max-h-0 opacity-0 translate-y-6'
    }
  `}
>
  {/* IDE JÖN A TE TELJES NÉV INPUTOD VÁLTOZTATÁS NÉLKÜL */}

                <div>
                  <label className="block text-sm font-semibold text-purple-300 mb-2">
                    Teljes név
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                    required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Kovács János"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                  </div>
                </div>
                </div>

              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  Email cím
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                  required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="pelda@email.com"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-purple-300 mb-2">
                  Jelszó
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                  required
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Register only) */}
              {!isLogin && (
                <div
  className={`transition-all duration-[400ms] ease-in-out overflow-hidden
    ${!isLogin
      ? 'max-h-40 opacity-100 translate-y-0'
      : 'max-h-0 opacity-0 -translate-y-6'
    }
  `}
>
  {/* IDE JÖN A TE CONFIRM PASSWORD INPUTOD VÁLTOZTATÁS NÉLKÜL */}


                <div>
                  <label className="block text-sm font-semibold text-purple-300 mb-2">
                    Jelszó megerősítése
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                    required
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                  </div>
                </div>
                </div>
              )}

              {/* Remember Me / Forgot Password */}
              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-2 border-purple-500/50 bg-black/30 text-purple-600 focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                    />
                    <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
                      Maradjak bejelentkezve
                    </span>
                  </label>
                  <a href="#" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                    Elfelejtett jelszó?
                  </a>
                </div>
              )}

              {/* Submit Button */}
              <button
              style={{cursor:'pointer'}}
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {isLogin ? 'Bejelentkezés' : 'Regisztráció'}
              </button>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-purple-500/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-gray-500 font-semibold" style={{
                    background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)'
                  }}>
                    vagy folytatás ezekkel
                  </span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Google', icon: <Chrome className="w-5 h-5" /> },
                  { name: 'GitHub', icon: <Github className="w-5 h-5" /> },
                  { name: 'Apple', icon: <Apple className="w-5 h-5" /> }
                ].map((social) => (
                  <button
                    key={social.name}
                    type="button"
                    className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 flex items-center justify-center text-gray-400 hover:text-white group"
                    title={social.name}
                  >
                    <div className="group-hover:scale-110 transition-transform">
                      {social.icon}
                    </div>
                  </button>
                ))}
              </div>
            </form>


            {/* Terms */}
            {!isLogin && (
              <p className="mt-5 text-center text-xs text-gray-500">
                A regisztrációval elfogadod az{' '}
                <a href="#" className="text-purple-400 hover:text-purple-300 font-semibold">
                  ÁSZF-et
                </a>{' '}
                és az{' '}
                <a href="#" className="text-purple-400 hover:text-purple-300 font-semibold">
                  Adatvédelmi Nyilatkozatot
                </a>
                .
              </p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        input::placeholder {
          color: #6b7280;
        }

        input[type="checkbox"]:checked {
          background-color: #a855f7;
          border-color: #a855f7;
        }
      `}</style>
    </>
  );
}

// Példa használat:
// 
// import { useState } from 'react';
// import AuthModal from './AuthModal';
// 
// function App() {
//   const [isAuthOpen, setIsAuthOpen] = useState(false);
// 
//   return (
//     <>
//       <button onClick={() => setIsAuthOpen(true)}>
//         Bejelentkezés
//       </button>
//       <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
//     </>
//   );
// }
























// import React, { useState } from 'react';
// import {
//   Mail, Lock, User, Eye, EyeOff, X,
//   Sparkles, Chrome, Github, Apple
// } from 'lucide-react';

// export default function AuthModal({ isOpen, onClose }) {
//   const [isLogin, setIsLogin] = useState(true);
//   const [isSwitching, setIsSwitching] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     password: '',
//     confirmPassword: ''
//   });

//   const switchMode = (toLogin) => {
//     if (toLogin === isLogin) return;

//     setIsSwitching(true);
//     setIsLogin(toLogin);

//     setTimeout(() => {
//       setIsSwitching(false);
//     }, 400);
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//   };

//   if (!isOpen) return null;

//   return (
//     <>
//       {/* Overlay */}
//       <div
//         className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in"
//         onClick={onClose}
//       >
//         {/* Modal */}
//         <div
//           onClick={(e) => e.stopPropagation()}
//           className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
//           style={{
//             background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)',
//             border: '1px solid rgba(168, 85, 247, 0.3)'
//           }}
//         >
//           {/* Close */}
//           <button
//             onClick={onClose}
//             className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white"
//           >
//             <X className="w-5 h-5" />
//           </button>

//           {/* 🫧 Bubis switch overlay */}
//           <div className="absolute inset-0 pointer-events-none overflow-hidden">
//             <div
//               className={`absolute left-1/2 top-1/2 w-96 h-96 rounded-full
//                 bg-purple-500/20 blur-3xl
//                 transition-all duration-[400ms] ease-in-out
//                 ${isSwitching
//                   ? 'scale-100 opacity-100 -translate-x-1/2 -translate-y-1/2'
//                   : 'scale-50 opacity-0 -translate-x-1/2 -translate-y-1/2'
//                 }
//               `}
//             />
//           </div>

//           <div className="relative z-10 p-8">
//             {/* Header */}
//             <div className="text-center mb-8">
//               <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-4">
//                 <Sparkles className="w-8 h-8 text-white" />
//               </div>
//               <h2 className="text-3xl font-black text-white mb-2">
//                 {isLogin ? 'Üdvözlünk!' : 'Csatlakozz!'}
//               </h2>
//               <p className="text-gray-400">
//                 {isLogin ? 'Lépj be a fiókodba' : 'Hozz létre egy új fiókot'}
//               </p>
//             </div>

//             {/* Switch */}
//             <div className="flex gap-2 mb-6 p-1 rounded-2xl bg-white/5 border border-white/10">
//               <button
//                 onClick={() => switchMode(true)}
//                 className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300
//                   ${isLogin
//                     ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
//                     : 'text-gray-400 hover:text-gray-300'
//                   }
//                 `}
//               >
//                 Bejelentkezés
//               </button>
//               <button
//                 onClick={() => switchMode(false)}
//                 className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300
//                   ${!isLogin
//                     ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
//                     : 'text-gray-400 hover:text-gray-300'
//                   }
//                 `}
//               >
//                 Regisztráció
//               </button>
//             </div>

//             {/* Form */}
//             <form onSubmit={handleSubmit} className="space-y-4">

//               {/* 🔼 Teljes név – lentről felfelé */}
//               <div
//                 className={`overflow-hidden transition-all duration-[400ms] ease-in-out
//                   ${isLogin
//                     ? 'max-h-0 opacity-0 translate-y-6'
//                     : 'max-h-32 opacity-100 translate-y-0'
//                   }
//                 `}
//               >
//                 <label className="block text-sm font-semibold text-purple-300 mb-2">
//                   Teljes név
//                 </label>
//                 <input
//                   type="text"
//                   value={formData.name}
//                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                   className="w-full pl-4 pr-4 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white"
//                 />
//               </div>

//               {/* Email – FIX KÖZÉPPONT */}
//               <div>
//                 <label className="block text-sm font-semibold text-purple-300 mb-2">
//                   Email cím
//                 </label>
//                 <input
//                   type="email"
//                   value={formData.email}
//                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//                   className="w-full pl-4 pr-4 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white"
//                 />
//               </div>

//               {/* Password – FIX KÖZÉPPONT */}
//               <div>
//                 <label className="block text-sm font-semibold text-purple-300 mb-2">
//                   Jelszó
//                 </label>
//                 <div className="relative">
//                   <input
//                     type={showPassword ? 'text' : 'password'}
//                     value={formData.password}
//                     onChange={(e) => setFormData({ ...formData, password: e.target.value })}
//                     className="w-full pl-4 pr-12 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
//                   >
//                     {showPassword ? <EyeOff /> : <Eye />}
//                   </button>
//                 </div>
//               </div>

//               {/* 🔽 Confirm password – fentről lefelé */}
//               <div
//                 className={`overflow-hidden transition-all duration-[400ms] ease-in-out
//                   ${isLogin
//                     ? 'max-h-0 opacity-0 -translate-y-6'
//                     : 'max-h-32 opacity-100 translate-y-0'
//                   }
//                 `}
//               >
//                 <label className="block text-sm font-semibold text-purple-300 mb-2">
//                   Jelszó megerősítése
//                 </label>
//                 <input
//                   type="password"
//                   value={formData.confirmPassword}
//                   onChange={(e) =>
//                     setFormData({ ...formData, confirmPassword: e.target.value })
//                   }
//                   className="w-full pl-4 pr-4 py-3 rounded-xl bg-black/30 border border-purple-500/30 text-white"
//                 />
//               </div>

//               <button
//                 type="submit"
//                 className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:scale-105 transition"
//               >
//                 {isLogin ? 'Bejelentkezés' : 'Regisztráció'}
//               </button>
//             </form>
//           </div>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes fade-in {
//           from { opacity: 0; }
//           to { opacity: 1; }
//         }
//         @keyframes scale-in {
//           from { opacity: 0; transform: scale(0.9); }
//           to { opacity: 1; transform: scale(1); }
//         }
//         .animate-fade-in {
//           animation: fade-in 0.2s ease-out;
//         }
//         .animate-scale-in {
//           animation: scale-in 0.3s ease-out;
//         }
//       `}</style>
//     </>
//   );
// }
