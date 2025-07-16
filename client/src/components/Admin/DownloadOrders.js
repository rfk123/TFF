import React, { useEffect, useState } from 'react';

const DownloadOrders = () => {
  const [cycles, setCycles] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedCycleForDownload, setSelectedCycleForDownload] = useState('');
  const [selectedSiteForDownload, setSelectedSiteForDownload] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cycleRes, siteRes] = await Promise.all([
          fetch('/api/cycles'),
          fetch('/api/admin/sites'),
        ]);
        const cycleData = await cycleRes.json();
        const siteData = await siteRes.json();
        setCycles(cycleData);
        setSites(siteData);
      } catch (error) {
        console.error('Error loading cycles or sites:', error);
      }
    };
    fetchData();
  }, []);

  const downloadCycleOrders = async () => {
    if (!selectedCycleForDownload) {
      alert('Please select a cycle first!');
      return;
    }
    try {
      const response = await fetch(`/api/admin/download-cycle-orders/${selectedCycleForDownload}`);
      const data = await response.json();
      const blob = new Blob([
        new Uint8Array(atob(data.data).split('').map(c => c.charCodeAt(0)))
      ], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading cycle orders:', error);
      alert('Error downloading cycle orders');
    }
  };

  const downloadSubscriptionsByLocation = async () => {
    if (!selectedCycleForDownload || !selectedSiteForDownload) {
      alert('Please select both cycle and site.');
      return;
    }
    try {
      const response = await fetch(
        `/api/admin/download-subscriptions/${selectedCycleForDownload}/${selectedSiteForDownload}`
      );
      const data = await response.json();
      const blob = new Blob([
        new Uint8Array(atob(data.data).split('').map(c => c.charCodeAt(0)))
      ], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading subscriptions:', error);
      alert('Error downloading subscriptions');
    }
  };

  const downloadAllOrders = async () => {
    try {
      const response = await fetch('/api/admin/download-all-orders');
      const data = await response.json();
      const blob = new Blob([
        new Uint8Array(atob(data.data).split('').map(c => c.charCodeAt(0)))
      ], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading all orders:', error);
      alert('Error downloading all orders');
    }
  };

  const downloadWaitlist = async () => {
    try {
      const response = await fetch('/api/admin/download-waitlist');
      const data = await response.json();
      const blob = new Blob([
        new Uint8Array(atob(data.data).split('').map(c => c.charCodeAt(0)))
      ], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading waitlist:', error);
      alert('Error downloading waitlist');
    }
  };

  return (
    <>
      <section>
        <h2>Download Orders</h2>
        <label>Select Cycle to Download:</label>
        <select
          value={selectedCycleForDownload}
          onChange={(e) => setSelectedCycleForDownload(e.target.value)}
        >
          <option value="">-- Select Cycle --</option>
          {cycles.map((c) => (
            <option key={c.cycle_id} value={c.cycle_id}>
              {c.cycle_name} ({new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()})
            </option>
          ))}
        </select>
        <button onClick={downloadCycleOrders} disabled={!selectedCycleForDownload}>
          Download This Cycle's Orders
        </button>
        <hr />
        <h2>Download Subscriptions for a Specific Site and Cycle</h2>
        <label>Select Cycle:</label>
        <select
          value={selectedCycleForDownload}
          onChange={(e) => setSelectedCycleForDownload(e.target.value)}
        >
          <option value="">-- Select Cycle --</option>
          {cycles.map((c) => (
            <option key={c.cycle_id} value={c.cycle_id}>
              {c.cycle_name} ({new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()})
            </option>
          ))}
        </select>
        <label>Select Site:</label>
        <select
          value={selectedSiteForDownload}
          onChange={(e) => setSelectedSiteForDownload(e.target.value)}
        >
          <option value="">-- Select Site --</option>
          {sites.map((s) => (
            <option key={s.site_id} value={s.site_id}>
              {s.site_name} - {s.site_address}
            </option>
          ))}
        </select>
        <button
          onClick={downloadSubscriptionsByLocation}
          disabled={!selectedCycleForDownload || !selectedSiteForDownload}
        >
          Download All Subscriptions for This Site
        </button>
        <hr />
        <button onClick={downloadAllOrders}>Download All Subscriptions</button>
        <hr />
        <button onClick={downloadWaitlist}>Download Waitlist</button>
      </section>
      <hr />
    </>
  );
};

export default DownloadOrders;