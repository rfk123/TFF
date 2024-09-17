require('dotenv').config();
const { Pool } = require('pg');

const express = require('express');
const app = express();
const Stripe = require('stripe');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer'); 
const xlsx = require('xlsx');
const fs = require('fs');
const axios = require('axios');
const path = require('path');


// HTTPS Redirection Middleware
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });

app.use(express.static(path.join(__dirname, 'client/build')));

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false, // Adjust based on your SSL requirements
  },
});

// Nodemailer transporter setup (use App Password for Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD  
  }
});

// Email function to send confirmation
const sendConfirmationEmail = (email, name, eggCycle, totalAmount) => {
  console.log('Sending email for cycle:', eggCycle);  // Log eggCycle for debugging
  
  const mailOptions = {
    from: 'your_email@gmail.com',
    to: email,
    subject: 'Subscription Confirmation',
    text: `Hello ${name},\n\nThank you for subscribing to the ${eggCycle} cycle! Your payment of $${totalAmount} has been received.\n\nView more information on your order through your user profile!\n\nBest regards,\nThe Farm Team`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending email:', err);
    } else {
      console.log('Confirmation email sent:', info.response);
    }
  });
};

// Define the getCurrentCycle function before it is used
const getCurrentCycle = (callback) => {
  const today = new Date().toISOString().slice(0, 10); // Format today's date as YYYY-MM-DD
  console.log('Formatted today\'s date:', today); // Log today's date for debugging

  const query = `
    SELECT cycle_id, cycle_name, start_date, end_date 
    FROM cycles 
    WHERE (start_date - INTERVAL '14 days') <= $1 
    AND (end_date - INTERVAL '14 days') >= $1
  `;
  
  console.log('Executing query:', query, 'with today\'s date:', today);

  pool.query(query, [today], (err, result) => {
    if (err) {
      console.error('Error fetching the current cycle:', err);
      callback(err, null);
    } else if (result.rows.length > 0) {
      console.log('Current cycle found:', result.rows[0]); // Log the found cycle
      callback(null, result.rows[0]);  // Return the current cycle
    } else {
      console.log('No current cycle found');
      callback(null, null);  // No current cycle found
    }
  });
};

