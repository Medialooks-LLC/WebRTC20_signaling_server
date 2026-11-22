# Repository conventions

- Keep `main` as the canonical branch. Use descriptive project names for temporary branches and remove them after merging.
- Do not add AI assistant names, assistant branding, or generated-by attributions to branch names or release notes.
- Write release notes for users: explain changes in behavior and deployment, without internal branch names or development transcripts.
- Keep the first release notes in `release-notes/initial.md` as the comparison with the original application. Subsequent release notes collect changes since the previous published release.
- Run the release unit suite for release automation changes. Keep the unchanged-commit gate and container smoke checks intact.
