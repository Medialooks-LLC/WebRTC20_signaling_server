/* eslint-disable no-restricted-globals */
/*
 * Playout controls for a remote-controlled stream: play, pause, stop, backward, forward, previous / next, a seek bar,
 * the playlist, the media library of the player and the output to a video device (renderer).
 *
 * Shown only on the dedicated player page (/player/<id>) when the Host is a "Remote Control Player" (see the
 * "Sample Remote Control Player 2.0" in the SDK samples) - for any other stream nothing is rendered.
 *
 *   page -> player   socket event "forward":  { to: <id of the Host>, playback: { cmd, value, to, name, key } }
 *                    cmd: hello | play | pause | stop | backward | forward | seek (value = seconds) | next | prev
 *                       | renderers | renderer_start (name = device) | renderer_stop
 *                       | library | playlist | pl_add (name = path in the library) | pl_remove (value = index)
 *                       | pl_move (value = index, to = new index) | pl_clear | pl_play (value = index) | repeat (name = off|one|all)
 *                    key: the password of the player, when it has one
 *   player -> page   socket event "message":  { from: <id of the Host>, payload: '<JSON>' }, the JSON is one of
 *                    {"kind":"playback_state", state: "playing"|"paused"|"stopped", position, duration, step (seconds), file, renderer, index}
 *                    {"kind":"playlist", items: [names], index, repeat, library: bool}
 *                    {"kind":"library", name, items: [paths relative to the library]}
 *                    {"kind":"renderers", items: [device names], active}
 *                    {"kind":"auth", required, ok}
 *                    {"kind":"error", cmd, message}
 *
 * The app owns the socket (window.socket); this module only adds a listener to it, so the app is not touched.
 * The first command ("hello") registers the page: the player sends the state twice a second to the registered pages.
 * Rendered outside the React root, like the status pill.
 */
import { getPageRoute } from "../helpers/pageRoute";

