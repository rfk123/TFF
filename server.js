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

const admin = require('firebase-admin');
const serviceAccount = require('./trent-family-farms-firebase-adminsdk-rrulv-8c1b0fb70f.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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
    rejectUnauthorized: false, // ssl requirement adjustments
  },
});

//nodemailer transporter setup (use App Password for Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD  
  }
});


const sendConfirmationEmail = (email, name, eggCycleName, pickupSiteName, pickupSiteAddress, pickupSiteInstructions, pickupStartDay, pickupDeadlineDay, totalAmount) => {
    console.log('Sending email for cycle:', eggCycleName);  // for debugging
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Subscription Confirmation',
        html: `Hello ${name},<br><br>
        Thank you for subscribing to the <b>${eggCycleName}</b> cycle! 
        Your payment of <b>$${totalAmount}</b> has been received.<br><br>
      
        You have selected the following pickup site:<br><br>
      
        <b>Site:</b> ${pickupSiteName}<br>
        <b>Address:</b> ${pickupSiteAddress}<br>
        <b>Instructions:</b> ${pickupSiteInstructions}<br>
        <b>Pickup Start Day:</b> ${pickupStartDay}<br>
        <b>Pickup Deadline Day:</b> ${pickupDeadlineDay}<br><br>
      
        View more information on your order through your user profile!<br><br>
      
        If you have questions, please reach out to Amy Stork at <a href="mailto:amystork@gmail.com">amystork@gmail.com</a>.<br><br>
      
        <b>NOTE:</b> Mike is just one guy, and he's affected by weather, traffic, and all the other dropoffs he does on his days in town (restaurants, grocery stores, and NE CSA sites), so occasionally he gets behind schedule. If YOU have a super tight schedule, and/or live far away from your pickup site, I recommend giving a little bit of a cushion after the target delivery times.<br><br>
      
        Best regards,<br>
        The Farm Team`
      };
      
  
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Error sending email:', err);
      } else {
        console.log('Confirmation email sent:', info.response);
      }
    });
  };  

const getCurrentCycle = (callback) => {
  const today = new Date().toISOString().slice(0, 10); // format as YYYY-MM-DD
  // console.log('Formatted today\'s date:', today); // for debugging

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
      console.log('Current cycle found:', result.rows[0]); 
      callback(null, result.rows[0]);  // return the current cycle
    } else {
      console.log('No current cycle found');
      callback(null, null);  // or no current cycle found
    }
  });
};

