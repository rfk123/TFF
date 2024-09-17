import { loadStripe } from '@stripe/stripe-js';

// Public key needs to be a string, so wrap it in quotes
const stripePromise = loadStripe('pk_live_51PyKkL08zoYgSJYV3mB12RVp2pHbBiWcxRN3pOdfPaghZWsJAhUWQVFp1SBd6gCiVTW21gA0EJ3OKsSFM17kAKFg00ax6EZfnf');

export { stripePromise };
