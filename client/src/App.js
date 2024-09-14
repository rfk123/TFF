import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from './stripe'; 
import { auth } from './firebase'; // Import Firebase auth
import Header from './components/Header';
import Home from './pages/Home';
import StripeWrapper from './pages/Subscribe';
import Contact from './pages/Contact';
import Signup from './components/Auth/Signup';
import Login from './components/Auth/Login';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import Success from './pages/Success';  
import Cancel from './pages/Cancel'; 
import Admin from './pages/Admin';

function AppContent() {
  const location = useLocation();
  const hideHeaderRoutes = ['/login', '/signup'];
  const [loading, setLoading] = useState(true); // For tracking auth state loading
  const [user, setUser] = useState(null);

  // Check Firebase auth state when the app loads
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false); // Auth state is resolved
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Display while checking auth state
  }

  return (
    <div>
      {!hideHeaderRoutes.includes(location.pathname) && <Header />}
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscribe"
          element={
            <ProtectedRoute>
              <StripeWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/questions"
          element={
            <ProtectedRoute>
              <Contact />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin={true}> {/* Require admin access */}
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cancel"
          element={
            <ProtectedRoute>
              <Cancel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/success"
          element={
            <ProtectedRoute>
              <Success />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
