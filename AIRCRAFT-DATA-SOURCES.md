# Aircraft models & pricing reference (October 2026)

This website carries **35 indicative aircraft profiles**, prioritizing aircraft regularly active in European business aviation. The ``popular_europe`` marker is a navigation aid: it marks representative aircraft belonging to frequently observed model families, **not an availability claim** or ranking of individual variants.

## Activity basis
- AVI-GO European business aviation flight activity July 2026: https://ai.avi-go.com/news/ai-news-center/reports/2026-07/67
- Embraer delivery summary, February 2026: https://embraer.com/media-center/pt?detail=24354&mediatype=NEWS

## Aircraft specification reference points
- Textron Aviation product tables: https://www.textron.com/assets/FB/2023/textron-aviation.html
- Textron Citation Latitude specifications: https://customer.cessna.com/sitecore/content/cessnaweb/home/citation/latitude?sc_lang=en
- Embraer Praetor 500 and 600 manufacturer ranges: https://embraer.com/media-center/en/?detail=14002&mediatype=NEWS
- Embraer Phenom 100EX brochure: https://embraer.com/media/03xjembo/114-2024-brochure-phenom-100ex-40-fb-digital.pdf
- Pilatus PC-24 brochure (range depends on passenger load): https://www.pilatus-aircraft.com/assets/files/Brochures/PC-24/Pilatus-Aircraft-PC-24-Brochure.pdf
- Gulfstream G280 manufacturer's spec sheet: https://assets.gulfstream.aero/downloads/g280_spec_sheet_english_web_v02.pdf
- Dassault Falcon 2000LXS: https://www.dassaultfalcon.com/businessjets/falcon-2000lxs/
- Dassault aircraft range comparison: https://www.dassaultfalcon.com/aircraft/compare-aircraft/?id_aircraft=143

**Do not use the table as certified performance or operational flight-planning data.** ``tas`` is simplified average cruise true airspeed, not maximum cruise speed; ``range`` is an indicative reference range and the calculator plans fuel stops at 88% of that range. Typical charter passenger counts may be below the certified maximum and vary by cabin configuration, luggage and weather. Older aircraft variant values are approximate and should be individually checked against operator documents before quoting.

## Charter hourly rates
``rate_eur`` values are editable **indicative European charter planning benchmarks** (EUR/block hour), not verified rates for particular airframes or operators. Pricing references include:
- https://bbac.aero/blog/how-much-does-a-private-jet-charter-cost
- https://www.aircontact.com/en/private-jet-charter-everything-you-need-to-know-about-pricing-flexibility-and-choosingthe-right-aircraft/
- https://www.menkoraviation.com/en/news/private-jet-cost-2026-europe-africa/

These references show wide overlapping class ranges. Actual prices require an operator quote and depend on base, ferry legs, season, crew, taxes, actual fees and schedule.

## Updating
Edit ``assets/data/aircraft-models.json`` and run ``python tools/rebuild-estimator-data.py``. The self-contained ``assets/trip.js`` bundle MUST be rebuilt for GitHub Pages. Category averages in ``assets/data/aircraft.json`` can still be edited through ``admin.html``; model-specific ``rate_eur`` values are edited in the JSON, and override category averages **only when that model is selected**.


### 2026-10-24 jet speed update

The Global 7500 now uses Bombardier's 7,700 nm maximum long-range benchmark
under NBAA IFR theoretical conditions at Mach 0.85. The typical/high-speed
planning speeds for selected Global and Gulfstream models are 488/516 kt TAS
(Global 7500, G650ER), 488/505 kt (Global 6000), and 459/488 kt (G550).
These TAS conversions are planning approximations, not certified charts.
High-speed range multipliers are disclosed *estimator assumptions* and not
manufacturer-published values; published aircraft range already incorporates
NBAA IFR fuel reserves, so the additional general 7% range contingency is a
rough payload/weather allowance rather than an extra IFR reserve.

Sources for performance context:
- https://www.globaljets.net/specs/global7500brochure.pdf
- https://assets.gulfstream.aero/downloads/22_464552_G650ER_Product_Sheet_PROD_DAM.pdf
- https://resources.globalair.com/specs/aircraftbrochures/1935_g550_spec_sheet.pdf
- https://www.easa.europa.eu/en/domains/air-operations/czibs/czib-2022-01r14
- https://www.easa.europa.eu/en/domains/air-operations/czibs/2025-01-r2
- https://www.easa.europa.eu/en/newsroom-and-events/news/easa-issues-safety-directive-calling-member-states-mandate-avoidance
