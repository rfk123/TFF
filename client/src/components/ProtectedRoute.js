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
          setLoading(true); // Ensure loading is true while checking admin status
          const adminStatus = await checkIfAdmin(currentUser.uid);
          setIsAdmin(adminStatus);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, [requireAdmin]);

  if (loading) {
    return <div>Loading...</div>; // Ensure loading state while checking
  }

  if (!user) {
    return <Navigate to="/login" />; // Redirect to login if user is not authenticated
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />; // Redirect non-admin users to the home page
  }

  return children; // Allow access to the protected route
};

export default ProtectedRoute;
