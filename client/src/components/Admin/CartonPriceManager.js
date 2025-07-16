import React, { useState, useEffect } from 'react';

const CartonPriceManager = () => {
  const [cartonPrice, setCartonPrice] = useState(6.5);

  useEffect(() => {
    const fetchCartonPrice = async () => {
      try {
        const response = await fetch('/api/admin/carton-price');
        const data = await response.json();
        setCartonPrice(data.carton_price);
      } catch (error) {
        console.error('Error fetching carton price:', error);
      }
    };
    fetchCartonPrice();
  }, []);

  const updateCartonPrice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/carton-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carton_price: cartonPrice }),
      });

      if (response.ok) {
        alert('Carton price updated successfully');
      } else {
        alert('Failed to update carton price');
      }
    } catch (error) {
      console.error('Error updating carton price:', error);
    }
  };

  return (
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
  );
};

export default CartonPriceManager;
