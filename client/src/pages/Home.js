import React from "react";
import { NavLink } from 'react-router-dom';
import './home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome to Trent Family Farms Ecommerce</h1>
        <p>Pick up farm-fresh eggs from one of our local pickup sites. Ready to subscribe?</p>
        <div className="home-buttons">
          <NavLink to="/subscribe" className="home-btn">
            Subscribe for Pickup
          </NavLink>
          <NavLink to="/questions" className="home-btn secondary-btn">
            Contact Us
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Home;
