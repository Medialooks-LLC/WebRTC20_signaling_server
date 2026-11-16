# Web Guest / Web Preview (webguest2) — source

React (Create React App 4, React 16.14, TypeScript) app served by the `webguest2`
container. Routes:

| Path | Mode |
|---|---|
| `/streamer` | Standalone browser camera/microphone publisher with share links |
| `/wg2/<id>` (`/duplex`, `/webguest2`) | Web Guest 2 — duplex guest |
| `/wg/<id>` (`/webguest`) | Streamer |
| `/pb/<id>` (`/publisher`) | Publisher |
| `/<id>` | Web Preview — viewer |

## Browser Streamer

Open `/streamer` and click **Enable devices** to grant device access and reveal
camera/microphone names before choosing the inputs. This briefly opens each enabled
input to populate the device list, then stops the temporary captures without
connecting to signaling. **Refresh devices** repeats the setup; it can be cancelled.
Then click **Start streaming** to open the selected inputs and publish.
Device access starts only after an explicit button click. The page registers a new source through
the configured signaling auth service and displays links after joining its own room:

- **Browser viewer:** `/<stream-id>?lobby=0&autojoin=true`. This viewer acquires no
  camera or microphone. Use its audio control if the browser blocks autoplay with sound.
- **C# WebRTC 2.0 sample:** `https://<server>/<stream-id>/<stream-id>?receive=1`.
  Paste this into the channel URL of the updated MFormats or MPlatform Duplex 2.0
  sample and use its connect/start button. `receive=1` skips local encoding and host
  creation. The browser source's room, socket ID and public name share the same ID.

Camera/microphone publishing requires HTTPS or localhost. Stop, page exit, capture
termination and signaling failure release the capture tracks and peer connections.
Starting again generates a fresh ID, so copy the new links. Keep the publishing tab
open; multiple receivers connect directly to it. Anyone with a link can receive the
stream while it is live.

The page uses `REACT_APP_SIGNALING_SERVER_URL` (or the same origin); a `signaling`
query parameter overrides it and is preserved in the browser viewer link. The SDK
endpoint uses HTTPS and the same origin by default; override it with
`REACT_APP_SDK_SIGNALING_URL` or `sdkSignaling=https://<server>` when the SDK and web
endpoints differ. Local HTTP UI port 8080 uses the local SDK TLS proxy on 8443.
Publisher registration sends an empty auth object to the existing auth service;
that service must authorize browser publishers. Server authorization is unchanged.

## Pre-join lobby and in-call UI — `src/lobby/`

- `lobby.js` — device setup before connecting (camera/mic/speaker, name, quality).
  `src/index.tsx` renders the app only after `runLobby()` resolves, so no signaling
  or WebRTC connection is made before the user joins. `?lobby=0` skips it.
  Hand-off to the app: localStorage settings, URL flags (`autostart`, `camOff`,
  `micOff`, `audio`), chosen devices injected into the app's first `getUserMedia`.
- `incall.js` — status pill (connection state, timer, quality from `getStats`) and
  the remote-video placeholder state (`body[data-ic-video]`).
- `/player` opens a separate page to enter the Player ID; `/player/<id>` opens its video and remote controls.
  The C# samples generate the `/player/<id>` link. The ordinary viewer `/<id>` has no player controls.
- `remote.js`, `remote.css` - playout controls on the dedicated page `/player/<id>`: play / pause / stop / backward / forward,
  previous / next, a seek bar, the playlist and the media library of the player, and the output to a video device
  (renderer). Shown only when the Host of the stream is a remote-controlled player (SDK sample "Sample Remote Control
  Player 2.0", MFormats, or "Remote Control Player Sample 2.0", MPlatform); every other stream is unchanged.
  The bar fades out while the video plays, asks for the password of a protected player, and shows "Player offline"
  when the state stops arriving. The page sends `forward` events `{ to: <host id>, playback: { cmd, value, to, name, key } }`
  over the app's socket (`window.socket`) and receives JSON strings as `message` events (`payload`):
  `playback_state`, `playlist`, `library`, `renderers`, `auth`, `error` (see the header of `remote.js` for the fields).
  Commands: `hello play pause stop forward backward seek next prev renderers renderer_start renderer_stop library
  playlist pl_add pl_remove pl_move pl_clear pl_play repeat`. The page can only add files of the library folder of the
  player (by a relative path), never a path of the player's computer.
  The Host needs `sgn.extra_events=playback` (set on the MConnect object before `Channel_Create`), otherwise the SDK does
  not pass the `playback` event to the application.
- `lobby.css`, `theme.css` — lobby and in-call styling (imported after the app styles).

## Responsive layout

Setup pages use normal document scrolling, while live video keeps a viewport layout.
Phone layouts stack the setup/share panels; short landscape layouts put preview and
setup side by side. Touch controls use at least 44px targets and editable phone/tablet
fields use 16px text. Page zoom remains available.

Safe-area insets protect video control bars from notches and system indicators.
The visual viewport sizes the video and login/settings panels when browser bars or
a software keyboard reduce the available area. Password entry stays above the keyboard.
Long playlists, media libraries and output-device menus scroll within their panels.
Mobile controls follow touch input and orientation changes, including iPadOS using
a desktop user agent. Video remains inline rather than forcing fullscreen.

Validation covers phone widths 320–430px, landscape, tablets and desktop layouts.
Browser-engine emulation supplements this; real-device Android/iOS testing is a
separate release check.

## Build

The root [Dockerfile](../../Dockerfile) builds this app with a pinned supported
Node 24 image. CRA 4 / webpack 4 uses the OpenSSL legacy provider during the build.
To build only the frontend locally, use Node 24 and the optional `.env.example`
settings (or set `NODE_OPTIONS=--openssl-legacy-provider` in your shell):

```bash
npm ci --legacy-peer-deps
npm run typecheck
npm run build
```

Output: `build/`. `.env` is local-only. The container injects `SDK_SIGNALING_URL`
through `/runtime-config.js`, so its public SDK endpoint can change without a rebuild.

## Provenance

The original repository was not available. This source was reconstructed from the
source maps of the production build 1.9.4.192 (revision adec9b40). Files the bundler
dropped were recreated and are marked `Reconstructed`:

- barrel `index.ts` files (pure re-exports) — generated from their importers
- type-only modules: `store/type.ts`, `webrtc/types.ts`,
  `middleware/lib/handlers/lib/types.ts`, `dto/AppDTO.ts`, `dto/MessageDTO.ts`,
  `dto/RemoteSettingsDTO.ts`
- `theme/scss/bootstrap.scss` (entry), `components/form/assets/input.scss`,
  `components/auth/assets/*.scss` (same content as the banner ones)

Dependency versions were matched to the bundle (React 16.14.0, Bootstrap 4.5.3,
lodash 4.17.20, react-notifications-component 2.4.1, react-dnd 14, yup 0.29, …).
The compiled CSS of this build contains every class of the original build.
If the original repository turns up, port `src/lobby/` and the `src/index.tsx`
change into it instead.
