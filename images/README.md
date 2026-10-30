# Representative card images

These JPEG screenshots were captured from `examples/preview.html` in a Chromium browser at a 390px card width. They render the actual card JavaScript using mocked HA states and minimal local `ha-card`/`ha-icon` primitives. They are representative previews, not live Home Assistant device verification. Regenerate after changing the card layout. `overview.jpg` shows all seven cards; `visual-editor.jpg` shows the fallback UI editing flow. `compact-media-muted.jpg` and `compact-environment-long.jpg` cover muted playback and a long numeric reading at 320px.

Run `python -m http.server 8129 --bind 127.0.0.1` in the repository root and open `/examples/preview.html`. `?card=compact-light-row` (or any of the seven registered types) selects one card for capture. Add `&capture=true` to hide preview chrome. A 422px browser viewport leaves room for the 390px card and screenshot margins. Width, theme, and offline controls expose review states. The preview sends no real device commands.

`examples/preview-icons.js` contains 24 Material Design Icon paths from Pictogrammers/MaterialDesign, used only by the preview. Source: https://github.com/Templarian/MaterialDesign/tree/master/svg . The upstream Apache-2.0 license is included as `MDI-LICENSE`. The runtime bundle has no icon dependency.

## Room dashboard captures

`showcase-light.jpg` and `showcase-dark.jpg` are actual Chromium captures of `examples/showcase.html?capture=true` (add `&theme=dark` for dark mode), at a 1200 × 640 viewport. `showcase-mobile.jpg` uses a 390 × 1480 viewport. Capture source: `49c1a5e`; all runtime styling and configuration changes are included. The seven individual card captures, overview and editor were also regenerated from that source.

These demonstrate three room groups with ten real card instances, seven card types, mocked states, and local HA visual primitives. No image generation, screenshot-only card CSS, or real device connection is involved. The exact card configurations are in `examples/showcase.yaml`; reproduction details are in `docs/showcase.md`.

`compact-home-editor.jpg` demonstrates explicit name-tap configuration in the home-panel editor. It was captured from source `d6e19a8` at a 422 × 1104 viewport using `/examples/preview.html?card=compact-home-panel&editor=true&capture=true`, with the first heading collapsed and the second item expanded. The shown switch and sensor use mocked states; keyboard Enter toggling and UI switching to more-info were also checked in Chromium.
