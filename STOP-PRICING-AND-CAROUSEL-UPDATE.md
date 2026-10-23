# Stopover pricing and touch-carousel change

## Flight estimator

- Separates flight block time from non-billable ground turnaround. The reference
  turnaround assumption is 60 min per technical stop, counted only toward
  total journey duration. Ground turnaround has a zero flight-hour charge.
- Additional fuel stops require additional flight operations: a configurable
  30-min billable block-time allowance per unlocated fuel stop (extra takeoff,
  taxi, approach and climb/descent), not one hour of parked time.
- Each manually entered intermediate airport starts a new flight leg; each
  leg carries its own 30-minute terminal/taxi allowance.
- The existing configurable €2,500 fuel/technical-stop amount remains an
  **illustrative combined service fee** (landing, handling/refuelling service),
  not a verified airport fee or the price of the uplifted fuel. Only the base
  origin/destination handling allowance is charged separately.
- Return itineraries count the actual outbound and inbound legs, stop ground
  times, fees and overnight assumptions in both directions.
- The detailed breakdown shows billable block time, zero-priced turnaround,
  technical-stop allowances and other pricing assumptions, with reconciliation
  against the total price.
- Estimations are not certified routes or quotes; fuel, landing permissions,
  ground services, operator terms and minimums require confirmation.

## Tablet and phone carousels

- The previous/next arrow controls are hidden on iPhone and iPad (touch
  pointers), including the services and gallery carousels.
- Touch swiping, snap positioning and pagination dots remain. Desktop arrow
  navigation is retained.

## Changed files

- `assets/trip.js` (including the embedded estimator snapshot),
  `assets/data/estimator-config.json`, `assets/site.css`, `index.html`,
  `trip-estimator.html` and HTML cache-busting references.
