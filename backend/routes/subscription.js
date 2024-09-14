const express = require('express');
const Stripe = require('stripe');
const router = express.Router();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a subscription endpoint
router.post('/create-subscription', async (req, res) => {
    const { email, paymentMethodId, priceId, dozenEggs, pickupSite, donationAmount, secondName, notes } = req.body;

    try {
        // Create a new Stripe customer
        const customer = await stripe.customers.create({
            email,
            payment_method: paymentMethodId,
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        // Create the subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            expand: ['latest_invoice.payment_intent'],
        });

        res.send({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(400).send({ error: { message: error.message } });
    }
});

module.exports = router;
