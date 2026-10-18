# CIS Flight Support — website

Multi-page site for CIS Flight Support GmbH (Stadtbergen, Germany). Static HTML,
no build step, no dependencies. One responsive stylesheet serves phone, tablet
and desktop.

## Structure

```
index.html        Home — hero, figures, about, why-us bento
services.html     Nine service lines + turnaround timeline
coverage.html     Station network map (Europe, CIS, Middle East)
fleet.html        Aircraft for sale and acquisition
prebuy.html       Pre-buy inspection process
training.html     CAW Academy platform
team.html         Who you deal with
contact.html      Enquiry form and contact details
impressum.html    German legal notice
assets/site.css   All styling, including the responsive breakpoints
assets/site.js    Nav, carousels, map, reveals, theme toggle
assets/img/       Aircraft silhouettes and CAW Academy artwork
```

## Breakpoints

| Range | Layout |
|---|---|
| ≤ 640px | One column, sticky call bar, swipe carousels, tap-to-read map |
| 641–1180px | Two columns, sheet menu, 44px+ touch targets |
| > 1180px | Dropdown nav, coverflow carousel, hover states |

## Publishing (GitHub Pages)

Upload everything **including the `assets` folder** to the repository root, then
Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)` → Save.
The site appears at `https://vitampampam.github.io/cisflightsupport/`.

## Before going live

- Contact form does not submit — wire it to a handler (Formspree, Basin, or similar)
- Directors' names and per-person email addresses are placeholders
- Hero figures (2004, 180, 40) and all fleet listings are placeholders
- Turnaround timeline is an illustrative sequence, not measured data
- App Store / Google Play badges are approximations; replace with official artwork
- No logo — the header is typographic


## Trip estimator

`trip-estimator.html` + `assets/trip.js` + `assets/data/`.

- `airports.json` — 5,448 airports (ICAO, IATA, city, coordinates) built from the
  OurAirports dataset: large and medium fields worldwide, plus smaller fields across
  Europe, the CIS and the Middle East. Loaded only on the estimator page.
- `aircraft.json` — six categories with cruise TAS, book range, seats and an indicative
  hourly rate. Edit the rates here; nothing else needs changing.
- `empty-legs.json` — **ships empty on purpose.** Add real listings only:
  `{"from":"EDMA","to":"OMDB","date":"2026-11-04","category":"supermid","seats":8,"price_eur":19500}`
  With an empty list the panel tells the visitor nothing is listed and invites their dates.

Model: track miles = great circle x 1.04; planned range = 85% of book range; block time adds
15 min for climb/descent and 15 min taxi, plus 1 h per fuel stop. Cost = hours x rate +
EUR 2,500 per tech stop, shown as a band of +/-15%.

## Admin editor

`admin.html` + `assets/admin.js` — edits hourly rates, cruise TAS, range and seats per
category, and the empty-leg list. It writes nothing to the server (there is none):
you edit, download `aircraft.json` / `empty-legs.json`, commit them to `assets/data/`
and push. ICAO codes are validated against the airport list as you type.

The page carries `noindex` and is not linked from anywhere, but it is **not protected** —
static hosting cannot authenticate. For real access control the site needs Cloudflare
Pages / Netlify access rules, or a small CMS with a GitHub login.

## Temporarily withdrawn

The fleet / aircraft-for-sale pages and the coverage page are hidden, not deleted: links carry `class="temp-off"`,
`fleet.html` and `coverage.html` carry a `noindex` meta. To restore, delete the `.temp-off` rule at the end of
`assets/site.css` and that meta tag.
