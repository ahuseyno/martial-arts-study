# Roll Notes Prototype

A lightweight BJJ training journal that works as a static web app, an installable iPhone web app, and a GitHub Pages site.

## What it does

- Saves class logs in `localStorage`
- Captures techniques, sparring reflections, struggles, and next-class takeaways
- Shows a small summary of recurring topics and weaknesses

## Run it locally

For the full iPhone-style app behavior, serve it locally instead of opening the file directly:

```bash
python3 -m http.server
```

Then open `http://localhost:8000` in your browser.

You can still open [index.html](/home/anvar/projects/martial-arts-study/index.html) directly for quick desktop checks, but service workers and install behavior need HTTP.

## Install on iPhone

1. Start the local server with `python3 -m http.server`.
2. Make your computer and iPhone available on the same network.
3. Find your computer's local IP address and open `http://YOUR-IP:8000` in Safari on your iPhone.
4. Tap the Share button in Safari.
5. Choose `Add to Home Screen`.
6. Launch `Roll Notes` from your home screen.

The app will open in standalone mode and cache its core files for offline use after the first load.

## Current storage

Entries are still saved in the browser's `localStorage`, so each iPhone or browser profile keeps its own data.

## Publish to GitHub Pages

To publish this at `https://ahuseyno.github.io/`, use a GitHub user site repository named exactly `ahuseyno.github.io`.

### Option 1: New repository named `ahuseyno.github.io`

1. Create a new GitHub repository named `ahuseyno.github.io`.
2. Copy the contents of this project into that repository root.
3. Commit and push to the `main` branch.
4. In GitHub, open `Settings > Pages`.
5. Set the source to `Deploy from a branch`.
6. Choose branch `main` and folder `/ (root)`.
7. Wait for GitHub Pages to publish.

Your site should appear at:

`https://ahuseyno.github.io/`

### Option 2: Publish from this repository

If you want to reuse this repo directly, add your GitHub repo as the `origin` remote, push the files, and then enable Pages from the root of `main`.

Example:

```bash
git remote add origin git@github.com:ahuseyno/ahuseyno.github.io.git
git add .
git commit -m "Initial Roll Notes site"
git push -u origin main
```

If you prefer HTTPS:

```bash
git remote add origin https://github.com/ahuseyno/ahuseyno.github.io.git
git add .
git commit -m "Initial Roll Notes site"
git push -u origin main
```

### Notes

- This app is already GitHub Pages friendly because it uses relative asset paths like `./app.js` and `./styles.css`.
- The journal data will still save in each visitor's browser using `localStorage`.
- The service worker in [sw.js](/home/anvar/projects/martial-arts-study/sw.js) may cache older files after updates, so after a deploy you may need one hard refresh.

## If you want a true native iOS app next

The next step would be wrapping this in a native shell such as Capacitor and opening it in Xcode for simulator/device builds and App Store distribution. That requires a Mac setup with Xcode, which is not available in this workspace right now.
