
import { useState } from 'react'
import { createContext } from 'react'


export const MyUserContext = createContext()

const MyUserProvider = ({children}) => {
  
  const [user, setUser] = useState(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false);

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
      value={{user, setUser, isAuthOpen, setIsAuthOpen}}>
      {children}
    </MyUserContext.Provider>
  )
}

export default MyUserProvider
    