(function () {
  "use strict";

  var page = getPageRoute();
  if (!page.isPlayer || !page.targetId) return;
  var hostId = page.targetId;

  var STALE_MS = 4000; // no state for this long: the player is gone
  var IDLE_MS = 4500; // the bar fades out after this long without a mouse move, while the video plays
  var KEY_STORE = "rc-key:" + hostId;

  var el, mainEl, panelEl, lockEl, lockInput, lockMsg, menuEl, toastEl;
  var playBtn, stopBtn, backBtn, fwdBtn, prevBtn, nextBtn, queueBtn, outBtn;
  var seekEl, tipEl, curEl, durEl, fileEl;
  var tabsEl, listEl, libEl, libListEl, searchEl, repeatBtn, clearBtn, emptyEl;
  var socket = null;
  var last = null; // the state of the player: { state, position, duration, step, file, renderer, index, at }
  var playlist = { items: [], index: -1, repeat: "off", library: false };
  var library = null; // paths, null until asked
  var libraryName = "";
  var renderers = [];
  var auth = { required: false, ok: true, wrong: false };
  var key = "";
  var tab = "playlist";
  var dragging = false;
  var wasLive = false;
  var activity = Date.now();
  var toastTimer = 0;

  try { key = sessionStorage.getItem(KEY_STORE) || ""; } catch (e) { key = ""; }

  // ---------------------------------------------------------------- icons

  function svg(inner, stroke) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' +
      (stroke ? ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : ' fill="currentColor"') +
      ">" + inner + "</svg>";
  }

  var ICONS = {
    play: svg('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>'),
    pause: svg('<rect x="6" y="5" width="4.2" height="14" rx="1"/><rect x="13.8" y="5" width="4.2" height="14" rx="1"/>'),
    stop: svg('<rect x="6" y="6" width="12" height="12" rx="1.6"/>'),
    back: svg('<path d="M11.5 6.2v11.6a.8.8 0 0 1-1.3.6L3.3 12.6a.8.8 0 0 1 0-1.2l6.9-5.8a.8.8 0 0 1 1.3.6zM21 6.2v11.6a.8.8 0 0 1-1.3.6l-6.9-5.8a.8.8 0 0 1 0-1.2l6.9-5.8a.8.8 0 0 1 1.3.6z"/>'),
    fwd: svg('<path d="M12.5 6.2v11.6a.8.8 0 0 0 1.3.6l6.9-5.8a.8.8 0 0 0 0-1.2l-6.9-5.8a.8.8 0 0 0-1.3.6zM3 6.2v11.6a.8.8 0 0 0 1.3.6l6.9-5.8a.8.8 0 0 0 0-1.2L4.3 5.6A.8.8 0 0 0 3 6.2z"/>'),
    prev: svg('<rect x="5" y="5" width="2.4" height="14" rx="1"/><path d="M19 6.2v11.6a.8.8 0 0 1-1.3.6l-8.2-5.8a.8.8 0 0 1 0-1.2l8.2-5.8a.8.8 0 0 1 1.3.6z"/>'),
    next: svg('<rect x="16.6" y="5" width="2.4" height="14" rx="1"/><path d="M5 6.2v11.6a.8.8 0 0 0 1.3.6l8.2-5.8a.8.8 0 0 0 0-1.2L6.3 5.6A.8.8 0 0 0 5 6.2z"/>'),
    out: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', true),
    queue: svg('<path d="M4 6h12M4 12h12M4 18h8"/><path d="m18 14 4 3-4 3z" fill="currentColor"/>', true),
    up: svg('<path d="m6 15 6-6 6 6"/>', true),
    down: svg('<path d="m6 9 6 6 6-6"/>', true),
    remove: svg('<path d="M6 6l12 12M18 6 6 18"/>', true),
    add: svg('<path d="M12 5v14M5 12h14"/>', true),
    repeat: svg('<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>', true),
    lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', true),
    now: svg('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>'),
  };

  function h(tag, cls, html, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    if (attrs) for (var a in attrs) n.setAttribute(a, attrs[a]);
    return n;
  }

  function button(cls, title, icon, label) {
    var b = h("button", "rc-btn " + cls, icon + (label ? '<span class="rc-label">' + label + "</span>" : ""), { type: "button", title: title, "aria-label": title });
    return b;
  }

  // ---------------------------------------------------------------- view

  function build() {
    el = h("div", "", "", { id: "rc-bar", role: "group", "aria-label": "Player controls" });
    el.hidden = true;

    // The drawer with the playlist and the library
    panelEl = h("div", "rc-panel", "", { role: "region", "aria-label": "Playlist" });
    panelEl.hidden = true;
    tabsEl = h("div", "rc-tabs", '<button type="button" class="rc-tab rc-sel" data-tab="playlist">Playlist <span class="rc-count"></span></button>' +
      '<button type="button" class="rc-tab" data-tab="library">Library</button>');
    repeatBtn = button("rc-repeat", "Repeat", ICONS.repeat, "Off");
    clearBtn = button("rc-clear", "Remove all items", ICONS.remove, "Clear");
    var tools = h("div", "rc-tools");
    tools.appendChild(repeatBtn);
    tools.appendChild(clearBtn);
    var head = h("div", "rc-panel-head");
    head.appendChild(tabsEl);
    head.appendChild(tools);

    listEl = h("ol", "rc-list");
    emptyEl = h("div", "rc-empty");
    libEl = h("div", "rc-lib");
    searchEl = h("input", "rc-search", "", { type: "search", placeholder: "Search the library", "aria-label": "Search the library", autocomplete: "off" });
    libListEl = h("ul", "rc-liblist");
    libEl.appendChild(searchEl);
    libEl.appendChild(libListEl);
    panelEl.appendChild(head);
    panelEl.appendChild(listEl);
    panelEl.appendChild(libEl);
    panelEl.appendChild(emptyEl);

    // The password
    lockEl = h("form", "rc-lock", "", { autocomplete: "off" });
    lockEl.hidden = true;
    lockInput = h("input", "rc-lock-input", "", { type: "password", placeholder: "Password of the player", "aria-label": "Password of the player", autocomplete: "off" });
    lockMsg = h("span", "rc-lock-msg", "This player is protected");
    var unlock = h("button", "rc-unlock", "Unlock", { type: "submit" });
    lockEl.appendChild(h("span", "rc-lock-icon", ICONS.lock));
    lockEl.appendChild(lockMsg);
    lockEl.appendChild(lockInput);
    lockEl.appendChild(unlock);

    // The bar
    mainEl = h("div", "rc-main");
    var row = h("div", "rc-buttons");
    prevBtn = button("rc-prev", "Previous (P)", ICONS.prev);
    backBtn = button("rc-back", "Backward (Left)", ICONS.back);
    playBtn = button("rc-play", "Play (Space)", ICONS.play);
    stopBtn = button("rc-stop", "Stop", ICONS.stop);
    fwdBtn = button("rc-fwd", "Forward (Right)", ICONS.fwd);
    nextBtn = button("rc-next", "Next (N)", ICONS.next);
    [prevBtn, backBtn, playBtn, stopBtn, fwdBtn, nextBtn].forEach(function (b) { row.appendChild(b); });

    var timeline = h("div", "rc-timeline");
    curEl = h("span", "rc-time");
    durEl = h("span", "rc-time rc-dur");
    seekEl = h("input", "rc-seek", "", { type: "range", min: "0", max: "1000", step: "1", value: "0", "aria-label": "Position" });
    tipEl = h("div", "rc-tip");
    tipEl.hidden = true;
    timeline.appendChild(curEl);
    timeline.appendChild(seekEl);
    timeline.appendChild(durEl);
    timeline.appendChild(tipEl);

    fileEl = h("div", "rc-file");
    queueBtn = button("rc-queue", "Playlist and library", ICONS.queue);
    outBtn = button("rc-out", "Output to a video device", ICONS.out);
    outBtn.hidden = true;
    outBtn.setAttribute("aria-haspopup", "menu");
    outBtn.setAttribute("aria-expanded", "false");
    var side = h("div", "rc-side");
    side.appendChild(queueBtn);
    side.appendChild(outBtn);

    menuEl = h("div", "rc-menu", "", { role: "menu" });
    menuEl.hidden = true;
    toastEl = h("div", "rc-toast", "", { role: "status", "aria-live": "polite" });
    toastEl.hidden = true;

    mainEl.appendChild(row);
    mainEl.appendChild(timeline);
    mainEl.appendChild(fileEl);
    mainEl.appendChild(side);
    mainEl.appendChild(menuEl);
    mainEl.appendChild(toastEl);

    el.appendChild(panelEl);
    el.appendChild(lockEl);
    el.appendChild(mainEl);
    document.body.appendChild(el);

    bind();
  }

  function bind() {
    playBtn.addEventListener("click", function () { send(last && last.state === "playing" ? "pause" : "play"); });
    stopBtn.addEventListener("click", function () { send("stop"); });
    backBtn.addEventListener("click", function () { send("backward"); });
    fwdBtn.addEventListener("click", function () { send("forward"); });
    prevBtn.addEventListener("click", function () { send("prev"); });
    nextBtn.addEventListener("click", function () { send("next"); });

    // The bar moves by itself; while it is dragged it follows the finger, and the jump is sent on release.
    seekEl.addEventListener("input", function () {
      dragging = true;
      curEl.textContent = fmt(fromSlider());
      seekEl.style.setProperty("--rc-fill", seekEl.value / 10 + "%");
    });
    seekEl.addEventListener("change", function () {
      dragging = false;
      tipEl.hidden = true;
      send("seek", fromSlider());
    });
    seekEl.addEventListener("pointerdown", function () { dragging = true; wake(); });
    seekEl.addEventListener("pointerup", function () { dragging = false; tipEl.hidden = true; });
    seekEl.addEventListener("pointercancel", function () { dragging = false; tipEl.hidden = true; render(); });
    seekEl.addEventListener("blur", function () { dragging = false; tipEl.hidden = true; });
    seekEl.addEventListener("pointermove", function (e) {
      if (!last || !last.duration || e.pointerType === "touch") return;
      var r = seekEl.getBoundingClientRect();
      var f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      tipEl.textContent = fmt(f * last.duration);
      tipEl.hidden = false;
      var half = tipEl.offsetWidth / 2;
      var left = seekEl.offsetLeft + f * r.width;
      tipEl.style.left = Math.max(half, Math.min(seekEl.parentElement.clientWidth - half, left)) + "px";
    });
    seekEl.addEventListener("pointerleave", function () { tipEl.hidden = true; });

    queueBtn.addEventListener("click", function () { setPanel(panelEl.hidden); });
    outBtn.addEventListener("click", function () {
      var open = menuEl.hidden;
      if (open) {
        send("renderers"); // the devices can change: ask again
        setPanel(false);
      }
      setMenu(open);
    });

    tabsEl.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".rc-tab") : null;
      if (t) setTab(t.getAttribute("data-tab"));
    });
    repeatBtn.addEventListener("click", function () {
      send("repeat", undefined, playlist.repeat === "off" ? "all" : playlist.repeat === "all" ? "one" : "off");
    });
    clearBtn.addEventListener("click", function () { send("pl_clear"); });
    searchEl.addEventListener("input", buildLibrary);

    lockEl.addEventListener("submit", function (e) {
      e.preventDefault();
      key = lockInput.value;
      auth.wrong = false;
      try { sessionStorage.setItem(KEY_STORE, key); } catch (err) { /* private mode */ }
      lockInput.value = "";
      send("hello");
    });

    // Close the drawer and the menu with a click outside and with Escape
    document.addEventListener("click", function (e) {
      if ((!panelEl.hidden || !menuEl.hidden) && !el.contains(e.target)) { setPanel(false); setMenu(false); }
    });

    document.addEventListener("keydown", function (e) {
      wake();
      if (el.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      // Inputs own their keys, including the seek slider's native arrow-key controls.
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape") {
        if (!menuEl.hidden || !panelEl.hidden) { setMenu(false); setPanel(false); e.preventDefault(); }
        return;
      }
      if (mode() !== "live") return;
      var map = { " ": playBtn, k: playBtn, ArrowLeft: backBtn, ArrowRight: fwdBtn, n: nextBtn, p: prevBtn };
      var b = map[e.key];
      if (b && !(e.key === " " && t && t.tagName === "BUTTON")) {
        e.preventDefault();
        b.click();
      }
    });

    ["pointermove", "pointerdown", "touchstart", "wheel"].forEach(function (n) { document.addEventListener(n, wake, { passive: true }); });
    window.addEventListener("resize", updatePlacement);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updatePlacement);
      window.visualViewport.addEventListener("scroll", updatePlacement);
    }
  }

  function wake() {
    activity = Date.now();
    if (el) el.classList.remove("rc-idle");
  }

  function updatePlacement() {
    if (!el || el.hidden) return;
    var viewport = window.visualViewport;
    var height = viewport ? viewport.height : window.innerHeight;
    var top = viewport ? viewport.offsetTop : 0;
    var hiddenBottom = Math.max(0, window.innerHeight - top - height);
    var styles = getComputedStyle(el);
    var safeTop = parseFloat(styles.getPropertyValue("--rc-safe-top")) || 0;
    var safeBottom = parseFloat(styles.getPropertyValue("--rc-safe-bottom")) || 0;
    var controls = parseFloat(styles.getPropertyValue("--ic-controls-height")) || 96;
    // The app's bottom toolbar is behind the software keyboard when it covers the page.
    var keyboard = hiddenBottom > Math.max(120, window.innerHeight * 0.2);
    var bottom = hiddenBottom + safeBottom + 8 + (keyboard ? 0 : controls);
    var available = Math.max(0, window.innerHeight - bottom - top - Math.max(8, safeTop));
    el.style.setProperty("--rc-bottom", bottom + "px");
    el.style.setProperty("--rc-max-height", available + "px");
    var mainHeight = mainEl.hidden ? 0 : mainEl.getBoundingClientRect().height;
    el.style.setProperty("--rc-popup-height", Math.max(0, available - mainHeight - 10) + "px");
  }

  function setMenu(open) {
    if (open) setPanel(false);
    menuEl.hidden = !open;
    outBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setPanel(open) {
    if (open) setMenu(false);
    panelEl.hidden = !open;
    queueBtn.classList.toggle("rc-on", open);
    if (open) {
      if (tab === "library" && library === null) send("library");
      buildPanel();
    }
  }

  function setTab(name) {
    tab = name;
    if (name === "library" && library === null) send("library");
    buildPanel();
  }

  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    var hh = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    return (hh ? hh + ":" + (m < 10 ? "0" : "") : (m < 10 ? "0" : "")) + m + ":" + (ss < 10 ? "0" : "") + ss;
  }

  function fromSlider() {
    return last && last.duration ? (parseInt(seekEl.value, 10) / 1000) * last.duration : 0;
  }

  function mode() {
    if (auth.required && !auth.ok) return "locked";
    if (!last) return "hidden";
    return Date.now() - last.at < STALE_MS ? "live" : "offline";
  }

  // The playlist: the items and the buttons of an item
  function buildPlaylist() {
    listEl.innerHTML = "";
    playlist.items.forEach(function (name, i) {
      var cur = i === playlist.index;
      var li = h("li", "rc-row" + (cur ? " rc-cur" : ""));
      var main = h("button", "rc-row-main", (cur ? '<span class="rc-now">' + ICONS.now + "</span>" : '<span class="rc-num">' + (i + 1) + "</span>") + '<span class="rc-name"></span>', { type: "button", title: "Play " + name });
      main.querySelector(".rc-name").textContent = name;
      main.addEventListener("click", function () { send("pl_play", i); });
      li.appendChild(main);
      var acts = h("span", "rc-row-actions");
      var up = button("rc-mini", "Move up", ICONS.up);
      var down = button("rc-mini", "Move down", ICONS.down);
      var rm = button("rc-mini", "Remove", ICONS.remove);
      up.disabled = i === 0;
      down.disabled = i === playlist.items.length - 1;
      up.addEventListener("click", function () { send("pl_move", i, undefined, i - 1); });
      down.addEventListener("click", function () { send("pl_move", i, undefined, i + 1); });
      rm.addEventListener("click", function () { send("pl_remove", i); });
      acts.appendChild(up);
      acts.appendChild(down);
      acts.appendChild(rm);
      li.appendChild(acts);
      listEl.appendChild(li);
    });
  }

  // The library: the files of the player's folder, filtered by the search
  function buildLibrary() {
    libListEl.innerHTML = "";
    if (!library) return;
    var q = searchEl.value.trim().toLowerCase();
    var shown = 0;
    library.forEach(function (path) {
      if (q && path.toLowerCase().indexOf(q) < 0) return;
      shown++;
      var slash = path.lastIndexOf("/");
      var li = h("li", "rc-row");
      var b = h("button", "rc-row-main", '<span class="rc-add">' + ICONS.add + '</span><span class="rc-name"></span><span class="rc-dir"></span>', { type: "button", title: "Add to the playlist" });
      b.querySelector(".rc-name").textContent = path.slice(slash + 1);
      b.querySelector(".rc-dir").textContent = slash > 0 ? path.slice(0, slash) : "";
      b.addEventListener("click", function () {
        send("pl_add", undefined, path);
        li.classList.add("rc-added");
        setTimeout(function () { li.classList.remove("rc-added"); }, 700);
      });
      li.appendChild(b);
      libListEl.appendChild(li);
    });
    if (!shown) libListEl.appendChild(h("li", "rc-empty-row", q ? "Nothing found" : "The library is empty"));
  }

  function buildPanel() {
    var inLib = tab === "library";
    [].forEach.call(tabsEl.querySelectorAll(".rc-tab"), function (t) {
      var on = t.getAttribute("data-tab") === tab;
      t.classList.toggle("rc-sel", on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    });
    tabsEl.querySelector(".rc-count").textContent = playlist.items.length ? "· " + playlist.items.length : "";
    repeatBtn.querySelector(".rc-label").textContent = playlist.repeat === "all" ? "All" : playlist.repeat === "one" ? "One" : "Off";
    repeatBtn.classList.toggle("rc-on", playlist.repeat !== "off");
    repeatBtn.title = "Repeat: " + (playlist.repeat === "all" ? "the playlist" : playlist.repeat === "one" ? "the item" : "off");
    clearBtn.hidden = inLib || !playlist.items.length;
    repeatBtn.hidden = inLib;

    listEl.hidden = inLib || !playlist.items.length;
    libEl.hidden = !inLib || (library !== null && !library.length && !playlist.library);
    emptyEl.hidden = true;
    if (!inLib) {
      buildPlaylist();
      if (!playlist.items.length) {
        emptyEl.hidden = false;
        emptyEl.textContent = playlist.library ? "The playlist is empty. Add files from the Library." : "The playlist is empty.";
      }
    } else if (!playlist.library) {
      emptyEl.hidden = false;
      emptyEl.textContent = "The player has no library folder.";
    } else {
      buildLibrary();
      if (library === null) libListEl.innerHTML = '<li class="rc-empty-row">Loading…</li>';
    }
  }

  function buildMenu() {
    var active = last ? last.renderer : "";
    menuEl.innerHTML = "";
    var add = function (label, name, on) {
      var b = h("button", "rc-item" + (on ? " rc-active" : ""), "", { type: "button", role: "menuitemradio", "aria-checked": on ? "true" : "false" });
      b.textContent = label;
      b.addEventListener("click", function () {
        setMenu(false);
        if (name) send("renderer_start", undefined, name);
        else send("renderer_stop");
      });
      menuEl.appendChild(b);
    };
    menuEl.appendChild(h("div", "rc-menu-title", "Output on the player's computer"));
    add("Off", "", !active);
    renderers.forEach(function (n) { add(n, n, n.toLowerCase() === (active || "").toLowerCase()); });
    outBtn.hidden = !renderers.length;
    outBtn.classList.toggle("rc-on", !!active);
    outBtn.title = active ? "Output: " + active : "Output to a video device";
  }

  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 5000);
  }

  // What the page shows: nothing, the password, the controls, or the controls of a player that has gone
  function render() {
    var m = mode();
    var covered = document.documentElement.classList.contains("lobby-active");
    el.hidden = m === "hidden" || covered;
    document.body.toggleAttribute("data-rc", !el.hidden);
    if (el.hidden) return;

    el.setAttribute("data-mode", m);
    lockEl.hidden = m !== "locked";
    mainEl.hidden = m === "locked";
    if (m === "locked") {
      panelEl.hidden = true;
      lockMsg.textContent = auth.wrong ? "Wrong password" : "This player is protected";
      lockEl.classList.toggle("rc-wrong", auth.wrong);
      updatePlacement();
      return;
    }

    var live = m === "live";
    [playBtn, stopBtn, backBtn, fwdBtn, prevBtn, nextBtn, seekEl].forEach(function (b) { b.disabled = !live; });
    var playing = live && last.state === "playing";
    playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    playBtn.title = playing ? "Pause (Space)" : "Play (Space)";
    playBtn.setAttribute("aria-label", playBtn.title);
    playBtn.classList.toggle("rc-on", playing);
    backBtn.title = "Backward " + last.step + " s (Left)";
    fwdBtn.title = "Forward " + last.step + " s (Right)";

    var multi = playlist.items.length > 1;
    prevBtn.hidden = nextBtn.hidden = !multi;
    queueBtn.hidden = !playlist.items.length && !playlist.library;
    fileEl.textContent = live ? last.file : "Player offline";
    fileEl.hidden = !(live ? last.file : true);

    var pos = estimate();
    durEl.textContent = fmt(last.duration);
    seekEl.disabled = !live || !last.duration;
    if (!dragging) {
      curEl.textContent = fmt(pos);
      var v = last.duration ? Math.round((pos / last.duration) * 1000) : 0;
      seekEl.value = String(v);
      seekEl.style.setProperty("--rc-fill", v / 10 + "%");
    }

    // Fade the bar away while the video plays and nobody touches the page
    var busy = !panelEl.hidden || !menuEl.hidden || el.matches(":hover") || el.contains(document.activeElement);
    el.classList.toggle("rc-idle", playing && !busy && Date.now() - activity > IDLE_MS);

    if (live && !wasLive && mode() === "live") buildMenu();
    wasLive = live;
    updatePlacement();
  }

  // ---------------------------------------------------------------- protocol

  function send(cmd, value, name, to) {
    if (!socket) return;
    var playback = { cmd: cmd };
    if (typeof value === "number") playback.value = Math.round(value * 100) / 100;
    if (typeof name === "string") playback.name = name;
    if (typeof to === "number") playback.to = to;
    if (key) playback.key = key;
    socket.emit("forward", { to: hostId, playback: playback });
    wake();
    if (last) {
      // Show the effect at once; the state of the player corrects it within half a second
      if (cmd === "play") last.state = "playing";
      else if (cmd === "pause") last.state = "paused";
      else if (cmd === "stop") { last.state = "stopped"; last.position = 0; }
      else if (cmd === "backward") last.position = Math.max(0, estimate() - last.step);
      else if (cmd === "forward") last.position = Math.min(last.duration, estimate() + last.step);
      else if (cmd === "seek") last.position = value;
      else if (cmd === "renderer_start" || cmd === "renderer_stop") {
        last.renderer = cmd === "renderer_start" ? name : "";
        buildMenu();
      }
      last.at = Date.now();
      render();
    }
  }

  function onMessage(m) {
    if (!m || m.from !== hostId || typeof m.payload !== "string" || m.payload.indexOf('"kind"') < 0) return;
    var s;
    try { s = JSON.parse(m.payload); } catch (e) { return; }
    if (!s) return;

    if (s.kind === "playback_state") {
      var before = last ? last.renderer : null;
      last = {
        state: s.state,
        position: +s.position || 0,
        duration: +s.duration || 0,
        step: +s.step || 10,
        file: s.file || "",
        renderer: s.renderer || "",
        index: typeof s.index === "number" ? s.index : -1,
        at: Date.now(),
      };
      if (before !== last.renderer) buildMenu();
      if (playlist.index !== last.index && last.index >= 0) { playlist.index = last.index; if (!panelEl.hidden) buildPanel(); }
    } else if (s.kind === "auth") {
      var hadKey = !!key;
      auth.required = !!s.required;
      auth.ok = !!s.ok;
      auth.wrong = !s.ok && hadKey;
      if (!s.ok && hadKey) {
        key = "";
        try { sessionStorage.removeItem(KEY_STORE); } catch (e2) { /* private mode */ }
      }
      if (s.ok) { library = null; send("playlist"); }
    } else if (s.kind === "playlist") {
      playlist = { items: s.items || [], index: typeof s.index === "number" ? s.index : -1, repeat: s.repeat || "off", library: !!s.library };
      if (!panelEl.hidden) buildPanel();
    } else if (s.kind === "library") {
      library = s.items || [];
      libraryName = s.name || "";
      if (!panelEl.hidden) buildPanel();
    } else if (s.kind === "renderers") {
      renderers = s.items || [];
      if (last) last.renderer = s.active || "";
      buildMenu();
    } else if (s.kind === "error") {
      toast(s.message || "The command failed");
    }
    render();
  }

  // The state arrives twice a second: between the messages the position runs by itself
  function estimate() {
    if (!last) return 0;
    var p = last.position + (last.state === "playing" ? (Date.now() - last.at) / 1000 : 0);
    return last.duration ? Math.min(p, last.duration) : p;
  }

  // ---------------------------------------------------------------- connection to the app's socket

  var bound = null;
  var lastHello = 0;

  function tick() {
    var s = window.socket;
    if (s && s !== bound) {
      bound = s;
      socket = s;
      s.on("message", onMessage);
      lastHello = 0;
    }

    // Ask for the state until it arrives (a normal stream does not answer: the bar stays hidden).
    // A page that was live asks again when the player comes back; a locked player waits for the password.
    var silent = !last || Date.now() - last.at >= STALE_MS;
    var waitingForKey = auth.required && !auth.ok;
    if (socket && socket.connected && silent && !waitingForKey && Date.now() - lastHello > 3000) {
      lastHello = Date.now();
      socket.emit("forward", { to: hostId, playback: key ? { cmd: "hello", key: key } : { cmd: "hello" } });
    }
    if (el) render();
  }

  function start() {
    build();
    setInterval(tick, 250);
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
