import React, { useState } from 'react';
import { auth } from '../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail, sendEmailVerification } from 'firebase/auth';
import './settings.css';

const Settings = () => {
  const user = auth.currentUser;
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSendVerification = async () => {
    try {
      await sendEmailVerification(user);
      setSuccessMessage("Verification email sent to your current email.");
    } catch (error) {
      console.error("Error sending verification email:", error);
      setEmailError("Could not send verification email.");
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailError('');
    setSuccessMessage('');

    if (!newEmail.trim()) {
      setEmailError("Email cannot be empty.");
      return;
    }

    try {
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setEmailError("Please verify your current email first. A verification link has been sent.");
        return;
      }

      const password = prompt("Enter your password to confirm:");
      if (!password) {
        setEmailError("Password is required.");
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, newEmail);

      setSuccessMessage("A confirmation link has been sent to your new email.");
      setNewEmail('');
    } catch (err) {
      console.error("Email update error:", err);
      if (err.code === "auth/email-already-in-use") {
        setEmailError("This email is already in use.");
      } else if (err.code === "auth/wrong-password") {
        setEmailError("Incorrect password.");
      } else {
        setEmailError("Something went wrong. Try again.");
      }
    }
  };

  if (!user) {
    return <div>Please log in to view your settings.</div>;
  }

  return (
    <div className="settings-container">
      <h1>Account Settings</h1>

      <div className="settings-section">
        <p><strong>Current Email:</strong> {user.email}</p>
        <p><strong>Email Verified:</strong> {user.emailVerified ? "Yes" : "No"}</p>
        {!user.emailVerified && (
          <button onClick={handleSendVerification}>Resend Verification Email</button>
        )}
      </div>

      <div className="settings-section">
        <h2>Change Email</h2>
        <form onSubmit={handleEmailChange}>
          <input
            type="email"
            placeholder="Enter new email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <button type="submit">Update Email</button>
        </form>
        {emailError && <p className="error-message">{emailError}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
      </div>
    </div>
  );
};

export default Settings;
