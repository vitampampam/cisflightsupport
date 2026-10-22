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
- `aircraft.json` — six categories with long-range cruise TAS, normal (not max) range,
  seats and an indicative hourly rate. Rates are category averages for European ad-hoc
  charter, cross-checked against published 2026 guides; edit them in `admin.html`.
- `routing.json` — route-extension bands, terminal allowance, positioning allowance and
  the restricted-airspace polygons (Russia, Belarus, Ukraine, from Natural Earth 110m).
- `empty-legs.json` — **ships empty on purpose.** Add real listings only:
  `{"from":"EDMA","to":"OMDB","date":"2026-11-04","category":"supermid","seats":8,"price_eur":19500}`
  With an empty list the panel tells the visitor nothing is listed and invites their dates.

### Enhanced planning model (October 2026)

The estimator now additionally includes a coarse geometric restricted-area detour
engine (`assets/route-model.js`), editable example aircraft-model profiles
(`assets/data/aircraft-models.json`), optional travel dates, an itemized pricing
allowance model (`assets/data/estimator-config.json`), and an optional adapter
for licensed wind forecasts. If no weather provider is configured, figures are
still-air estimates. Detailed integration instructions, methodology, source links
and limitations: **[ESTIMATOR-SETUP.md](ESTIMATOR-SETUP.md)**.

**Do not confuse the estimated geometry with EUROCONTROL validated routing.**
The website still does NOT consume an AIRAC database, actual ATS airways,
validated SID/STAR geometry, live NOTAMs, NM RAD/IFPS validation, actual operator
quotations or verified airport charges. Geographic country polygons are simplified.

## Per-service request forms

`assets/request.js` + `assets/data/request-forms.json`. Each service card's call to
action opens a dialog asking what that service actually needs — catering asks uplift
time, pax and allergies; pre-buy asks serial, location, inspection date and scope;
VIP asks where the meet happens and how many vehicles. Twelve services are covered.

The answers are composed into a structured message and carried into the contact form
with the right service preselected. There is no backend, so the person still presses
send on the contact page. To change a question, edit `request-forms.json` — field types
are `text`, `number`, `date`, `select` (`opts`), `checks` (multi-select) and `textarea`;
`req: true` marks a field required.

## Admin editor

`admin.html` + `assets/admin.js` — edits hourly rates, cruise TAS, range and seats per
category, and the empty-leg list. It writes nothing to the server (there is none):
you edit, download `aircraft.json` / `empty-legs.json`, commit them to `assets/data/`
and push. ICAO codes are validated against the airport list as you type.

The page carries `noindex` and is not linked from anywhere, but it is **not protected** —
static hosting cannot authenticate. For real access control the site needs Cloudflare
Pages / Netlify access rules, or a small CMS with a GitHub login.

## Aircraft for sale

`assets/data/fleet.json` drives `fleet.html`. **Publishing the first listing re-enables
the Fleet page**: `assets/fleet.js` runs on every page, and when the list is non-empty it
strips `.temp-off` from the Fleet links and removes the `noindex` meta on that page. With
an empty list the carousel is hidden and the page says nothing is listed. Edit listings in
`admin.html`, download `fleet.json`, commit.

Silhouettes come from `assets/img/` — the `silhouettes` array in `fleet.json` lists what is
available to pick in the editor.

## Temporarily withdrawn

The coverage page is hidden, not deleted (the fleet page now un-hides itself when a listing is published): links carry `class="temp-off"`,
`fleet.html` and `coverage.html` carry a `noindex` meta. To restore, delete the `.temp-off` rule at the end of
`assets/site.css` and that meta tag.
