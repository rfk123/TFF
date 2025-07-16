import React, { useState, useEffect } from 'react';
import '../../pages/admin.css';

const SubscriptionsTable = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [editingSubId, setEditingSubId] = useState(null);
  const [editedSubscription, setEditedSubscription] = useState({});
  const [totals, setTotals] = useState({ totalAmount: 0, totalCartons: 0, totalDonations: 0 });

  // load subscriptions and cycles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, cyclesRes] = await Promise.all([
          fetch('/api/admin/subscriptions'),
          fetch('/api/cycles')
        ]);
        const subsData = await subsRes.json();
        const cyclesData = await cyclesRes.json();
        setSubscriptions(subsData);
        setCycles(cyclesData);
      } catch (err) {
        console.error('Error loading subscriptions or cycles:', err);
      }
    };
    fetchData();
  }, []);

  // recalc totals when cycle or subscriptions change
  useEffect(() => {
    if (!selectedCycle) {
      setTotals({ totalAmount: 0, totalCartons: 0, totalDonations: 0 });
      return;
    }
    const filtered = subscriptions.filter(sub => sub.egg_cycle === selectedCycle);
    const totalAmount = filtered.reduce((sum, sub) => sum + parseFloat(sub.total_amount || 0), 0);
    const totalCartons = filtered.reduce((sum, sub) => sum + parseInt(sub.cartons_per_week || 0, 10), 0);
    const totalDonations = filtered.reduce((sum, sub) => sum + parseInt(sub.donation_cartons || 0, 10), 0);
    setTotals({ totalAmount, totalCartons, totalDonations });
    setCurrentPage(1);
  }, [selectedCycle, subscriptions]);

  const handleSearch = e => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const filteredSubscriptions = subscriptions
    .filter(sub => !selectedCycle || sub.egg_cycle === selectedCycle)
    .filter(sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSubscriptions = filteredSubscriptions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);

  const startEditing = sub => {
    setEditingSubId(sub.id);
    setEditedSubscription(sub);
  };

  const cancelEditing = () => {
    setEditingSubId(null);
    setEditedSubscription({});
  };

  const saveEditedSubscription = async id => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedSubscription)
      });
      if (res.ok) {
        alert('Subscription updated successfully');
        cancelEditing();
        const updated = await (await fetch('/api/admin/subscriptions')).json();
        setSubscriptions(updated);
      } else {
        const err = await res.json();
        alert('Error updating subscription: ' + (err.error || 'Unknown'));
      }
    } catch (err) {
      console.error('Error saving subscription:', err);
      alert('Error updating subscription');
    }
  };

  return (
    <section>
      <h2>Subscriptions</h2>

      <div className="subscription-controls" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="cycle-summary">
          <label>Select Cycle: </label>
          <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
            <option value="">All cycles</option>
            {cycles.map(c => (
              <option key={c.cycle_id} value={c.cycle_name}>{c.cycle_name}</option>
            ))}
          </select>
          {selectedCycle && (
            <div style={{ marginTop: '0.5rem' }}>
              <p><strong>Total Amount:</strong> ${totals.totalAmount.toFixed(2)}</p>
              <p><strong>Total Cartons:</strong> {totals.totalCartons}</p>
              <p><strong>Total Donations:</strong> {totals.totalDonations}</p>
            </div>
          )}
        </div>

        <div className="search-box">
          <label>Search by Name: </label>
          <input
            type="text"
            placeholder="Enter name..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="subscription-table" style={{ minWidth: '800px', tableLayout: 'auto' }}>
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
            {currentSubscriptions.map((sub, i) => (
              <tr key={sub.id || i}>
                <td>
                  {editingSubId === sub.id ? (
                    <input
                      type="text"
                      value={editedSubscription.name}
                      onChange={e => setEditedSubscription({ ...editedSubscription, name: e.target.value })}
                    />
                  ) : sub.name}
                </td>
                <td>
                  {editingSubId === sub.id ? (
                    <input
                      type="number"
                      value={editedSubscription.cartons_per_week}
                      onChange={e => setEditedSubscription({ ...editedSubscription, cartons_per_week: e.target.value })}
                    />
                  ) : sub.cartons_per_week}
                </td>
                <td>{sub.egg_cycle}</td>
                <td>{sub.pickup_site}</td>
                <td>${parseFloat(sub.total_amount).toFixed(2)}</td>
                <td>{sub.donation_cartons || 0}</td>
                <td>{sub.second_email || ''}</td>
                <td>{sub.additional_notes || ''}</td>
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
      </div>

      <ul className="pagination">
        <li>
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
            Previous
          </button>
        </li>
        {[...Array(totalPages).keys()].map(num => (
          <li key={num + 1} className={currentPage === num + 1 ? 'active' : ''}>
            <button onClick={() => setCurrentPage(num + 1)}>{num + 1}</button>
          </li>
        ))}
        <li>
          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
            Next
          </button>
        </li>
      </ul>
    </section>
  );
};

export default SubscriptionsTable;