// Function to geocode address and get lat/lon
const geocodeAddress = async (address) => {
  const encodedAddress = encodeURIComponent(address);
  const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`, {
    headers: {
      'User-Agent': 'YourAppName/1.0 (your_email@example.com)'  // Replace with your app name and email
    }
  });
  const data = response.data;
  if (data.length > 0) {
    const { lat, lon } = data[0];
    return { lat: parseFloat(lat), lon: parseFloat(lon) };
  } else {
    throw new Error('Geocoding failed');
  }
};

// Middleware to parse JSON for all non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next(); 
  } else {
    express.json()(req, res, next); 
  }
});

// Create checkout session route
// app.post('/create-checkout-session', async (req, res) => {
//   console.log('Received data from frontend:', req.body);

//   const { userId, name, email, amount, cartonsPerWeek, pickupSite, donationCartons, eggCycle } = req.body;
//   const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4242';
//   if (!userId || !name || !amount || !cartonsPerWeek || !pickupSite || !eggCycle || !email) {
//     console.log('Missing required fields:', req.body);
//     return res.status(400).send('Missing required fields');
//   }

//   getCurrentCycle((err, currentCycle) => {
//     if (err || !currentCycle) {
//       console.error('Error fetching current cycle:', err);
//       return res.status(500).send('Error fetching current cycle');
//     }

//     console.log('Creating Stripe Checkout session...');
//     stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       customer_email: email, 
//       line_items: [
//         {
//           price_data: {
//             currency: 'usd',
//             product_data: {
//               name: 'Egg Subscription',
//             },
//             unit_amount: amount, // Ensure it's in cents
//           },
//           quantity: 1,
//         },
//       ],
//       mode: 'payment',
//       success_url: `${CLIENT_URL}/success`,
//       cancel_url: `${CLIENT_URL}/cancel`,
//       metadata: {
//         userId,
//         name,
//         cartonsPerWeek,
//         pickupSite,
//         donationCartons,
//         cycle_id: currentCycle.cycle_id,
//         eggCycle: currentCycle.cycle_name
//       }
//     })        
//     .then(session => {
//       console.log('Stripe session created successfully:', session.id);
//       res.json({ id: session.id });
//     })
//     .catch(error => {
//       console.error('Error creating Stripe Checkout session:', error);
//       res.status(500).send('Server error: Could not create session');
//     });
//   });
// });

// Create checkout session route
app.post('/create-checkout-session', async (req, res) => {
    console.log('Received data from frontend:', req.body);
  
    const { userId, name, email, amount, cartonsPerWeek, pickupSite, donationCartons, eggCycle } = req.body;
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4242';
  
    // Validate that all required fields are present
    if (!userId || !name || !amount || !cartonsPerWeek || !pickupSite || !eggCycle || !email) {
      console.log('Missing required fields:', req.body);
      return res.status(400).send('Missing required fields');
    }
  
    // Creating Stripe Checkout session using the data from the frontend
    try {
      console.log('Creating Stripe Checkout session...');
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Egg Subscription',
              },
              unit_amount: amount, // Ensure it's in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${CLIENT_URL}/success`,
        cancel_url: `${CLIENT_URL}/cancel`,
        metadata: {
          userId,
          name,
          cartonsPerWeek,
          pickupSite,
          donationCartons,
          cycle_id: eggCycle,  // cycle_id from the frontend
          eggCycle            // eggCycle name from the frontend
        }
      });
  
      console.log('Stripe session created successfully:', session.id);
      res.json({ id: session.id });  // Send the session ID to the frontend
    } catch (error) {
      console.error('Error creating Stripe Checkout session:', error);
      res.status(500).send('Server error: Could not create session');
    }
  });
  

// Stripe webhook requires raw body parsing
app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Session metadata:', session.metadata);
    
    const insertQuery = `
      INSERT INTO subscriptions (user_id, name, cartons_per_week, egg_cycle, pickup_site, total_amount, cycle_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
  
    // pool.query(insertQuery, [
    //   session.metadata.userId,
    //   session.metadata.name,
    //   session.metadata.cartonsPerWeek,
    //   session.metadata.eggCycle,
    //   session.metadata.pickupSite,
    //   session.amount_total / 100,
    //   session.metadata.cycle_id
    // ], (err, result) => {
    pool.query(insertQuery, [
    session.metadata.userId,
    session.metadata.name,
    parseInt(session.metadata.cartonsPerWeek, 10),
    session.metadata.eggCycle,
    parseInt(session.metadata.pickupSite, 10), // Ensure pickupSite is an integer
    session.amount_total / 100,
    parseInt(session.metadata.cycle_id, 10)
    ], (err, result) => {
      if (err) {
        console.error('Error inserting subscription data:', err);
        return response.status(500).send('Error inserting subscription data');
      }
      
      // Send confirmation email
      sendConfirmationEmail(session.customer_email, session.metadata.name, session.metadata.eggCycle, session.amount_total / 100);
      response.status(200).send('Webhook received and email sent');
    });
  } else {
    response.status(200).send('Webhook received');
  }
});

// Fetch subscriptions for admin
app.get('/api/admin/subscriptions', (req, res) => {
    const query = `
      SELECT s.user_id, s.name, s.cartons_per_week, c.cycle_name AS egg_cycle,
             st.site_name AS pickup_site, s.total_amount, s.cycle_id 
      FROM subscriptions s
      JOIN cycles c ON s.cycle_id = c.cycle_id
      JOIN sites st ON s.pickup_site = st.site_id
    `;
  
    pool.query(query, (err, result) => {
      if (err) {
        console.error('Error fetching subscriptions:', err);
        return res.status(500).json({ error: 'Error fetching subscriptions' });
      }
      res.json(result.rows);
    });
  });
  

// Contact form submission route
app.post('/submit-question', (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validate the form data
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Insert the contact form data into PostgreSQL
  const insertQuery = `
    INSERT INTO contact_form_submissions (name, email, subject, message)
    VALUES ($1, $2, $3, $4)
  `;
  
  pool.query(insertQuery, [name, email, subject, message], (err) => {
    if (err) {
      console.error('Error inserting contact form data:', err);
      return res.status(500).json({ error: 'Error submitting question' });
    }
    res.status(200).json({ message: 'Question submitted successfully' });
  });
});

// Update route to add site with geocoding
app.post('/api/admin/sites', async (req, res) => {
  const { site_name, site_address, site_instructions, pickup_start_day, pickup_deadline_day } = req.body;

  try {
    const location = await geocodeAddress(site_address);  // Geocode the address to get lat/lon
    const query = `
      INSERT INTO sites (site_name, site_address, site_instructions, pickup_start_day, pickup_deadline_day, lat, lon)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    pool.query(query, [site_name, site_address, site_instructions, pickup_start_day, pickup_deadline_day, location.lat, location.lon], (err, result) => {
      if (err) {
        console.error('Error adding new site:', err);
        return res.status(500).send('Error adding new site');
      }
      res.status(200).send('Site added successfully');
    });
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).send('Error geocoding address');
  }
});

