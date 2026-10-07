# Trent Family Farms

An egg-ordering and pickup management app for Trent Family Farms. Customers can create an account, order eggs for a pickup cycle, choose a pickup site, add donation cartons, and view their orders. Administrators manage orders, cycles, pickup locations, pricing, waitlists, customer questions, and email communications.

The interface calls orders **subscriptions**, but checkout uses a **one-time Stripe payment** for the selected cycle. The app does not implement automatic recurring billing.

## Technology

| Component | Implementation |
| --- | --- |
| Frontend | React 18, Create React App, React Router |
| Backend | Node.js, Express |
| Database | PostgreSQL via `pg` |
| Accounts | Firebase Authentication; Firestore stores user documents |
| Payments | Stripe Checkout and signed webhooks |
| Email | Nodemailer with Gmail SMTP |
| Order exports | Excel files generated with `xlsx` |
| Address lookup | OpenStreetMap Nominatim |

## Before you start

- Node.js and npm. The root package declares Node `>=18.x`; use a supported Node LTS release and verify it with this project's tests and build.
- An existing PostgreSQL database with the application's schema and seed data, or a restored development copy.
- A Firebase project with email/password Authentication, Firestore, a registered web app, and server credentials.
- Stripe test keys and a webhook signing secret for payment development.
- Gmail SMTP credentials if you need to test email delivery.

**This repository does not include a complete database bootstrap.** The only SQL migration creates `payment_receipts`; it does not create the legacy application tables. You need the existing schema before the app can support ordering or administration.

## Local setup

### 1. Install dependencies

From the repository root:

```sh
npm ci
npm --prefix client ci
```

### 2. Configure the backend

Create `.env` in the repository root using your development values:

```dotenv
NODE_ENV=development
PORT=4242
CLIENT_URL=http://localhost:3000
CHECKOUT_ENABLED=false

DB_HOST=your-postgres-host
DB_PORT=5432
DB_DATABASE=tff_development
DB_USER=your-database-user
DB_PASSWORD=your-database-password

STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me

EMAIL_USER=your-test-sender@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside-this-repo/firebase-service-account.json
```

The backend loads this file with `dotenv`. Firebase Admin supports either `GOOGLE_APPLICATION_CREDENTIALS` pointing to a credential file outside the repository, application default credentials, or `FIREBASE_SERVICE_ACCOUNT_JSON` supplied through your hosting environment's secret configuration. Use one appropriate credential source; keep private credentials out of source control.

`CHECKOUT_ENABLED` must be exactly `true` to allow checkout. Leave it disabled until the database, Firebase, and Stripe test configuration are ready. `CLIENT_URL` controls Stripe's success and cancellation redirects; it should point to the frontend you are using.

The PostgreSQL pool currently requires SSL and sets `rejectUnauthorized: false`. A plain, non-SSL local PostgreSQL instance will not work with the current pool configuration. Production certificate validation needs review for your database provider.

### 3. Configure the frontend

Create `client/.env` from your Firebase web app configuration and Stripe **publishable** test key:

```dotenv
REACT_APP_FIREBASE_API_KEY=replace_me
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=replace_me
REACT_APP_FIREBASE_APP_ID=replace_me
REACT_APP_FIREBASE_MEASUREMENT_ID=replace_me
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_replace_me
```

These values are embedded in the browser build. Never put database passwords, Stripe secret keys, or Firebase service-account credentials in `REACT_APP_*` variables. Restart the development server after changing frontend configuration; rebuild for production changes.

Enable email/password sign-in in Firebase, authorize the frontend's domain, and configure Firestore rules for the `users` documents created during signup. Deployed Firestore rules are not included in this repository.

### 4. Prepare the database

The backend expects these tables:

```text
subscriptions             cycles
sites                     settings
waitlist                  contact_form_submissions
mass_emails               waitlist_emails
payment_receipts
```

Restore the legacy schema and suitable development data first. Then apply the included migration to that development database:

```sh
psql -h YOUR_DB_HOST -p 5432 -U YOUR_DB_USER -d YOUR_DB_DATABASE \
  -v ON_ERROR_STOP=1 -f migrations/001_payment_receipts.sql
```

Use your provider's required SSL connection settings. The command prompts for credentials as needed; it does not load the app's `.env`. The migration is transactional and creates the receipt table if it is absent. Back up an existing database before applying migrations.

Ordering needs a carton price in `settings`, an active cycle with valid dates and a week count, and an eligible pickup site. The admin interface manages these records once the schema and admin account are ready.

### 5. Start the app

Run the backend from the repository root:

```sh
npm start
```

In another terminal, start the frontend:

```sh
npm --prefix client start
```

Open **http://localhost:3000**. Create React App proxies API requests to **http://localhost:4242** using the `proxy` entry in `client/package.json`. If you change the backend port, update that proxy too.

## Administrator access

Admin access requires the trusted Firebase custom claim `admin: true`. A Firestore user document's `role` field does not grant backend administrator access.

Create the intended account, find its UID in Firebase Authentication, and run this from the repository root with credentials for that Firebase project:

