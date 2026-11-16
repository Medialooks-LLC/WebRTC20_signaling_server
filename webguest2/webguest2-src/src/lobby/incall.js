/* eslint-disable no-restricted-globals */
/*
 * In-call status pill: connection state, call timer and connection quality.
 *
 * Observes the app's RTCPeerConnections (wrapped transparently - the app's calls are passed
 * through unchanged) and polls getStats() for round-trip time, packet loss, resolution,
 * frame rate and bitrate. Rendered outside the React root, so it never touches the app's DOM.
 * Imported first in src/index.tsx, so the wrapper is in place before the app creates connections.
 */
import { getPageRoute } from "../helpers/pageRoute";

(function () {
  "use strict";

  var page = getPageRoute();
  if (page.isStreamer || (page.isPlayer && !page.targetId)) return;

  // Fixed panels must fit the visible area when browser chrome or a keyboard resizes it.
  function syncViewport() {
    var viewport = window.visualViewport;
    var style = document.documentElement.style;
    style.setProperty("--ic-viewport-height", (viewport ? viewport.height : window.innerHeight) + "px");
    style.setProperty("--ic-viewport-width", (viewport ? viewport.width : window.innerWidth) + "px");
    style.setProperty("--ic-viewport-top", (viewport ? viewport.offsetTop : 0) + "px");
    positionQualityPopover();
  }
  syncViewport();
  window.addEventListener("resize", syncViewport);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncViewport);
    window.visualViewport.addEventListener("scroll", syncViewport);
  }

  var Orig = window.RTCPeerConnection;
  if (!Orig) return;

  var pcs = [];
  var everConnected = false;
  var connectedAt = 0;

  function Wrapped(config, constraints) {
    var pc = constraints === undefined ? new Orig(config) : new Orig(config, constraints);
    track(pc);
    return pc;
  }
  Wrapped.prototype = Orig.prototype;
  Object.setPrototypeOf(Wrapped, Orig); // keeps static members like generateCertificate
  window.RTCPeerConnection = Wrapped;
  if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = Wrapped;

  function track(pc) {
    pcs.push(pc);
    var onChange = function () {
      if (pc.connectionState === "closed") pcs = pcs.filter(function (p) { return p !== pc; });
      update();
    };
    pc.addEventListener("connectionstatechange", onChange);
    pc.addEventListener("iceconnectionstatechange", onChange);
    update();
  }

  function stateOf(pc) {
    // connectionState isn't available everywhere; fall back to the ICE state.
    var s = pc.connectionState || pc.iceConnectionState;
    if (s === "completed") s = "connected";
    if (s === "checking") s = "connecting";
    return s;
  }

  // ---------------------------------------------------------------- view

  var isSender = page.isSender;
  var roomId = page.targetId;
  // The lobby adds autostart=1, so the app connects without its own Start button.
  // Read on demand: the lobby rewrites the URL just before the app starts.
  function isAutostart() {
    return /[?&]autostart=(1|true|t)(&|$)/.test(location.search);
  }

  var el, dotEl, labelEl, timeEl, qualityEl, popEl;

  function build() {
    el = document.createElement("div");
    el.id = "ic-status";
    el.hidden = true;
    el.setAttribute("role", "status");
    el.innerHTML =
      '<span class="ic-dot idle"></span><span class="ic-label">Connecting…</span>' +
      '<span class="ic-time" hidden></span>' +
      (roomId ? '<span class="ic-sep ic-room-sep"></span><span class="ic-room"></span>' : "") +
      '<span class="ic-quality" role="button" tabindex="0" hidden aria-label="Connection quality" aria-expanded="false" aria-controls="ic-quality-details">' +
      '<span class="ic-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<span class="ic-qlabel"></span><div class="ic-pop" id="ic-quality-details"></div></span>';
    document.body.appendChild(el);
    dotEl = el.querySelector(".ic-dot");
    labelEl = el.querySelector(".ic-label");
    timeEl = el.querySelector(".ic-time");
    qualityEl = el.querySelector(".ic-quality");
    popEl = el.querySelector(".ic-pop");
    function toggleQuality() {
      var open = !qualityEl.classList.contains("ic-open");
      qualityEl.classList.toggle("ic-open", open);
      qualityEl.setAttribute("aria-expanded", String(open));
      positionQualityPopover();
    }
    qualityEl.addEventListener("click", function (event) {
      if (!popEl.contains(event.target)) toggleQuality();
    });
    qualityEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleQuality();
      } else if (event.key === "Escape") {
        closeQuality();
      }
    });
    qualityEl.addEventListener("pointerenter", positionQualityPopover);
    qualityEl.addEventListener("focus", positionQualityPopover);
    document.addEventListener("pointerdown", function (event) {
      if (!qualityEl.contains(event.target)) closeQuality();
    });
    if (roomId) {
      var r = el.querySelector(".ic-room");
      r.textContent = roomId;
      r.title = (isSender ? "Session " : "Stream ") + roomId;
    }
  }

  function closeQuality() {
    if (!qualityEl) return;
    qualityEl.classList.remove("ic-open");
    qualityEl.setAttribute("aria-expanded", "false");
  }

  function positionQualityPopover() {
    if (!qualityEl || !popEl || qualityEl.hidden) return;
    var viewport = window.visualViewport;
    var left = viewport ? viewport.offsetLeft : 0;
    var top = viewport ? viewport.offsetTop : 0;
    var width = viewport ? viewport.width : window.innerWidth;
    var height = viewport ? viewport.height : window.innerHeight;
    var anchor = qualityEl.getBoundingClientRect();
    popEl.style.maxWidth = Math.max(0, width - 24) + "px";
    popEl.style.setProperty("--ic-pop-room", Math.max(0, top + height - anchor.bottom - 20) + "px");
    var popupWidth = popEl.getBoundingClientRect().width;
    if (!popupWidth) return;
    var popupLeft = Math.max(left + 12, Math.min(anchor.left + anchor.width / 2 - popupWidth / 2, left + width - popupWidth - 12));
    popEl.style.left = (popupLeft - anchor.left) + "px";
    popEl.style.right = "auto";
  }

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    s = s % 60;
    var mm = (m < 10 ? "0" : "") + m;
    var ss = (s < 10 ? "0" : "") + s;
    return h ? h + ":" + mm + ":" + ss : mm + ":" + ss;
  }

  function update() {
    if (!el) return;
    // Stay hidden while the pre-join lobby is on screen.
    el.hidden = document.documentElement.classList.contains("lobby-active");

    var states = pcs.map(stateOf);
    var has = function (s) { return states.indexOf(s) >= 0; };
    var dot = "idle";
    var label;

    if (has("connected")) {
      if (!connectedAt) connectedAt = Date.now();
      everConnected = true;
      dot = "ok";
      label = isSender ? "Connected" : "Live";
    } else if (has("disconnected")) {
      dot = "warn";
      label = "Reconnecting…";
    } else if (has("failed")) {
      dot = "bad";
      label = "Connection lost";
    } else if (has("new") || has("connecting")) {
      label = "Connecting…";
    } else if (everConnected) {
      dot = "bad";
      label = "Disconnected";
      connectedAt = 0;
    } else if (!isSender || isAutostart()) {
      label = "Connecting…";
    } else {
      label = "Not connected";
    }

    dotEl.className = "ic-dot " + dot;
    labelEl.textContent = label;
    timeEl.hidden = !connectedAt || dot !== "ok";
    if (!timeEl.hidden) timeEl.textContent = fmtTime(Date.now() - connectedAt);
    if (dot !== "ok") {
      qualityEl.hidden = true;
      closeQuality();
      el.removeAttribute("data-q");
    }
  }

  // ---------------------------------------------------------------- stats

  var prev = {};

  function pollStats() {
    var pc = pcs.filter(function (p) { return stateOf(p) === "connected"; })[0];
    if (!pc || !pc.getStats) return;

    pc.getStats().then(function (report) {
      var now = performance.now();
      var rtt = null;
      var inV = null, outV = null, inA = null;
      var pairs = {};
      var selectedPair = null;

      report.forEach(function (s) {
        if (s.type === "candidate-pair") pairs[s.id] = s;
        if (s.type === "transport" && s.selectedCandidatePairId) selectedPair = s.selectedCandidatePairId;
        var kind = s.kind || s.mediaType;
        if (s.type === "inbound-rtp" && kind === "video") inV = s;
        if (s.type === "inbound-rtp" && kind === "audio") inA = s;
        if (s.type === "outbound-rtp" && kind === "video" && !outV) outV = s;
      });

      var pair = selectedPair ? pairs[selectedPair] : null;
      if (!pair) {
        for (var id in pairs) {
          if (pairs[id].nominated && pairs[id].state === "succeeded") { pair = pairs[id]; break; }
        }
      }
      if (pair && typeof pair.currentRoundTripTime === "number") rtt = Math.round(pair.currentRoundTripTime * 1000);

      var inbound = inV || inA;
      var loss = null;
      if (inbound && typeof inbound.packetsReceived === "number") {
        var p = prev.in;
        if (p) {
          var lost = (inbound.packetsLost || 0) - p.lost;
          var recv = inbound.packetsReceived - p.recv;
          if (lost + recv > 0) loss = Math.max(0, (100 * lost) / (lost + recv));
        }
        prev.in = { lost: inbound.packetsLost || 0, recv: inbound.packetsReceived };
      }

      var kbps = function (s, key) {
        if (!s || typeof s.bytesReceived !== "number" && typeof s.bytesSent !== "number") return null;
        var bytes = s.bytesReceived !== undefined ? s.bytesReceived : s.bytesSent;
        var p = prev[key];
        prev[key] = { bytes: bytes, t: now };
        if (!p || now <= p.t) return null;
        return Math.round(((bytes - p.bytes) * 8) / (now - p.t));
      };
      var inKbps = kbps(inV, "inV");
      var outKbps = kbps(outV, "outV");

      // Why the browser lowers our outgoing resolution/frame rate: "cpu", "bandwidth", "other" or "none".
      var limitedBy = outV && outV.qualityLimitationReason && outV.qualityLimitationReason !== "none"
        ? outV.qualityLimitationReason
        : null;

      var q = "good";
      if ((rtt !== null && rtt > 300) || (loss !== null && loss > 5)) q = "poor";
      else if ((rtt !== null && rtt > 150) || (loss !== null && loss > 2) || limitedBy) q = "fair";

      el.setAttribute("data-q", q);
      qualityEl.hidden = false;
      // Show why right in the pill, e.g. "Fair · CPU"
      var reason = limitedBy === "cpu" ? " · CPU" : limitedBy === "bandwidth" ? " · Network" : "";
      el.querySelector(".ic-qlabel").textContent = (q === "good" ? "Good" : q === "fair" ? "Fair" : "Poor") + reason;

      var rows = [];
      var row = function (k, v) { rows.push("<div><span>" + k + "</span><b>" + v + "</b></div>"); };
      var video = function (s, rate) {
        if (!s || !s.frameWidth) return rate !== null ? rate + " kbps" : "—";
        return s.frameWidth + "×" + s.frameHeight +
          (s.framesPerSecond ? " · " + Math.round(s.framesPerSecond) + " fps" : "") +
          (rate !== null ? " · " + (rate >= 1000 ? (rate / 1000).toFixed(1) + " Mbps" : rate + " kbps") : "");
      };
      if (rtt !== null) row("Round-trip", rtt + " ms");
      if (loss !== null) row("Packet loss", loss.toFixed(1) + " %");
      if (inV) row("Receiving", video(inV, inKbps));
      if (outV) row("Sending", video(outV, outKbps));
      if (outV) {
        row(
          "Limited by",
          limitedBy === "cpu" ? "CPU" : limitedBy === "bandwidth" ? "Bandwidth" : limitedBy ? limitedBy : "Nothing",
        );
        if (outV.encoderImplementation) row("Encoder", String(outV.encoderImplementation));
      }
      // What the camera actually delivers vs. the best it supports - tells a weak camera
      // (or dim-light frame-rate drop) apart from encoder/network limits.
      var camTrack = null;
      pc.getSenders().forEach(function (sd) {
        if (sd.track && sd.track.kind === "video") camTrack = sd.track;
      });
      if (camTrack && camTrack.getSettings) {
        var cs = camTrack.getSettings();
        if (cs.width) row("Camera", cs.width + "×" + cs.height + (cs.frameRate ? " · " + Math.round(cs.frameRate) + " fps" : ""));
        var cc = camTrack.getCapabilities ? camTrack.getCapabilities() : null;
        if (cc && cc.width && cc.width.max) {
          row("Camera max", cc.width.max + "×" + cc.height.max + (cc.frameRate && cc.frameRate.max ? " · " + Math.round(cc.frameRate.max) + " fps" : ""));
        }
      }
      popEl.innerHTML = rows.join("") || "<div><span>Collecting statistics…</span></div>";
      positionQualityPopover();
    }).catch(function () { /* stats are best-effort */ });
  }

  // ---------------------------------------------------------------- remote video placeholder

  // The app shows a "click to play" overlay until the remote video plays. After the lobby that is
  // usually just "no video yet", so we expose the real reason on <body data-ic-video> and let
  // theme.css render a matching placeholder. The user already clicked Join, so autoplay is allowed
  // in most browsers - try it ourselves and only ask for a click if the browser refuses.
  var playAttempt = null;

  function updateVideoState() {
    var overlay = document.querySelector('[data-cy="play-icon"]');
    var video = document.querySelector('video[data-cy="remote-video"]');
    var stateName = "";

    if (overlay && video) {
      var src = video.srcObject;
      var hasVideo = !!(src && src.getVideoTracks && src.getVideoTracks().some(function (t) { return t.readyState === "live"; }));
      var connected = pcs.some(function (p) { return stateOf(p) === "connected"; });

      if (hasVideo && video.paused) {
        if (!playAttempt) {
          playAttempt = video.play();
          if (playAttempt && playAttempt.then) {
            playAttempt.then(function () { playAttempt = null; }, function (err) {
              playAttempt = err && err.name === "NotAllowedError" ? "blocked" : null;
            });
          } else {
            playAttempt = null;
          }
        }
        stateName = playAttempt === "blocked" ? "blocked" : "waiting";
      } else if (hasVideo) {
        stateName = "waiting"; // playing, the app removes its overlay within a second
      } else if (connected) {
        stateName = "waiting";
      } else if (pcs.length || !isSender || isAutostart()) {
        stateName = "connecting";
      } else {
        stateName = "idle"; // guest opened without the lobby: waits for the Start button
      }
    } else {
      playAttempt = null;
    }

    if (stateName) document.body.setAttribute("data-ic-video", stateName);
    else document.body.removeAttribute("data-ic-video");
    document.body.setAttribute("data-ic-role", isSender ? "guest" : "viewer");
  }

  function start() {
    build();
    update();
    updateVideoState();
    setInterval(update, 1000);
    setInterval(updateVideoState, 500);
    setInterval(pollStats, 2000);
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
