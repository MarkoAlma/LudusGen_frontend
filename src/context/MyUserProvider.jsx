import { useState, createContext, useEffect } from "react";
import { auth } from "../firebase/firebaseApp";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import axios from "axios";
import { API_BASE } from "../api/client";

export const MyUserContext = createContext();

const MyUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [showCreditTopup, setShowCreditTopup] = useState(false);
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
          setMsg({ err: "Email is not verified!" });
          return;
        }

        await loadUserFromFirestore(currentUser);
        await fetch2FAStatus(currentUser);
      } else {
        setUser(null);
        setIs2FAEnabled(false);
        setLoading2FA(false);
      }
      setAuthLoading(false);
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

  // Credit egyenleg frissítése a backend-ről
  // Reuses the already-fetched user data from loadUserFromFirestore to avoid duplicate API calls.
  // Only makes a fresh call if the user data is stale or missing.
  const refreshCredits = async () => {
    if (!user?.uid) return;
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const response = await axios.get(
        `${API_BASE}/api/get-user/${user.uid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success && response.data.user) {
        setUser((prevUser) => ({
          ...prevUser,
          credits: response.data.user.credits ?? prevUser?.credits ?? 0,
        }));
      }
    } catch (error) {
      console.error("Error refreshing credits:", error);
    }
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
        setMsg({ katt: "Click the activation link sent to your email" });
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
    setMsg({ kijelentkezes: "Successfully logged out!" });
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
            setMsg({ incorrectSignIn: "Invalid email or password" });
            setLoading(false);
            return { requires2FA: false };
          }
        } catch (error) {
          console.error("Password validation error:", error);
          setMsg({
            incorrectSignIn:
              error.response?.data?.message || "Invalid email or password",
          });
          setLoading(false);
          return { requires2FA: false };
        }
      }

      const adat = await signInWithEmailAndPassword(auth, email, password);

      if (!adat.user.emailVerified) {
        setMsg({ err: "Email is not verified!" });
        setUser(null);
        await signOut(auth);
        setLoading(false);
        return { requires2FA: false };
      }

      setMsg({ signIn: true, kijelentkezes: "Successfully logged in!" });
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
      setMsg({ signIn: true, kijelentkezes: "Successfully logged in!" });
      return { success: true };
    } catch (error) {
      console.error("2FA sign in error:", error);
      setMsg({ incorrectSignIn: "Sign in error" });
      return { success: false };
    }
  };

  // Google bejelentkezés
  const signInWithGoogle = async (onStartBackendCheck) => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      
      if (typeof onStartBackendCheck === "function") {
        onStartBackendCheck();
      }

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
          setMsg({ incorrectSignIn: "Google sign in error" });
          return { requires2FA: false };
        }
      }

      if (!result.user.emailVerified) {
        setMsg({ err: "Email is not verified!" });
        await signOut(auth);
        setUser(null);
        return { requires2FA: false };
      }

      console.log("✅ Google sign-in successful (no 2FA)");
      setMsg({ signIn: true, kijelentkezes: "Successfully logged in!" });
      setIsAuthOpen(false);
      setShowNavbar(true);

      return { requires2FA: false };
    } catch (error) {
      console.error("Google sign-in error:", error);
      setMsg({ incorrectSignIn: error.message });

      // Nem várjuk meg a signOut-ot (nem használunk await-et), 
      // mert Firebase hajlamos 10 másodpercig "lefagyni" (timeoutolni), 
      // ha a user épp bezárta a popupot és nincs aktív session.
      try { signOut(auth).catch(() => {}); } catch { /* ignore */ }

      return { requires2FA: false };
    }
  };

  const resetPassword = async (email) => {
    try {
      await axios.post(`${API_BASE}/api/forgot-password`, { email });
      setMsg({ resetSent: "If the account exists, we sent the email." });
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
        refreshCredits,
        loadUserFromFirestore,
        signInWithGoogle,
        authLoading,
        showCreditTopup,
        setShowCreditTopup,
      }}
    >
      {children}
    </MyUserContext.Provider>
  );
};

export default MyUserProvider;
