import React, { useEffect, useState } from 'react';
import { auth } from './../firebase'; 
import './profile.css'; 

const Profile = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetch subscriptions on component mount
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const response = await fetch(`/get-subscriptions/${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            setSubscriptions(data);
          } else {
            setError('No active subscriptions found.');
          }
        } else {
          setError('User not logged in.');
        }
      } catch (error) {
        setError('Error fetching subscriptions.');
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  if (loading) {
    return <div>Loading your subscriptions...</div>;
  }

  if (error) {
    return <div className="no-subscription">{error}</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-content">
        <h1 className="profile-title">Your Profile</h1>
        {subscriptions.length > 0 ? (
          <div className="subscription-list">
            <h2>Your Active Subscriptions</h2>
            {subscriptions.map((subscription, index) => (
              <div className="subscription-details" key={index}>
                <p>
                  <strong>Egg Cycle:</strong> {subscription.egg_cycle}
                </p>
                <p>
                  <strong>Pickup Site:</strong> {subscription.pickup_site}
                </p>
                <p>
                  <strong>Cycle Dates:</strong> {new Date(subscription.start_date).toLocaleDateString()} - {new Date(subscription.end_date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Site Instructions:</strong> {subscription.site_instructions}
                </p>
                <p>
                  <strong>Cartons per Week:</strong> {subscription.cartons_per_week}
                </p>
                <p>
                    <strong>Donated Cartons:</strong> {subscription.donation_cartons}
                </p>
                <p>
                  <strong>Total Amount Paid:</strong> ${subscription.total_amount}
                </p>
                <hr /> 
              </div>
            ))}
          </div>
        ) : (
          <div className="no-subscription">No active subscriptions found.</div>
        )}
      </div>
    </div>
  );
};

export default Profile;