// Function to geocode address and get lat/lon
const geocodeAddress = async (address) => {
  const encodedAddress = encodeURIComponent(address);
  const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`, {
    headers: {
      'User-Agent': 'TrentFamilyFarmsLLC/1.0 (trentfamilyfarmsllc@yahoo.com)'  
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

// checkout session route
app.post('/create-checkout-session', async (req, res) => {
    // console.log('Received data from frontend:', req.body);
  
    const { userId, name, email, amount, cartonsPerWeek, pickupSite, donationCartons, eggCycle, secondEmail, additionalNotes } = req.body;
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4242';
  
    // ensure that required fields are present
    if (!userId || !name || !amount || !cartonsPerWeek || !pickupSite || !eggCycle || !email) {
      // console.log('Missing required fields:', req.body);
      return res.status(400).send('Missing required fields');
    }
  
    // creating Stripe Checkout session from FE data
    try {
      // console.log('Creating Stripe Checkout session...');
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
              unit_amount: amount, // ensure it's in cents
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
          cycleId: eggCycle, 
          secondEmail: secondEmail || ' ',
          additionalNotes: additionalNotes || ' '
        }
      });
  
      // console.log('Stripe session created successfully:', session.id);
      res.json({ id: session.id });  
    } catch (error) {
      console.error('Error creating Stripe Checkout session:', error);
      res.status(500).send('Server error: Could not create session');
    }
  });
  
// Add an email to the generic waitlist
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const insertQuery = `
    INSERT INTO waitlist (email, created_at)
    VALUES ($1, NOW())
    ON CONFLICT (email) DO NOTHING
  `;

  try {
    await pool.query(insertQuery, [email]);
    return res.status(200).json({ message: 'You have been added to the waitlist.' });
  } catch (error) {
    console.error('Error adding email to waitlist:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.delete('/api/waitlist/:email', async (req, res) => {
  const { email } = req.params;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const deleteQuery = 'DELETE FROM waitlist WHERE email = $1';
    const result = await pool.query(deleteQuery, [email]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'That email was not on the list.' });
    }
    return res.status(200).json({ message: 'Email removed from waitlist' });
  } catch (error) {
    console.error('Error removing email from waitlist:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/notify-waitlist', async (req, res) => {
  try {
    //Fetch all waitlist entries not notified yet
    const getWaitlistQuery = `
      SELECT email
      FROM waitlist
      WHERE notified = false
    `;
    const waitlistResult = await pool.query(getWaitlistQuery);
    const entries = waitlistResult.rows; 

    //For each entry, send an email using nodemailer, etc.
    for (const entry of entries) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: entry.email,
        subject: 'Announcement from Trent Family Farms',
        text: 'We now have a new cycle open for sign-ups! Visit our site at shop.trentfamilyfarmsllc.com to learn more.',
      };
      await transporter.sendMail(mailOptions);
    }

    //Mark all as notified
    if (entries.length > 0) {
      const updateQuery = `
        UPDATE waitlist
        SET notified = true
        WHERE email = ANY ($1)
      `;
      const emailsToUpdate = entries.map(e => e.email);
      await pool.query(updateQuery, [emailsToUpdate]);
    }
    await pool.query(`INSERT INTO waitlist_emails (message) VALUES ($1)`, [message]);
    return res.status(200).json({ message: 'All waitlist emails have been notified' });
  } catch (error) {
    console.error('Error notifying waitlist:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// stripe webhook (requires raw body parsing)
// app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
//     const sig = request.headers['stripe-signature'];
//     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
//     let event;
//     try {
//       event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
//     } catch (err) {
//       console.error('Webhook signature verification failed:', err.message);
//       return response.status(400).send(`Webhook Error: ${err.message}`);
//     }
  
//     if (event.type === 'checkout.session.completed') {
//       const session = event.data.object;
//       console.log('Session metadata:', session.metadata);
      
//       const insertQuery = `
//         INSERT INTO subscriptions (user_id, name, cartons_per_week, egg_cycle, pickup_site, total_amount, cycle_id, donation_cartons, second_email, additional_notes)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
//       `;
    
//       // query to get the egg cycle name and full pickup site details
//       const cycleQuery = `
//         SELECT c.cycle_name, s.site_name, s.site_address, s.site_instructions, s.pickup_start_day, s.pickup_deadline_day 
//         FROM cycles c 
//         JOIN sites s ON s.site_id = $1
//         WHERE c.cycle_id = $2
//       `;
  
//       pool.query(cycleQuery, [session.metadata.pickupSite, session.metadata.cycle_id], (err, result) => {
//         if (err) {
//           console.error('Error fetching cycle and site details:', err);
//           return response.status(500).send('Error fetching cycle and site details');
//         }
  
//         const eggCycleName = result.rows[0].cycle_name;
//         const pickupSiteName = result.rows[0].site_name;
//         const pickupSiteAddress = result.rows[0].site_address;
//         const pickupSiteInstructions = result.rows[0].site_instructions;
//         const pickupStartDay = result.rows[0].pickup_start_day;
//         const pickupDeadlineDay = result.rows[0].pickup_deadline_day;
  
//         // insert subscription data
//         pool.query(insertQuery, [
//           session.metadata.userId,
//           session.metadata.name,
//           parseInt(session.metadata.cartonsPerWeek, 10),
//           session.metadata.eggCycle,
//           parseInt(session.metadata.pickupSite, 10),
//           session.amount_total / 100,
//           parseInt(session.metadata.cycle_id, 10),
//           parseInt(session.metadata.donationCartons, 10) || 0,
//           session.metadata.secondEmail || ' ', 
//           session.metadata.additionalNotes || ' ' 
//         ], (err, result) => {
//           if (err) {
//             console.error('Error inserting subscription data:', err);
//             return response.status(500).send('Error inserting subscription data');
//           }
  
//           //confirmation email with full site details
//           sendConfirmationEmail(
//             session.customer_email,
//             session.metadata.name,
//             eggCycleName,                    
//             pickupSiteName,                 
//             pickupSiteAddress,               
//             pickupSiteInstructions,          
//             pickupStartDay,                  
//             pickupDeadlineDay,               
//             session.amount_total / 100       
//           );
//           response.status(200).send('Webhook received and email sent');
//         });
//       });
//     } else {
//       response.status(200).send('Webhook received');
//     }
//   });
  
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // console.log('Session metadata:', session.metadata);

    // Extract fields from session.metadata
    const {
      userId,
      name,
      cartonsPerWeek,
      pickupSite,
      donationCartons,
      cycleId,          // numeric cycle ID from the front-end
      secondEmail = ' ',
      additionalNotes = ' ',
    } = session.metadata;

    // Convert numeric strings to numbers
    const numericCartonsPerWeek = parseInt(cartonsPerWeek, 10) || 0;
    const numericPickupSite = parseInt(pickupSite, 10) || 0;
    const numericCycleId = parseInt(cycleId, 10) || 0;
    const numericDonationCartons = parseInt(donationCartons, 10) || 0;

    // 1) Look up the cycle name and site details from the database
    let cycleName = 'Unknown Cycle';
    let siteName = 'Unknown Site';
    let siteAddress = 'No address';
    let siteInstructions = '';
    let pickupStartDay = '';
    let pickupDeadlineDay = '';

    try {
      const query = `
        SELECT c.cycle_name,
               s.site_name,
               s.site_address,
               s.site_instructions,
               s.pickup_start_day,
               s.pickup_deadline_day
        FROM cycles c
        JOIN sites s ON s.site_id = $1
        WHERE c.cycle_id = $2
      `;
      const cycleResult = await pool.query(query, [numericPickupSite, numericCycleId]);

      if (cycleResult.rows.length > 0) {
        cycleName = cycleResult.rows[0].cycle_name;
        siteName = cycleResult.rows[0].site_name;
        siteAddress = cycleResult.rows[0].site_address;
        siteInstructions = cycleResult.rows[0].site_instructions;
        pickupStartDay = cycleResult.rows[0].pickup_start_day;
        pickupDeadlineDay = cycleResult.rows[0].pickup_deadline_day;
      }
    } catch (err) {
      console.error('Error fetching cycle/site details:', err);
      return res.status(500).send('Error fetching cycle/site details');
    }

    // 2) Insert subscription data into your table
    try {
      const insertQuery = `
        INSERT INTO subscriptions
          (user_id, name, cartons_per_week, egg_cycle, pickup_site, total_amount, cycle_id, donation_cartons, second_email, additional_notes)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      await pool.query(insertQuery, [
        userId,
        name,
        numericCartonsPerWeek,
        cycleName,                  // store the fetched cycle name
        numericPickupSite,
        session.amount_total / 100, // Stripe amount is in cents
        numericCycleId,
        numericDonationCartons,
        secondEmail,
        additionalNotes,
      ]);

      // 3) Send confirmation email
      sendConfirmationEmail(
        session.customer_email,
        name,
        cycleName,
        siteName,
        siteAddress,
        siteInstructions,
        pickupStartDay,
        pickupDeadlineDay,
        session.amount_total / 100
      );

      return res.status(200).send('Webhook received and email sent');
    } catch (err) {
      console.error('Error inserting subscription data:', err);
      return res.status(500).send('Error inserting subscription data');
    }
  } else {
    // For all other event types, just acknowledge
    return res.status(200).send('Webhook received');
  }
});

// Fetch subscriptions for admin
app.get('/api/admin/subscriptions', (req, res) => {
  const query = `
    SELECT s.id, s.user_id, s.name, s.second_email, s.cartons_per_week, s.donation_cartons, 
           c.cycle_name AS egg_cycle, st.site_name AS pickup_site, s.total_amount, s.cycle_id
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

  app.get('/api/waitlist/:email', async (req, res) => {
    const { email } = req.params;
    try {
        const result = await pool.query('SELECT * FROM waitlist WHERE email = $1', [email]);
        const onWaitlist = result.rows.length > 0;
        res.json({ onWaitlist });
    } catch (error) {
        console.error('Error checking waitlist status:', error);
        res.status(500).json({ error: 'Error checking waitlist status' });
    }
});

// for manual creation
app.post('/api/admin/subscriptions', async (req, res) => {
  const {
    name,
    cycle_id,
    pickup_site,
    cartons_per_week,
    total_amount,
    donation_cartons,
    second_email,
    additional_notes,
  } = req.body;

  if (
    !name ||
    !cycle_id ||
    !pickup_site ||
    !cartons_per_week ||
    total_amount == null
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // We'll store the cycle_name text automatically or from the cycles table if needed
  // For now, let's store egg_cycle as some placeholder or empty string
  // Or you can retrieve the cycle_name from the cycles table if you want
  let egg_cycle_text = '';

  try {
    // Optionally fetch cycle_name from cycles table
    const cycleResult = await pool.query(
      'SELECT cycle_name FROM cycles WHERE cycle_id = $1',
      [cycle_id]
    );
    if (cycleResult.rows.length > 0) {
      egg_cycle_text = cycleResult.rows[0].cycle_name;
    }

    const insertQuery = `
      INSERT INTO subscriptions
      (user_id, name, egg_cycle, pickup_site, cartons_per_week, total_amount, cycle_id, donation_cartons, second_email, additional_notes)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const userId = '';  

    const result = await pool.query(insertQuery, [
      userId,
      name,
      egg_cycle_text,             
      parseInt(pickup_site, 10),
      parseInt(cartons_per_week, 10),
      parseFloat(total_amount),
      parseInt(cycle_id, 10),
      parseInt(donation_cartons, 10) || 0,
      second_email || '',
      additional_notes || '',
    ]);

    return res.status(200).json({
      message: 'Subscription created manually',
      subscription: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating manual subscription:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Contact form submission route
app.post('/submit-question', (req, res) => {
  const { name, email, subject, message } = req.body;

  // validate form data
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

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

app.post('/api/admin/notify-waitlist', async (req, res) => {
  const message = req.body.message || 'The wait is over! You can now subscribe at https://shop.trentfamilyfarmsllc.com';

  try {
    const getWaitlistQuery = `SELECT email FROM waitlist WHERE notified = false`;
    const waitlistResult = await pool.query(getWaitlistQuery);
    const entries = waitlistResult.rows; 

    for (const entry of entries) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: entry.email,
        subject: 'Notification from Trent Family Farms',
        text: message,
      };
      await transporter.sendMail(mailOptions);
    }

    if (entries.length > 0) {
      const updateQuery = `
        UPDATE waitlist
        SET notified = true
        WHERE email = ANY ($1)
      `;
      const emailsToUpdate = entries.map(e => e.email);
      await pool.query(updateQuery, [emailsToUpdate]);
    }

    return res.status(200).json({ message: 'Notifications sent and waitlist updated.' });
  } catch (error) {
    console.error('Error notifying waitlist:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Update route to add site with geocoding
app.post('/api/admin/sites', async (req, res) => {
  const { site_name, site_address, site_instructions, pickup_start_day, pickup_deadline_day } = req.body;

  try {
    const location = await geocodeAddress(site_address);  // geocode the address to get lat/lon
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

app.get('/api/admin/download-all-orders', async (req, res) => {
  try {
    // fetch subscriptions from PostgreSQL
    const query = `
      SELECT s.user_id, s.created_at, s.name, s.second_email, s.additional_notes, s.cartons_per_week, s.donation_cartons, c.cycle_name AS egg_cycle,
             st.site_name AS pickup_site, s.total_amount, s.cycle_id
      FROM subscriptions s
      JOIN cycles c ON s.cycle_id = c.cycle_id
      JOIN sites st ON s.pickup_site = st.site_id
    `;
    const result = await pool.query(query);
    const subscriptions = result.rows;

    // fetch user emails from Firebase
    // const userPromises = subscriptions.map(async (sub) => {
    //   const userRecord = await admin.auth().getUser(sub.user_id);
    //   return {
    //     ...sub,
    //     email: userRecord.email
    //   };
    // });
    // const subscriptionsWithEmails = await Promise.all(userPromises);
    const userPromises = subscriptions.map(async (sub) => {
      if (!sub.user_id || sub.user_id.trim() === '') {
        // Return the subscription with a default email if user_id is invalid
        return { ...sub, email: 'unknown@gmail.com' };
      }
      try {
        const userRecord = await admin.auth().getUser(sub.user_id);
        return { ...sub, email: userRecord.email };
      } catch (error) {
        console.error(`Error fetching user for subscription with user_id=${sub.user_id}:`, error);
        // Fallback value if fetching the user fails
        return { ...sub, email: 'unknown@example.com' };
      }
    });
    
    const subscriptionsWithEmails = await Promise.all(userPromises);    

    // create Excel file
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(subscriptionsWithEmails);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'All Orders');

    // write workbook to buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Ssnd buffer in the response
    res.json({
      success: true,
      filename: `all-orders.xlsx`,
      data: buffer.toString('base64') // have to convert buffer to base64 to send as JSON
    });
  } catch (error) {
    console.error('Error fetching subscription orders:', error);
    res.status(500).json({ error: 'Error fetching subscription orders' });
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

app.post('/api/admin/send-mass-email', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT second_email 
      FROM subscriptions 
      WHERE second_email IS NOT NULL AND second_email <> ''
    `);
    // const result = await pool.query(`SELECT email FROM test_emails`);
    
    const emails = result.rows.map(row => row.second_email);
    // const emails = result.rows.map(row => row.email);

    const sendPromises = emails.map(email => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Important Update from Trent Family Farms',
        html: `<p>Dear Subscriber,</p><p>${message}</p><p>Best regards,<br>The Farm Team</p>`,
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(sendPromises);

    await pool.query(
      `INSERT INTO mass_emails (message) VALUES ($1)`,
      [message]
    );

    return res.status(200).json({ success: 'Emails sent successfully' });
  } catch (error) {
    console.error('Error sending mass emails:', error);
    return res.status(500).json({ error: 'Failed to send mass emails' });
  }
});

app.get('/api/admin/last-mass-email', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sent_at FROM mass_emails ORDER BY sent_at DESC LIMIT 1
    `);
    if (result.rows.length > 0) {
      res.json({ timestamp: result.rows[0].sent_at });
    } else {
      res.json({ timestamp: null });
    }
  } catch (error) {
    console.error('Error fetching last mass email:', error);
    res.status(500).json({ error: 'Failed to fetch last email timestamp' });
  }
});

app.get('/api/admin/last-waitlist-email', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sent_at FROM waitlist_emails ORDER BY sent_at DESC LIMIT 1
    `);
    if (result.rows.length > 0) {
      res.json({ timestamp: result.rows[0].sent_at });
    } else {
      res.json({ timestamp: null });
    }
  } catch (error) {
    console.error('Error fetching last waitlist email:', error);
    res.status(500).json({ error: 'Failed to fetch last waitlist email timestamp' });
  }
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

    // console.log('Results:', result.rows); // for debug
    if (result.rows.length === 0) {
      return res.status(404).send('No sites found');
    }

    res.json(result.rows[0]);
  });
});

