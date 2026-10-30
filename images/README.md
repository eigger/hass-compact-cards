# Representative card images

These JPEG screenshots were captured from `examples/preview.html` in a Chromium browser at a 390px card width. They render the actual card JavaScript using mocked HA states and minimal local `ha-card`/`ha-icon` primitives. They are representative previews, not live Home Assistant device verification. Regenerate after changing the card layout. `overview.jpg` shows all seven cards; `visual-editor.jpg` shows the fallback UI editing flow. `compact-media-muted.jpg` and `compact-environment-long.jpg` cover muted playback and a long numeric reading at 320px.

Run `python -m http.server 8129 --bind 127.0.0.1` in the repository root and open `/examples/preview.html`. `?card=compact-light-row` (or any of the seven registered types) selects one card for capture. Add `&capture=true` to hide preview chrome. A 422px browser viewport leaves room for the 390px card and screenshot margins. Width, theme, and offline controls expose review states. The preview sends no real device commands.

`examples/preview-icons.js` contains 24 Material Design Icon paths from Pictogrammers/MaterialDesign, used only by the preview. Source: https://github.com/Templarian/MaterialDesign/tree/master/svg . The upstream Apache-2.0 license is included as `MDI-LICENSE`. The runtime bundle has no icon dependency.

## Room dashboard captures

`showcase-light.jpg` and `showcase-dark.jpg` are actual Chromium captures of `examples/showcase.html?capture=true` (add `&theme=dark` for dark mode), at a 1200 × 640 viewport. `showcase-mobile.jpg` uses a 390 × 1377 viewport. These room images, `compact-climate-row.jpg` (422 × 180), and `overview.jpg` (422 × 946) were regenerated from source `a889174` for the climate fit update, using the isolated worktree server on port 8130. Other individual card images retain their original `49c1a5e` captures; their card implementations did not change in this update.

These demonstrate three room groups with ten real card instances, seven card types, mocked states, and local HA visual primitives. No image generation, screenshot-only card CSS, or real device connection is involved. The exact card configurations are in `examples/showcase.yaml`; reproduction details are in `docs/showcase.md`.

`compact-home-editor.jpg` demonstrates explicit name-tap configuration in the home-panel editor. It was captured from source `d6e19a8` at a 422 × 1104 viewport using `/examples/preview.html?card=compact-home-panel&editor=true&capture=true`, with the first heading collapsed and the second item expanded. The shown switch and sensor use mocked states; keyboard Enter toggling and UI switching to more-info were also checked in Chromium.

`compact-climate-inline.jpg` (422 × 180) and `compact-climate-picker.jpg` (320 × 390) were captured from source `a889174` using `/examples/climate-fit.html?target=panel&theme=dark&capture=true` and `target=picker`, respectively. The former shows a 390px home panel; the latter exposes the fixed 280 × 320 parent boundary while the actual card keeps its content height. Only external fixture layout and local HA primitives are mocked; card CSS comes from the bundle.

## Languages

Images without a suffix are English and are used by `README.md` and the English sections of the guides. `*-ko.jpg` are the Korean versions used by `README.ko.md` and the Korean sections. The preview pages (`preview.html`, `climate-fit.html`, `showcase.html`) render English by default; add `lang=ko` to the URL for the Korean captures.

The `-ko` images are the original captures, taken from the source commits named above. The English images were captured later from the current bundle (source `b7e4109`, the v0.2.4 release) at the same viewports with the same mocked states, so small layout differences against the `-ko` twins (for example the climate mode-button order) come from bundle changes, not from translation. English text is slightly wider, so in `compact-climate-inline.jpg` the five-mode air conditioner row wraps its modes onto a second line, which fits on one line in Korean.

The cards' own labels are Korean-only in the bundle, so English captures swap the Korean sample text and card-rendered labels in the page's DOM through `examples/preview-locale.js` (preview only; the bundle is unchanged; tooltips and some status messages are translated best-effort). `preview.html` also accepts `width=320|390|760` to set the preview width for capture. `compact-home-editor` and `visual-editor` are captured after expanding the editor sections they show (home panel: item 2 only; environment panel: item 1 with one added `31°C or above · Warning` threshold, `이상 · 주의` in Korean).
