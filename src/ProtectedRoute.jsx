import React from 'react'
import { useContext } from 'react'
import { MyUserContext } from './context/MyUserProvider'
import { Navigate } from 'react-router-dom'

export const ProtectedRoute = ( {children} ) => {
    const { user, authLoading } = useContext(MyUserContext)
    
    if (authLoading) {
        return null;
    }

    if(!user) {
        return <Navigate to="/"  replace/>
    }

  return children;
}