import { useState } from 'react'
import { createContext } from 'react'
import {auth} from '../firebase/firebaseApp'
import { createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { useEffect } from 'react'

export const MyUserContext = createContext()

const MyUserProvider = ({children}) => {
  
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState({});
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);


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
      await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(auth.currentUser, {displayName:display_name})
      await sendEmailVerification(auth.currentUser)
      setMsg(prev => delete prev.err)
      //setMsg({signUp:"Kattints az emailben érkezett aktiváló linkre"})
      setMsg({katt:"Kattints az emailben érkezett aktiváló linkre"})
    } catch (error) {
      console.log(error);
      setMsg({incorrectSignUp:error.message})
    }finally {
      setLoading(false)
    }
  }

  const logoutUser = async ()=> {
    await signOut(auth)
    setMsg({kijelentkezes:'Sikeres kijelentkezés!'})
     setUser(null)
  }

  const signInUser = async (email, password) => {
    setUser(null)
    try {
      const adat = await signInWithEmailAndPassword(auth, email, password)
      if (adat.user.emailVerified) {
        setMsg({signIn:true, kijelentkezes:'Sikeres bejelentkezés!'})
      }else {
        setMsg({err:"Nincs megerősítve az email!"})
        setUser(null)
      }
      //
    } catch (error) {
      console.log(error);
      setMsg({incorrectSignIn:error.message})
    }
  }

  const resetPassword = async (email)=> {
    let success = false
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
  }



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
  )
}

export default MyUserProvider
    