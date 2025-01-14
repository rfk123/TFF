import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import './subscribe.css';
import { auth } from './../firebase';

// load Stripe with the publishable key from your environment file
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        eggCycle: '',
        cartonsPerWeek: '',
        pickupSite: '',
        wantsToDonate: 'no',
        donationCartons: '',
        notes: ''
    });

    const [availableSites, setAvailableSites] = useState([]);  
    const [availableCycles, setAvailableCycles] = useState([]);
    const [remainingWeeks, setRemainingWeeks] = useState(0); 
    const [orderTotal, setOrderTotal] = useState(0); 
    const [showDonationInfo, setShowDonationInfo] = useState(false); 
    const [showTotal, setShowTotal] = useState(false); 
    const [cartonPrice, setCartonPrice] = useState(6.50);  

    const stripe = useStripe();
    const elements = useElements();

    // for the Closest Pickup Location logic
    const [userAddress, setUserAddress] = useState('');
    const [nearestSite, setNearestSite] = useState('');
    
    useEffect(() => {
        fetchCurrentCycles();
        fetchSites();  // fetch the available sites from the backend
        fetchCartonPrice();  // fetch the latest carton price
    }, []);

    useEffect(() => {
        if (formData.eggCycle) {
            calculateRemainingWeeks();
        }
    }, [formData.eggCycle]);

    useEffect(() => {
        if (formData.cartonsPerWeek && formData.eggCycle && formData.pickupSite) {
            setShowTotal(true); 
            calculateOrderTotal();
        } else {
            setShowTotal(false); 
        }
    }, [formData.cartonsPerWeek, formData.wantsToDonate, formData.donationCartons, formData.eggCycle, formData.pickupSite, remainingWeeks]);

    const fetchCurrentCycles = async () => {
        try {
            const response = await fetch('/api/cycles');  
            const cycles = await response.json();
            console.log(cycles);
    
            const currentDate = new Date();
            const filteredCycles = cycles.filter(cycle => {
                const startDate = new Date(cycle.start_date);
                const endDate = new Date(cycle.end_date);
    
                const twoWeeksBeforeStart = new Date(startDate);
                twoWeeksBeforeStart.setDate(startDate.getDate() - 14);
    
                const twoWeeksBeforeEnd = new Date(endDate);
                twoWeeksBeforeEnd.setDate(endDate.getDate() - 14);
    
                return currentDate >= twoWeeksBeforeStart && currentDate <= twoWeeksBeforeEnd;
            });
    
            setAvailableCycles(filteredCycles);
        } catch (error) {
            console.error('Error fetching cycles:', error);
        }
    };
    

    const fetchSites = async () => {
        try {
            const response = await fetch('/api/admin/sites');  
            const data = await response.json();
            setAvailableSites(data);  
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchCartonPrice = async () => {
        try {
            const response = await fetch('/api/admin/carton-price');  
            const data = await response.json();
            setCartonPrice(data.carton_price);  
        } catch (error) {
            console.error('Error fetching carton price:', error);
        }
    };

    const calculateRemainingWeeks = () => {
        const today = new Date();
        const selectedCycle = availableCycles.find(cycle => String(cycle.cycle_id) === formData.eggCycle);  
        if (!selectedCycle) {
            return;
        }

        const endDate = new Date(selectedCycle.end_date);
        const startOfCycle = new Date(selectedCycle.start_date);
        const totalWeeks = selectedCycle.number_of_weeks;

        const msPerWeek = 7 * 24 * 60 * 60 * 1000; 
        const weeksFromStart = Math.floor((today - startOfCycle) / msPerWeek);
        const remainingWeeks = today > startOfCycle ? totalWeeks - weeksFromStart : totalWeeks;
        setRemainingWeeks(Math.max(remainingWeeks, 0));  
    };

    const calculateOrderTotal = () => {
        const cartonsPerWeek = parseInt(formData.cartonsPerWeek, 10) || 0;
        const donationCartons = formData.wantsToDonate === 'yes' ? (parseInt(formData.donationCartons, 10) || 0) : 0;
        const totalCartonCost = remainingWeeks * cartonsPerWeek * cartonPrice; 
        const totalDonationCost = donationCartons * cartonPrice;
        const total = totalCartonCost + totalDonationCost;
        setOrderTotal(total.toFixed(2));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.cartonsPerWeek <= 0) {
            alert('Please select at least 1 carton per week');
            return;
        }

        const currentUser = auth.currentUser; 
        if (!currentUser) {
            console.error("User not authenticated");
            return;
        }
        const userId = currentUser.uid; 
        const email = currentUser.email; 

        const bodyData = {
            userId, 
            name: formData.name, 
            email,  
            amount: Math.round(orderTotal * 100),
            cartonsPerWeek: formData.cartonsPerWeek,
            eggCycle: formData.eggCycle,  
            pickupSite: formData.pickupSite,
            donationCartons: formData.wantsToDonate === 'yes' ? formData.donationCartons : 0,
        };

        try {
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyData),
            });

            if (!response.ok) {
                throw new Error('Server error');
            }

            const session = await response.json();

            const { error } = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (error) {
                console.error('Error redirecting to Stripe Checkout:', error);
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
        }
    };

    // closest Pickup Location Logic
    const geocodeAddress = async (address) => {
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`);
        const data = await response.json();

        if (data.length > 0) {
            const { lat, lon } = data[0];
            return { lat: parseFloat(lat), lon: parseFloat(lon) };
        } else {
            throw new Error('Address not found.');
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const toRad = (value) => (value * Math.PI) / 180;
        const R = 6371; 
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    };

    const findClosestSite = (userLocation, sites) => {
        let closestSite = null;
        let minDistance = Infinity;

        sites.forEach((site) => {
            const distance = calculateDistance(userLocation.lat, userLocation.lon, site.lat, site.lon);
            if (distance < minDistance) {
                minDistance = distance;
                closestSite = site;
            }
        });

        return closestSite;
    };

    const handleFindClosestSite = async () => {
        try {
            const userLocation = await geocodeAddress(userAddress);
            const closestSite = findClosestSite(userLocation, availableSites);
            if (closestSite) {
                setNearestSite(closestSite.site_name); 
            } else {
                alert('No site found');
            }
        } catch (error) {
            alert("Could not find the address. Please enter a valid address.");
        }
    };

    return (
        <div className="subscribe-container">
          {/* Closest Pickup Location Form */}
          <div className="form-section closest-pickup-form">
            <h2>Find the Closest Pickup Location</h2>
            <form onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="userAddress">Enter Your Address (Format: Street, City, State, ZIP):</label>
              <input
                type="text"
                id="userAddress"
                name="userAddress"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="e.g., 123 Main St, Portland, OR, 97201"
              />
              <button type="button" onClick={handleFindClosestSite}>
                Find Closest Pickup Site
              </button>
            </form>
      
            {/* Display nearest site */}
            {nearestSite && (
              <div className="nearest-site">
                <strong>Nearest Pickup Site:</strong> {nearestSite}
              </div>
            )}
          </div>
      
          {/* Subscription Form */}
          <div className="form-section subscribe-content">
            <h1>Subscribe to Our Egg Pickup</h1>
            <form onSubmit={handleSubmit}>
              <label htmlFor="name">Your Name:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                required
              />
      
              <label htmlFor="eggCycle">Select Egg Cycle:</label>
              <select
                id="eggCycle"
                name="eggCycle"
                value={formData.eggCycle}
                onChange={handleChange}
                required
              >
                <option value="">Select a cycle...</option>
                {availableCycles.map((cycle) => (
                  <option key={cycle.cycle_id} value={cycle.cycle_id}>
                    {cycle.cycle_name} ({new Date(cycle.start_date).toLocaleDateString()} -{' '}
                    {new Date(cycle.end_date).toLocaleDateString()})
                  </option>
                ))}
              </select>
      
              <label htmlFor="pickupSite">Select Pickup Site:</label>
              <select
                id="pickupSite"
                name="pickupSite"
                value={formData.pickupSite}
                onChange={handleChange}
                required
              >
                <option value="">Select a site...</option>
                {availableSites.map((site) => (
                  <option key={site.site_id} value={site.site_id}>
                    {site.site_name}
                  </option>
                ))}
              </select>
      
              <label htmlFor="cartonsPerWeek">
                How Many Cartons of Eggs Per Week?{' '}
                <span className="carton-info">(Each carton is ${cartonPrice})</span>
              </label>
              <input
                type="number"
                id="cartonsPerWeek"
                name="cartonsPerWeek"
                value={formData.cartonsPerWeek}
                onChange={handleChange}
                placeholder="Enter number of cartons"
                min="1"
                max="30"
                required
              />
      
              <label htmlFor="wantsToDonate">
                Would You Like to Donate Eggs to Those in Need?
              </label>
                <div className="donation-info-popup">
                  If you would like to make some of these delicious, nutritious eggs
                  available to people living on low incomes, we are also collecting
                  contributions for additional weekly subscriptions to donate eggs to
                  Collectiva de la Comida, a neighborhood food pantry serving low income
                  families in the NE Cully neighborhood, or to NE Emergency Food Program.
                  Any additional financial donation you make now will go toward those
                  subscriptions.
                </div>
              <select
                id="wantsToDonate"
                name="wantsToDonate"
                value={formData.wantsToDonate}
                onChange={handleChange}
                required
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
      
              {formData.wantsToDonate === 'yes' && (
                <>
                  <label htmlFor="donationCartons">
                    How Many Total Cartons Would You Like to Donate?{' '}
                    <span className="carton-info">(Each carton is ${cartonPrice})</span>
                  </label>
                  <input
                    type="number"
                    id="donationCartons"
                    name="donationCartons"
                    value={formData.donationCartons}
                    onChange={handleChange}
                    placeholder="Enter number of cartons to donate"
                    min="0"
                    max="30"
                    required
                  />
                </>
              )}

              <label htmlFor="notes">Additional Notes (Optional):</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes..."
              />
      
              {showTotal && (
                <div className="order-total">
                  <h3>Your Total: ${orderTotal}</h3>
                </div>
              )}
      
              <button className="subscribe-btn" type="submit">
                Continue to Payment
              </button>
            </form>
          </div>
        </div>
      );      
};

// Wrap the form with Stripe Elements
const StripeWrapper = () => (
    <Elements stripe={stripePromise}>
        <SubscribeForm />
    </Elements>
);

export default StripeWrapper;
