# Optiflux reference direction — October 3, 2026

The user replaced the previous pixel-art direction with https://optiflux.polsia.app/. That URL rendered a Polsia landing page when inspected in the browser. Its visual language is monochrome office photography, a black monospace activity terminal, orange signal band, large elegant serif headings, metallic rectangular buttons, editorial sections, white-background robot imagery and a black footer.

LaunchGuild now applies that direction to its landing page, login, overview and all workspace routes. The existing partner records, capacity arithmetic, reviewed decisions and source-backed local model tasks remain functional. The terminal renders actual stored execution events and current status. Idle, failed and completed tasks are labeled accurately. This is a local application, not a public deployment or proof of hosted provider configuration.

## Original artwork

Both images were generated with `image_gen.imagegen` on October 3, 2026. No source-site images, logos, code or fonts were copied. The generated images are separate from the old procedural CC0 artwork. Original generation files remain under `/Users/srivibhavp/.codex/generated_images/[private local receipt retained outside source]/`.

- Office: `public/art/office-noir.png`, original `exec-32d46364-28af-4280-9628-98a841c845e3.png`.
- Team: `public/art/team-noir.png`, original `exec-80bc372e-8aa6-49d7-b26a-20a80f2eec8c.png`.
- Typography: self-hosted Cormorant Garamond and IBM Plex Mono from Fontsource.

Office prompt:

> Use case: photorealistic-natural. Asset type: cinematic full-bleed website hero background, landscape 16:9. Create an original black-and-white analog-film photograph of an empty 1980s corporate office at night. Wide symmetrical architectural composition looking down an aisle between dark fabric cubicles, one central desk with a softly glowing CRT monitor and a black ergonomic office chair, luminous fluorescent ceiling panels, long shadows, realistic office textures and carpet, subtle fine 35mm film grain, deep charcoal shadows and silver highlights. The camera is at human eye height, slightly low, center CRT and chair at lower center, generous dark negative space in the upper middle for white serif website text. The mood is quiet, uncanny, elegant and cinematic. Photographic realism, not illustration, not pixel art. Do not include any people, robots, words, logos, interface text, or watermarks. This is original imagery for LaunchGuild; do not reproduce any other brand's image exactly.

Team prompt:

> Use case: stylized-concept. Asset type: original website editorial team photograph, landscape 16:9. A high-end black-and-white silver-gelatin style studio image of five distinct chrome humanoid robot analysts in tailored black business suits, seated and standing at a long minimal oval black conference table. One robot in foreground profile, two at either side, two at the far end, collaborating quietly around a small glowing CRT terminal and paper documents. They have smooth sculptural metallic faces and expressive industrial joints, not skulls or scary faces. Wide editorial composition, full group visible, bright pure white seamless studio background with lots of clear white space in top third, no environment clutter. Rich monochrome film grain, polished chrome highlights, tailored fabric texture, strong sophisticated silhouette. The image should feel like an original surreal 1990s fashion advertisement about an artificial intelligence team. No words, logos, branding, UI, watermark, or duplicated famous characters. Original composition for LaunchGuild, not a copy of an existing brand photograph.

## Verification

Run `npm test`, `npm run build`, then `npm run qa` against the production server. `node scripts/verify-optiflux.mjs` reopens a real completed local task session in an isolated QA browser, checks desktop/mobile pages, navigation, refresh persistence and exact-source drawers, then captures screenshots and `artifacts/optiflux-browser-proof.json`. The session cookie is never exported.

Current screenshots use the `optiflux-` prefix. Old videos and pixel screenshots are historical and do not show this interface.
