# CIS Flight Support — estimator and responsive UI update (23 October 2026)

## Root cause and change
- Valid European-to-Southeast-Asian routes such as Amsterdam–Singapore failed with `unroutable` because the simplified geometry routine deliberately refuses sectors longer than 4,000 nm that cross a restricted-country polygon. The UI treated the *limitation of the heuristic* as evidence the journey could not be calculated.
- The public commercial estimator now uses an explicitly labelled, non-operational **bypass-distance allowance** only when the limited geometric search cannot find a corridor. It still blocks endpoints inside a marked restricted polygon. This is **not a cleared or validated air route**; operators must confirm airspace, route, approvals, costs and aircraft suitability.
- Interactive model rates, 35 aircraft models, departure/arrival search, and earlier dropdown fixes remain.
- On iPhone an older `!important` touch CSS rule kept charcoal/pink instead of the cool blue and white mobile branding; it is overridden, with no change to font size or layout.
- With the services filter active, CSS Grid now shrinks to available visible cards and centres them on desktop; unfiltered grid and touch carousel remain as before.

## Files changed
- `assets/route-model.js`, `assets/trip.js`, `assets/site.css`, `index.html`, `trip-estimator.html`.

## Safety notice
Estimated track distances and cost ranges are indicative only and must not be used to plan or authorize a flight. Route distance is not based on actual airways, NOTAMs, NOTAM acceptance, SID/STAR, or AIRAC data. No wind forecast is connected.

## Optional intermediate stop
- Collapsible “Add an intermediate stop” airport selector on both pages; autocomplete and ?via=ICAO supported.
- Both sectors are estimated independently, with each leg checked against indicative aircraft range, and one additional planned stop per direction included in indicative duration and cost.
- Stopovers are **not automatically recommended or confirmed**; suitability and flight plans require operator confirmation.
- Invalid/missing/same-as-origin stop is rejected, and the enquiry includes the via airport.
