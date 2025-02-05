import React, { useState, useEffect } from 'react';
import './admin.css';

const Admin = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [sites, setSites] = useState([]);
  const [newSite, setNewSite] = useState({
    site_name: '',
    site_address: '',
    site_instructions: '',
    pickup_start_day: '',
    pickup_deadline_day: '',
  });
  const [cartonPrice, setCartonPrice] = useState(6.5);
  const [loading, setLoading] = useState(true);
  const [totalsByCycle, setTotalsByCycle] = useState({});
  const [newCycle, setNewCycle] = useState({
    cycle_name: '',
    start_date: '',
    end_date: '',
    number_of_weeks: '',
  });
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [totalCartons, setTotalCartons] = useState(0);
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedCycleForDownload, setSelectedCycleForDownload] = useState('');
  const [selectedCycleForTable, setSelectedCycleForTable] = useState('');

  const [editingSubId, setEditingSubId] = useState(null);
  const [editedSubscription, setEditedSubscription] = useState({});
  const [selectedCycleForSiteDownload, setSelectedCycleForSiteDownload] = useState('');
  const [selectedSiteForDownload, setSelectedSiteForDownload] = useState('');


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

  const handleCycleChangeForTotals = (e) => {
    const cycle = e.target.value;
    setSelectedCycle(cycle);
  };

  const handleCycleChangeForTable = (e) => {
    const cycle = e.target.value;
    setSelectedCycleForTable(cycle);
    setCurrentPage(1); 
  };

  const handleCycleChange = (e) => {
    const cycle = e.target.value;
    setSelectedCycle(cycle);

    // fetch the total cartons for the selected cycle and location
    if (cycle && selectedLocation) {
      fetchTotalCartons(cycle, selectedLocation);
    }

    // update locations based on the selected cycle
    if (totalsByCycle[cycle]) {
      setLocations(Object.keys(totalsByCycle[cycle].byLocation));
    }
  };

  const handleLocationChange = (e) => {
    const location = e.target.value;
    setSelectedLocation(location);

    if (selectedCycle && location) {
      fetchTotalCartons(selectedCycle, location);
    }
  };

  // fetch subscriptions from the server
  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions');
      const data = await response.json();
      calculateTotals(data);
      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  // fetch unresolved questions from the server
  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/admin/questions');
      const data = await response.json();
      const formattedData = data.map((question) => ({
        ...question,
        created_at: new Date(question.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      }));
      setQuestions(formattedData);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  // fetch sites from the server
  const fetchSites = async () => {
    try {
      const response = await fetch('/api/admin/sites');
      const data = await response.json();
      setSites(data);
      setLocations(data);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  // fetch carton price from the server
  const fetchCartonPrice = async () => {
    try {
      const response = await fetch('/api/admin/carton-price');
      const data = await response.json();
      setCartonPrice(data.carton_price);
    } catch (error) {
      console.error('Error fetching carton price:', error);
    }
  };

  // fetch cycles from the server
  const fetchCycles = async () => {
    try {
      const response = await fetch('/api/cycles');
      const data = await response.json();
      setCycles(data);
    } catch (error) {
      console.error('Error fetching cycles:', error);
    }
  };

  const downloadAllOrders = async () => {
    try {
      const response = await fetch('/api/admin/download-all-orders');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to download orders: ${response.statusText}`);
      }

      const blob = new Blob(
        [
          new Uint8Array(
            atob(data.data)
              .split('')
              .map((c) => c.charCodeAt(0))
          ),
        ],
        {
          type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading all orders:', error);
    }
  };

  const fetchTotalCartons = async (cycleId, siteId) => {
    try {
      const encodedCycleId = encodeURIComponent(cycleId);
      const encodedSiteId = encodeURIComponent(siteId);
      const response = await fetch(
        `/api/admin/total-cartons/${encodedCycleId}/${encodedSiteId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch total cartons: ${response.statusText}`);
      }
      const data = await response.json();
      setTotalCartons(data.totalCartons);
    } catch (error) {
      console.error('Error fetching total cartons:', error);
    }
  };

  // add a new cycle
  const addCycle = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCycle),
      });
      if (response.ok) {
        alert('Cycle added successfully');
        setNewCycle({
          cycle_name: '',
          start_date: '',
          end_date: '',
          number_of_weeks: '',
        });
        fetchCycles();
      } else {
        alert('Failed to add cycle');
      }
    } catch (error) {
      console.error('Error adding cycle:', error);
    }
  };

const saveCycle = async (id) => {
    const cycle = cycles.find((cycle) => cycle.cycle_id === id);
    try {
      const response = await fetch(`/api/admin/cycles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle_name: cycle.cycle_name,
          start_date: cycle.start_date,
          end_date: cycle.end_date,
          number_of_weeks: cycle.number_of_weeks,
        }),
      });
      if (response.ok) {
        alert('Cycle updated successfully');
        fetchCycles();
      } else {
        alert('Failed to update cycle');
      }
    } catch (error) {
      console.error('Error updating cycle:', error);
    }
  };

  // delete a cycle
  const deleteCycle = async (id) => {
    try {
      const response = await fetch(`/api/admin/cycles/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        alert('Cycle deleted successfully');
        fetchCycles();
      } else {
        alert('Failed to delete cycle');
      }
    } catch (error) {
      console.error('Error deleting cycle:', error);
    }
  };

  // update carton price
  const updateCartonPrice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/carton-price', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ carton_price: cartonPrice }),
      });

      if (response.ok) {
        alert('Carton price updated successfully');
        fetchCartonPrice();
      } else {
        alert('Failed to update carton price');
      }
    } catch (error) {
      console.error('Error updating carton price:', error);
    }
  };

  const addSite = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  // delete a site
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

  // for resolving questions
  const resolveQuestion = async (id) => {
    try {
      const response = await fetch(`/api/admin/questions/${id}/resolve`, {
        method: 'PUT',
      });

      if (response.ok) {
        alert('Question resolved successfully');
        fetchQuestions();
      } else {
        alert('Failed to resolve question');
      }
    } catch (error) {
      console.error('Error resolving question:', error);
    }
  };

  // calc total amount by egg cycle
  const calculateTotals = (data) => {
    const totals = data.reduce((acc, sub) => {
      const cycle = sub.egg_cycle;
      const pickupSite = sub.pickup_site;

      // initialize the cycle if not present
      if (!acc[cycle]) {
        acc[cycle] = {
          totalAmount: 0,
          totalCartons: 0,
          totalDonations: 0,
          byLocation: {},
        };
      }

      // add to the total amount and cartons per week for the cycle
      acc[cycle].totalAmount += parseFloat(sub.total_amount) || 0;
      acc[cycle].totalCartons += parseInt(sub.cartons_per_week, 10) || 0;
      acc[cycle].totalDonations += parseInt(sub.donation_cartons, 10) || 0;

      // initialize pickup location if not present
      if (!acc[cycle].byLocation[pickupSite]) {
        acc[cycle].byLocation[pickupSite] = 0;
      }

      // add cartons to specific site location
      acc[cycle].byLocation[pickupSite] +=
        parseInt(sub.cartons_per_week, 10) || 0;

      return acc;
    }, {});

    setTotalsByCycle(totals);
  };

  const downloadOrdersByLocation = async (cycleId, siteId) => {
    try {
      const encodedCycleId = encodeURIComponent(cycleId);
      const encodedSiteId = encodeURIComponent(siteId);
      const response = await fetch(
        `/api/admin/download-orders/${encodedCycleId}/${encodedSiteId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to download orders: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Total Cartons Needed:', data.totalCartons);
  
      const blob = new Blob(
        [
          new Uint8Array(
            atob(data.data)
              .split('')
              .map((c) => c.charCodeAt(0))
          ),
        ],
        {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading the orders:', error);
    }
  };  

  const handleCycleNameChange = (id, newName) => {
    setCycles(cycles.map((cycle) => 
      cycle.cycle_id === id ? { ...cycle, cycle_name: newName } : cycle
    ));
  };
  
  const handleCycleDateChange = (id, newValue, field) => {
    setCycles(cycles.map((cycle) => 
      cycle.cycle_id === id ? { ...cycle, [field]: newValue } : cycle
    ));
  };
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchSubscriptions(),
          fetchQuestions(),
          fetchSites(),
          fetchCartonPrice(),
          fetchCycles(),
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCycleForTable]);

  const filteredSubscriptions = selectedCycleForTable
    ? subscriptions.filter(
        (sub) => sub.egg_cycle === selectedCycleForTable
      )
    : subscriptions;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSubscriptions = filteredSubscriptions.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);

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
      // POST to a new /api/admin/subscriptions route
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
        fetchSubscriptions();
      } else {
        alert('Failed to add subscription.');
      }
    } catch (error) {
      console.error('Error adding subscription manually:', error);
      alert('Error adding subscription manually.');
    }
  };

  const notifyWaitlist = async () => {
    try {
      const response = await fetch('/api/admin/notify-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'The wait is over! You can now subscribe at https://shop.trentfamilyfarmsllc.com'
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

  const downloadWaitlist = async () => {
    try {
      const response = await fetch('/api/admin/download-waitlist');
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(`Failed to download waitlist: ${response.statusText}`);
      }
  
      const blob = new Blob(
        [
          new Uint8Array(
            atob(data.data)
              .split('')
              .map((c) => c.charCodeAt(0))
          ),
        ],
        {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading waitlist:', error);
    }
  };
  
  // Called when the admin clicks the "Edit" button for a subscription.
  const startEditing = (sub) => {
    setEditingSubId(sub.id);
    // Pre-fill our edit state with the current subscription details.
    setEditedSubscription(sub);
  };

  const cancelEditing = () => {
    setEditingSubId(null);
    setEditedSubscription({});
  };

  const saveEditedSubscription = async (id) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedSubscription)
      });
      if (response.ok) {
        alert("Subscription updated successfully");
        setEditingSubId(null);
        setEditedSubscription({});
        // Refresh the subscriptions list:
        fetchSubscriptions();
      } else {
        const data = await response.json();
        alert("Error updating subscription: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error updating subscription", err);
      alert("Error updating subscription");
    }
  };
  
  const toggleCycleStatus = async (cycleId) => {
    try {
      const response = await fetch(`/api/admin/cycles/${cycleId}/toggle`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Cycle status updated: ${data.cycle.is_active ? 'Active' : 'Inactive'}`);
        // Refresh cycles
        fetchCycles();
      } else {
        alert('Failed to toggle cycle status');
      }
    } catch (error) {
      console.error('Error toggling cycle status:', error);
      alert('Error toggling cycle status');
    }
  };
  
  const downloadSubscriptionsByLocation = async (cycleId, siteId) => {
    try {
      const encodedCycleId = encodeURIComponent(cycleId);
      const encodedSiteId = encodeURIComponent(siteId);
      const response = await fetch(`/api/admin/download-subscriptions/${encodedCycleId}/${encodedSiteId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Failed to download subscriptions: ${response.statusText}`);
      }
      const blob = new Blob(
        [
          new Uint8Array(
            atob(data.data)
              .split('')
              .map((c) => c.charCodeAt(0))
          ),
        ],
        {
          type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading subscriptions:', error);
      alert('Error downloading subscriptions');
    }
  };  

  const downloadCycleOrders = async () => {
    if (!selectedCycleForDownload) {
      alert('Please select a cycle first!');
      return;
    }

    try {
      const response = await fetch(`/api/admin/download-cycle-orders/${selectedCycleForDownload}`);
      if (!response.ok) {
        throw new Error(`Failed to download cycle orders: ${response.statusText}`);
      }

      const data = await response.json();
      // same approach as "downloadAllOrders" method:
      const blob = new Blob(
        [
          new Uint8Array(
            atob(data.data)
              .split('')
              .map((c) => c.charCodeAt(0))
          )
        ],
        {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading cycle orders:', error);
      alert('Error downloading cycle orders');
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      {/* Carton Price Management Section */}
      <section>
        <h2>Carton Price</h2>
        <form onSubmit={updateCartonPrice}>
          <label>
            Current Carton Price: $
            <input
              type="number"
              step="0.01"
              value={cartonPrice}
              onChange={(e) => setCartonPrice(e.target.value)}
              required
            />
          </label>
          <button type="submit">Update Carton Price</button>
        </form>
      </section>
      <hr />
      <section>
        <h2>Manually Add a New Subscription</h2>
        <form onSubmit={addManualSubscription} style={{ marginBottom: '2rem' }}>
          
          <label>
            User Name:
            <input
              type="text"
              value={newSubscription.name}
              onChange={(e) =>
                setNewSubscription({ ...newSubscription, name: e.target.value })
              }
              required
            />
          </label>

          <label>
            Email:
            <input
              type="text"
              value={newSubscription.second_email}
              onChange={(e) =>
                setNewSubscription({ ...newSubscription, second_email: e.target.value })
              }
            />
          </label>

          <label>
            Select Cycle:
            <select
              value={newSubscription.cycle_id}
              onChange={(e) =>
                setNewSubscription({ ...newSubscription, cycle_id: e.target.value })
              }
              required
            >
              <option value="">-- Select Cycle --</option>
              {cycles.map((c) => (
                <option key={c.cycle_id} value={c.cycle_id}>
                  {c.cycle_name} ({new Date(c.start_date).toLocaleDateString()} -{' '}
                  {new Date(c.end_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </label>

          <label>
            Pickup Site:
            <select
              value={newSubscription.pickup_site}
              onChange={(e) =>
                setNewSubscription({ ...newSubscription, pickup_site: e.target.value })
              }
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
              onChange={(e) =>
                setNewSubscription({
                  ...newSubscription,
                  cartons_per_week: e.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Total Amount ($):
            <input
              type="number"
              step="0.01"
              value={newSubscription.total_amount}
              onChange={(e) =>
                setNewSubscription({ ...newSubscription, total_amount: e.target.value })
              }
              required
            />
          </label>

          <label>
            Donation Cartons:
            <input
              type="number"
              min="0"
              value={newSubscription.donation_cartons}
              onChange={(e) =>
                setNewSubscription({ ...newSubscription, donation_cartons: e.target.value })
              }
            />
          </label>

          <label>
            Additional Notes (optional):
            <input
              type="text"
              value={newSubscription.additional_notes}
              onChange={(e) =>
                setNewSubscription({
                  ...newSubscription,
                  additional_notes: e.target.value,
                })
              }
            />
          </label>

          <button type="submit">Add Subscription</button>
        </form>
      </section>
      <section>
        <h2>Notify Waitlist</h2>
        <button onClick={notifyWaitlist}>Notify All Waitlist Emails</button>
      </section>
      {/* Send Mass Email Section */}
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
        </form>
      </section>
      <hr />
      {/* Download All Orders Section */}
      <section>
        <h2>Download Orders</h2>

        <label>Select Cycle to Download:</label>
        <select
          value={selectedCycleForDownload}
          onChange={(e) => setSelectedCycleForDownload(e.target.value)}
        >
          <option value="">-- Select Cycle --</option>
          {cycles.map((cycle) => (
            <option key={cycle.cycle_id} value={cycle.cycle_id}>
              {cycle.cycle_name} ({new Date(cycle.start_date).toLocaleDateString()} -{' '}
              {new Date(cycle.end_date).toLocaleDateString()})
            </option>
          ))}
        </select>

        <button onClick={downloadCycleOrders} disabled={!selectedCycleForDownload}>
          Download This Cycle's Orders
        </button>
        <hr />
        <h2>Download Subscriptions for a Specific Site and Cycle</h2>
          <label>Select Cycle:</label>
          <select onChange={(e) => setSelectedCycleForDownload(e.target.value)}>
            <option value="">-- Select Cycle --</option>
            {cycles.map((cycle) => (
              <option key={cycle.cycle_id} value={cycle.cycle_id}>
                {cycle.cycle_name} ({new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()})
              </option>
            ))}
          </select>
          <label>Select Site:</label>
          <select onChange={(e) => setSelectedLocation(e.target.value)}>
            <option value="">-- Select Site --</option>
            {sites.map((site) => (
              <option key={site.site_id} value={site.site_id}>
                {site.site_name} - {site.site_address}
              </option>
            ))}
          </select>
          <button
            onClick={() => downloadSubscriptionsByLocation(selectedCycleForDownload, selectedLocation)}
            disabled={!selectedCycleForDownload || !selectedLocation}
          >
            Download All Subscriptions for This Site
          </button>
        <hr />
        <button onClick={downloadAllOrders}>Download All Subscriptions</button>
        <hr />
        <button onClick={downloadWaitlist}>Download Waitlist</button>
      </section>
      <hr />
      {/* Subscriptions Section */}
      <section>
        <h2>Subscriptions</h2>
        <div className="subscription-summary">
          <label>Select Cycle:</label>
          <select onChange={handleCycleChangeForTotals}>
            <option value="">Select a cycle</option>
            {cycles.map((cycle) => (
              <option key={cycle.cycle_id} value={cycle.cycle_name}>
                {cycle.cycle_name}
              </option>
            ))}
          </select>

          {selectedCycle && (
            <div>
              <p>
                <strong>Total Amount:</strong> $
                {Number(
                  totalsByCycle[selectedCycle]?.totalAmount || 0
                ).toFixed(2)}
              </p>
              <p>
                <strong>Total Cartons Needed per Week:</strong>{' '}
                {totalsByCycle[selectedCycle]?.totalCartons || 0}
              </p>
              <p>
                <strong>Total Number of Cartons Donated:</strong>{' '}
                {totalsByCycle[selectedCycle]?.totalDonations || 0}
              </p>
            </div>
          )}
        </div>
        {/* For Pickup Sheets and Totals */}
        <div className="cycle-summary">
          <h2>For Pickup Sheet and totals:</h2>
          <label>Select Cycle:</label>
          <select onChange={(e) => setSelectedCycle(e.target.value)}>
            <option value="">Select a cycle</option>
            {Object.keys(totalsByCycle).map((cycle) => (
              <option key={cycle} value={cycle}>
                {cycle}
              </option>
            ))}
          </select>

          {selectedCycle && (
            <>
              <label>Select Location:</label>
              <select onChange={(e) => setSelectedLocation(e.target.value)}>
                <option value="">Select a location</option>
                {sites.map((site) => (
                  <option key={site.site_id} value={site.site_id}>
                    {site.site_name} - {site.site_address}
                  </option>
                ))}
              </select>
            </>
          )}

          {selectedCycle && selectedLocation && (
            <>
              <p>
                <strong>
                  Total Cartons Needed (press the download button to view):
                </strong>{' '}
                {totalCartons}
              </p>
              <button
                onClick={() =>
                  downloadOrdersByLocation(selectedCycle, selectedLocation)
                }
                disabled={!selectedCycle || !selectedLocation}
              >
                Download Printable File
              </button>
            </>
          )}
        </div>
        <br />
        {/* Subscription Data Table */}
        <label>Filter Subscriptions by Cycle:</label>
        <select onChange={handleCycleChangeForTable}>
          <option value="">All cycles</option>
          {cycles.map((cycle) => (
            <option key={cycle.cycle_id} value={cycle.cycle_name}>
              {cycle.cycle_name}
            </option>
          ))}
        </select>
        <table className="subscription-table">
          <thead>
            <tr>
            <th>Name</th>
            <th>Cartons/Week</th>
            <th>Cycle</th>
            <th>Pickup Site</th>
            <th>Total Amount</th>
            <th>Donation Cartons</th>
            <th>Secondary Email</th>
            <th>Additional Notes</th>
            <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentSubscriptions.map((sub, index) => (
              <tr key={sub.id || index}>
                {/* Name */}
                <td>
                  {editingSubId === sub.id ? (
                    <input
                      type="text"
                      value={editedSubscription.name}
                      onChange={(e) =>
                        setEditedSubscription({ ...editedSubscription, name: e.target.value })
                      }
                    />
                  ) : (
                    sub.name
                  )}
                </td>
                
                {/* Cartons per Week */}
                <td>
                  {editingSubId === sub.id ? (
                    <input
                      type="number"
                      value={editedSubscription.cartons_per_week}
                      onChange={(e) =>
                        setEditedSubscription({ ...editedSubscription, cartons_per_week: e.target.value })
                      }
                    />
                  ) : (
                    sub.cartons_per_week
                  )}
                </td>
                
                {/* Cycle (use a dropdown so admin can select a different cycle) */}
                <td>
                  {editingSubId === sub.id ? (
                    <select
                      value={editedSubscription.cycle_id}
                      onChange={(e) =>
                        setEditedSubscription({ ...editedSubscription, cycle_id: e.target.value })
                      }
                    >
                      <option value="">Select Cycle</option>
                      {cycles.map((cycle) => (
                        <option key={cycle.cycle_id} value={cycle.cycle_id}>
                          {cycle.cycle_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    sub.egg_cycle
                  )}
                </td>
                
                {/* Pickup Site (dropdown as well) */}
                <td>
                  {editingSubId === sub.id ? (
                    <select
                      value={editedSubscription.pickup_site}
                      onChange={(e) =>
                        setEditedSubscription({ ...editedSubscription, pickup_site: e.target.value })
                      }
                    >
                      <option value="">Select Site</option>
                      {sites.map((site) => (
                        <option key={site.site_id} value={site.site_id}>
                          {site.site_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    sub.pickup_site
                  )}
                </td>
                
                {/* Total Amount */}
                <td>
                  {editingSubId === sub.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editedSubscription.total_amount}
                      onChange={(e) =>
                        setEditedSubscription({ ...editedSubscription, total_amount: e.target.value })
                      }
                    />
                  ) : (
                    `$${parseFloat(sub.total_amount).toFixed(2)}`
                  )}
                </td>
                
                {/* Donation Cartons */}
                <td>
                  {editingSubId === sub.id ? (
                    <input
                      type="number"
                      value={editedSubscription.donation_cartons}
                      onChange={(e) =>
                        setEditedSubscription({ ...editedSubscription, donation_cartons: e.target.value })
                      }
                    />
                  ) : (
                    sub.donation_cartons || 0
                  )}
                </td>
                
                {/* Secondary Email */}
                <td>
                  {editingSubId === sub.id ? (
                    <input
                      type="text"
                      value={editedSubscription.second_email}
                      onChange={(e) =>
                        setEditedSubscription({ ...editedSubscription, second_email: e.target.value })
                      }
                    />
                  ) : (
                    sub.second_email || ''
                  )}
                </td>
                
                {/* Additional Notes */}
                <td>
                  {editingSubId === sub.id ? (
                    <input
                      type="text"
                      value={editedSubscription.additional_notes}
                      onChange={(e) =>
                        setEditedSubscription({ ...editedSubscription, additional_notes: e.target.value })
                      }
                    />
                  ) : (
                    sub.additional_notes || ''
                  )}
                </td>
                
                {/* Actions */}
                <td>
                  {editingSubId === sub.id ? (
                    <>
                      <button onClick={() => saveEditedSubscription(sub.id)}>Save</button>
                      <button onClick={cancelEditing}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => startEditing(sub)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination Controls */}
        <ul className="pagination">
          <li>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
          </li>
          {[...Array(totalPages).keys()].map((number) => (
            <li
              key={number + 1}
              className={currentPage === number + 1 ? 'active' : ''}
            >
              <button onClick={() => setCurrentPage(number + 1)}>
                {number + 1}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </li>
        </ul>
      </section>
      <hr />
      {/* Questions Section with Resolve Action */}
      <section>
        <h2>Questions</h2>
        <p>Total Questions: {questions.length}</p>
        <table className="questions-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Subject</th>
              <th>Message</th>
              <th>Date Sent</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question, index) => (
              <tr key={index}>
                <td>{question.name}</td>
                <td>{question.email}</td>
                <td>{question.subject}</td>
                <td>{question.message}</td>
                <td>{question.created_at}</td>
                <td>
                  <button onClick={() => resolveQuestion(question.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <hr />
      {/* Cycle Management Section */}
      <section>
        <h2>Manage Cycles</h2>
        <form onSubmit={addCycle}>
          <label>
            Cycle Name:
            <input
              type="text"
              value={newCycle.cycle_name}
              onChange={(e) =>
                setNewCycle({ ...newCycle, cycle_name: e.target.value })
              }
              required
            />
          </label>
          <label>
            Start Date:
            <input
              type="date"
              value={newCycle.start_date}
              onChange={(e) =>
                setNewCycle({ ...newCycle, start_date: e.target.value })
              }
              required
            />
          </label>
          <label>
            End Date:
            <input
              type="date"
              value={newCycle.end_date}
              onChange={(e) =>
                setNewCycle({ ...newCycle, end_date: e.target.value })
              }
              required
            />
          </label>
          <label>
            Number of Weeks:
            <input
              type="number"
              value={newCycle.number_of_weeks}
              onChange={(e) =>
                setNewCycle({ ...newCycle, number_of_weeks: e.target.value })
              }
              required
            />
          </label>
          <button type="submit">Add Cycle</button>
        </form>
        <br />

        <h3>Existing Cycles</h3>
        <table className="cycle-table">
          <thead>
            <tr>
              <th>Cycle Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Number of Weeks</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((cycle) => (
              <tr key={cycle.cycle_id}>
                <td>
                  <input
                    type="text"
                    value={cycle.cycle_name}
                    onChange={(e) => handleCycleNameChange(cycle.cycle_id, e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={cycle.start_date.slice(0, 10)}
                    onChange={(e) => handleCycleDateChange(cycle.cycle_id, e.target.value, 'start_date')}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={cycle.end_date.slice(0, 10)}
                    onChange={(e) => handleCycleDateChange(cycle.cycle_id, e.target.value, 'end_date')}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={cycle.number_of_weeks}
                    onChange={(e) => handleCycleDateChange(cycle.cycle_id, e.target.value, 'number_of_weeks')}
                  />
                </td>
                <td style={{ color: cycle.is_active ? 'green' : 'red' }}>
                  {cycle.is_active ? 'Active' : 'Inactive'}
                </td>
                <td>
                  {/* Existing save/delete buttons */}
                  <button onClick={() => saveCycle(cycle.cycle_id)}>Save</button>
                  <button onClick={() => deleteCycle(cycle.cycle_id)}>Delete</button>
                  {/* New toggle button */}
                  <button onClick={() => toggleCycleStatus(cycle.cycle_id)}>
                    {cycle.is_active ? 'Stop Cycle' : 'Start Cycle'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <hr />
      {/* Sites Management Section */}
      <section>
        <h2>Manage Pickup Sites</h2>
        <form onSubmit={addSite} className="site-form">
          <label>
            Site Name:
            <input
              type="text"
              value={newSite.site_name}
              onChange={(e) =>
                setNewSite({ ...newSite, site_name: e.target.value })
              }
              required
            />
          </label>
          <label>
            Site Address: <br />
            <input
              type="text"
              value={newSite.site_address}
              onChange={(e) =>
                setNewSite({ ...newSite, site_address: e.target.value })
              }
              placeholder="e.g., 123 Main St, Portland, Oregon, 97214"
              required
            />
          </label>
          <label>
            Site Instructions:
            <input
              type="text"
              value={newSite.site_instructions}
              onChange={(e) =>
                setNewSite({ ...newSite, site_instructions: e.target.value })
              }
            />
          </label>
          <label>
            Pickup Start Day:
            <input
              type="text"
              value={newSite.pickup_start_day}
              onChange={(e) =>
                setNewSite({ ...newSite, pickup_start_day: e.target.value })
              }
              required
            />
          </label>
          <label>
            Pickup Deadline Day:
            <input
              type="text"
              value={newSite.pickup_deadline_day}
              onChange={(e) =>
                setNewSite({ ...newSite, pickup_deadline_day: e.target.value })
              }
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
                  <button onClick={() => deleteSite(site.site_id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Admin;
