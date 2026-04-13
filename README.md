# Roll Notes

A BJJ training journal with a public landing page, a separate authenticated dashboard, Supabase auth, and synced class logs across devices.

## What changed

- Added a landing page with sign in and sign up flows
- Added a separate logged-in dashboard page for new class logs, snapshots, and past entries
- Switched storage from browser-only `localStorage` to Supabase-backed user data
- Kept a one-click import path for older local-only notes

## Architecture

- GitHub Pages hosts the frontend
- Supabase handles authentication and the database
- Each user can only read and write their own entries through row-level security

## Supabase setup

### 1. Create a Supabase project

Create a new project in Supabase and wait for the database to finish provisioning.

### 2. Create the database table and policies

In the Supabase SQL Editor, run the SQL from [supabase-schema.sql](/home/anvar/projects/martial-arts-study/supabase-schema.sql).

### 3. Get your project URL and publishable key

In Supabase, open `Project Settings > API` and copy:

- `Project URL`
- `Publishable key`

### 4. Add the values to the frontend config

Edit [supabase-config.js](/home/anvar/projects/martial-arts-study/supabase-config.js):

```js
window.ROLL_NOTES_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  publishableKey: "YOUR_SUPABASE_PUBLISHABLE_KEY",
};
```

These values are safe to expose in a browser app. Do not put your secret or service-role key in the frontend.

### 5. Configure authentication URLs

In Supabase, open `Authentication > URL Configuration` and add:

- Site URL: `https://ahuseyno.github.io`
- Redirect URL: `https://ahuseyno.github.io`

If you also test locally, add:

- `http://localhost:8000`

The app now sends email-based auth flows back to the landing page first, then redirects authenticated users into `dashboard.html`. That means you do not need a separate dashboard redirect URL unless you choose to add one yourself.

### 6. Choose your auth settings

The app supports:

- Email/password sign in
- Email/password sign up
- Magic link sign in

If email confirmation is enabled in Supabase, new users may need to confirm their email before signing in.

## Local development

Serve the site over HTTP so auth redirects behave correctly:

```bash
python3 -m http.server
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

This app is already GitHub Pages friendly because it uses relative paths and runs entirely in the browser.

- Public entry page: `https://ahuseyno.github.io/`
- Logged-in dashboard: `https://ahuseyno.github.io/dashboard.html`

Push the site to the `main` branch of the `ahuseyno.github.io` repository and GitHub Pages will serve it at:

`https://ahuseyno.github.io/`

## Current data model

The app stores these fields per training session:

- Class date
- Class focus
- Coach or gym
- Energy rating
- Techniques covered
- What clicked
- Where you got stuck
- Sparring reflection
- Main takeaway

## Notes

- Older entries already in browser `localStorage` can be imported after login with the `Import local notes` button.
- The app does not currently support editing or deleting entries yet.
- `supabase-config.js` currently contains placeholders, so the deployed app will show a setup banner until you add your real Supabase values and publish again.
