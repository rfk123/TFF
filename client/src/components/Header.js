import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './header.css';
import { FaUserCircle } from 'react-icons/fa';
import { auth, checkIfAdmin } from '../firebase';
import { signOut } from 'firebase/auth'; 

const Header = () => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [adminLoading, setAdminLoading] = useState(true); // Loading state for admin check
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user); 
      setDropdownOpen(false);

      if (user) {
        // Check if the user is an admin
        const adminStatus = await checkIfAdmin(user.uid); 
        setIsAdmin(adminStatus); 
      } else {
        setIsAdmin(false); // Reset admin state if no user
      }

      setAdminLoading(false); // Set loading to false after the check
    });

    return () => unsubscribe(); 
  }, []);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleMouseLeave = () => {
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth); 
      setDropdownOpen(false);
      navigate('/login', { state: { logoutSuccess: true } }); 
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <header className="header-container">
      <nav className="header-nav">
        <NavLink to="/" className="nav-logo">Trent Family Farms</NavLink>

        <div className="nav-links">
          <NavLink to="/subscribe" className="nav-link">Subscribe</NavLink>
          <NavLink to="/questions" className="nav-link">Contact</NavLink>

          <div className="profile-dropdown" onMouseLeave={handleMouseLeave}>
            <FaUserCircle className="user-icon" onClick={toggleDropdown} />
            
            {dropdownOpen && (
              <div className="dropdown-menu">
                <NavLink to="/profile" className="dropdown-item">User Profile</NavLink>
                {!adminLoading && isAdmin && (
                  <NavLink to="/admin" className="dropdown-item">Admin</NavLink>
                )}

                <button className="dropdown-item" onClick={handleLogout}>Logout</button> 
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
