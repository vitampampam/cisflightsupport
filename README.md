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
