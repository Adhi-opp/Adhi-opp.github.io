# Adhiraj Singh: portfolio

Live at **<https://adhi-opp.github.io>**

A static site (HTML, CSS, vanilla JS, no build step) presenting four projects:
GammaLeak, TradeRetro, Alpha and Phasr.

## Structure

```text
index.html                 page shell: hero, work, stack, journey, contact
assets/css/main.css        all styles (one dark theme, per-project accent colours)
assets/js/projects.js      ALL project content: pitch, screens, steps, case studies, journey
assets/js/scenes.js        canvas line-art animations (hero tape + one per project)
assets/js/main.js          rendering, hash routing (#gammaleak etc.), tabs, market clock
assets/js/replay.js        GammaLeak replay: hero tape data + the interactive signal tape
assets/data/gammaleak/     real sessions as 1-minute bars + engine events (no raw ticks)
assets/img/<project>/      real screenshots of each app, captured locally
tools/serve.js             local preview server with live reload
```

To change text or numbers, edit `assets/js/projects.js`; the home chapters and
the case-study pages both render from it. A screen with made-up numbers gets a
`flag` (shown in its browser bar) so nobody mistakes demo data for real data.

## Run locally

```sh
node tools/serve.js
```

Then open <http://localhost:5500>. The page reloads on every save (CSS changes
apply without a reload). No npm install needed.

## Deploy

GitHub Pages serves the `main` branch root. Push to `main` and the site
updates in about a minute.

## Security

The site is static: no server, no database, no forms, no third-party scripts.

- A Content-Security-Policy (meta tag) lets only this site's own scripts run and
  only Google Fonts load from outside.
- External links open with `rel="noopener"`; the referrer policy is
  `strict-origin-when-cross-origin`.
- The email address is assembled in JavaScript, so it never appears whole in
  the HTML source.
- Screenshots are re-encoded WebP with no EXIF or location metadata.
