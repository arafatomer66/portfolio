# Omer Arafat portfolio

Zero-build static site: `index.html` + `styles.css` + `main.js`. No framework, no bundler.

## Run locally

    python3 -m http.server 8000
    open http://localhost:8000

## Deploy

Push to a GitHub repo and enable Pages on the `main` branch, root folder.

## What is in here

- Ambient canvas background (three indigo blobs that drift and follow the pointer)
- Custom cursor: magnetic on buttons and nav, expands on links, enlarges over media, particle trail on a second canvas
- Split-text headline reveals + staggered section reveals (IntersectionObserver)
- Lerped scroll proxy driving parallax and the experience timeline tracer
- 3D tilt + cursor spotlight border on project cards
- Interactive terminal: `help`, `about`, `skills`, `experience`, `projects`, `writing`, `contact`, `open <target>`, `clear`; Tab completion, arrow history, Ctrl+L
- Copy-to-clipboard email button with success state
- All motion is transform/opacity only; `prefers-reduced-motion` turns it all off, touch/small screens get no cursor, tilt or ambient canvas

## To do before it is really yours

Project images are Picsum placeholders seeded per project. Replace the `src` on each `.card-media img` with a real screenshot.
