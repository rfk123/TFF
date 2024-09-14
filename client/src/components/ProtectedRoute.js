import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, checkIfAdmin } from '../firebase';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        if (requireAdmin) {
          setLoading(true); 
          const adminStatus = await checkIfAdmin(currentUser.uid);
          setIsAdmin(adminStatus);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe(); 
  }, [requireAdmin]);

  if (loading) {
    return <div>Loading...</div>; 
  }

  if (!user) {
    return <Navigate to="/login" />; 
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />; 
  }

  return children; 
};

export default ProtectedRoute;