app.put('/api/admin/subscriptions/:id', async (req, res) => {
  const { id } = req.params;
  const { name, cartons_per_week, donation_cartons, second_email, additional_notes, total_amount, cycle_id, pickup_site } = req.body;
  
  // Validate required fields
  if (!name || !cartons_per_week || total_amount == null || !cycle_id || !pickup_site) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const query = `
    UPDATE subscriptions
    SET name = $1,
        cartons_per_week = $2,
        donation_cartons = $3,
        second_email = $4,
        additional_notes = $5,
        total_amount = $6,
        cycle_id = $7,
        pickup_site = $8
    WHERE id = $9
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [
      name,
      parseInt(cartons_per_week, 10),
      parseInt(donation_cartons, 10) || 0,
      second_email || '',
      additional_notes || '',
      parseFloat(total_amount),
      parseInt(cycle_id, 10),
      parseInt(pickup_site, 10),
      id
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    return res.status(200).json({ message: "Subscription updated", subscription: result.rows[0] });
  } catch (err) {
    console.error("Error updating subscription:", err);
    return res.status(500).json({ error: "Error updating subscription" });
  }
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

app.put('/api/admin/cycles/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const query = `
    UPDATE cycles 
    SET is_active = NOT COALESCE(is_active, false)
    WHERE cycle_id = $1
    RETURNING *;
  `;
  try {
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cycle not found' });
    }
    res.json({ message: 'Cycle status updated', cycle: result.rows[0] });
  } catch (err) {
    console.error('Error toggling cycle status:', err);
    res.status(500).json({ error: 'Error toggling cycle status' });
  }
});

// Delete a cycle
app.delete('/api/admin/cycles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'DELETE FROM cycles WHERE cycle_id = $1';
    const result = await pool.query(query, [id]);
    if (result.rowCount > 0) {
      res.status(200).send('Cycle deleted successfully');
    } else {
      res.status(404).send('No cycle found to delete');
    }
  } catch (error) {
    console.error('Error deleting cycle:', error);
    res.status(500).send('Error deleting cycle');
  }
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

app.delete('/api/waitlist/:email', async (req, res) => {
  const { email } = req.params;
  try {
      const result = await pool.query('DELETE FROM waitlist WHERE email = $1 RETURNING *', [email]);
      if (result.rowCount > 0) {
          res.json({ success: true });
      } else {
          res.status(404).json({ error: 'Email not found on waitlist' });
      }
  } catch (error) {
      console.error('Error removing from waitlist:', error);
      res.status(500).json({ error: 'Error removing from waitlist' });
  }
});


// Fetch all subscriptions for a specific user
app.get('/get-subscriptions/:userId', (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT 
      s.cartons_per_week, 
      s.donation_cartons,
      c.cycle_name AS egg_cycle, 
      c.start_date, 
      c.end_date, 
      site.site_address AS pickup_site, 
      site.site_instructions, 
      s.total_amount
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
    res.json(result.rows); //  only unresolved questions are sent as JSON
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
  const query = 'SELECT cycle_id, cycle_name, start_date, end_date, number_of_weeks, is_active FROM cycles';
  pool.query(query, (err, result) => {
      if (err) {
          console.error('Error fetching cycles:', err);
          return res.status(500).send('Error fetching cycles');
      }
      res.json(result.rows); 
  });
});


// Download orders for a specific cycle and site
app.get('/api/admin/download-orders/:cycleId/:siteId', (req, res) => {
    // need to decode and parse the route parameters
    const cycleId = decodeURIComponent(req.params.cycleId);
    const siteId = parseInt(decodeURIComponent(req.params.siteId), 10);
  
    // console.log(`Received cycleId: ${cycleId}, siteId: ${siteId}`);
  
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
  
      const totalCartons = result.rows.reduce((sum, sub) => sum + sub.cartons_per_week, 0);
  
      const workbook = xlsx.utils.book_new();
  
      const cycleName = result.rows[0].cycle_name.replace(/[^\w\s]/gi, '_');
      const siteName = result.rows[0].site_name.replace(/[^\w\s]/gi, '_');
      const siteAddress = result.rows[0].site_address.replace(/[^\w\s]/gi, '_');
  
      const sheetTitle = `TFF EGG CSA (${cycleName}) - (${siteName}) - (${siteAddress})`;
  
      const worksheet = xlsx.utils.aoa_to_sheet([
        [sheetTitle],
        ['Name', '# of Cartons', ...Array(11).fill('.')]  
      ]);
  
      result.rows.forEach(sub => {
        const row = [
          sub.name,
          sub.cartons_per_week,
          ...Array(11).fill('')  
        ];
        xlsx.utils.sheet_add_aoa(worksheet, [row], { origin: -1 });
      });
  
      xlsx.utils.book_append_sheet(workbook, worksheet, cycleName);
  
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
      res.json({
        success: true,
        totalCartons,
        filename: `orders-${cycleName}-${siteName}.xlsx`,
        data: buffer.toString('base64') // need to convert buffer to base64 to send as JSON
      });
    });
  });  
  
app.get('/api/admin/download-subscriptions/:cycleId/:siteId', async (req, res) => {
  try {
    const cycleId = parseInt(req.params.cycleId, 10);
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(cycleId) || isNaN(siteId)) {
      return res.status(400).json({ error: 'Invalid cycle ID or site ID' });
    }

    const query = `
      SELECT 
        s.user_id, 
        s.name, 
        s.cartons_per_week, 
        s.donation_cartons, 
        s.second_email, 
        s.additional_notes, 
        s.total_amount,
        c.cycle_name,
        c.start_date,
        c.end_date,
        st.site_name,
        st.site_address,
        st.site_instructions
      FROM subscriptions s
      JOIN cycles c ON s.cycle_id = c.cycle_id
      JOIN sites st ON s.pickup_site = st.site_id
      WHERE s.cycle_id = $1 AND s.pickup_site = $2
    `;
    const result = await pool.query(query, [cycleId, siteId]);
    const subscriptions = result.rows;
    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No subscriptions found for this cycle and site.' });
    }

    const subscriptionsWithEmail = await Promise.all(
      subscriptions.map(async (sub) => {
        let userEmail = '';
        try {
          if (sub.user_id) {
            const userRecord = await admin.auth().getUser(sub.user_id);
            userEmail = userRecord.email;
          }
        } catch (error) {
          console.error(`Error fetching user for user_id=${sub.user_id}:`, error);
          userEmail = '[unknown or deleted user]';
        }
        return { ...sub, user_email: userEmail };
      })
    );

    const workbook = xlsx.utils.book_new();
    const worksheetData = subscriptionsWithEmail.map((sub) => ({
      "Name": sub.name,
      "User ID": sub.user_id,
      "Email": sub.user_email,
      "Cartons/Week": sub.cartons_per_week,
      "Donation Cartons": sub.donation_cartons,
      "Total Amount": sub.total_amount,
      "Second Email": sub.second_email || '',
      "Additional Notes": sub.additional_notes || '',
      "Cycle Name": sub.cycle_name,
      "Cycle Start": sub.start_date,
      "Cycle End": sub.end_date,
      "Site Name": sub.site_name,
      "Site Address": sub.site_address,
      "Site Instructions": sub.site_instructions
    }));
    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Subscriptions');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `subscriptions-cycle-${cycleId}-site-${siteId}.xlsx`;
    res.json({
      success: true,
      filename: fileName,
      data: buffer.toString('base64')
    });
  } catch (err) {
    console.error('Error downloading subscriptions:', err);
    res.status(500).json({ error: 'Server error downloading subscriptions' });
  }
});

  app.get('/api/admin/download-cycle-orders/:cycleId', async (req, res) => {
    try {
      const cycleId = parseInt(req.params.cycleId, 10);
      if (isNaN(cycleId)) {
        return res.status(400).json({ error: 'Invalid cycle ID' });
      }
  
      const query = `
        SELECT
          s.user_id,
          s.name,
          s.cartons_per_week,
          s.donation_cartons,
          s.second_email,
          s.additional_notes,
          s.total_amount,
          c.cycle_name,
          st.site_name,
          st.site_address
        FROM subscriptions s
        JOIN cycles c ON s.cycle_id = c.cycle_id
        JOIN sites st ON s.pickup_site = st.site_id
        WHERE s.cycle_id = $1
      `;
      const result = await pool.query(query, [cycleId]);
      const subscriptions = result.rows;
  
      if (subscriptions.length === 0) {
        return res.status(404).json({ error: 'No subscriptions found for that cycle.' });
      }
  
      const subscriptionsWithEmail = [];
      for (const sub of subscriptions) {
        let userEmail = '';
        try {
          if (sub.user_id) {
            const userRecord = await admin.auth().getUser(sub.user_id);
            userEmail = userRecord.email;
          }
        } catch (error) {
          console.error(`Error fetching Firebase user for user_id=${sub.user_id}:`, error);
          userEmail = '[unknown or deleted user]';
        }
  
        subscriptionsWithEmail.push({
          ...sub,
          user_email: userEmail,
        });
      }
      const workbook = xlsx.utils.book_new();
  
      const worksheetData = subscriptionsWithEmail.map((sub) => ({
        Name: sub.name,
        Email: sub.user_email,
        'Second Email': sub.second_email || '',
        'Cartons/Week': sub.cartons_per_week,
        'Donation Cartons': sub.donation_cartons,
        'Total Amount': sub.total_amount,
        'Additional Notes': sub.additional_notes || '',
        'Cycle Name': sub.cycle_name,
        'Site Name': sub.site_name,
        'Site Address': sub.site_address,
      }));
  
      const worksheet = xlsx.utils.json_to_sheet(worksheetData);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Cycle Orders');
  
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
      const fileName = `cycle-${cycleId}-orders.xlsx`;
  
      return res.json({
        success: true,
        filename: fileName,
        data: buffer.toString('base64'),
      });
    } catch (err) {
      console.error('Error downloading cycle orders:', err);
      return res.status(500).json({ error: 'Server error downloading cycle orders' });
    }
  });
  
  app.get('/api/admin/download-waitlist', async (req, res) => {
    try {
      const query = 'SELECT * FROM waitlist';
      const result = await pool.query(query);
      const waitlistEntries = result.rows;
  
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(waitlistEntries);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Waitlist');
  
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
      res.json({
        success: true,
        filename: 'waitlist.xlsx',
        data: buffer.toString('base64')
      });
    } catch (error) {
      console.error('Error downloading waitlist:', error);
      res.status(500).json({ error: 'Error downloading waitlist' });
    }
  });  

// Fetch total cartons for a specific cycle and site
app.get('/api/admin/total-cartons/:cycleId/:siteId', (req, res) => {
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
  
      const totalCartons = result.rows[0]?.totalcartons || 0; // default to 0 if no results
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
  
    if (!cycle_name || !start_date || !end_date || !number_of_weeks) {
      return res.status(400).send('All fields are required');
    }

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

app.put('/api/admin/cycles/:id', (req, res) => {
  const { id } = req.params;
  const { cycle_name, start_date, end_date, number_of_weeks } = req.body;

  if (!start_date || !end_date || !cycle_name || !number_of_weeks) {
    return res.status(400).send('Cycle name, start date, end date, and number of weeks are required');
  }

  const cycle_year = new Date(start_date).getFullYear();

  const query = `
    UPDATE cycles 
    SET cycle_name = $1, start_date = $2, end_date = $3, number_of_weeks = $4, cycle_year = $5
    WHERE cycle_id = $6
  `;

  pool.query(
    query,
    [cycle_name, start_date, end_date, number_of_weeks, cycle_year, id],
    (err, result) => {
      if (err) {
        console.error('Error updating cycle:', err);
        return res.status(500).send('Error updating cycle');
      }
      res.status(200).send('Cycle updated successfully');
    }
  );
});


app.put('/api/admin/cycles/:id', (req, res) => {
    const { id } = req.params;
    const { start_date, end_date } = req.body;
  
    if (!start_date || !end_date) {
      return res.status(400).send('Start date and end date are required');
    }

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

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
