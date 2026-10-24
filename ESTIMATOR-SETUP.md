## Homepage calculator repair — October 22, 2026

ROOT CAUSE: `index.html` was still using the old calculator markup and loaded
`assets/trip.js?v=207` without `assets/route-model.js`. The newer trip.js
requires `#teAircraft`, `#teDate`, `#teReturnDate`, `#teWeather`,
`#tePricing`, and `#teCostHeading`. On the homepage `wire()` threw a
`Cannot read properties of null (reading addEventListener)` exception;
the generic error handler incorrectly displayed “Estimator data is invalid.”
This happened even with the From and To fields empty and prevented the swap
listener being registered.

FIXED:
- Homepage and standalone estimator now use identical calculator form markup.
- Homepage loads route-model.js before trip.js.
- Both HTML pages use ?v=231 on calculator scripts, to bust stale Safari caches.
- A startup failure is not mislabeled as corrupt airport data.
- Regressions now include homepage and standalone widget, empty inputs,
  manually typed airport codes, Calculate, swap, one-way and return.

TO DEPLOY: Upload the complete ZIP contents to the site root, including
`assets/`. Alternatively replace only these four files, keeping paths:
`index.html`, `trip-estimator.html`, `assets/trip.js`, and
`assets/route-model.js`. Ensure the homepage HTML contains
`calculator-compatible-homepage-v231`. GitHub Pages publication/cache may
take time; force-reload Safari if you still see the old button.

## Critical estimator initialization and airport-swap fix (October 22, 2026)

`assets/trip.js` previously initialized the embedded airport snapshot before creating
its airport name normalizer (`FOLD`). When visiting a pre-filled URL such as
`trip-estimator.html?from=EHAM&to=LUKK`, initialization tried to resolve the
selected airports while the normalizer was still undefined. The error was
incorrectly presented as “Estimator data is invalid”; it also skipped wiring the
swap control.

**Fixed:** The airport reference snapshot is initialized only after normalizer,
pricing constants, and all event-handler definitions are ready. The airport-swap
button swaps the raw field text as well as the selected airport objects, even if
a visitor has not clicked a suggestion. Deep-linked routes, empty fields,
manual airport inputs, and return trips have regression tests.

**After publishing:** Both `assets/trip.js` and `trip-estimator.html` must be
uploaded together. The stylesheet, routing model, and airport JSON files remain
in the package. The page uses `assets/trip.js?v=224` so iPhone Safari and
GitHub Pages should fetch the updated script rather than a cached old version.
If the live page still says “Unavailable,” check whether GitHub Pages has
finished deploying the new versions.

## Reliability fix (October 22, 2026)

The old estimator disabled Calculate when **any** of five JSON requests failed on GitHub Pages, but reported all failures as if the airport database was missing. This is fixed: `assets/trip.js` now includes a self-contained snapshot of the airport, aircraft, routing, pricing, and empty-leg data. It initializes immediately without `fetch` calls for those files, so transient JSON 404s, deployment mismatches or offline JSON requests do not disable the calculator. All source JSON files are still included for the admin editor.

**When updating aircraft rates, airport data, routing settings, models, or empty legs:** run `python3 tools/rebuild-estimator-data.py` before uploading. This regenerates the bundled snapshot in `assets/trip.js`. If the bundle is not rebuilt, the public calculator will continue using the previous snapshot, even if the JSON data files change. Bump the `?v=` cache suffix of `assets/trip.js` in `trip-estimator.html` after an update.

For reliable GitHub Pages deployment, upload the **entire** ZIP contents preserving the `assets/` subfolders. Do not upload the ZIP itself as a file in the repository. This is a reliability fix, not a live-route or EUROCONTROL connection.

---

# CIS Flight Support — enhanced public trip estimator

Updated October 2026. This is a **commercial-enquiry estimator**, not a dispatch-grade flight planner or an EUROCONTROL NM connection. The website remains static and works on GitHub Pages with no backend; the wind integration is **optional** and requires licensed credentials and separate hosting.

## Shipped and active

