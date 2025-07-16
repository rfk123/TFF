import React, { useState, useEffect } from 'react';

const NotifyWaitlist = () => {
  const [lastWaitlistDate, setLastWaitlistDate] = useState(null);

  useEffect(() => {
    const fetchLastWaitlistEmail = async () => {
      try {
        const res = await fetch('/api/admin/last-waitlist-email');
        const data = await res.json();
        if (data.timestamp) {
          setLastWaitlistDate(new Date(data.timestamp));
        }
      } catch (error) {
        console.error('Error fetching last waitlist email date:', error);
      }
    };

    fetchLastWaitlistEmail();
  }, []);

  const notifyWaitlist = async () => {
    try {
      const response = await fetch('/api/admin/notify-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'The wait is over! You can now subscribe at https://shop.trentfamilyfarmsllc.com',
        }),
      });
      if (response.ok) {
        alert('Waitlist notifications sent successfully!');
      } else {
        alert('Failed to send notifications.');
      }
    } catch (error) {
      console.error('Error notifying waitlist:', error);
      alert('Error sending notifications.');
    }
  };

  return (
    <section>
      <h2>Notify Waitlist</h2>
      <button onClick={notifyWaitlist}>Notify All Waitlist Emails</button>
      {lastWaitlistDate && (
        <p style={{ fontSize: '0.9em', color: '#777' }}>
          Last waitlist email sent: {lastWaitlistDate.toLocaleString()}
        </p>
      )}
    </section>
  );
};

export default NotifyWaitlist;
