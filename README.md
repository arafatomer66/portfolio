# Omer Arafat portfolio

Zero-build static site: `index.html` + `styles.css` + `main.js`. No framework, no bundler.

## Run locally

    python3 -m http.server 8000
    open http://localhost:8000

## Deploy

Push to a GitHub repo and enable Pages on the `main` branch, root folder.

## What is in here

- Content follows the Work Journey document (2018 to 2026): roles, numbers and projects
- Hero: WebGL2 contour-map field that bends toward the pointer, with a portrait that tilts
- Proof numbers that count up, one tech-stack marquee (Simple Icons)
- "What I want to work on" bento, sticky-stacked case studies with real screenshots
- ShareDeal deep dive with a sideways-scrolling metrics row
- Experience as an accordion (native `<details>`), interactive terminal kept
- Dark and light mode from the system setting; `prefers-reduced-motion` turns all motion off
- No scroll listeners: IntersectionObserver for reveals, nav state and the active link
