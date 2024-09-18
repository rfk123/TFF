import { loadStripe } from '@stripe/stripe-js';

// Public key needs to be a string, so wrap it in quotes
const stripePromise = loadStripe('pk_test_51PyKkL08zoYgSJYVWe4D8sjnyMEM3XIMtItnfuRhXDlBIUMUKXW9xSCRSSG13TESWfOvLTyu3X8e14r0rzx0OZw300IHReWrEG');

export { stripePromise };
