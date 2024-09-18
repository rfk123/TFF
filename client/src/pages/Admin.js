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
    const [cartonPrice, setCartonPrice] = useState(6.50); 
    const [loading, setLoading] = useState(true); 
    const [totalsByCycle, setTotalsByCycle] = useState({}); 
    const [newCycle, setNewCycle] = useState({
        cycle_name: '',
        start_date: '',
        end_date: '',
        number_of_weeks: ''
    });
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [locations, setLocations] = useState([]); 
    const [totalCartons, setTotalCartons] = useState(0);


    const handleCycleChange = (e) => {
        const cycle = e.target.value;
        setSelectedCycle(cycle);

        // Fetch the total cartons for the selected cycle and location
        if (cycle && selectedLocation) {
            fetchTotalCartons(cycle, selectedLocation);
        }

        // Update locations based on the selected cycle
        if (totalsByCycle[cycle]) {
            setLocations(Object.keys(totalsByCycle[cycle].byLocation));
        }
    };


    const handleLocationChange = (e) => {
        const location = e.target.value;
        setSelectedLocation(location);

        // Fetch the total cartons for the selected cycle and location
        if (selectedCycle && location) {
            fetchTotalCartons(selectedCycle, location);
        }
    };



    // Fetch subscriptions from MySQL
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

    // Fetch unresolved questions from MySQL
    const fetchQuestions = async () => {
        try {
            const response = await fetch('/api/admin/questions');
            const data = await response.json();
            setQuestions(data);
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    };

    // Fetch sites from MySQL
    const fetchSites = async () => {
        try {
            const response = await fetch('/api/admin/sites');
            const data = await response.json();
            setSites(data);
            setLocations(data); // Populate locations for the new feature
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };



    // Fetch carton price
    const fetchCartonPrice = async () => {
        try {
            const response = await fetch('/api/admin/carton-price');
            const data = await response.json();
            setCartonPrice(data.carton_price);
        } catch (error) {
            console.error('Error fetching carton price:', error);
        }
    };

    // Fetch cycles from MySQL
    const fetchCycles = async () => {
        try {
            const response = await fetch('/api/cycles');
            const data = await response.json();
            setCycles(data);
        } catch (error) {
            console.error('Error fetching cycles:', error);
        }
    };

    const fetchTotalCartons = async (cycleId, siteId) => {
        try {
            const encodedCycleId = encodeURIComponent(cycleId);
            const encodedSiteId = encodeURIComponent(siteId);
            const response = await fetch(`/api/admin/total-cartons/${encodedCycleId}/${encodedSiteId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch total cartons: ${response.statusText}`);
            }
            const data = await response.json();
            setTotalCartons(data.totalCartons);
        } catch (error) {
            console.error('Error fetching total cartons:', error);
        }
    };

    // Add a new cycle
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

    // Edit cycle dates
    const editCycle = async (id, startDate, endDate) => {
        try {
            const response = await fetch(`/api/admin/cycles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_date: startDate, end_date: endDate }),
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

    // Delete a cycle
    const deleteCycle = async (id) => {
        try {
            const response = await fetch(`/api/admin/cycles/${id}`, { method: 'DELETE' });
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

    // Update carton price
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
                setNewSite({ site_name: '', site_address: '', site_instructions: '', pickup_start_day: '', pickup_deadline_day: '' });
            } else {
                alert('Failed to add site');
            }
        } catch (error) {
            console.error('Error adding site:', error);
        }
    };    

    // Delete a site
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

    // Resolve a question
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

    // Calculate total amount by egg cycle
    const calculateTotals = (data) => {
        const totals = data.reduce((acc, sub) => {
            const cycle = sub.egg_cycle;
            const pickupSite = sub.pickup_site;
            
            // Initialize the cycle if not present
            if (!acc[cycle]) {
                acc[cycle] = {
                    totalAmount: 0,
                    totalCartons: 0,
                    byLocation: {}  
                };
            }
            
            // Add to the total amount and cartons per week for the cycle
            acc[cycle].totalAmount += parseFloat(sub.total_amount) || 0;
            acc[cycle].totalCartons += parseInt(sub.cartons_per_week, 10) || 0;
    
            // Initialize pickup location if not present
            if (!acc[cycle].byLocation[pickupSite]) {
                acc[cycle].byLocation[pickupSite] = 0;
            }
            
            // Add cartons to the specific pickup location
            acc[cycle].byLocation[pickupSite] += parseInt(sub.cartons_per_week, 10) || 0;
            
            return acc;
        }, {});
        
        setTotalsByCycle(totals);
    };

    const downloadOrdersByLocation = async (cycleId, siteId) => {
        try {
            const encodedCycleId = encodeURIComponent(cycleId);
            const encodedSiteId = encodeURIComponent(siteId);
            const response = await fetch(`/api/admin/download-orders/${encodedCycleId}/${encodedSiteId}`);
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(`Failed to download orders: ${response.statusText}`);
            }
    
            // Display total cartons needed
            console.log('Total Cartons Needed:', data.totalCartons);
            setTotalCartons(data.totalCartons);
    
            // Download the file
            const blob = new Blob([new Uint8Array(atob(data.data).split("").map(c => c.charCodeAt(0)))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
    
    

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                await Promise.all([fetchSubscriptions(), fetchQuestions(), fetchSites(), fetchCartonPrice(), fetchCycles()]);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    

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
            <hr></hr>
            {/* Subscriptions Section */}
            <section>
                <h2>Subscriptions</h2>
                <div className="egg-cycle-summary">
                    {Object.keys(totalsByCycle).map((cycle) => (
                        <div key={cycle}>
                            <p>
                                <strong>{cycle} Total:</strong> ${Number(totalsByCycle[cycle].totalAmount || 0).toFixed(2)}
                            </p>
                            <div className="cycle-summary">
                                <h2>For Pickup Sheet and totals:</h2>
                                <label>Select Cycle:</label>
                                <select onChange={(e) => setSelectedCycle(e.target.value)}>
                                    <option value="">Select a cycle</option>
                                    {Object.keys(totalsByCycle).map((cycle) => (
                                        <option key={cycle} value={cycle}>{cycle}</option>
                                    ))}
                                </select>

                                {selectedCycle && (
                                    <>
                                        <label>Select Location:</label>
                                        <select onChange={(e) => setSelectedLocation(e.target.value)}>
                                            <option value="">Select a location</option>
                                            {locations.map((site) => (
                                                <option key={site.site_id} value={site.site_id}>
                                                    {site.site_name} - {site.site_address}
                                                </option>
                                            ))}
                                        </select>
                                    </>
                                )}

                                {selectedCycle && selectedLocation && (
                                    <>
                                        <p><strong>Total Cartons Needed (press the download button to view):</strong> {totalCartons}</p> {/* Show total cartons */}
                                        <button
                                            onClick={() => downloadOrdersByLocation(selectedCycle, selectedLocation)}
                                            disabled={!selectedCycle || !selectedLocation}
                                        >
                                            Download Printable File
                                        </button>
                                    </>
                                )}
                            </div>
                            <br />
                        </div>
                    ))}
                </div>
                <table className="subscription-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Cartons/Week</th>
                            <th>Egg Cycle</th>
                            <th>Pickup Site</th>
                            <th>Total Amount</th>
                            <th>Donations</th> {/* Added the new column for donations */}
                        </tr>
                    </thead>
                    <tbody>
                        {subscriptions.map((sub, index) => (
                            <tr key={index}>
                                <td>{sub.name}</td>
                                <td>{sub.cartons_per_week}</td>
                                <td>{sub.egg_cycle}</td>
                                <td>{sub.pickup_site}</td>
                                <td>${parseFloat(sub.total_amount).toFixed(2)}</td>
                                <td>{sub.donation_cartons || 0}</td> {/* Display donation cartons here */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            <hr></hr>
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
                                <td>
                                    <button onClick={() => resolveQuestion(question.id)}>Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            <hr></hr>
            {/* Cycle Management Section */}
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
                <br />

                <h3>Existing Cycles</h3>
                <table className="cycle-table">
                    <thead>
                        <tr>
                            <th>Cycle Name</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Number of Weeks</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cycles.map((cycle) => (
                            <tr key={cycle.cycle_id}>
                                <td>{cycle.cycle_name}</td>
                                <td>
                                    <input
                                        type="date"
                                        value={cycle.start_date.slice(0, 10)}
                                        onChange={(e) => editCycle(cycle.cycle_id, e.target.value, cycle.end_date)}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="date"
                                        value={cycle.end_date.slice(0, 10)}
                                        onChange={(e) => editCycle(cycle.cycle_id, cycle.start_date, e.target.value)}
                                    />
                                </td>
                                <td>{cycle.number_of_weeks}</td>
                                <td>
                                    <button onClick={() => deleteCycle(cycle.cycle_id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            <hr></hr>
            {/* Sites Management Section */}
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
                        Site Address: <br />
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
                <br></br>
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
        </div>
    );
};

export default Admin;