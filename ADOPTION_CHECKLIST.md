# Selective standards review — verification record

Scope and applicability: [STANDARDS.md](STANDARDS.md). This is a card-specific reference review, not a claim of full integration standards adoption.

## Target and environment

- Date: 2026-10-30 (Asia/Seoul).
- Target: initial uncommitted working tree on `main`; HEAD does not exist and no remote is configured. Results apply to these local files, not a published commit.
- Reference: `ef7762d769a1df8a405412fb4467f87df69aaee6` from the local standards checkout; no central release descriptor is adopted.
- Windows x64, Node.js 24.18.0, npm 11.16.0, Happy DOM 21.0.4.
- GitHub runner configuration remains Ubuntu with Node.js 22. No HA minimum or runtime dependency changed.

## Results

| Status | Check | Evidence |
| --- | --- | --- |
| PASS | Reproducible development install | `npm ci`: 9 packages installed; audit reported 0 vulnerabilities at execution time. |
| PASS | JavaScript syntax | `npm run check`. |
| PASS | Card regression suite | `npm test`: 7 passed, 0 failed. Card registration, temperature limits, unavailable entities, nested configuration errors, command targets, failure notifications and comparisons. |
| PASS | Action pin resolution | `git ls-remote` against official action repositories resolved checkout `v4.3.1` to `34e114876b0b11c390a56381ad16ebd13914f8d5`, setup-node `v4.4.0` to `49933ea5288caeca8642d1e84afbd3f7d6820020`. |
| PASS | Workflow static validation | `actionlint 1.7.12 .github/workflows/check.yml .github/workflows/release.yml` exited 0. Official Windows amd64 release archive SHA-256 matched upstream checksums: `6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9`. |
| PASS | Release gate behavior | Executed the exact `node -e` gate extracted from the workflow in child Node processes: `v0.1.0` accepted; mismatched `v0.2.0`, prerelease `v0.1.0-beta.1` and malformed `vwrong` rejected. No release command was executed. |
| PASS | Local documentation links | Node filesystem check resolved all 11 relative links across both READMEs, STANDARDS and this record, including reciprocal language links. Remote links were not revalidated in this review. |
| PASS | Self-review | Korean content preserved in `README.ko.md`; English guide covers the same features, limitations and examples. No card runtime, configuration, HA support minimum or installation artifact changed. Local workflow names and the existing test job name are retained. |
| TODO | GitHub CI and release execution | No remote or published target commit; workflow jobs and token permissions have not been exercised on GitHub. |
| TODO | HACS installation and live rendering | No connected HA installation used for this review. DOM tests do not verify browser layout, HA compatibility or actual devices. |
| TODO | Minimum development environment | Node.js 22 is configured in CI but local checks ran on Node.js 24.18.0. |
| N/A | Integration-only checks | No Python integration, domain, manifest, BLE/payload library or integration ZIP. Central integration checker, Hassfest and real HA Python fixture tests do not apply. |

## Review decisions

The primary agent implemented and reviewed this limited documentation/local workflow change. No shared standards workflow implementation or card service behavior changed; a separate integration lifecycle review was not needed. Standardized integration README blocks, automatic badge generation and central adoption status updates were intentionally excluded under the user's selective-reference instruction.

Before the first release, rerun checks on the committed tree, confirm the actual GitHub repository and support features, run CI on Node.js 22, and verify installation and controls in Home Assistant. Record those results separately; the TODO entries above are not passes.
