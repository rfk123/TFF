import React, { useState, useEffect } from 'react';

const ManualSubscriptionForm = () => {
  const [newSubscription, setNewSubscription] = useState({
    name: '',
    cycle_id: '',
    pickup_site: '',
    cartons_per_week: 1,
    total_amount: 0,
    donation_cartons: 0,
    second_email: '',
    additional_notes: '',
  });

  const [cycles, setCycles] = useState([]);
  const [sites, setSites] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cycleRes, siteRes] = await Promise.all([
          fetch('/api/cycles'),
          fetch('/api/admin/sites'),
        ]);
        const cyclesData = await cycleRes.json();
        const sitesData = await siteRes.json();
        setCycles(cyclesData);
        setSites(sitesData);
      } catch (error) {
        console.error('Error fetching cycles/sites:', error);
      }
    };
    fetchData();
  }, []);

  const addManualSubscription = async (e) => {
    e.preventDefault();
    const payload = {
      name: newSubscription.name,
      cycle_id: parseInt(newSubscription.cycle_id, 10),
      pickup_site: parseInt(newSubscription.pickup_site, 10),
      cartons_per_week: parseInt(newSubscription.cartons_per_week, 10),
      total_amount: parseFloat(newSubscription.total_amount) || 0,
      donation_cartons: parseInt(newSubscription.donation_cartons, 10) || 0,
      second_email: newSubscription.second_email || '',
      additional_notes: newSubscription.additional_notes || '',
    };

    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Subscription added manually!');
        setNewSubscription({
          name: '',
          cycle_id: '',
          pickup_site: '',
          cartons_per_week: 1,
          total_amount: 0,
          donation_cartons: 0,
          second_email: '',
          additional_notes: '',
        });
      } else {
        alert('Failed to add subscription.');
      }
    } catch (error) {
      console.error('Error adding subscription manually:', error);
    }
  };

  return (
    <section>
      <h2>Manually Add a New Subscription</h2>
      <form onSubmit={addManualSubscription}>
        <label>
          User Name:
          <input
            type="text"
            value={newSubscription.name}
            onChange={(e) => setNewSubscription({ ...newSubscription, name: e.target.value })}
            required
          />
        </label>
        <label>
          Email:
          <input
            type="text"
            value={newSubscription.second_email}
            onChange={(e) => setNewSubscription({ ...newSubscription, second_email: e.target.value })}
          />
        </label>
        <label>
          Select Cycle:
          <select
            value={newSubscription.cycle_id}
            onChange={(e) => setNewSubscription({ ...newSubscription, cycle_id: e.target.value })}
            required
          >
            <option value="">-- Select Cycle --</option>
            {cycles.map((c) => (
              <option key={c.cycle_id} value={c.cycle_id}>
                {c.cycle_name} ({new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </label>
        <label>
          Pickup Site:
          <select
            value={newSubscription.pickup_site}
            onChange={(e) => setNewSubscription({ ...newSubscription, pickup_site: e.target.value })}
            required
          >
            <option value="">-- Select Site --</option>
            {sites.map((s) => (
              <option key={s.site_id} value={s.site_id}>
                {s.site_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cartons per Week:
          <input
            type="number"
            min="1"
            value={newSubscription.cartons_per_week}
            onChange={(e) => setNewSubscription({ ...newSubscription, cartons_per_week: e.target.value })}
            required
          />
        </label>
        <label>
          Total Amount ($):
          <input
            type="number"
            step="0.01"
            value={newSubscription.total_amount}
            onChange={(e) => setNewSubscription({ ...newSubscription, total_amount: e.target.value })}
            required
          />
        </label>
        <label>
          Donation Cartons:
          <input
            type="number"
            min="0"
            value={newSubscription.donation_cartons}
            onChange={(e) => setNewSubscription({ ...newSubscription, donation_cartons: e.target.value })}
          />
        </label>
        <label>
          Additional Notes (optional):
          <input
            type="text"
            value={newSubscription.additional_notes}
            onChange={(e) => setNewSubscription({ ...newSubscription, additional_notes: e.target.value })}
          />
        </label>
        <button type="submit">Add Subscription</button>
      </form>
    </section>
  );
};

export default ManualSubscriptionForm;