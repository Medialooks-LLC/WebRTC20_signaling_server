# GitLab to GitHub releases

This pipeline builds the root Dockerfile as one `linux/amd64` image, tests the
container, copies `main` and the release tag to GitHub without force, then
publishes a GitHub release. It does not deploy or restart meet.medialooks.com.

The intended source is GitLab project **143**, default protected branch `main`.
The default destination is
[`Medialooks-LLC/WebRTC20_signaling_server`](https://github.com/Medialooks-LLC/WebRTC20_signaling_server).
The destination repository must already exist. Source import retains the new
GitLab history; old Bitbucket history and its private configuration are not
required or published by these scripts.

## Runner and variables

GitLab 18.2 or later is required for `trigger: strategy: mirror`. The configured
GitLab 19.5.3 supports it. All script jobs select the **intersection** of tags
`linux`, `shell`, and `$RELEASE_RUNNER_TAG` (default `plant01`), so a Windows
runner sharing a generic tag cannot claim them. The runner needs Python 3.11+,
Git, Docker CLI, a working Linux Docker daemon, and access to the build's public
package registries. Docker-in-Docker and host Node/npm are not required. The
runner used for setup was checked for Python 3.11.2, Docker linux/amd64 and Git.

Configure these project CI/CD variables in GitLab Settings > CI/CD > Variables:

| Variable | Setting |
| --- | --- |
| `GITHUB_TOKEN` | Required, masked and protected. GitHub token permitted to push repository contents and create/upload/publish releases. A fine-grained PAT needs Contents read/write for this repository; a GitHub App installation token with the same permission also works, but must remain valid through the job. |
| `GITHUB_REPOSITORY` | Optional override of the destination `owner/repository`. |
| `RELEASE_RUNNER_TAG` | Optional unique runner tag; default `plant01`. Static `linux` and `shell` selectors remain required. |
| `PUBLISH_GHCR` | `false` by default. Set `true` only to enable the additional registry output. |
| `GHCR_USERNAME` | Required only for GHCR: the GitHub login owning the registry token. |
| `GHCR_TOKEN` | Required only for GHCR, masked and protected: a **classic PAT** with `write:packages`, authorized for the organization if SSO is required. GitHub Packages does not accept a fine-grained Contents-only PAT. |

`CI_JOB_TOKEN` reads the project's commit/MR APIs; no separate GitLab PAT is
needed. Do not enable `CI_DEBUG_TRACE`, print environment variables, or place
tokens in repository files or remote URLs. The scripts pass Git authentication
through process environment and isolate optional Docker login in temporary
configuration. Long-lived credentials are not embedded in the image or release.

## Release behavior

1. The parent `release_lane` acquires one `github-release` resource group and
   waits for its complete downstream hierarchy. Do not put this resource group
   on the child jobs: the parent already holds it.
2. The coordinator runs offline unit tests and preflight **inside that lock**.
   Preflight paginates published managed releases and selects the newest source
   SHA by Git ancestry. It verifies that release's manifest, SHA256SUMS, uploaded
   asset digest/size metadata and lightweight tag. It downloads only the small
   manifest and checksums; it does not download Docker archives.
3. Same SHA, or an obsolete pipeline whose SHA is already an ancestor of the
   checkpoint, generates only an `unchanged` job. The dynamic child contains no
   build job. Divergent history fails rather than rewriting GitHub. A failed
   attempt leaves its source eligible for retry.
4. Changed source generates one release job. It rechecks the checkpoint, reads
   the full commit range, builds the immutable pipeline SHA with
   `VERSION=meet-<12-character SHA>`, `VCS_REF=<full SHA>` and
   `SOURCE_DATE_EPOCH=<Git commit timestamp>`, and runs
   `python3 tests/container/smoke.py --image videosdk-meet:<full SHA>`.
5. Docker save output is streamed into `docker-image-linux-amd64.tar.gz`.
   The job prepares the four assets below and their checksums. Each asset must
   be under GitHub's 2 GiB limit; oversized output fails before GitHub mutation.
6. An atomic, ordinary Git push copies only `main` and `meet-<full SHA>`. It
   never force-pushes, prunes refs, mirrors unrelated branches, or changes an
   existing different tag. Diverged GitHub history fails visibly.
7. The job creates or resumes its own draft. Matching uploaded assets are
   reused; incomplete/different assets can be repaired only in that owned
   unpublished draft. Unexpected assets and published releases are preserved.
8. Assets and notes are verified before publication. Changing the draft to
   published is the **only checkpoint transition**. A lost publication response
   succeeds only after a fresh complete checkpoint verification. If the job
   fails after publication, retry sees the verified checkpoint and skips build.

Publication uses one final PATCH with explicit tag, source commit, notes,
`draft=false` and `prerelease=false`, after a fresh owned-draft/tag check.
GitHub removes the current release tag when PATCH omits `tag_name`; even a
notes-only PATCH must not precede this publication gate. Draft `html_url` values
may normally contain `untagged-*`; verification uses the API's `tag_name` and
the actual Git tag target instead.

No persistent GitLab variable, expiring job artifact or CI cache is used as a
release checkpoint. GitHub's `/releases/latest` is deliberately unused: its
ordering follows commit creation dates, which need not match release order.
Enabling GitHub immutable releases is compatible with this draft-first flow.

## Downloadable release

| Asset | Contents |
| --- | --- |
| `docker-image-linux-amd64.tar.gz` | Docker save archive of `videosdk-meet:<full SHA>`; load with `gzip -dc ... | docker load`. |
| `release-notes.md` | Complete merged-request, direct-commit and full-commit lists. |
| `release-manifest.json` | Schema/version, managed owner marker, source SHA/previous SHA/project/branch, image ID/platform, change metadata, archive/notes sizes and SHA256 hashes; optional GHCR digest. |
| `SHA256SUMS` | SHA256 hashes for the archive, notes and manifest. |

Verify downloads with `sha256sum -c SHA256SUMS`. GitHub's asset SHA256 digest
metadata verifies SHA256SUMS itself during checkpoint checks. Full notes remain
attached even if they exceed the release description limit.

Optional GHCR output uses
`ghcr.io/medialooks-llc/webrtc20_signaling_server:<full SHA>`. Before pushing,
the job checks an existing source tag's content-addressed config and OCI
repository/revision labels. A matching image is pulled by digest and reused
before rebuilding, then goes through the same smoke gate. This allows retry
after an earlier registry push even if a rebuild's timestamps would differ.
It refuses to replace an image for another source. After pushing a new tag it
verifies the remote config and manifest
digest. A registry failure cannot publish the GitHub release/checkpoint. New
GHCR packages are private by default; package visibility is managed separately.

## Notes and verification

`GIT_DEPTH=0` preserves complete ancestry. Notes use all parents in
`previous-successful-release..pipeline-SHA`, not commit timestamps or the
previous pipeline's SHA. The initial release includes all available GitLab
history. Commit-to-MR associations and merged MR metadata are fully paginated;
merge/squash/head integration SHAs must be present in the actual commit range.
MRs are deduplicated by project/IID. A complete commit list also preserves
changes without MR metadata, including the initial sanitized import. Historical
Bitbucket PR titles and links require a separate metadata import.

Run offline tests with:

```sh
python3 -B -m unittest discover -s ci/release -p 'test_*.py' -v
```

Tests use real temporary Git repositories and fake paginated APIs/Docker. They
cover unchanged and obsolete pipelines, divergent/missing ancestry, old side
branches, pagination, merge/squash/fast-forward records, direct commits,
checksums/tag tampering, owned draft repair, safe Git push arguments, failures
at each publication phase, and lost publication responses. They do not publish
to GitHub. The container smoke suite is a separate mandatory release gate.

## Official references

- [GitLab resource groups](https://docs.gitlab.com/ci/resource_groups/)
- [Dynamic and nested child pipelines](https://docs.gitlab.com/ci/pipelines/downstream_pipelines/)
- [GitLab job-token permissions](https://docs.gitlab.com/ci/jobs/ci_job_token/)
- [GitLab commit-to-MR API](https://docs.gitlab.com/api/commits/)
- [GitHub releases API](https://docs.github.com/en/rest/releases/releases)
- [GitHub release assets API](https://docs.github.com/en/rest/releases/assets)
- [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
- [GitHub Container registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