// Fetch all sites
app.get('/api/admin/sites', (req, res) => {
  const query = `
    SELECT site_id, site_name, site_address, site_instructions, pickup_start_day, pickup_deadline_day, lat, lon 
    FROM sites 
    WHERE lat IS NOT NULL AND lon IS NOT NULL
  `;
  
  pool.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching sites:', err);
      return res.status(500).send('Error fetching sites');
    }
    res.json(result.rows);
  });
});

// Find the closest site based on user location
app.post('/api/closest-site', (req, res) => {
  const { userLatitude, userLongitude } = req.body;

  if (!userLatitude || !userLongitude) {
    return res.status(400).send('Latitude and longitude are required');
  }

  const query = `
    SELECT site_name, site_address, (
      6371 * acos(
        cos(radians($1)) * cos(radians(lat)) * 
        cos(radians(lon) - radians($2)) + 
        sin(radians($1)) * sin(radians(lat))
      )
    ) AS distance
    FROM sites
    WHERE lat IS NOT NULL AND lon IS NOT NULL
    ORDER BY distance
    LIMIT 1;
  `;

  pool.query(query, [userLatitude, userLongitude], (err, result) => {
    if (err) {
      console.error('Error fetching closest site:', err);
      return res.status(500).send('Error fetching closest site');
    }

    console.log('Results:', result.rows); // Log query results to inspect
    if (result.rows.length === 0) {
      return res.status(404).send('No sites found');
    }

    res.json(result.rows[0]);
  });
});

// Edit an existing site
app.put('/api/admin/sites/:id', (req, res) => {
  const { site_name, site_address, site_instructions, pickup_start_day, pickup_deadline_day } = req.body;
  const { id } = req.params;

  const query = `
    UPDATE sites 
    SET site_name = $1, site_address = $2, site_instructions = $3, pickup_start_day = $4, pickup_deadline_day = $5
    WHERE site_id = $6
  `;

  pool.query(query, [site_name, site_address, site_instructions, pickup_start_day, pickup_deadline_day, id], (err, result) => {
    if (err) {
      console.error('Error updating site:', err);
      return res.status(500).send('Error updating site');
    }
    res.status(200).send('Site updated successfully');
  });
});

// Delete a site
app.delete('/api/admin/sites/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM sites WHERE site_id = $1';

  pool.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting site:', err);
      return res.status(500).send('Error deleting site');
    }
    res.status(200).send('Site deleted successfully');
  });
});

