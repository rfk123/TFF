import React, { useState, useEffect } from 'react';

const CycleManager = () => {
  const [newCycle, setNewCycle] = useState({
    cycle_name: '',
    start_date: '',
    end_date: '',
    number_of_weeks: '',
  });
  const [cycles, setCycles] = useState([]);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const response = await fetch('/api/cycles');
      const data = await response.json();
      setCycles(data);
    } catch (error) {
      console.error('Error fetching cycles:', error);
    }
  };

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
        setNewCycle({ cycle_name: '', start_date: '', end_date: '', number_of_weeks: '' });
        fetchCycles();
      } else {
        alert('Failed to add cycle');
      }
    } catch (error) {
      console.error('Error adding cycle:', error);
    }
  };

  const saveCycle = async (id) => {
    const cycle = cycles.find((c) => c.cycle_id === id);
    try {
      const response = await fetch(`/api/admin/cycles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cycle),
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

  const toggleCycleStatus = async (cycleId) => {
    try {
      const response = await fetch(`/api/admin/cycles/${cycleId}/toggle`, {
        method: 'PUT'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Cycle status updated: ${data.cycle.is_active ? 'Active' : 'Inactive'}`);
        fetchCycles();
      } else {
        alert('Failed to toggle cycle status');
      }
    } catch (error) {
      console.error('Error toggling cycle status:', error);
    }
  };

  const handleCycleChange = (id, field, value) => {
    setCycles((prev) =>
      prev.map((cycle) =>
        cycle.cycle_id === id ? { ...cycle, [field]: value } : cycle
      )
    );
  };

  return (
    <section>
      <h2>Manage Cycles</h2>
      <form onSubmit={addCycle}>
        <label>
          Cycle Name:
          <input
            type="text"
            value={newCycle.cycle_name}
            onChange={(e) => setNewCycle({ ...newCycle, cycle_name: e.target.value })}
            required
          />
        </label>
        <label>
          Start Date:
          <input
            type="date"
            value={newCycle.start_date}
            onChange={(e) => setNewCycle({ ...newCycle, start_date: e.target.value })}
            required
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            value={newCycle.end_date}
            onChange={(e) => setNewCycle({ ...newCycle, end_date: e.target.value })}
            required
          />
        </label>
        <label>
          Number of Weeks:
          <input
            type="number"
            value={newCycle.number_of_weeks}
            onChange={(e) => setNewCycle({ ...newCycle, number_of_weeks: e.target.value })}
            required
          />
        </label>
        <button type="submit">Add Cycle</button>
      </form>

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
                  onChange={(e) => handleCycleChange(cycle.cycle_id, 'cycle_name', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={cycle.start_date.slice(0, 10)}
                  onChange={(e) => handleCycleChange(cycle.cycle_id, 'start_date', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={cycle.end_date.slice(0, 10)}
                  onChange={(e) => handleCycleChange(cycle.cycle_id, 'end_date', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={cycle.number_of_weeks}
                  onChange={(e) => handleCycleChange(cycle.cycle_id, 'number_of_weeks', e.target.value)}
                />
              </td>
              <td style={{ color: cycle.is_active ? 'green' : 'red' }}>
                {cycle.is_active ? 'Active' : 'Inactive'}
              </td>
              <td>
                <button onClick={() => saveCycle(cycle.cycle_id)}>Save</button>
                <button onClick={() => deleteCycle(cycle.cycle_id)}>Delete</button>
                <button onClick={() => toggleCycleStatus(cycle.cycle_id)}>
                  {cycle.is_active ? 'Stop Cycle' : 'Start Cycle'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default CycleManager;