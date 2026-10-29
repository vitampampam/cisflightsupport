# Trip estimator v10 — streamlined location search

- Existing From and To fields remain the default, supporting airport, city and ICAO/IATA lookup.
- The optional “Or choose by country” browser **replaces** that route input while open, displaying only **Country** and **City or airport** (one combined searchable field). After a choice the normal From/To input returns.
- Search within the selected country accepts partial city names, airport names, ICAO and IATA codes.
- Clicking a result fills the main From or To field, closes the browser and retains normal estimator calculation.
- Lists are custom, accessible keyboard-operable controls in the existing brand style, with no browser-native long select menus.
- No backend or external lookup service is required; uses the existing local airport snapshot.
- Updated CSS and JS cache keys to v375 / v363.
