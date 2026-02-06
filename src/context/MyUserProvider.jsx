import { useState, createContext, useEffect } from "react";
import { auth } from "../firebase/firebaseApp";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
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
        // Email verifikáció ellenőrzése
        if (!currentUser.emailVerified) {
          console.log("❌ Email not verified, signing out");
          await signOut(auth);
          setUser(null);
          setIs2FAEnabled(false);
          setLoading2FA(false);
          setMsg({ err: "Nincs megerősítve az email!" });
          return;
        }
        
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
        setUser(currentUser);
      }
    } catch (error) {
      console.error("Error loading user from Firestore:", error);
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

  // Refresh 2FA status
  const refresh2FAStatus = async () => {
    if (user) {
      await fetch2FAStatus(user);
    }
  };

  // ✅ updateUser függvény - lokális state frissítés
  const updateUser = (updatedData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...updatedData,
    }));
  };

  useEffect(() => {
    console.log("msg változott:", msg);
  }, [msg]);

  // ✅ BIZTONSÁGOS REGISZTRÁCIÓ - Backend csinálja, soha nem jelentkezik be!
  const signUpUser = async (email, password, display_name, setLoading) => {
    try {
      const response = await axios.post("http://localhost:3001/api/register-user", {
        email,
        password,
        displayName: display_name,
      });

      if (response.data.success) {
        setMsg((prev) => delete prev.err);
        setMsg({ katt: "Kattints az emailben érkezett aktiváló linkre" });
      } else {
        setMsg({ incorrectSignUp: response.data.message });
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMsg({ 
        incorrectSignUp: error.response?.data?.message || error.message 
      });
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
      // ✅ ELŐSZÖR ELLENŐRIZZÜK, HOGY SZÜKSÉGES-E A 2FA
      const check2FAResponse = await axios.post(
        "http://localhost:3001/api/check-2fa-required",
        { email }
      );

      // ✅ Ha 2FA szükséges, NE jelentkeztessük be Firebase-ben!
      if (check2FAResponse.data.requires2FA) {
        console.log("2FA required for user:", email);
        
        // Jelszó validáció backend-en
        try {
          const validateResponse = await axios.post(
            "http://localhost:3001/api/validate-password",
            { email, password }
          );
          
          if (validateResponse.data.success) {
            // Jelszó helyes, de 2FA kell
            return { requires2FA: true };
          } else {
            setMsg({ incorrectSignIn: "Hibás email/jelszó páros" });
            return { requires2FA: false };
          }
        } catch (error) {
          console.error("Password validation error:", error);
          setMsg({ 
            incorrectSignIn: error.response?.data?.message || "Hibás email/jelszó páros" 
          });
          return { requires2FA: false };
        }
      }

      // ✅ HA NINCS 2FA, AKKOR NORMÁL FIREBASE BEJELENTKEZÉS
      const adat = await signInWithEmailAndPassword(auth, email, password);
      
      // Email verifikáció ellenőrzése (ez a onAuthStateChanged-ben is fut)
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

  // ✅ 2FA login with custom token
  const signInWith2FA = async (customToken) => {
    try {
      await signInWithCustomToken(auth, customToken);
      setMsg({ signIn: true, kijelentkezes: "Sikeres 2FA bejelentkezés!" });
      return { success: true };
    } catch (error) {
      console.error("2FA sign in error:", error);
      setMsg({ incorrectSignIn: "Bejelentkezési hiba" });
      return { success: false };
    }
  };

  const resetPassword = async (email) => {
    let success = false;
    try {
      await sendPasswordResetEmail(auth, email, {
        url: "http://localhost:5173/reset-password",
      });
      success = true;
    } catch (error) {
      console.log(error);
      setMsg({ incorrectResetPwEmail: error.message });
    } finally {
      if (success) {
        // navigate("/signin")
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
        signInWith2FA,
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
        loadUserFromFirestore,
      }}
    >
      {children}
    </MyUserContext.Provider>
  );
};

export default MyUserProvider;