```sh
node -r dotenv/config scripts/grant-admin.js FIREBASE_USER_UID
```

The `-r dotenv/config` option loads the root `.env` for this standalone script. The script grants the claim while preserving other custom claims. Sign out and sign back in, then visit `/admin`.

## Payments and order fulfillment

1. An authenticated customer selects a cycle, pickup site, weekly quantity, and optional donation cartons.
2. The backend validates the offering and calculates the total in integer cents using database pricing and remaining cycle weeks. A stale displayed total is rejected so the customer can refresh it.
3. Stripe Checkout collects a one-time USD card payment.
4. Stripe sends `checkout.session.completed` to **`POST /webhook`**. The backend verifies the signature and checks that payment is complete.
5. The backend records a payment receipt and order in a transaction, preventing repeated fulfillment of the same session/event after a successful commit, then attempts a confirmation email.

For local testing, forward Stripe test webhook events to `http://localhost:4242/webhook`. If using an installed Stripe CLI:

```sh
stripe listen --events checkout.session.completed --forward-to localhost:4242/webhook
```

Put the listener's signing secret in `STRIPE_WEBHOOK_SECRET` and restart the backend. Use matching Stripe test secret and publishable keys, enable checkout in your development `.env`, and complete checkout through the app so the event contains its order metadata. A generic synthetic event may lack required metadata.

The success page alone does not verify that an order was fulfilled. Check the Stripe event delivery and database order when validating the flow. Confirmation emails do not currently have a durable retry queue.

## Commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm start` | Start Express; defaults to port 4242 |
| `npm test` | Run backend tests with Node's built-in test runner |
| `npm --prefix client start` | Start the React development server |
| `npm --prefix client run build` | Create the production frontend in `client/build` |
| `npm --prefix client test` | Run the frontend test runner |
| `npm run heroku-postbuild` | Install frontend dependencies and build for Heroku |

Backend tests cover authentication, administrator claims, ownership checks, pricing, checkout handlers, and fulfillment transactions using mocked external services. They do not verify live Firebase, PostgreSQL, Stripe, or SMTP integrations.

## Project layout

```text
.
├── server.js                    Express API, integrations, and frontend serving
├── lib/
│   ├── firebase-admin.js        Server-side Firebase credentials and initialization
│   ├── security.js              Token verification and access checks
│   ├── pricing.js               Quantity validation and checkout calculations
│   └── fulfill.js               Transactional payment deduplication
├── migrations/                  Incremental database migrations
├── scripts/grant-admin.js       Firebase administrator claim utility
├── test/                        Backend security and route tests
├── client/
│   ├── public/                  HTML template and public assets
│   └── src/
│       ├── pages/               Customer pages and admin dashboard
│       ├── components/Admin/    Management forms, tables, and exports
│       ├── components/Auth/     Signup and login
│       ├── firebase.js          Browser Firebase configuration
│       └── utils/api.js         Same-origin requests with Firebase ID tokens
├── Procfile                     Heroku web process
└── PRODUCTION_RECOVERY.md       Recovery findings and deployment readiness work
```

## Production build and deployment

Build the frontend, then start Express to serve both the API and React app:

```sh
npm --prefix client run build
npm start
```

For a local preview of that build, set `CLIENT_URL=http://localhost:4242` and open that address.

The repository includes Heroku deployment support: `Procfile` runs `node server.js`, and `heroku-postbuild` builds the frontend. Configure backend secrets and frontend build variables on the host, set `CLIENT_URL` to the public HTTPS origin, and configure Stripe's webhook endpoint as `https://YOUR_DOMAIN/webhook`.

With `NODE_ENV=production`, Express redirects requests to HTTPS based on `x-forwarded-proto`. The hosting proxy must supply that header correctly.

Read [PRODUCTION_RECOVERY.md](PRODUCTION_RECOVERY.md) before reopening production ordering. It documents credential recovery, database restoration, staging checks, and outstanding work. Known limitations include incomplete schema migrations, legacy duplicate routes and admin editing defects, dependency maintenance, and missing email retries. Some business text and ordering deadlines are hardcoded in the frontend and email templates; review them for the intended season.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Ordering is temporarily closed | `CHECKOUT_ENABLED=true` on the intended environment; restart after changing `.env` |
| Database SSL or missing-table errors | SSL-capable database, correct connection settings, restored legacy schema, and receipt migration |
| Login/signup fails | Firebase web configuration, email/password sign-in, authorized domain, and Firestore rules |
| API responds with `401` | Signed-in Firebase user, valid ID token, and matching frontend/backend Firebase projects |
| Admin API responds with `403` | `admin: true` custom claim and a refreshed login |
| Payment completes but no order appears | Webhook forwarding/endpoint, signing secret, event delivery logs, and database migration |
| Checkout reports pricing changed | Refresh the frontend and verify cycle dates, week count, and carton price |
| API requests fail in development | Backend running on port 4242, or matching frontend proxy configuration |
| Confirmation email is missing | Gmail sender/app password and backend logs; verify the order separately before retrying any payment |
