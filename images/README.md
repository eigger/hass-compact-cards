# Representative card images

These JPEG screenshots were captured from `examples/preview.html` in a Chromium browser at a 390px card width. They render the actual card JavaScript using mocked HA states and minimal local `ha-card`/`ha-icon` primitives. They are representative previews, not live Home Assistant device verification. Regenerate after changing the card layout. `overview.jpg` shows all seven cards; `visual-editor.jpg` shows the fallback UI editing flow.

Run `python -m http.server 8129 --bind 127.0.0.1` in the repository root and open `/examples/preview.html`. `?card=compact-light-row` (or any of the seven registered types) selects one card for capture. Add `&capture=true` to hide preview chrome. A 422px browser viewport leaves room for the 390px card and screenshot margins. Width, theme, and offline controls expose review states. The preview sends no real device commands.

`examples/preview-icons.js` contains 23 Material Design Icon paths from Pictogrammers/MaterialDesign, used only by the preview. Source: https://github.com/Templarian/MaterialDesign/tree/master/svg . The upstream Apache-2.0 license is included as `MDI-LICENSE`. The runtime bundle has no icon dependency.
