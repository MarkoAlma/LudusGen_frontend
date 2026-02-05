import { useState } from "react";
import { createContext } from "react";
import { auth } from "../firebase/firebaseApp";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { useEffect } from "react";
import axios from "axios";

export const MyUserContext = createContext();

const MyUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser);
      setUser(currentUser); // null if signed out, object if signed in
      console.log(currentUser);
    });

useEffect(() => {
  const unsub = onAuthStateChanged(auth, (currentUser) => {
    console.log("Auth state changed:", currentUser);
    setUser(currentUser); // null if signed out, object if signed in
    console.log(currentUser)
  });

  return () => unsub();
}, []); // <-- run only once on mount

useEffect(() => {
  console.log("msg változott:", msg);
}, [msg]);


  const signUpUser = async (email, password, display_name, setLoading)=> {
    try {
      // 1. Firebase Auth user létrehozása
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // 2. Display name beállítása
      await updateProfile(auth.currentUser, { displayName: display_name });
      
      // 3. Email verifikáció küldése
      await sendEmailVerification(auth.currentUser);
      
      // 4. Firestore dokumentum létrehozása - axios-szal hívjuk a backend-et
      try {
        await axios.post("http://localhost:3001/api/create-user", {
          uid,
          email,
          name: display_name,
          displayName: display_name,
        });
      } catch (firestoreError) {
        console.error("Firestore user creation error:", firestoreError);
        // Folytatjuk, mert a Firebase Auth user már létrejött
      }
      
      setMsg((prev) => delete prev.err);
      setMsg({ katt: "Kattints az emailben érkezett aktiváló linkre" });
    } catch (error) {
      console.log(error);
      setMsg({ incorrectSignUp: error.message });
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
    setMsg({ kijelentkezes: "Sikeres kijelentkezés!" });
    setUser(null);
  };

  const signInUser = async (email, password) => {
    setUser(null);
    try {
      // ✅ ELŐSZÖR ELLENŐRIZZÜK, HOGY SZÜKSÉGES-E A 2FA
      const check2FAResponse = await axios.post(
        "http://localhost:3001/api/check-2fa-required",
        { email }
      );

      // Ha 2FA szükséges, NEM jelentkeztetjük be a Firebase-ben
      if (check2FAResponse.data.requires2FA) {
        console.log("2FA required for user:", email);
        return { requires2FA: true };
      }

      // ✅ HA NINCS 2FA, AKKOR NORMÁL BEJELENTKEZÉS
      const adat = await signInWithEmailAndPassword(auth, email, password);
      
      if (adat.user.emailVerified) {
        setMsg({ signIn: true, kijelentkezes: "Sikeres bejelentkezés!" });
        return { requires2FA: false };
      } else {
        setMsg({ err: "Nincs megerősítve az email!" });
        setUser(null);
        // Kijelentkeztetjük, mert nincs megerősítve az email
        await signOut(auth);
        return { requires2FA: false };
      }
    } catch (error) {
      console.log(error);
      setMsg({ incorrectSignIn: error.message });
      return { requires2FA: false };
    }
  };

  const resetPassword = async (email) => {
    let success = false;
    try {
      await sendPasswordResetEmail(auth, email, {
        url: "http://localhost:5173/reset-password",
      })
      // setMsg({resetPw:"A jelszó visszaállításhoz szükséges email elküldve"})
      success = true
    } catch (error) {
      console.log(error);
      
      setMsg({incorrectResetPwEmail:error.message})
      // console.log(msg);
      
    }finally {
      if (success) {
        //navigate("/signin")
      }
    }
  };

  // useEffect(()=>{
  //   const unsub = onAuthStateChanged(auth,(currentUser)=>{
  //     console.log(currentUser);
  //     currentUser && setUser(currentUser) //ezt kell majd modositani
  //     user && console.log(user);
  //   })
  //   return ()=>unsub()
  // },[user])

  return (
    <MyUserContext.Provider 
      value={{user, signUpUser,logoutUser,signInUser, msg, setMsg, setUser, isAuthOpen, setIsAuthOpen, showNavbar, setShowNavbar, resetPassword}}>
      {children}
    </MyUserContext.Provider>
  );
};

export default MyUserProvider;