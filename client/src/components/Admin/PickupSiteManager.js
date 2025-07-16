import React, { useState, useEffect } from 'react';

const PickupSiteManager = () => {
  const [newSite, setNewSite] = useState({
    site_name: '',
    site_address: '',
    site_instructions: '',
    pickup_start_day: '',
    pickup_deadline_day: '',
  });
  const [sites, setSites] = useState([]);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/admin/sites');
      const data = await response.json();
      setSites(data);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const addSite = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });
      if (response.ok) {
        alert('Site added successfully');
        fetchSites();
        setNewSite({
          site_name: '',
          site_address: '',
          site_instructions: '',
          pickup_start_day: '',
          pickup_deadline_day: '',
        });
      } else {
        alert('Failed to add site');
      }
    } catch (error) {
      console.error('Error adding site:', error);
    }
  };

  const deleteSite = async (id) => {
    try {
      const response = await fetch(`/api/admin/sites/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        alert('Site deleted successfully');
        fetchSites();
      } else {
        alert('Failed to delete site');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
    }
  };

  return (
    <section>
      <h2>Manage Pickup Sites</h2>
      <form onSubmit={addSite} className="site-form">
        <label>
          Site Name:
          <input
            type="text"
            value={newSite.site_name}
            onChange={(e) => setNewSite({ ...newSite, site_name: e.target.value })}
            required
          />
        </label>
        <label>
          Site Address:
          <input
            type="text"
            value={newSite.site_address}
            onChange={(e) => setNewSite({ ...newSite, site_address: e.target.value })}
            placeholder="e.g., 123 Main St, Portland, Oregon, 97214"
            required
          />
        </label>
        <label>
          Site Instructions:
          <input
            type="text"
            value={newSite.site_instructions}
            onChange={(e) => setNewSite({ ...newSite, site_instructions: e.target.value })}
          />
        </label>
        <label>
          Pickup Start Day:
          <input
            type="text"
            value={newSite.pickup_start_day}
            onChange={(e) => setNewSite({ ...newSite, pickup_start_day: e.target.value })}
            required
          />
        </label>
        <label>
          Pickup Deadline Day:
          <input
            type="text"
            value={newSite.pickup_deadline_day}
            onChange={(e) => setNewSite({ ...newSite, pickup_deadline_day: e.target.value })}
            required
          />
        </label>
        <button type="submit">Add Site</button>
      </form>

      <br />
      <table className="site-table">
        <thead>
          <tr>
            <th>Site Name</th>
            <th>Site Address</th>
            <th>Site Instructions</th>
            <th>Pickup Start Day</th>
            <th>Pickup Deadline Day</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.site_id}>
              <td>{site.site_name}</td>
              <td>{site.site_address}</td>
              <td>{site.site_instructions}</td>
              <td>{site.pickup_start_day}</td>
              <td>{site.pickup_deadline_day}</td>
              <td>
                <button onClick={() => deleteSite(site.site_id)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default PickupSiteManager;