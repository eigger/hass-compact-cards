# Changelog

## Unreleased

- Use Home Assistant state icons in home-panel entity rows so device classes, current states and customized entity icons display correctly instead of a dot. Preserve explicit item icons and navigation icons.

## 0.2.0 — 2026-10-30

- Add standalone compact image and camera thumbnail rows with visual editors, fit controls, accessible image descriptions, load/retry feedback and tap-to-open native details (native picture card dialog for static URLs). No inline live playback. Cover entity recovery and lifecycle races with tests; document that live HA playback still needs verification.

- Replace dotted request outlines and pending/success card-edge flashes with subtle control dimming across cards. Remove button shrink/rebound effects while retaining keyboard focus, duplicate-request guards, actual-state colors and error feedback.

- Keep climate rows at their content height, including editor previews, and wrap mode controls only when their measured widths need another line. Preserve all icon-only modes and 44px coarse-pointer targets instead of forcing extra rows at fixed breakpoints.

## 0.1.1 — 2026-10-30

- Support explicit home-panel name-tap `toggle` and `more-info` actions in YAML and the visual editor while preserving default/legacy service-button behavior, dedicated right-hand controls, toggle confirmations, and unavailable/duplicate-request guards. Toggle requires the item's own explicit entity; this does not add the full Home Assistant action schema or hold/double-tap support.

## 0.1.0 — 2026-10-30

- Refine typography, active surfaces and slider rails without increasing card heights; replace README test-sheet previews with real room dashboard captures, matching YAML and a reproducible showcase guide.

- Apply UX review refinements: direct mute controls, independent audio/transport requests, per-scene feedback, unbroken environmental numbers with smaller units, keyboard-friendly color temperature, compact cover labels, and focused/reorder-safe visual editing.

- Clarify comparison periods directly beside values and retain icon-centered climate controls following the UX review.

- Polish press feedback, accessible request status, scene acceptance, true-state fan/cover motion, media playback indication and direct per-card help links.

- Add visual configuration editors for all seven cards, including nested items, ordering, actions, confirmations and thresholds while preserving YAML settings.

- Add capability-aware media playback and volume controls, per-card guides and representative browser screenshots for all seven cards.

- Add one-tap scene/script shortcuts and compact environment readings with explicit warning thresholds.

- Add direct light and cover rows with capability-aware controls, committed sliders and shared home-panel embedding.

- Improve compact climate touch targets and responsive mode placement, automatic home-panel columns, mobile comparisons, named heading badges and pending-service feedback.

- Add English and Korean documentation and record the card-specific standards review.
- Pin GitHub Actions to reviewed commits, restrict release write permissions to publishing, and add job timeouts and concurrency controls.
- Add weekly dependency update proposals for npm development tools and GitHub Actions.
- Enable required-CI-gated squash auto-merge for Dependabot patch/minor updates, merged-branch cleanup, and GitHub Sponsors funding metadata.

### Initial foundations

- Provide compact climate controls and a home panel for entities, navigation, commands and usage comparisons.
- Add HACS metadata, dashboard examples, DOM tests and a tag-triggered release workflow for the JavaScript bundle.

No migration is required for this release. Existing configurations remain valid; home panels now adapt ordinary entries to one column at widths up to 380px. Set `columns: 2` to retain two columns. Live Home Assistant and device verification remain pending.
