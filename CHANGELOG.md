# Changelog

## Unreleased

- Add one-tap scene/script shortcuts and compact environment readings with explicit warning thresholds.

- Add direct light and cover rows with capability-aware controls, committed sliders and shared home-panel embedding.

- Improve compact climate touch targets and responsive mode placement, automatic home-panel columns, mobile comparisons, named heading badges and pending-service feedback.

- Add English and Korean documentation and record the card-specific standards review.
- Pin GitHub Actions to reviewed commits, restrict release write permissions to publishing, and add job timeouts and concurrency controls.
- Add weekly dependency update proposals for npm development tools and GitHub Actions.
- Enable required-CI-gated squash auto-merge for Dependabot patch/minor updates, merged-branch cleanup, and GitHub Sponsors funding metadata.

## 0.1.0 — Initial development version (not yet published)

- Provide compact climate controls and a home panel for entities, navigation, commands and usage comparisons.
- Add HACS metadata, dashboard examples, DOM tests and a tag-triggered release workflow for the JavaScript bundle.

No migration is required for the Unreleased changes. Existing configurations remain valid; home panels now adapt ordinary entries to one column at widths up to 380px. Set `columns: 2` to retain two columns. Live Home Assistant and device verification remain pending.
