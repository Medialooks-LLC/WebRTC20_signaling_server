# Initial release

This release packages the signaling server, sample authorization service, and browser pages into one ready-to-run container.

## Changes from the original version

- **Browser streaming:** Added `/streamer` to publish a camera and microphone directly from the browser and share receiver links for browsers and compatible C# WebRTC 2.0 samples. Supports multiple viewers, device selection, camera/microphone controls, and a new stream ID for each session.
- **Device access:** Added explicit permission and device-refresh controls before publishing. Temporary captures and active tracks are released when cancelled or stopped.
- **Remote player:** Added dedicated `/player` and `/player/<id>` pages for compatible C# players, with playback controls, seeking, playlists, media-library browsing, password entry, and output-device selection. The ordinary viewer remains a viewing page.
- **Phones and tablets:** Improved layouts across setup, viewing, guest, and remote-player pages, including touch controls, orientation changes, safe-area spacing, scrolling menus, and handling of on-screen keyboards.
- **Connection reliability:** Improved publisher registration, session negotiation, ICE candidate ordering, and connection cleanup. Viewers are handled independently so one viewer disconnecting does not stop the source for the others.
- **Deployment:** Replaced the separate service setup with one Docker image and a simple Compose configuration. Added health checks, graceful shutdown, runtime endpoint configuration, and optional mounted TLS certificates. The container runs without root privileges.
- **Release automation:** Added image builds and checks, source synchronization to GitHub, downloadable image archives, checksums, and release notes collected from merged requests. Docker build and publication are skipped when the current source commit has already been released.

## Included downloads

- Docker image archive for Linux AMD64, ready for `docker load`.
- Source code archives.
- Release notes, checksums, and release manifest.

Browser camera/microphone capture requires HTTPS or localhost. C# receivers require HTTPS and a compatible receiver sample; the C# sample projects are maintained separately.
