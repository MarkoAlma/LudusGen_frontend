import React from 'react'
import { useContext } from 'react'
import { MyUserContext } from './context/MyUserProvider'
import { Navigate } from 'react-router-dom'

export const ProtectedRoute = ( {children} ) => {
    const { user } = useContext(MyUserContext)
    console.log(user);
    

    if(!user) {
        return <Navigate to="/"  replace/>
    }

  return children;
}