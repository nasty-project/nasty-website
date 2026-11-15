# nasty-website

Source of [nasty-project.eu](https://nasty-project.eu): a single static page (`index.html` + `style.css`), no build step.

## Screenshots

`shots/{light,dark}/*.webp` are captured from a live NASty with demo data:

```sh
cd tools && npm install
NASTY_URL=https://<box> NASTY_USER=admin NASTY_PASS=... node capture.mjs
```

Needs `cwebp` on PATH. The page shows the light or dark set to match the visitor's system theme.

## Preview locally

Open `index.html` in a browser.
