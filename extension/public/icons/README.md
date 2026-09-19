Place real PNG icons here before building:

- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128, also what the Chrome Web Store listing uses)

Derive them from `docs/logo.png` at the repo root (e.g. via an image editor
or `magick docs/logo.png -resize 128x128 extension/public/icons/icon128.png`
and similarly for the other sizes). Not generated here since they're binary
assets.
