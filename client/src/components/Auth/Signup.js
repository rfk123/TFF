import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../../firebase'; // Import Firestore
import { doc, setDoc } from "firebase/firestore"; // Import Firestore methods
import logo from './../../assets/logo.png';
import './signup.css';  

const Signup = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); 

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const onSubmit = async (e) => {
        e.preventDefault();
    
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.');
            setPassword('');
            setEmail('');
            return;
        }
    
        if (/\s/.test(password)) {
            setError('Password cannot contain spaces.');
            setPassword('');  // Clear the password field
            return;
        }
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
    
            // Store user info in Firestore with default role 'user'
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: "user"
            });
    
            console.log(user);
            navigate("/login", { state: { successMessage: "Account created successfully. Please login." } });
        } catch (error) {
            console.error(error.code, error.message);
    
            switch (error.code) {
                case 'auth/email-already-in-use':
                    setError('This email is already in use.');
                    break;
                case 'auth/weak-password':
                    setError('Password should be at least 6 characters.');
                    break;
                case 'auth/invalid-email':
                    setError('Invalid email format.');
                    break;
                default:
                    setError('An error occurred during signup. Please try again.');
            }
        }
    };
    

    return (
        <div className="signup-container">
            <form className="signup-form" onSubmit={onSubmit}>
                <img src={logo} alt="Logo" className="form-logo" />

                {error && <p className="error-message">{error}</p>}

                <div>
                    <label htmlFor="email-address">Email address</label>
                    <input
                        id="email-address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                    />
                </div>

                <button type="submit">Sign up</button>

                <p>
                    Already have an account?{' '}
                    <NavLink to="/login">Sign in</NavLink>
                </p>
            </form>
        </div>
    );
};

export default Signup;
