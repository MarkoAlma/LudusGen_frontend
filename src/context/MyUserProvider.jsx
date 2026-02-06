import { useState, createContext, useEffect } from "react";
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
import axios from "axios";

export const MyUserContext = createContext();

const MyUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(true);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser);
      
      if (currentUser) {
        // Betöltjük a Firestore-ból a teljes user adatokat
        await loadUserFromFirestore(currentUser);
        await fetch2FAStatus(currentUser);
      } else {
        setUser(null);
        setIs2FAEnabled(false);
        setLoading2FA(false);
      }
    });

    return () => unsub();
  }, []);

  // Firestore-ból betölti a user adatokat
  const loadUserFromFirestore = async (currentUser) => {
    try {
      const token = await currentUser.getIdToken();
      
      // Itt kérhetsz le egy /api/get-user endpoint-ot vagy használhatsz egy meglévőt
      // Egyszerűbb megoldás: közvetlenül a Firestore-ból olvassuk
      const response = await axios.get(`http://localhost:3001/api/get-user/${currentUser.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setUser({
          ...currentUser,
          ...response.data.user,
          uid: currentUser.uid,
        });
      } else {
        // Ha nincs Firestore dokumentum, csak a Firebase Auth adatokat használjuk
        setUser(currentUser);
      }
    } catch (error) {
      console.error("Error loading user from Firestore:", error);
      // Fallback: csak a Firebase Auth user
      setUser(currentUser);
    }
  };

  // 2FA státusz betöltése a backend-ből
  const fetch2FAStatus = async (currentUser) => {
    try {
      setLoading2FA(true);
      const token = await currentUser.getIdToken();
      
      const response = await axios.get("http://localhost:3001/api/check-2fa-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success) {
        setIs2FAEnabled(response.data.is2FAEnabled);
        console.log("2FA Status loaded:", response.data.is2FAEnabled);
      }
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
      setIs2FAEnabled(false);
    } finally {
      setLoading2FA(false);
    }
  };

  // Refresh 2FA status (call this after enabling/disabling 2FA)
  const refresh2FAStatus = async () => {
    if (user) {
      await fetch2FAStatus(user);
    }
  };

  // ✅ JAVÍTOTT updateUser függvény - lokális state frissítés
  // Ez NEM menti el az adatokat a backend-re, csak a local state-et frissíti
  // A backend mentést a Settings komponens handleSave függvénye végzi
  const updateUser = (updatedData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...updatedData,
    }));
  };

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
      
      // 4. Firestore dokumentum létrehozása
      try {
        await axios.post("http://localhost:3001/api/create-user", {
          uid,
          email,
          name: display_name,
          displayName: display_name,
        });
      } catch (firestoreError) {
        console.error("Firestore user creation error:", firestoreError);
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
    setIs2FAEnabled(false);
  };

  const signInUser = async (email, password) => {
    setUser(null);
    try {
      // ✅ ELŐSZÖR ELLENŐRIZZÜK, HOGY SZÜKSÉGES-E A 2FA (backend API-val)
      const check2FAResponse = await axios.post(
        "http://localhost:3001/api/check-2fa-required",
        { email }
      );

      // ✅ Ha 2FA szükséges, NE jelentkeztessük be Firebase-ben!
      // Csak ellenőrizzük a jelszót a backend-en
      if (check2FAResponse.data.requires2FA) {
        console.log("2FA required for user:", email);
        
        // Ellenőrizzük a jelszót anélkül, hogy bejelentkeznénk
        // A backend-en validáljuk a jelszót
        try {
          const validateResponse = await axios.post(
            "http://localhost:3001/api/validate-password",
            { email, password }
          );
          
          if (validateResponse.data.success) {
            // Jelszó helyes, de 2FA kell
            return { requires2FA: true };
          } else {
            // Rossz jelszó
            setMsg({ incorrectSignIn: "Hibás email/jelszó páros" });
            return { requires2FA: false };
          }
        } catch (error) {
          console.error("Password validation error:", error);
          setMsg({ incorrectSignIn: error.response?.data?.message || "Hibás email/jelszó páros" });
          return { requires2FA: false };
        }
      }

      // ✅ HA NINCS 2FA, AKKOR NORMÁL FIREBASE BEJELENTKEZÉS
      const adat = await signInWithEmailAndPassword(auth, email, password);
      
      if (!adat.user.emailVerified) {
        setMsg({ err: "Nincs megerősítve az email!" });
        setUser(null);
        await signOut(auth);
        return { requires2FA: false };
      }

      setMsg({ signIn: true, kijelentkezes: "Sikeres bejelentkezés!" });
      return { requires2FA: false };
      
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
      success = true
    } catch (error) {
      console.log(error);
      setMsg({incorrectResetPwEmail:error.message})
    }finally {
      if (success) {
        //navigate("/signin")
      }
    }
  };

  return (
    <MyUserContext.Provider
      value={{
        user,
        signUpUser,
        logoutUser,
        signInUser,
        msg,
        setMsg,
        setUser,
        updateUser,
        isAuthOpen,
        setIsAuthOpen,
        showNavbar,
        setShowNavbar,
        is2FAEnabled,
        loading2FA,
        resetPassword,
        refresh2FAStatus,
        loadUserFromFirestore, // Ha később szükséges lenne manuális refresh
      }}
    >
      {children}
    </MyUserContext.Provider>
  );
};

export default MyUserProvider;