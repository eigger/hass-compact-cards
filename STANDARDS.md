# Standards reference

## Review scope

- Date: 2026-10-30.
- Reference: `eigger/hass-repo-standards` commit `ef7762d769a1df8a405412fb4467f87df69aaee6` from the local checkout. This is a reference review, not adoption of a published standards release or the integration profile.
- Profile: Home Assistant dashboard card; no `custom_components` domain or Python runtime.
- Authority: the user's request in this chat to selectively reference the standards for a card repository.
- Target: uncommitted initial working tree, local branch `main`; no commits or configured Git remote at review time. Repository owner, remote default branch, release status and support URLs are not assumed.
- The reference checkout contained unrelated working changes; it was read only and was not modified. The reviewed rule documents were not listed as modified.

## Selected changes

| Rules | Application |
| --- | --- |
| DOC-01/02/06 | Preserve the Korean guide as `README.ko.md`, provide a full English counterpart, cross-link both, and document development commands and verification limits. Integration-specific managed templates and install categories are not used. |
| CI-01/03/08/11 | Keep card-specific Node workflows; validate with read access and publish in a separate write-enabled job at the same event commit. Disable persisted checkout credentials, add timeouts and concurrency, and keep shell inputs in environment variables. |
| CI-05/06, DEP-01 principle | Pin external actions to verified full commits with version comments; retain `npm ci` and the lockfile. Happy DOM remains development-only; no runtime dependency is introduced. |
| CI-09 principle | Dependabot proposes npm and action updates weekly. Under the user's subsequent explicit request, patch/minor PRs can squash auto-merge after required CI passes. Major updates remain manual; no version increment is automated. |
| REL-01/02/03 | Keep SemVer, check stable tag/package version equality, add a changelog and document manual release checks. Existing tag-triggered publishing is preserved. |
| GOV-01 principle | Record the reviewed SHA, applicability and evidence here; this file is not a central integration checker configuration. |

## Not applicable and deferred

- Python manifests, config entries, Core directory layout, HA pytest fixtures, Ruff, Hassfest, imagespec/blesession contracts, the Python dependency updater and integration ZIP releases do not apply to this frontend bundle. HACS continues to install `compact-cards.js` using the existing plugin manifest.
- The central `check_integration.py`, `sync_badges.py` and integration reusable workflows require a domain/manifest. They are not run or installed here. No artificial manifest, `.hass-standards.json`, central AGENTS file or integration test scaffold is added.
- Analytics Usage requires an integration domain. It is not an installation metric for these cards. Release/CI/support/install-link badges requiring a confirmed remote, published release or enabled support feature are deferred until those facts can be checked. No HA minimum or license is invented.
- The central adoption table and standards repository are outside this selective local reference task and were not changed. This review does not claim full standards adoption.
- Revisit when a remote is configured, a license is selected, the first release is published, or live HA compatibility is verified. Maintainer: repository owner; future changes should retain this scope distinction.

## Verification

The concrete commands, versions, results and outstanding checks are recorded in [ADOPTION_CHECKLIST.md](ADOPTION_CHECKLIST.md). The initial selective review performed no remote mutation. A subsequent user request in this chat authorizes committing, pushing, repository metadata, sponsorship and CI settings.

## Repository setup follow-up

The repository is published as [eigger/hass-compact-cards](https://github.com/eigger/hass-compact-cards) with `main` as its default branch. Settings follow `hass-niimbot` where applicable: squash auto-merge, branch deletion, read-only default workflow permissions and a strict required status check for the card's `test` job. Pull requests require no additional approving review, linear history is required, force pushes and branch deletion are disabled, and administrators retain their existing bypass capability. The funding account is `eigger`, matching that repository's `FUNDING.yml`.

Only the generic Dependabot auto-merge/cleanup workflow is reused from standards `v1.1.4`, pinned to its verified commit `a90531d05613597632a4c10c11ce1dbc45e0bab6`. Its published contents were inspected: it accepts same-repository Dependabot PRs against the default branch, allows only patch/minor auto-merge, and checks metadata without executing PR code. This is standalone CI reuse, not central enrollment or automatic standards adoption. Central integration CI and the adoption table remain unchanged.
