import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './../../firebase';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import logo from './../../assets/logo.png';
import './login.css'; 

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false); 
  const [successMessage, setSuccessMessage] = useState(''); 

  useEffect(() => {
    if (location.state?.logoutSuccess) {
      setSuccessMessage('You have successfully logged out.');
      setTimeout(() => setSuccessMessage(''), 3000); 
    }
  }, [location]);

  const onLogin = async (e) => {
    e.preventDefault();
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email to reset your password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent!');
    } catch (error) {
      setError("Error sending password reset email.");
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={onLogin}>
        <img src={logo} alt="logo" className='form-logo' />

        {successMessage && <p className="success-message">{successMessage}</p>}
        {error && <p className="error-message">{error}</p>}

        <div>
          <label htmlFor="email-address">Email address</label>
          <input
            id="email-address"
            type="email"
            placeholder="Email address"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="remember-me">
          <input
            type="checkbox"
            id="remember-me"
            checked={rememberMe}
            onChange={() => setRememberMe(!rememberMe)}
          />
          <label htmlFor="remember-me">Remember Me</label>
        </div>

        <button type="submit">Login</button>

        <p>
          No account yet?{' '}
          <NavLink to="/signup">Sign up</NavLink>
        </p>
        <p>
          <a className="forgot-password-link" href="#" onClick={handleForgotPassword}>Forgot your password?</a> 
        </p>
      </form>
    </div>
  );
};

export default Login;
