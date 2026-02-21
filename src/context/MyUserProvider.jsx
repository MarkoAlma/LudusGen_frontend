import { useState, createContext, useEffect } from "react";
import { auth, db } from "../firebase/firebaseApp";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import axios from "axios";

export const MyUserContext = createContext();

// ── API alap URL a .env-ből ────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const MyUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(true);
// UserContext vagy valahol központilag
// UserContext vagy valahol központilag
const [navHeight, setNavHeight] = useState(0);

useEffect(() => {
  const navEl = document.getElementById("top-nav");
  if (navEl) setNavHeight(navEl.offsetHeight);
}, []);
  useEffect(() => {
    console.log("A 2fa változott", is2FAEnabled);
  }, [is2FAEnabled]);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser?.email ?? "null");

      if (currentUser) {
        if (!currentUser.emailVerified) {
          console.log("❌ Email not verified, signing out");
          await signOut(auth);
          setUser(null);
          setIs2FAEnabled(false);
          setLoading2FA(false);
          setMsg({ err: "Nincs megerősítve az email!" });
          return;
        }

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

      const response = await axios.get(
        `${API_BASE}/api/get-user/${currentUser.uid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const mergedUser = Object.assign(
          Object.create(Object.getPrototypeOf(currentUser)),
          currentUser,
          response.data.user,
          { uid: currentUser.uid }
        );
        setUser(mergedUser);
      } else {
        setUser(currentUser);
      }
    } catch (error) {
      console.error("Error loading user from Firestore:", error);

      if (error.response?.status === 404) {
        console.warn("User document not found, using Firebase Auth data only");
      }

      setUser(currentUser);
    }
  };

  // 2FA státusz betöltése a backend-ből
  const fetch2FAStatus = async (currentUser) => {
    try {
      setLoading2FA(true);
      const token = await currentUser.getIdToken();

      const response = await axios.get(`${API_BASE}/api/check-2fa-status`, {
        headers: { Authorization: `Bearer ${token}` },
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

  // Lokális state frissítés
  const updateUser = (updatedData) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedData }));
  };

  useEffect(() => {
    console.log("msg változott:", msg);
  }, [msg]);

  // Regisztráció
  const signUpUser = async (email, password, display_name, setLoading) => {
    try {
      const response = await axios.post(`${API_BASE}/api/register-user`, {
        email,
        password,
        displayName: display_name,
      });

      if (response.data.success) {
        setMsg({ katt: "Kattints az emailben érkezett aktiváló linkre" });
      } else {
        setMsg({ incorrectSignUp: response.data.message });
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMsg({
        incorrectSignUp: error.response?.data?.message || error.message,
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

  const signInUser = async (email, password, setLoading) => {
    setUser(null);
    try {
      const check2FAResponse = await axios.post(
        `${API_BASE}/api/check-2fa-required`,
        { email }
      );

      if (check2FAResponse.data.requires2FA) {
        console.log("2FA required for user:", email);

        try {
          const validateResponse = await axios.post(
            `${API_BASE}/api/validate-password`,
            { email, password }
          );

          if (validateResponse.data.success) {
            return { requires2FA: true };
          } else {
            setMsg({ incorrectSignIn: "Hibás email/jelszó páros" });
            setLoading(false);
            return { requires2FA: false };
          }
        } catch (error) {
          console.error("Password validation error:", error);
          setMsg({
            incorrectSignIn:
              error.response?.data?.message || "Hibás email/jelszó páros",
          });
          setLoading(false);
          return { requires2FA: false };
        }
      }

      const adat = await signInWithEmailAndPassword(auth, email, password);

      if (!adat.user.emailVerified) {
        setMsg({ err: "Nincs megerősítve az email!" });
        setUser(null);
        await signOut(auth);
        setLoading(false);
        return { requires2FA: false };
      }

      setMsg({ signIn: true, kijelentkezes: "Sikeres bejelentkezés!" });
      return { requires2FA: false };
    } catch (error) {
      console.log(error);
      setMsg({ incorrectSignIn: error.message });
      setLoading(false);
      return { requires2FA: false };
    }
  };

  // 2FA login custom tokennel
  const signInWith2FA = async (customToken) => {
    try {
      await signInWithCustomToken(auth, customToken);
      setMsg({ signIn: true, kijelentkezes: "Sikeres bejelentkezés!" });
      return { success: true };
    } catch (error) {
      console.error("2FA sign in error:", error);
      setMsg({ incorrectSignIn: "Bejelentkezési hiba" });
      return { success: false };
    }
  };

  // Google bejelentkezés
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      console.log("Google popup completed for:", email);

      const check2FAResponse = await axios.post(
        `${API_BASE}/api/check-2fa-required`,
        { email }
      );

      if (check2FAResponse.data.requires2FA) {
        setIs2FAEnabled(true);
        console.log("2FA required, signing out temporarily");

        const firebaseIdToken = await result.user.getIdToken();
        await signOut(auth);

        const validateResponse = await axios.post(
          `${API_BASE}/api/validate-google-session`,
          { firebaseIdToken, email }
        );

        if (validateResponse.data.success) {
          return {
            requires2FA: true,
            email,
            provider: "google",
            sessionId: validateResponse.data.sessionId,
          };
        } else {
          setMsg({ incorrectSignIn: "Google bejelentkezési hiba" });
          return { requires2FA: false };
        }
      }

      if (!result.user.emailVerified) {
        setMsg({ err: "Nincs megerősítve az email!" });
        await signOut(auth);
        setUser(null);
        return { requires2FA: false };
      }

      console.log("✅ Google sign-in successful (no 2FA)");
      setMsg({ signIn: true, kijelentkezes: "Sikeres bejelentkezés!" });
      setIsAuthOpen(false);
      setShowNavbar(true);

      return { requires2FA: false };
    } catch (error) {
      console.error("Google sign-in error:", error);
      setMsg({ incorrectSignIn: error.message });

      try { await signOut(auth); } catch {}

      return { requires2FA: false };
    }
  };

  const resetPassword = async (email) => {
    try {
      await axios.post(`${API_BASE}/api/forgot-password`, { email });
      setMsg({ resetSent: "Ha létezik a fiók, kiküldtük az emailt." });
    } catch (error) {
      console.log(error);
      setMsg({ incorrectResetPwEmail: error.response?.data?.error || error.message });
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
        navHeight,
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
        signInWithGoogle,
      }}
    >
      {children}
    </MyUserContext.Provider>
  );
};

export default MyUserProvider;