1. **Route-aware geometric distance** (`assets/route-model.js`): Haversine/geodesic tracks, detect crossings of the coarse Russian, Belarusian and Ukrainian country polygons supplied in `routing.json`, and when avoidance is selected run a bounded shortest-path search around them. An additional smaller en-route allowance and a generic (not procedure-derived) terminal allowance are added. Routes to/from those polygons are blocked from automated pricing pending operator review. If the bounded graph cannot model a detour, it shows a warning instead of inventing a detour factor. The polygons are a coarse **geographic illustration**, not the latest AIP, NOTAM, restricted-area database or any guarantee of closure. **No published airways, AIRAC, RAD, IFPS, FPL validation, real SID or STAR data is included.**
2. **Specific aircraft** (`assets/data/aircraft-models.json`): model selector contains nine example aircraft planning profiles. Range, true airspeed (TAS), and typical passenger counts are **indicative**, not performance-sheet calculations. The per-hour rate is inherited from the matching editable category in `aircraft.json` (the admin page still edits category rates). Specific-model rates should be substituted when reliable operator costs are available.
3. **Date and return date**: editable UTC calendar dates, validation that return follows departure, and overnight-charge benchmark. It does *not* infer real trip duration, positioning legs, downtime or aircraft availability from dates.
4. **Transparent costs** (`assets/data/estimator-config.json`): flight hours × category rate plus an assumed 0.8-hour one-way positioning allowance, cost per technical stop, an airport/handling fee per sector, a distance-scaled *navigation-charge allowance*, and an assumed overnight fee for return trips over multiple dates. These are editable planning assumptions, **not EUROCONTROL route charges, operator quotes or actual landing/handling tariffs**. The displayed ±15% band is illustrative, not a statistical confidence interval.
5. **Optional forecast component**: an adapter accepts an optional API endpoint returning directional tailwind components and adjusts inbound and outbound cruise-time estimates separately. No weather is queried by default, and still-air calculations are clearly marked. The optional Cloudflare Worker implementation in `integrations/cloudflare-wind-worker.js` is ready to configure with a **commercial Open-Meteo API key**. It retrieves 250/300-hPa winds at three points and projects them along the route's approximate heading. This is not a route- and flight-level-optimized winds-aloft calculation.

## Enable winds safely

1. Subscribe to a commercial weather-data plan with permission for this use. Open-Meteo's free public API is restricted to non-commercial use; this corporate website should not call it. See https://open-meteo.com/en/pricing and https://open-meteo.com/en/terms.
2. Deploy `integrations/cloudflare-wind-worker.js` as a Cloudflare Worker at your domain or dedicated subdomain, configured with the following private environment variables: `WEATHER_API_KEY` (Cloudflare secret) and `SITE_ORIGIN` (e.g. `https://vitampampam.github.io`). Restrict public access/rate-limit at the edge; the example Worker includes input/date validation but is not a production-grade billing quota control.
3. Set `"wind_endpoint":"https://YOUR_WORKER_DOMAIN/api/trip-winds"` in `assets/data/estimator-config.json`. **Never put a commercial weather API key in GitHub Pages files or client-side JavaScript.**
4. If the Worker, licensed subscription, date horizon, or forecast fails, the front end displays a still-air fallback, not invented winds. The optional Worker only responds within approximately 14 forecast days and samples 12:00 UTC rather than the actual departure hour, which is why the result is marked approximate.

Expected endpoint JSON response:

```json
{"outbound_tailwind_kt":20,"return_tailwind_kt":-25,"provider":"Licensed forecast service"}
```

*Positive* indicates tailwind; *negative* indicates headwind. Components are bounded for robustness on the public page.

## Model and rate maintenance

- `aircraft.json`: six original category-level benchmarks, editable from `admin.html` as before.
- `aircraft-models.json`: selected named models and approximate TAS, range and passenger capacity; edit directly in the JSON file.
- `estimator-config.json`: pricing assumptions and optional wind endpoint.
- `routing.json`: airport-terminal, distance band, and *coarse* restricted polygon configuration. This is not an authoritative AIRAC route database. Changes to airspace restrictions require legal/aeronautical review and data updates, not a casual CSS/JS edit.

## Important limitations and future integration

For validated available routes, published SID/STAR tracks, current AIRAC, weather-optimized cruise profiles, and reliable route charges, the next step is a properly licensed flight-planning/aviation-data provider and a server-side integration. EUROCONTROL NM B2B Flight Plan Preparation supports route proposals and validation but access requires stakeholder eligibility and formal processes; this package does **not** include NM connectivity or credentials. https://www.eurocontrol.int/service/network-manager-business-business-b2b-web-services

Do not use the estimator to navigate aircraft, make airspace-compliance decisions, determine dispatch fuel, decide suitability of an aircraft, or claim verified charter prices. Confirm all trip calculations and fees with a qualified operator.


### Airspace controls and long-range speed comparisons (October 2026)

- Ukraine remains excluded in all estimates under the active civil airspace closure.
- Separate Russia and Belarus checkbox assumptions are both enabled to avoid by default.
  Unchecking either is only a *hypothetical distance/pricing comparison*. It never
  establishes flight permissions or operator eligibility. Relevant regulatory,
  insurance, and ATC requirements remain for the actual operator.
- G550, G650ER, Global 6000, and Global 7500 have manufacturer-referenced
  typical/long-range and high-speed cruise benchmarks. High-speed comparison is
  opt-in and reduces indicative aircraft planning range; the exact range
  multiplier is not certified or manufacturer quoted.
- For long routings beyond the intentionally limited geometry search, the
  website may apply a low-confidence *non-operational* distance allowance
  proportional to the country polygons intersected by the direct line:
  Ukraine 4%, Belarus 4%, Russia 10% (combined capped at 16%).
  These percentages are assumptions, not published airways or real detours.
  A displayed great-circle reference is not an allowed route. Do not use
  these calculations for flight navigation or scheduling.
