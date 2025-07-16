import React, { useState, useEffect } from 'react';

const MassEmailSender = () => {
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastEmailDate, setLastEmailDate] = useState(null);

  useEffect(() => {
    const fetchLastMassEmail = async () => {
      try {
        const res = await fetch('/api/admin/last-mass-email');
        const data = await res.json();
        if (data.timestamp) {
          setLastEmailDate(new Date(data.timestamp));
        }
      } catch (error) {
        console.error('Error fetching last mass email date:', error);
      }
    };
    fetchLastMassEmail();
  }, []);

  const handleSendMassEmail = async () => {
    if (!emailMessage.trim()) {
      alert('Please enter a message.');
      return;
    }

    setSendingEmail(true);

    try {
      const response = await fetch('/api/admin/send-mass-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: emailMessage }),
      });

      if (response.ok) {
        alert('Mass email sent successfully!');
        setEmailMessage('');
        const res = await fetch('/api/admin/last-mass-email');
        const data = await res.json();
        if (data.timestamp) {
          setLastEmailDate(new Date(data.timestamp));
        }
      } else {
        alert('Failed to send mass email.');
      }
    } catch (error) {
      console.error('Error sending mass email:', error);
      alert('An error occurred while sending the email.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <section>
      <h2>Send Mass Email</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMassEmail();
        }}
      >
        <label>
          Message:
          <textarea
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            rows="5"
            placeholder="Enter your message here..."
            required
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ccc',
            }}
          />
        </label>
        <button type="submit" disabled={sendingEmail}>
          {sendingEmail ? 'Sending...' : 'Send Email'}
        </button>
        {lastEmailDate && (
          <p style={{ fontSize: '0.9em', color: '#777' }}>
            Last sent: {lastEmailDate.toLocaleString()}
          </p>
        )}
      </form>
    </section>
  );
};

export default MassEmailSender;