// Fetch all subscriptions for a specific user
app.get('/get-subscriptions/:userId', (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT s.cartons_per_week, c.cycle_name AS egg_cycle, site.site_address AS pickup_site, s.total_amount
    FROM subscriptions s
    JOIN cycles c ON s.cycle_id = c.cycle_id
    JOIN sites site ON s.pickup_site = site.site_id
    WHERE s.user_id = $1
  `;

  pool.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error fetching subscriptions:', err);
      return res.status(500).send('Error fetching subscriptions');
    }

    if (result.rows.length === 0) {
      return res.status(404).send('No subscriptions found');
    }

    res.json(result.rows);
  });
});

// Mark a question as resolved
app.put('/api/admin/questions/:id/resolve', (req, res) => {
  const { id } = req.params;

  const query = `UPDATE contact_form_submissions SET resolved = TRUE WHERE id = $1`;

  pool.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error marking question as resolved:', err);
      return res.status(500).send('Error resolving question');
    }
    res.status(200).send('Question marked as resolved');
  });
});

// Fetch only unresolved questions for admin view
app.get('/api/admin/questions', (req, res) => {
  const query = 'SELECT * FROM contact_form_submissions WHERE resolved = FALSE';
  
  pool.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching questions:', err);
      return res.status(500).json({ error: 'Error fetching questions' });
    }
    res.json(result.rows); // Send only unresolved questions as JSON
  });
});

// Fetch the current carton price
app.get('/api/admin/carton-price', (req, res) => {
  const query = 'SELECT carton_price FROM settings LIMIT 1';

  pool.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching carton price:', err);
      return res.status(500).send('Error fetching carton price');
    }
    res.json(result.rows[0]);
  });
});

app.get('/api/cycles', (req, res) => {
    const query = 'SELECT cycle_id, cycle_name, start_date, end_date, number_of_weeks FROM cycles';
    pool.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching cycles:', err);
            return res.status(500).send('Error fetching cycles');
        }
        res.json(result.rows); // Return the cycles
    });
});

// Download orders for a specific cycle and site
app.get('/api/admin/download-orders/:cycleId/:siteId', (req, res) => {
    // Decode and parse the route parameters
    const cycleId = decodeURIComponent(req.params.cycleId);
    const siteId = parseInt(decodeURIComponent(req.params.siteId), 10);
  
    console.log(`Received cycleId: ${cycleId}, siteId: ${siteId}`);
  
    const query = `
      SELECT s.name, s.cartons_per_week, st.site_name, st.site_address, c.cycle_name
      FROM subscriptions s
      JOIN sites st ON s.pickup_site = st.site_id
      JOIN cycles c ON s.cycle_id = c.cycle_id
      WHERE c.cycle_name = $1 AND s.pickup_site = $2
    `;
  
    pool.query(query, [cycleId, siteId], (err, result) => {
      if (err) {
        console.error('Error fetching subscriptions:', err);
        return res.status(500).json({ error: 'Error fetching subscriptions' });
      }
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No subscriptions found for this cycle and location' });
      }
  
      // Calculate total number of cartons
      const totalCartons = result.rows.reduce((sum, sub) => sum + sub.cartons_per_week, 0);
  
      // Prepare the workbook and sheet
      const workbook = xlsx.utils.book_new();
  
      const cycleName = result.rows[0].cycle_name.replace(/[^\w\s]/gi, '_');
      const siteName = result.rows[0].site_name.replace(/[^\w\s]/gi, '_');
      const siteAddress = result.rows[0].site_address.replace(/[^\w\s]/gi, '_');
  
      const sheetTitle = `TFF EGG CSA (${cycleName}) - (${siteName}) - (${siteAddress})`;
  
      const worksheet = xlsx.utils.aoa_to_sheet([
        [sheetTitle],
        ['Name', '# of Cartons', ...Array(11).fill('.')]  // Header row
      ]);
  
      result.rows.forEach(sub => {
        const row = [
          sub.name,
          sub.cartons_per_week,
          ...Array(11).fill('')  // Empty cells for weekly check-offs
        ];
        xlsx.utils.sheet_add_aoa(worksheet, [row], { origin: -1 });
      });
  
      xlsx.utils.book_append_sheet(workbook, worksheet, cycleName);
  
      // Write workbook to buffer
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
      // Send buffer, totalCartons, and results in the response
      res.json({
        success: true,
        totalCartons,
        filename: `orders-${cycleName}-${siteName}.xlsx`,
        data: buffer.toString('base64') // Convert buffer to base64 to send as JSON
      });
    });
  });  
  

// Fetch total cartons for a specific cycle and site
app.get('/api/admin/total-cartons/:cycleId/:siteId', (req, res) => {
    // Decode and parse the route parameters
    const cycleId = decodeURIComponent(req.params.cycleId);
    const siteId = parseInt(decodeURIComponent(req.params.siteId), 10);
  
    const query = `
      SELECT SUM(s.cartons_per_week) AS totalCartons
      FROM subscriptions s
      JOIN sites st ON s.pickup_site = st.site_id
      JOIN cycles c ON s.cycle_id = c.cycle_id
      WHERE c.cycle_name = $1 AND s.pickup_site = $2
    `;
  
    pool.query(query, [cycleId, siteId], (err, result) => {
      if (err) {
        console.error('Error fetching total cartons:', err);
        return res.status(500).json({ error: 'Error fetching total cartons' });
      }
  
      const totalCartons = result.rows[0]?.totalcartons || 0; // Default to 0 if no results
      res.json({ totalCartons });
    });
  });
  
  

// Update the carton price
app.put('/api/admin/carton-price', (req, res) => {
  const { carton_price } = req.body;

  if (!carton_price || isNaN(carton_price)) {
    return res.status(400).send('Invalid carton price');
  }

  const query = 'UPDATE settings SET carton_price = $1';

  pool.query(query, [carton_price], (err, result) => {
    if (err) {
      console.error('Error updating carton price:', err);
      return res.status(500).send('Error updating carton price');
    }
    res.status(200).send('Carton price updated successfully');
  });
});

// Route to add a new cycle
app.post('/api/admin/cycles', (req, res) => {
    const { cycle_name, start_date, end_date, number_of_weeks } = req.body;
  
    // Input validation
    if (!cycle_name || !start_date || !end_date || !number_of_weeks) {
      return res.status(400).send('All fields are required');
    }
  
    // Extract the year from start_date
    const cycle_year = new Date(start_date).getFullYear();
  
    const query = `
      INSERT INTO cycles (cycle_name, start_date, end_date, number_of_weeks, cycle_year)
      VALUES ($1, $2, $3, $4, $5)
    `;
  
    pool.query(
      query,
      [cycle_name, start_date, end_date, number_of_weeks, cycle_year],
      (err, result) => {
        if (err) {
          console.error('Error adding new cycle:', err);
          return res.status(500).send('Error adding new cycle');
        }
        res.status(200).send('Cycle added successfully');
      }
    );
  });
  
app.delete('/api/admin/cycles/:id', (req, res) => {
    const { id } = req.params;
  
    if (!id) {
      return res.status(400).send('Cycle ID is required');
    }
  
    const query = 'DELETE FROM cycles WHERE cycle_id = $1';
  
    pool.query(query, [id], (err, result) => {
      if (err) {
        console.error('Error deleting cycle:', err);
        return res.status(500).send('Error deleting cycle');
      }
      res.status(200).send('Cycle deleted successfully');
    });
 });  


// Route to edit cycle start and end dates
app.put('/api/admin/cycles/:id', (req, res) => {
    const { id } = req.params;
    const { start_date, end_date } = req.body;
  
    // Input validation
    if (!start_date || !end_date) {
      return res.status(400).send('Start date and end date are required');
    }
  
    // Extract the year from start_date
    const cycle_year = new Date(start_date).getFullYear();
  
    const query = `
      UPDATE cycles 
      SET start_date = $1, end_date = $2, cycle_year = $3
      WHERE cycle_id = $4
    `;
  
    pool.query(
      query,
      [start_date, end_date, cycle_year, id],
      (err, result) => {
        if (err) {
          console.error('Error updating cycle dates:', err);
          return res.status(500).send('Error updating cycle dates');
        }
        res.status(200).send('Cycle dates updated successfully');
      }
    );
  });
  

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
