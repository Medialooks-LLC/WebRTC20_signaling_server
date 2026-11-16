/* eslint-disable no-restricted-globals */
/*
 * Pre-join lobby for Web Guest (/wg2/<id>, /wg/<id>, /pb/<id>) and Web Preview (/<id>).
 *
 * The user sets up camera / microphone / speaker (or, for the viewer, the speaker only) with a
 * live preview first. Only after "Join" the original React app is started, so no signaling or
 * WebRTC connection is made before the user is ready.
 *
 * Hand-off to the app (no changes to the compiled bundle are needed):
 *  - name / resolution / echo cancellation / mirroring -> the app's localStorage keys
 *  - camera / mic on-off, autostart, remote audio      -> the app's query parameters
 *  - selected camera / microphone -> injected into the app's first getUserMedia() call
 *    (the app takes the devices of that first stream as its defaults)
 *  - selected speaker -> setSinkId() on every media element the app creates
 *
 * Add ?lobby=0 to the link to skip the lobby (e.g. for automated / embedded use).
 *
 * Usage (src/index.tsx): runLobby().then(() => ReactDOM.render(<App />, root));
 */
import { getPageRoute } from "../helpers/pageRoute";

export function runLobby() {
  return new Promise(function (resolveJoin) {
    var CONFIG = {
      brand: "Medialooks",
      brandSub: "Meet",
    };

    // ---------------------------------------------------------------- mode & params

    var page = getPageRoute();
    var first = (location.pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
    var MODE = /^(wg|webguest)$/.test(first)
      ? "streamer"
      : /^(wg2|duplex|webguest2)$/.test(first)
      ? "duplex"
      : /^(pb|publisher)$/.test(first)
      ? "publisher"
      : "preview";
    var IS_SENDER = MODE !== "preview";
    var TARGET_ID = page.targetId;
    var query = new URLSearchParams(location.search);

    function parseBool(v) {
      return v === "1" || v === "true" || v === "t";
    }

    // ---------------------------------------------------------------- storage (never throws)

    function lsGet(k) {
      try {
        var v = localStorage.getItem(k);
        return v === null || v === "undefined" || v === "null" ? null : v;
      } catch (e) {
        return null;
      }
    }

    function lsSet(k, v) {
      try {
        if (v === null || v === undefined) localStorage.removeItem(k);
        else localStorage.setItem(k, String(v));
      } catch (e) {
        /* storage blocked - settings just won't be remembered */
      }
    }

    // ---------------------------------------------------------------- app boot

    var booted = false;

    function bootApp() {
      if (booted) return;
      booted = true;
      document.documentElement.classList.remove("lobby-active");
      resolveJoin();
    }

    if (query.get("lobby") === "0" || query.get("lobby") === "false") {
      bootApp();
      return;
    }

    // ---------------------------------------------------------------- icons

    function icon(name, size) {
      var p = {
        mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/>',
        micOff:
          '<path d="M15 9.4V6a3 3 0 0 0-5.7-1.3"/><path d="M9 9v3a3 3 0 0 0 5.1 2.1"/><path d="M19 11a7 7 0 0 1-.8 3.2"/><path d="M16.9 16.9A7 7 0 0 1 5 11"/><path d="M12 18v3"/><path d="m3 3 18 18"/>',
        cam: '<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="m15.5 10.5 6-3.5v10l-6-3.5z"/>',
        camOff:
          '<path d="M10.5 6H13a2.5 2.5 0 0 1 2.5 2.5v2l6-3.5v10l-2.2-1.3"/><path d="M15.5 15.5A2.5 2.5 0 0 1 13 18H5a2.5 2.5 0 0 1-2.5-2.5v-7A2.5 2.5 0 0 1 5 6"/><path d="m3 3 18 18"/>',
        speaker: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
        sliders:
          '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5h.01"/>',
        play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
        chevron: '<path d="m6 9 6 6 6-6"/>',
        wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
        refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
        logo: '<path d="M8 6.5v11l9-5.5z" fill="#fff" stroke="none"/>',
        flip: '<path d="M4 9a8 8 0 0 1 14.3-3.3L20 7.5"/><path d="M20 3.5v4h-4"/><path d="M20 15a8 8 0 0 1-14.3 3.3L4 16.5"/><path d="M4 20.5v-4h4"/>',
      }[name];
      size = size || 20;
      return (
        '<svg width="' + size + '" height="' + size +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        p + "</svg>"
      );
    }

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    // ---------------------------------------------------------------- state

    var md = navigator.mediaDevices;
    var HAS_MEDIA = !!(md && md.getUserMedia && md.enumerateDevices);
    var HAS_SINK = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

    var RESOLUTIONS = [
      { id: "default", label: "Auto (recommended)" },
      { id: "1920x1080", label: "Full HD 1080p" },
      { id: "1280x720", label: "HD 720p" },
      { id: "640x360", label: "SD 360p" },
    ];

    var storedRes = lsGet("resolution");
    var state = {
      permission: "pending", // pending | granted | denied | nodevice | busy | insecure | error
      camOn: query.has("camOff") ? !parseBool(query.get("camOff")) : lsGet("lobby.camOn") !== "0",
      micOn: query.has("micOff") ? !parseBool(query.get("micOff")) : lsGet("lobby.micOn") !== "0",
      cams: [],
      mics: [],
      spks: [],
      camId: lsGet("lobby.camId") || lsGet("videoInput") || "",
      micId: lsGet("lobby.micId") || lsGet("audioInput") || "",
      spkId: lsGet("lobby.spkId") || "default",
      vTrack: null,
      aTrack: null,
      name: query.get("name") || lsGet("name") || "",
      resolution: RESOLUTIONS.some(function (r) { return r.id === storedRes; }) ? storedRes : "default",
      enhancements: lsGet("audioEnhancements") !== "false",
      mirror: lsGet("mirroring") !== "false",
      sound: query.has("audio") ? parseBool(query.get("audio")) : lsGet("lobby.sound") !== "0",
      server: { status: "pending", ms: 0 },
      joining: false,
      resHint: "",
      tips: { camera: "", light: "" },
    };

    // ---------------------------------------------------------------- DOM

    var root;
    var $ = function (id) {
      return document.getElementById(id);
    };

    function titleText() {
      if (page.isPlayer) return "Ready to control the player?";
      if (MODE === "preview") return "Ready to watch?";
      if (MODE === "streamer") return "Ready to go live?";
      return "Ready to join?";
    }

    function subtitleText() {
      if (page.isPlayer) return "Choose your audio output, then open the player and its controls.";
      if (MODE === "preview")
        return "Choose where you want to hear the stream, then start watching.";
      return "Check your camera and microphone before you join. Nobody can see or hear you yet.";
    }

    function joinText() {
      if (page.isPlayer) return "Open player";
      if (MODE === "preview") return "Watch stream";
      if (MODE === "streamer") return "Start streaming";
      return "Join now";
    }

    function render() {
      root = document.createElement("div");
      root.id = "lobby-root";
      root.setAttribute("role", "main");

      var roomChip = TARGET_ID
        ? '<span class="lb-chip lb-hide-sm" title="' + esc(TARGET_ID) + '">' +
          (page.isPlayer ? "Player" : MODE === "preview" ? "Stream" : "Session") + " <b>" + esc(TARGET_ID) + "</b></span>"
        : "";

      var stage = IS_SENDER
        ? '<div class="lb-stage" id="lb-stage">' +
          '<video id="lb-video" autoplay playsinline muted></video>' +
          '<div class="lb-stage-overlay" id="lb-overlay"></div>' +
          '<div class="lb-stage-top"><span class="lb-tag" id="lb-name-tag"></span><span></span></div>' +
          '<div class="lb-meter" id="lb-meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
          '<div class="lb-stage-bottom">' +
          '<button class="lb-round" id="lb-mic-btn" type="button"></button>' +
          '<button class="lb-round" id="lb-cam-btn" type="button"></button>' +
          '<button class="lb-round lb-flip" id="lb-flip-btn" type="button" title="Switch camera" aria-label="Switch camera" hidden>' +
          icon("flip", 22) + "</button>" +
          "</div></div>"
        : '<div class="lb-stage lb-poster">' +
          '<div class="lb-stage-overlay"><div class="lb-stage-msg">' +
          '<div class="lb-poster-play">' + icon("play", 34) + "</div>" +
          (page.isPlayer
            ? "<h3>Remote player</h3><p>Preview and controls open when you press <b>Open player</b>.</p>"
            : "<h3>Live stream</h3><p>Playback starts as soon as you press <b>Watch stream</b>.</p>") +
          "</div></div>" +
          '<div class="lb-stage-top"><span class="lb-tag">' + icon("play", 12) + (page.isPlayer ? "Player</span>" : "Stream</span>") +
          (TARGET_ID ? '<span class="lb-tag">' + esc(TARGET_ID) + "</span>" : "<span></span>") +
          "</div></div>";

      var deviceCard = IS_SENDER
        ? '<div class="lb-card">' +
          field("lb-name", "user", "Your name",
            '<input class="lb-input" id="lb-name" maxlength="64" autocomplete="name" placeholder="Enter your name">') +
          field("lb-cam", "cam", "Camera", '<select class="lb-select" id="lb-cam"></select>') +
          field("lb-mic", "mic", "Microphone", '<select class="lb-select" id="lb-mic"></select>') +
          speakerField() +
          '<details class="lb-details" id="lb-adv"><summary>Advanced settings ' + icon("chevron", 16) + "</summary>" +
          '<div class="lb-details-body">' +
          field("lb-res", "sliders", "Video quality", '<select class="lb-select" id="lb-res"></select>') +
          '<div class="lb-hint warn" id="lb-res-hint" hidden></div>' +
          toggle("lb-enh", "Noise suppression & echo cancellation", "Recommended without headphones") +
          toggle("lb-mirror", "Mirror my video", "Only affects your own view") +
          "</div></details></div>"
        : '<div class="lb-card">' +
          speakerField() +
          toggle("lb-sound", "Start with sound on", "You can change the volume at any time") +
          "</div>";

      root.innerHTML =
        '<header class="lb-topbar">' +
        '<div class="lb-brand"><span class="lb-brand-mark">' + icon("logo", 18) + "</span>" +
        "<span>" + esc(CONFIG.brand) + ' <span class="lb-brand-sub">' + esc(CONFIG.brandSub) + "</span></span></div>" +
        '<div class="lb-spacer"></div>' + roomChip +
        '<span class="lb-chip" id="lb-server-chip"><span class="lb-dot pending"></span><span>Checking server…</span></span>' +
        "</header>" +
        '<div class="lb-main"><div class="lb-grid">' +
        "<div>" + stage + "</div>" +
        '<div class="lb-panel">' +
        '<div class="lb-heading"><h1>' + titleText() + "</h1><p>" + subtitleText() + "</p></div>" +
        '<div id="lb-alert-slot"></div>' +
        deviceCard +
        '<div class="lb-actions">' +
        '<button class="lb-btn lb-btn-primary" id="lb-join" type="button">' + joinText() + "</button>" +
        '<div class="lb-checks" id="lb-checks" aria-live="polite"></div>' +
        "</div>" +
        "</div></div></div>" +
        '<footer class="lb-footer">' +
        (IS_SENDER
          ? "Nothing is sent until you join. Settings are remembered on this device."
          : page.isPlayer
          ? "Nothing is connected until you press Open player. Settings are remembered on this device."
          : "Nothing is connected until you press Watch stream. Settings are remembered on this device.") +
        "</footer>";

      document.body.appendChild(root);
      bindUi();
    }

    function field(id, ic, label, control) {
      return (
        '<div class="lb-field"><label class="lb-label" for="' + id + '">' + icon(ic, 14) + esc(label) +
        "</label>" + control + "</div>"
      );
    }

    function speakerField() {
      if (!HAS_SINK) {
        return (
          '<div class="lb-field"><span class="lb-label">' + icon("speaker", 14) + "Speaker</span>" +
          '<div class="lb-row"><span class="lb-hint" style="flex:1">This browser plays sound on the system default device.</span>' +
          '<button class="lb-btn lb-btn-small" id="lb-test" type="button">' + icon("speaker", 16) + "Test</button></div></div>"
        );
      }
      return field(
        "lb-spk",
        "speaker",
        "Speaker",
        '<div class="lb-row"><select class="lb-select" id="lb-spk"></select>' +
          '<button class="lb-btn lb-btn-small" id="lb-test" type="button" title="Play a test sound">' +
          icon("speaker", 16) + "Test</button></div>"
      );
    }

    function toggle(id, text, sub) {
      return (
        '<label class="lb-toggle" for="' + id + '"><span class="lb-toggle-text"><span>' + esc(text) +
        "</span><small>" + esc(sub) + '</small></span><span class="lb-switch"><input type="checkbox" id="' + id +
        '"><i></i></span></label>'
      );
    }

    function bindUi() {
      $("lb-join").addEventListener("click", join);
      $("lb-test").addEventListener("click", playTestSound);

      if (HAS_SINK) {
        $("lb-spk").addEventListener("change", function (e) {
          state.spkId = e.target.value;
          lsSet("lobby.spkId", state.spkId);
        });
      }

      if (!IS_SENDER) {
        $("lb-sound").checked = state.sound;
        $("lb-sound").addEventListener("change", function (e) {
          state.sound = e.target.checked;
        });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !isFormControl(e.target)) join();
        });
        return;
      }

      var nameInput = $("lb-name");
      nameInput.value = state.name;
      nameInput.addEventListener("input", function () {
        state.name = nameInput.value;
        updateNameTag();
      });
      nameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") join();
      });

      $("lb-mic-btn").addEventListener("click", toggleMic);
      $("lb-flip-btn").addEventListener("click", flipCamera);
      $("lb-cam-btn").addEventListener("click", toggleCam);

      $("lb-cam").addEventListener("change", function (e) {
        state.camId = e.target.value;
        lsSet("lobby.camId", state.camId);
        if (state.camOn) openVideo();
      });
      $("lb-mic").addEventListener("change", function (e) {
        state.micId = e.target.value;
        lsSet("lobby.micId", state.micId);
        openAudio();
      });

      var res = $("lb-res");
      res.innerHTML = RESOLUTIONS.map(function (r) {
        return '<option value="' + r.id + '">' + esc(r.label) + "</option>";
      }).join("");
      res.value = state.resolution;
      res.addEventListener("change", function () {
        state.resolution = res.value;
        state.resHint = "";
        if (state.camOn) openVideo();
      });

      $("lb-enh").checked = state.enhancements;
      $("lb-enh").addEventListener("change", function (e) {
        state.enhancements = e.target.checked;
        openAudio();
      });

      $("lb-mirror").checked = state.mirror;
      $("lb-mirror").addEventListener("change", function (e) {
        state.mirror = e.target.checked;
        updateStage();
      });

      document.addEventListener("keydown", function (e) {
        var mod = e.ctrlKey || e.metaKey;
        if (mod && !e.shiftKey && !e.altKey && (e.key === "d" || e.key === "D")) {
          e.preventDefault();
          toggleMic();
        } else if (mod && !e.shiftKey && !e.altKey && (e.key === "e" || e.key === "E")) {
          e.preventDefault();
          toggleCam();
        } else if (e.key === "Enter" && !isFormControl(e.target)) {
          join();
        }
      });
    }

    function isFormControl(el) {
      return el && /^(INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY)$/.test(el.tagName);
    }

    // ---------------------------------------------------------------- media

    function videoConstraints() {
      var c = {};
      if (state.camId) c.deviceId = { exact: state.camId };
      if (state.resolution !== "default") {
        var wh = state.resolution.split("x");
        c.width = { exact: +wh[0] };
        c.height = { exact: +wh[1] };
      } else {
        c.width = { ideal: 1280 };
        c.height = { ideal: 720 };
      }
      return c;
    }

    function audioConstraints() {
      var c = { echoCancellation: state.enhancements, noiseSuppression: state.enhancements, autoGainControl: state.enhancements };
      if (state.micId) c.deviceId = { exact: state.micId };
      return c;
    }

    function stopTrack(t) {
      if (t) {
        try { t.stop(); } catch (e) { /* already stopped */ }
      }
    }

    function errorKind(err) {
      var n = (err && err.name) || "";
      if (n === "NotAllowedError" || n === "SecurityError" || n === "PermissionDeniedError") return "denied";
      if (n === "NotFoundError" || n === "DevicesNotFoundError") return "nodevice";
      if (n === "NotReadableError" || n === "TrackStartError" || n === "AbortError") return "busy";
      if (n === "OverconstrainedError" || n === "ConstraintNotSatisfiedError") return "constraint";
      return "error";
    }

    // First start: one combined request, so the browser shows a single permission prompt.
    function initMedia() {
      if (!HAS_MEDIA) {
        state.permission = window.isSecureContext === false ? "insecure" : "error";
        updateAll();
        return;
      }

      state.permission = "pending";
      updateAll();

      md.enumerateDevices()
        .then(function (devices) {
          var hasCam = devices.some(function (d) { return d.kind === "videoinput"; });
          var hasMic = devices.some(function (d) { return d.kind === "audioinput"; });
          if (!hasCam && !hasMic) {
            state.permission = "nodevice";
            return refreshDevices();
          }
          var wantVideo = hasCam && state.camOn;
          var wantAudio = hasMic;
          if (!wantVideo && !wantAudio) wantVideo = hasCam;
          return getStream(wantVideo, wantAudio).then(function (stream) {
            state.permission = "granted";
            adoptStream(stream);
            return refreshDevices();
          });
        })
        .catch(function (err) {
          var kind = errorKind(err);
          state.permission = kind === "constraint" ? "error" : kind;
          refreshDevices();
        })
        .then(updateAll);
    }

    // getUserMedia with graceful fallbacks: stale device id / unsupported resolution -> retry relaxed.
    function getStream(wantVideo, wantAudio) {
      var c = { video: wantVideo ? videoConstraints() : false, audio: wantAudio ? audioConstraints() : false };
      return md.getUserMedia(c).catch(function (err) {
        if (errorKind(err) !== "constraint" && errorKind(err) !== "nodevice") throw err;
        if (wantVideo && state.resolution !== "default") {
          state.resHint = "This camera doesn't support " + state.resolution + " - switched to Auto.";
          state.resolution = "default";
        }
        state.camId = "";
        state.micId = "";
        c = { video: wantVideo ? videoConstraints() : false, audio: wantAudio ? audioConstraints() : false };
        return md.getUserMedia(c);
      });
    }

    function adoptStream(stream) {
      stream.getVideoTracks().forEach(function (t) {
        stopTrack(state.vTrack);
        state.vTrack = t;
        state.camId = t.getSettings().deviceId || state.camId;
        checkCameraCapabilities(t);
      });
      stream.getAudioTracks().forEach(function (t) {
        stopTrack(state.aTrack);
        state.aTrack = t;
        state.micId = t.getSettings().deviceId || state.micId;
        t.enabled = state.micOn;
        startMeter(t);
      });
      attachPreview();
    }

    function openVideo() {
      if (!HAS_MEDIA) return Promise.resolve();
      stopTrack(state.vTrack);
      state.vTrack = null;
      updateStage();
      return getStream(true, false)
        .then(function (stream) {
          state.permission = "granted";
          adoptStream(stream);
          return refreshDevices();
        })
        .catch(function (err) {
          var kind = errorKind(err);
          if (kind === "denied") state.permission = "denied";
          else if (kind === "busy") showAlert("Your camera is used by another application. Close it and select the camera again.");
          else showAlert("Couldn't start the camera (" + ((err && err.name) || "error") + ").");
        })
        .then(updateAll);
    }

    function openAudio() {
      if (!HAS_MEDIA) return Promise.resolve();
      stopTrack(state.aTrack);
      state.aTrack = null;
      stopMeter();
      return getStream(false, true)
        .then(function (stream) {
          state.permission = "granted";
          adoptStream(stream);
          return refreshDevices();
        })
        .catch(function (err) {
          var kind = errorKind(err);
          if (kind === "denied") state.permission = "denied";
          else showAlert("Couldn't start the microphone (" + ((err && err.name) || "error") + ").");
        })
        .then(updateAll);
    }

    function refreshDevices() {
      if (!HAS_MEDIA) return Promise.resolve();
      return md.enumerateDevices().then(function (devices) {
        function list(kind) {
          return devices.filter(function (d) { return d.kind === kind && d.deviceId; });
        }
        state.cams = list("videoinput");
        state.mics = list("audioinput");
        state.spks = list("audiooutput");

        // A device was unplugged -> fall back to the first available one.
        if (state.camId && state.cams.length && !state.cams.some(function (d) { return d.deviceId === state.camId; })) {
          state.camId = state.cams[0].deviceId;
          if (state.camOn && state.vTrack) openVideo();
        }
        if (state.micId && state.mics.length && !state.mics.some(function (d) { return d.deviceId === state.micId; })) {
          state.micId = state.mics[0].deviceId;
          if (state.aTrack) openAudio();
        }
        if (!state.spks.some(function (d) { return d.deviceId === state.spkId; })) state.spkId = "default";

        if (state.permission === "nodevice" && (state.cams.length || state.mics.length)) {
          // A device was plugged in while we showed "no devices".
          setTimeout(initMedia, 0);
        }
        updateAll();
      });
    }

    if (HAS_MEDIA && md.addEventListener) {
      md.addEventListener("devicechange", function () {
        refreshDevices();
      });
    }

    function attachPreview() {
      var v = $("lb-video");
      if (!v) return;
      var tracks = [];
      if (state.vTrack) tracks.push(state.vTrack);
      v.srcObject = tracks.length ? new MediaStream(tracks) : null;
      if (tracks.length) {
        var p = v.play();
        if (p && p.catch) p.catch(function () { /* muted video autoplays; ignore */ });
      }
    }

    function toggleMic() {
      if (!IS_SENDER) return;
      state.micOn = !state.micOn;
      lsSet("lobby.micOn", state.micOn ? "1" : "0");
      if (state.aTrack) state.aTrack.enabled = state.micOn;
      updateAll();
    }

    // Phones: next camera in the list (front <-> back)
    function flipCamera() {
      if (state.cams.length < 2) return;
      var i = state.cams.findIndex(function (d) { return d.deviceId === state.camId; });
      state.camId = state.cams[(i + 1) % state.cams.length].deviceId;
      lsSet("lobby.camId", state.camId);
      if (!state.camOn) {
        state.camOn = true;
        lsSet("lobby.camOn", "1");
      }
      openVideo();
    }

    function toggleCam() {
      if (!IS_SENDER) return;
      state.camOn = !state.camOn;
      lsSet("lobby.camOn", state.camOn ? "1" : "0");
      if (state.camOn) {
        if (state.permission === "granted" || state.permission === "pending") openVideo();
        else initMedia();
      } else {
        // Release the camera so its light goes off while the user doesn't want to be seen.
        stopTrack(state.vTrack);
        state.vTrack = null;
        attachPreview();
      }
      updateAll();
    }

    // ---------------------------------------------------------------- quality tips

    function checkCameraCapabilities(track) {
      var caps = track.getCapabilities ? track.getCapabilities() : null;
      var maxW = caps && caps.width && caps.width.max;
      var maxH = caps && caps.height && caps.height.max;
      state.tips.camera = maxW && maxW < 1280
        ? "This camera supports at most " + maxW + "×" + maxH + ". An HD camera will look much sharper."
        : "";
    }

    // Cameras lower frame rate and add noise in dim light - sample the preview brightness.
    var lightCanvas = document.createElement("canvas");
    lightCanvas.width = 32;
    lightCanvas.height = 18;
    var darkSamples = 0;
    setInterval(function () {
      var v = $("lb-video");
      if (!v || !state.vTrack || !state.camOn || v.readyState < 2) return;
      try {
        var ctx = lightCanvas.getContext("2d");
        ctx.drawImage(v, 0, 0, 32, 18);
        var px = ctx.getImageData(0, 0, 32, 18).data;
        var sum = 0;
        for (var i = 0; i < px.length; i += 4) sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        var luma = sum / (px.length / 4);
        darkSamples = luma < 55 ? darkSamples + 1 : 0;
        var tip = darkSamples >= 2
          ? "Your picture looks dark. Add light in front of you - cameras lower quality and frame rate in dim light."
          : "";
        if (tip !== state.tips.light) {
          state.tips.light = tip;
          updateAlert();
        }
      } catch (e) {
        /* preview not readable yet */
      }
    }, 1500);

    // ---------------------------------------------------------------- mic level meter

    var meter = { ctx: null, src: null, analyser: null, raf: 0, data: null };

    function startMeter(track) {
      stopMeter();
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !$("lb-meter")) return;
      try {
        meter.ctx = meter.ctx || new AC();
        meter.src = meter.ctx.createMediaStreamSource(new MediaStream([track]));
        meter.analyser = meter.ctx.createAnalyser();
        meter.analyser.fftSize = 512;
        meter.data = new Float32Array(meter.analyser.fftSize);
        meter.src.connect(meter.analyser);
        if (meter.ctx.state === "suspended") meter.ctx.resume().catch(function () {});
      } catch (e) {
        return;
      }
      var bars = $("lb-meter").children;
      var smooth = 0;
      var tick = function () {
        meter.analyser.getFloatTimeDomainData(meter.data);
        var sum = 0;
        for (var i = 0; i < meter.data.length; i++) sum += meter.data[i] * meter.data[i];
        var rms = Math.sqrt(sum / meter.data.length);
        var level = state.micOn ? Math.min(1, Math.max(0, (20 * Math.log10(rms + 1e-8) + 60) / 50)) : 0;
        smooth = level > smooth ? level : smooth * 0.85 + level * 0.15;
        var shape = [0.55, 0.8, 1, 0.8, 0.55];
        for (var b = 0; b < bars.length; b++) {
          bars[b].style.height = 4 + Math.round(18 * smooth * shape[b]) + "px";
        }
        meter.raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // Chrome may create the AudioContext suspended until the first user gesture.
    document.addEventListener("pointerdown", function () {
      if (meter.ctx && meter.ctx.state === "suspended") meter.ctx.resume().catch(function () {});
    });

    function stopMeter() {
      cancelAnimationFrame(meter.raf);
      if (meter.src) {
        try { meter.src.disconnect(); } catch (e) { /* ignore */ }
      }
      meter.src = null;
    }

    // ---------------------------------------------------------------- speaker test

    var testAudio = null;
    var testUrl = null;

    function chimeWavUrl() {
      if (testUrl) return testUrl;
      var rate = 44100;
      var notes = [[659.25, 0], [880, 0.16], [1318.5, 0.32]];
      var len = Math.floor(rate * 1.1);
      var pcm = new Int16Array(len);
      for (var i = 0; i < len; i++) {
        var t = i / rate;
        var v = 0;
        for (var n = 0; n < notes.length; n++) {
          var dt = t - notes[n][1];
          if (dt >= 0) v += Math.sin(2 * Math.PI * notes[n][0] * dt) * Math.exp(-dt * 5) * Math.min(1, dt * 200);
        }
        pcm[i] = Math.max(-1, Math.min(1, v * 0.28)) * 32767;
      }
      var buf = new ArrayBuffer(44 + pcm.length * 2);
      var dv = new DataView(buf);
      var w = function (o, s) { for (var k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k)); };
      w(0, "RIFF"); dv.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true);
      dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, pcm.length * 2, true);
      new Int16Array(buf, 44).set(pcm);
      testUrl = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
      return testUrl;
    }

    function playTestSound() {
      var btn = $("lb-test");
      if (testAudio) testAudio.pause();
      testAudio = new Audio(chimeWavUrl());
      var ready = HAS_SINK && state.spkId && state.spkId !== "default"
        ? testAudio.setSinkId(state.spkId).catch(function () {})
        : Promise.resolve();
      ready.then(function () {
        btn.disabled = true;
        testAudio.onended = function () { btn.disabled = false; };
        var p = testAudio.play();
        if (p && p.catch) p.catch(function () { btn.disabled = false; });
      });
    }

    // ---------------------------------------------------------------- server check

    function checkServer() {
      var base = (query.get("signaling") || location.origin).replace(/\/+$/, "");
      var started = performance.now();
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
      fetch(base + "/socket.io/?EIO=4&transport=polling&t=" + Date.now(), {
        cache: "no-store",
        signal: ctrl ? ctrl.signal : undefined,
      })
        .then(function (r) {
          return r.text().then(function (t) {
            // A socket.io server answers with an engine.io "open" packet: 0{"sid":...}
            state.server = r.ok && /^\d*0\{/.test(t)
              ? { status: "ok", ms: Math.round(performance.now() - started) }
              : { status: "warn", ms: 0 };
          });
        })
        .catch(function () {
          state.server = { status: "bad", ms: 0 };
        })
        .then(function () {
          clearTimeout(timer);
          updateServer();
          updateChecks();
        });
    }

    // ---------------------------------------------------------------- view updates

    function updateAll() {
      updateSelects();
      updateStage();
      updateAlert();
      updateChecks();
    }

    function deviceLabel(d, i, kind) {
      if (d.label) return d.label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, "");
      if (d.deviceId === "default") return "System default";
      return kind + " " + (i + 1);
    }

    function fillSelect(sel, devices, current, kind, emptyText) {
      if (!sel) return;
      if (!devices.length) {
        sel.innerHTML = '<option value="">' + esc(emptyText) + "</option>";
        sel.disabled = true;
        return;
      }
      sel.disabled = false;
      sel.innerHTML = devices
        .map(function (d, i) {
          return '<option value="' + esc(d.deviceId) + '">' + esc(deviceLabel(d, i, kind)) + "</option>";
        })
        .join("");
      if (devices.some(function (d) { return d.deviceId === current; })) sel.value = current;
    }

    function updateSelects() {
      if (IS_SENDER) {
        fillSelect($("lb-cam"), state.cams, state.camId, "Camera", "No camera found");
        fillSelect($("lb-mic"), state.mics, state.micId, "Microphone", "No microphone found");
        $("lb-res").value = state.resolution;
        var hint = $("lb-res-hint");
        hint.hidden = !state.resHint;
        hint.textContent = state.resHint;
        if (state.resHint) $("lb-adv").open = true;
      }
      if (HAS_SINK) {
        var spks = state.spks.length ? state.spks : [{ deviceId: "default", label: "System default" }];
        fillSelect($("lb-spk"), spks, state.spkId, "Speaker", "System default");
      }
    }

    function initials(name) {
      var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return "";
      return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
    }

    function updateNameTag() {
      var tag = $("lb-name-tag");
      if (!tag) return;
      var name = state.name.trim();
      tag.textContent = name || "You";
      var av = root.querySelector(".lb-avatar");
      if (av) av.innerHTML = initials(name) || icon("user", 40);
    }

    function isBackCamera() {
      var settings = state.vTrack && state.vTrack.getSettings ? state.vTrack.getSettings() : {};
      if (settings.facingMode) return settings.facingMode === "environment";
      var cam = state.cams.filter(function (d) { return d.deviceId === state.camId; })[0];
      return !!(cam && /back|rear|environment/i.test(cam.label));
    }

    function updateStage() {
      if (!IS_SENDER) return;
      var stageEl = $("lb-stage");
      var video = $("lb-video");
      var overlay = $("lb-overlay");
      var showVideo = state.camOn && !!state.vTrack;
      stageEl.classList.toggle("lb-cam-off", !showVideo);
      // Mirror only a user-facing camera: a back camera shown mirrored looks wrong (text reads backwards).
      video.classList.toggle("lb-mirror", state.mirror && !isBackCamera());

      var html = "";
      if (state.permission === "pending") {
        html = '<div class="lb-stage-msg"><div class="lb-spinner"></div><h3>Starting your devices…</h3>' +
          "<p>Allow camera and microphone access when your browser asks.</p></div>";
      } else if (state.permission === "denied") {
        html = '<div class="lb-stage-msg">' + icon("camOff", 36) + "<h3>Camera and microphone are blocked</h3>" +
          "<p>Click the camera icon in the address bar, allow access, then try again.</p>" +
          '<button class="lb-btn lb-btn-small" type="button" data-act="retry">' + icon("refresh", 16) + "Try again</button></div>";
      } else if (state.permission === "nodevice") {
        html = '<div class="lb-stage-msg">' + icon("camOff", 36) + "<h3>No camera or microphone found</h3>" +
          "<p>Connect a device - it will show up here automatically.</p></div>";
      } else if (state.permission === "busy" && !state.vTrack) {
        html = '<div class="lb-stage-msg">' + icon("alert", 36) + "<h3>Your camera is busy</h3>" +
          "<p>Another application is using the camera or microphone. Close it and try again.</p>" +
          '<button class="lb-btn lb-btn-small" type="button" data-act="retry">' + icon("refresh", 16) + "Try again</button></div>";
      } else if (state.permission === "insecure") {
        html = '<div class="lb-stage-msg">' + icon("alert", 36) + "<h3>Secure connection required</h3>" +
          "<p>Open this page over HTTPS to use your camera and microphone.</p></div>";
      } else if (state.permission === "error" && !state.vTrack && !state.aTrack) {
        html = '<div class="lb-stage-msg">' + icon("alert", 36) + "<h3>Couldn't start your devices</h3>" +
          '<p>Check that your browser supports camera access.</p><button class="lb-btn lb-btn-small" type="button" data-act="retry">' +
          icon("refresh", 16) + "Try again</button></div>";
      } else if (!showVideo) {
        html = '<div class="lb-stage-msg"><div class="lb-avatar"></div><p>' +
          (state.camOn ? "Starting camera…" : "Your camera is off") + "</p></div>";
      }
      overlay.innerHTML = html;
      // Blocking messages (permission, no device, errors) replace the stage controls.
      stageEl.classList.toggle("lb-has-msg", !!html && html.indexOf("lb-avatar") < 0);
      var retry = overlay.querySelector('[data-act="retry"]');
      if (retry) retry.addEventListener("click", initMedia);
      updateNameTag();

      var noMedia = state.permission !== "granted";
      var micBtn = $("lb-mic-btn");
      micBtn.innerHTML = icon(state.micOn ? "mic" : "micOff", 22);
      micBtn.classList.toggle("lb-off", !state.micOn);
      micBtn.disabled = noMedia && !state.mics.length;
      micBtn.setAttribute("aria-pressed", String(!state.micOn));
      micBtn.title = (state.micOn ? "Turn off microphone" : "Turn on microphone") + " (Ctrl+D)";
      micBtn.setAttribute("aria-label", micBtn.title);

      var camBtn = $("lb-cam-btn");
      camBtn.innerHTML = icon(state.camOn ? "cam" : "camOff", 22);
      camBtn.classList.toggle("lb-off", !state.camOn);
      camBtn.disabled = noMedia && !state.cams.length;
      camBtn.setAttribute("aria-pressed", String(!state.camOn));
      camBtn.title = (state.camOn ? "Turn off camera" : "Turn on camera") + " (Ctrl+E)";
      camBtn.setAttribute("aria-label", camBtn.title);

      $("lb-meter").style.visibility = state.micOn && state.aTrack ? "visible" : "hidden";
      $("lb-flip-btn").hidden = noMedia || state.cams.length < 2;
    }

    function showAlert(text) {
      state.alert = text;
      updateAlert();
    }

    function updateAlert() {
      var slot = $("lb-alert-slot");
      if (!slot) return;
      var text = state.alert;
      if (!text && IS_SENDER && (state.permission === "denied" || state.permission === "nodevice")) {
        text = state.permission === "denied"
          ? "You can still join - others won't see or hear you until you allow access."
          : "You can still join and watch without a camera or microphone.";
        slot.innerHTML = '<div class="lb-alert info">' + icon("info", 18) + "<span>" + esc(text) + "</span></div>";
        return;
      }
      var html = text ? '<div class="lb-alert">' + icon("alert", 18) + "<span>" + esc(text) + "</span></div>" : "";
      [state.tips.camera, state.tips.light].forEach(function (tip) {
        if (tip) html += '<div class="lb-alert info" style="margin-top:8px">' + icon("info", 18) + "<span>" + esc(tip) + "</span></div>";
      });
      slot.innerHTML = html;
    }

    function check(label, status, detail) {
      var cls = status === "ok" ? "ok" : status === "warn" ? "warn" : status === "bad" ? "bad" : status === "pending" ? "pending" : "";
      return '<span class="lb-check"><span class="lb-dot ' + cls + '"></span>' + esc(label) +
        (detail ? ' <span style="opacity:.7">' + esc(detail) + "</span>" : "") + "</span>";
    }

    function updateChecks() {
      var el = $("lb-checks");
      if (!el) return;
      var html = "";
      if (IS_SENDER) {
        var p = state.permission;
        var camStatus = !state.camOn ? "" : state.vTrack ? "ok" : p === "pending" ? "pending" : "bad";
        var micStatus = !state.micOn ? "" : state.aTrack ? "ok" : p === "pending" ? "pending" : "bad";
        html += check("Camera", camStatus, state.camOn ? "" : "off");
        html += check("Microphone", micStatus, state.micOn ? "" : "muted");
      }
      var s = state.server;
      html += check("Server", s.status, s.status === "ok" ? s.ms + " ms" : s.status === "bad" ? "unreachable" : s.status === "warn" ? "unknown" : "");
      el.innerHTML = html;

      var join = $("lb-join");
      if (!state.joining) join.disabled = IS_SENDER && state.permission === "pending";
    }

    function updateServer() {
      var chip = $("lb-server-chip");
      var s = state.server;
      var cls = s.status === "ok" ? "ok" : s.status === "bad" ? "bad" : "warn";
      var text = s.status === "ok" ? "Server online · " + s.ms + " ms" : s.status === "bad" ? "Server unreachable" : "Server status unknown";
      chip.innerHTML = '<span class="lb-dot ' + cls + '"></span><span>' + esc(text) + "</span>";
      chip.title = s.status === "bad" ? "The signaling server didn't answer. You can still try to join." : "";
    }

    // ---------------------------------------------------------------- join

    function installDeviceHint(camId, micId) {
      var orig = md.getUserMedia.bind(md);
      var hint = function (v, id) {
        if (!id) return v;
        if (v === true) return { deviceId: { exact: id } };
        if (v && typeof v === "object" && !v.deviceId) {
          var copy = {};
          for (var k in v) copy[k] = v[k];
          copy.deviceId = { exact: id };
          return copy;
        }
        return v;
      };
      md.getUserMedia = function (c) {
        if (!c || typeof c !== "object") return orig(c);
        var v = hint(c.video, camId);
        var a = hint(c.audio, micId);
        if (v === c.video && a === c.audio) return orig(c);
        // Only fills in a device when the app asks for "any" device; its own explicit choices win.
        return orig({ video: v, audio: a }).catch(function (err) {
          var k = errorKind(err);
          if (k === "constraint" || k === "nodevice" || k === "busy") return orig(c);
          throw err;
        });
      };
    }

    function installSpeakerSink(sinkId) {
      if (!HAS_SINK || !sinkId || sinkId === "default") return;
      var apply = function (el) {
        if (el.sinkId !== sinkId) el.setSinkId(sinkId).catch(function () {});
      };
      var origPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        apply(this);
        return origPlay.apply(this, arguments);
      };
      new MutationObserver(function () {
        var els = document.querySelectorAll("video, audio");
        for (var i = 0; i < els.length; i++) apply(els[i]);
      }).observe(document.body, { childList: true, subtree: true });
    }

    function join() {
      if (state.joining || booted) return;
      if (IS_SENDER && state.permission === "pending") return;
      state.joining = true;

      var btn = $("lb-join");
      btn.disabled = true;
      btn.innerHTML = '<span class="lb-spinner"></span>' + (MODE === "preview" ? "Connecting…" : "Joining…");

      var q = new URLSearchParams(location.search);
      q.delete("lobby");

      if (IS_SENDER) {
        var name = state.name.trim();
        if (name) {
          lsSet("name", name);
          if (q.has("name")) q.set("name", name);
        }
        lsSet("resolution", state.resolution);
        // The app prefers a saved bitrate over its default; upgrade the old default (2.5M) to the new one.
        if ((lsGet("videoBitrate") || lsGet("bitrate")) === "2.5M") lsSet("videoBitrate", "4M");
        lsSet("audioEnhancements", state.enhancements ? "true" : "false");
        lsSet("mirroring", state.mirror ? "true" : "false");
        lsSet("lobby.camId", state.camId);
        lsSet("lobby.micId", state.micId);

        var hasMedia = state.permission === "granted";
        var camOff = !state.camOn || !state.vTrack && !hasMedia;
        var micOff = !state.micOn || !state.aTrack && !hasMedia;
        if (camOff) q.set("camOff", "1"); else q.delete("camOff");
        if (micOff) q.set("micOff", "1"); else q.delete("micOff");
        // The lobby replaces the in-app "Start" step and the in-app name/location form.
        q.set("autostart", "1");
        q.set("autojoin", "1");
        // No self-view overlay in the call; an explicit ?selfie=1 in the link still enables it.
        if (!q.has("selfie")) lsSet("selfie", "false");

        if (hasMedia) installDeviceHint(state.camId, state.micId);
      } else {
        lsSet("lobby.sound", state.sound ? "1" : "0");
        if (state.sound) q.set("audio", "1"); else q.delete("audio");
      }
      // The Join click is a user gesture, so remote audio can start without an extra "unmute" click.
      if (IS_SENDER && !q.has("audio")) q.set("audio", "1");

      installSpeakerSink(state.spkId);

      var qs = q.toString();
      history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);

      // Release the lobby's devices so the app can open them.
      stopMeter();
      if (meter.ctx) meter.ctx.close().catch(function () {});
      stopTrack(state.vTrack);
      stopTrack(state.aTrack);
      state.vTrack = state.aTrack = null;
      if (testAudio) testAudio.pause();

      root.classList.add("lb-leaving");
      setTimeout(function () {
        if (root.parentNode) root.parentNode.removeChild(root);
        if (testUrl) URL.revokeObjectURL(testUrl);
      }, 300);
      bootApp();
    }

    // ---------------------------------------------------------------- start

    function start() {
      document.title = (page.isPlayer ? "Remote player" : MODE === "preview" ? "Watch stream" : "Join session") + (TARGET_ID ? " · " + TARGET_ID : "");
      render();
      checkServer();
      if (IS_SENDER) {
        initMedia();
        var nameInput = $("lb-name");
        if (!state.name) setTimeout(function () { nameInput.focus(); }, 50);
      } else {
        // Viewers don't need camera/mic permission; speaker labels show only if permission was granted before.
        state.permission = "granted";
        refreshDevices();
        updateAll();
        $("lb-join").focus();
      }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  });
}
