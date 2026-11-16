// Observes RTCPeerConnections for the in-call status pill - must run before the app creates any.
import "./lobby/incall";

import "./theme/scss/bootstrap.scss";

import React from "react";
import ReactDOM from "react-dom";

import * as serviceWorker from "./serviceWorker";
import { App } from "./app/App";

// Imported after the app so they override the component styles.
import "./lobby/theme.css";
import "./lobby/lobby.css";
import "./lobby/remote.css";
import "./app/standalone.css";
import "./lobby/remote";
import { runLobby } from "./lobby/lobby";
import { getPageRoute } from "./helpers/pageRoute";

// The pre-join lobby runs first; the app (signaling + WebRTC) starts only after the user joins.
const page = getPageRoute();
if (page.isPlayer) document.title = "Remote player" + (page.targetId ? " · " + page.targetId : "");
if (page.isStreamer) document.title = "WebRTC Streamer · Medialooks";
const standalone = page.isStreamer || (page.isPlayer && !page.targetId);
if (standalone) {
  document.documentElement.classList.remove("lobby-active");
  document.documentElement.classList.add("standalone-page");
}
const ready = standalone ? Promise.resolve() : runLobby();
ready.then(() => {
  ReactDOM.render(<App />, document.getElementById("root"));
});

serviceWorker.unregister();
