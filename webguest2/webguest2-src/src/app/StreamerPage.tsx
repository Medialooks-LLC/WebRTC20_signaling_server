import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { nanoid } from "@reduxjs/toolkit";
import { Socket } from "socket.io-client";
import store from "../store";
import { WebRtcState } from "../store/type";
import * as actions from "../actions";
import { WS_DISCONNECT, WEB_RTC_SET_LOCAL_MEDIA_STREAM, WEB_RTC_UPDATE_GENERAL_SETTINGS } from "../actions/constants";
import { updateLocalMediaConfig } from "../actions/rtc/lib/mediaConstraints";
import { updateLocalStreamConstraints } from "../actions/rtc/lib/generalSettings";
import { setLocalPeerInfo } from "../actions/rtc/lib/setLocalPeerInfo";
import { prepareLocalPeerInfo } from "../helpers/localPeerInfo";
import { WorkingMode } from "../dto";
import { SIGNALING_SERVER_URL } from "../config/WebRTC";
import { sdkSignalingBase } from "../config/runtime";
import { DEFAULT_VIDEO_ENCODER, DEFAULT_VIDEO_BITRATE, DEFAULT_AUDIO_BITRATE } from "../config/DefaultParams";
import "./streamer.css";

type Phase = "idle" | "starting" | "live";

const makeLinks = (id: string) => {
  const query = new URLSearchParams(window.location.search);
  const viewer = new URL("/" + encodeURIComponent(id), window.location.origin);
  viewer.searchParams.set("lobby", "0");
  viewer.searchParams.set("autojoin", "true");
  if (query.get("signaling")) viewer.searchParams.set("signaling", query.get("signaling") as string);
  const sdkBase = sdkSignalingBase();
  if (!sdkBase) return { viewer: viewer.href, sdk: "" };
  const sdk = new URL("/" + id + "/" + id, sdkBase);
  sdk.protocol = "https:";
  sdk.searchParams.set("receive", "1");
  return { viewer: viewer.href, sdk: sdk.href };
};

const mediaError = (error: unknown) => {
  const err = error as Error;
  if (err.name === "NotAllowedError") return "Camera or microphone access was denied. Allow access in your browser and try again.";
  if (err.name === "NotFoundError") return "No camera or microphone was found. Choose an available device and try again.";
  if (err.name === "NotReadableError") return "The selected device is busy or unavailable. Close other apps using it and try again.";
  return err.message || "Unable to start streaming. Please try again.";
};

export const StreamerPage: FC = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [enablingDevices, setEnablingDevices] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState("");
  const [camera, setCamera] = useState("");
  const [microphone, setMicrophone] = useState("");
  const [useCamera, setUseCamera] = useState(true);
  const [useMicrophone, setUseMicrophone] = useState(true);
  const [cameraMuted, setCameraMuted] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [links, setLinks] = useState({ viewer: "", sdk: "" });
  const [viewerCount, setViewerCount] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const deviceStreams = useRef<MediaStream[]>([]);
  const deviceRequest = useRef(false);
  const attempt = useRef(0);
  const disposeSocket = useRef<() => void>(() => undefined);
  const timeout = useRef<number>();
  const active = useRef(false);
  const online = useSelector((state: WebRtcState) => state.online);

  const refreshDevices = useCallback(async () => {
    try {
      const available = await navigator.mediaDevices.enumerateDevices();
      setDevices(available);
      // A device can disappear between setup and Start. Fall back to the system default.
      setCamera(value => available.some(d => d.kind === "videoinput" && d.deviceId === value) ? value : "");
      setMicrophone(value => available.some(d => d.kind === "audioinput" && d.deviceId === value) ? value : "");
      return available;
    } catch (_) {
      setDeviceMessage("The browser could not list your devices. Use Enable devices to request access.");
      return [];
    }
  }, []);

  const stop = useCallback(() => {
    attempt.current += 1;
    active.current = false;
    deviceRequest.current = false;
    deviceStreams.current.forEach(probe => probe.getTracks().forEach(track => track.stop()));
    deviceStreams.current = [];
    setEnablingDevices(false);
    window.clearTimeout(timeout.current);
    disposeSocket.current();
    disposeSocket.current = () => undefined;
    // Disconnect before stopping capture so there is no sender left using these tracks.
    store.dispatch(actions.leaveRoom());
    store.dispatch({ type: WS_DISCONNECT });
    store.dispatch(actions.wsDisconnected());
    store.dispatch(actions.roomJoinCompleted());
    store.dispatch(actions.setReadyToCall(false));
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    store.dispatch({ type: WEB_RTC_SET_LOCAL_MEDIA_STREAM, stream: null });
    if (video.current) video.current.srcObject = null;
    setPhase("idle");
    setLinks({ viewer: "", sdk: "" });
    setViewerCount(0);
    setNotice("");
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("standalone-page");
    refreshDevices();
    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);
    const unload = () => stop();
    window.addEventListener("pagehide", unload);
    return () => {
      document.documentElement.classList.remove("standalone-page");
      navigator.mediaDevices?.removeEventListener("devicechange", refreshDevices);
      window.removeEventListener("pagehide", unload);
      stop();
    };
  }, [refreshDevices, stop]);

  useEffect(() => {
    if (online && active.current) {
      window.clearTimeout(timeout.current);
      setPhase("live");
    }
  }, [online]);

  useEffect(() => {
    if (phase !== "live") return;
    const timer = window.setInterval(() => {
      setViewerCount(store.getState().peers.filter(peer => peer.pc.connectionState === "connected").length);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const enableDevices = async () => {
    if (active.current || deviceRequest.current) return;
    setError("");
    setDeviceMessage("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Open this page using HTTPS (or localhost) to access your camera and microphone.");
      return;
    }
    const current = ++attempt.current;
    deviceRequest.current = true;
    setEnablingDevices(true);
    const probes: MediaStream[] = [];
    const errors: string[] = [];
    // Request each selected kind separately so a missing camera does not hide a usable mic.
    const requests = [
      ...(useCamera ? [{ label: "Camera", constraints: { video: true, audio: false } }] : []),
      ...(useMicrophone ? [{ label: "Microphone", constraints: { video: false, audio: true } }] : []),
    ];
    try {
      for (const request of requests) {
        if (attempt.current !== current) return;
        try {
          const probe = await navigator.mediaDevices.getUserMedia(request.constraints);
          probes.push(probe);
          if (attempt.current !== current) return;
          deviceStreams.current.push(probe);
        } catch (err) {
          if (attempt.current !== current) return;
          const failure = err as Error;
          const message = failure.name === "NotFoundError" ? "no device was found." :
            failure.name === "NotAllowedError" ? "access was denied. Allow access in your browser or turn this input off." : mediaError(err);
          errors.push(request.label + ": " + message);
        }
      }
      if (attempt.current !== current) return;
      // Enumerate while the temporary captures are live: browsers can then expose names/IDs.
      const available = await refreshDevices();
      if (attempt.current !== current) return;
      if (errors.length) setError(errors.join(" "));
      const inputs = available.filter(d => ["videoinput", "audioinput"].includes(d.kind) && d.deviceId);
      setDeviceMessage(inputs.length ? "Device list refreshed. Choose your inputs below." :
        "No devices are visible to this browser. Check its camera/microphone permissions and your system privacy settings.");
    } finally {
      probes.forEach(probe => probe.getTracks().forEach(track => track.stop()));
      if (attempt.current === current) {
        deviceStreams.current = [];
        deviceRequest.current = false;
        setEnablingDevices(false);
      }
    }
  };

  const start = async () => {
    if (active.current || deviceRequest.current) return;
    setError("");
    setNotice("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Open this page using HTTPS (or localhost) to access your camera and microphone.");
      return;
    }
    const current = ++attempt.current;
    active.current = true;
    setPhase("starting");
    try {
      const id = "Stream-" + nanoid(16);
      const nextLinks = makeLinks(id);
      const captured = await navigator.mediaDevices.getUserMedia({
        video: useCamera ? { deviceId: camera ? { exact: camera } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
        audio: useMicrophone ? { deviceId: microphone ? { exact: microphone } : undefined, echoCancellation: true } : false,
      });
      // A cancelled permission prompt may resolve after Stop or after this page unmounts.
      if (attempt.current !== current) {
        captured.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = captured;
      if (video.current) {
        video.current.srcObject = captured;
        video.current.play().catch(() => undefined);
      }
      captured.getTracks().forEach(track => track.addEventListener("ended", () => {
        if (active.current) {
          stop();
          setError("Capture ended. Check your devices and start a new stream.");
        }
      }, { once: true }));
      refreshDevices();
      setCameraMuted(false);
      setMicMuted(false);
      store.dispatch(actions.setOnline(false));
      store.dispatch(actions.setWorkingMode(WorkingMode.Publisher));
      store.dispatch(actions.setTargetId(id));
      store.dispatch(actions.setSignalingUrl(new URLSearchParams(window.location.search).get("signaling") || SIGNALING_SERVER_URL || window.location.origin));
      // IDs belong to this publishing session; never persist them in shared browser storage.
      store.dispatch({ type: WEB_RTC_UPDATE_GENERAL_SETTINGS, settings: {
        id, name: id, location: "Web", encoder: DEFAULT_VIDEO_ENCODER,
        videoBitrate: DEFAULT_VIDEO_BITRATE, audioBitrate: DEFAULT_AUDIO_BITRATE, frameRate: 30,
      } });
      store.dispatch(setLocalPeerInfo({
        ...prepareLocalPeerInfo(store.getState()),
        camera: useCamera ? "on" : "off",
      }));
      store.dispatch(actions.setAutoJoin(true));
      store.dispatch(updateLocalMediaConfig({ autostart: true, cameraMuted: false, micOff: false }));
      store.dispatch(updateLocalStreamConstraints({ video: useCamera, audio: useMicrophone }));
      store.dispatch(actions.setLocalMediaStream(captured));
      setLinks(nextLinks);
      store.dispatch(actions.testReadiness());
      const socket = (window as Window & { socket?: Socket }).socket;
      const fail = (message: string) => {
        if (attempt.current !== current) return;
        stop();
        setError(message);
      };
      const onError = (err: Error) => fail("Signaling connection failed: " + err.message);
      const onDisconnect = () => fail("The signaling connection closed. Start again to create a new stream.");
      socket?.on("connect_error", onError);
      socket?.on("disconnect", onDisconnect);
      disposeSocket.current = () => {
        socket?.off("connect_error", onError);
        socket?.off("disconnect", onDisconnect);
      };
      timeout.current = window.setTimeout(() => fail("The stream could not register with the signaling server. Check the server connection and try again."), 20000);
    } catch (err) {
      if (attempt.current !== current) return;
      stop();
      setError(mediaError(err));
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Link copied");
    } catch (_) { setNotice("Select the link above and copy it manually."); }
  };

  const busy = phase !== "idle";
  const setupBusy = busy || enablingDevices;
  const namedDevices = devices.some(d => ["videoinput", "audioinput"].includes(d.kind) && d.label);
  return (
    <main className="streamer-page">
      <h1 className="sr-only">Live stream</h1>
      <div className="streamer-status-row">
        <span className={"streamer-status " + phase} data-testid="streamer-status" role="status">{phase === "live" ? "Live · " + viewerCount + (viewerCount === 1 ? " viewer" : " viewers") : phase === "starting" ? "Starting…" : "Ready to stream"}</span>
      </div>
      <div className="streamer-grid">
        <section className="streamer-preview-panel" aria-label="Local preview">
          <div className="streamer-video">
            <video ref={video} data-testid="streamer-preview" autoPlay muted playsInline />
            {(!busy || !useCamera || cameraMuted) && <div className="streamer-placeholder"><span aria-hidden="true">◉</span><strong>{!busy ? "Your camera preview" : "Camera off"}</strong><p>{!busy ? "Choose your devices and start streaming." : "Audio continues when your microphone is on."}</p></div>}
            {phase === "live" && <span className="streamer-live-badge">● LIVE</span>}
          </div>
          <div className="streamer-preview-footer"><span>Local preview · audio muted here</span>{phase === "live" && <div className="streamer-live-controls">
            {useCamera && <button type="button" onClick={() => { store.dispatch(actions.toggleCamera(!cameraMuted)); setCameraMuted(!cameraMuted); }}>{cameraMuted ? "Camera on" : "Camera off"}</button>}
            {useMicrophone && <button type="button" onClick={() => { store.dispatch(actions.toggleMute(!micMuted)); setMicMuted(!micMuted); }}>{micMuted ? "Unmute" : "Mute"}</button>}
          </div>}</div>
        </section>
        <section className="streamer-card" aria-labelledby="streamer-setup-title">
          <h2 id="streamer-setup-title">Stream setup</h2>
          {!busy && <div className="streamer-device-access">
            <button type="button" data-testid="streamer-enable-devices" disabled={!useCamera && !useMicrophone} onClick={enablingDevices ? stop : enableDevices}>{enablingDevices ? "Cancel device access" : namedDevices ? "Refresh devices" : "Enable devices"}</button>
            <p className="streamer-help" data-testid="streamer-device-message" role="status">{enablingDevices ? "Allow access in the browser to show your devices." : deviceMessage || (namedDevices ? "Choose your camera and microphone below." : "Allow device access to see camera and microphone names before streaming.")}</p>
          </div>}
          <label className="streamer-toggle"><span>Camera</span><input type="checkbox" checked={useCamera} disabled={setupBusy} onChange={e => setUseCamera(e.target.checked)} /></label>
          <label className="streamer-device"><span className="sr-only">Camera device</span><select data-testid="streamer-camera" value={camera} disabled={setupBusy || !useCamera} onChange={e => setCamera(e.target.value)}><option value="">Default camera</option>{devices.filter(d => d.kind === "videoinput" && d.deviceId).map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Camera " + (i + 1)}</option>)}</select></label>
          <label className="streamer-toggle"><span>Microphone</span><input type="checkbox" checked={useMicrophone} disabled={setupBusy} onChange={e => setUseMicrophone(e.target.checked)} /></label>
          <label className="streamer-device"><span className="sr-only">Microphone device</span><select data-testid="streamer-microphone" value={microphone} disabled={setupBusy || !useMicrophone} onChange={e => setMicrophone(e.target.value)}><option value="">Default microphone</option>{devices.filter(d => d.kind === "audioinput" && d.deviceId).map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone " + (i + 1)}</option>)}</select></label>
          <p className="streamer-help">Streaming begins when you click Start streaming. Keep this page open while streaming.</p>
          {!busy ? <button className="streamer-primary" data-testid="streamer-start" disabled={enablingDevices || (!useCamera && !useMicrophone)} onClick={start}>Start streaming <span aria-hidden="true">↗</span></button> : <button className="streamer-stop" data-testid="streamer-stop" onClick={stop}>{phase === "starting" ? "Cancel" : "Stop streaming"}</button>}
          {error && <p className="streamer-error" role="alert">{error}</p>}
        </section>
      </div>
      <section className={"streamer-card streamer-share " + (phase === "live" ? "" : "pending")} aria-labelledby="streamer-share-title">
        <div><h2 id="streamer-share-title">Share your stream</h2><p>{phase === "live" ? "Anyone with a link can receive this stream while you are live." : "Your viewer links appear once the stream is live."}</p></div>
        {phase === "live" && <div className="streamer-links">
          <label>Browser viewer<div><input data-testid="streamer-viewer-url" value={links.viewer} readOnly onFocus={e => e.target.select()} /><button onClick={() => copy(links.viewer)}>Copy browser link</button></div></label>
          {links.sdk ? <><label>C# WebRTC 2.0 sample<div><input data-testid="streamer-sdk-url" value={links.sdk} readOnly onFocus={e => e.target.select()} /><button onClick={() => copy(links.sdk)}>Copy C# link</button></div></label>
          <p className="streamer-help">Paste the C# link into the channel URL in the updated Duplex 2.0 sample, then connect. It opens in receive-only mode.</p></> :
          <p className="streamer-help" data-testid="streamer-sdk-unavailable">C# receiving requires HTTPS. Ask the server administrator to enable HTTPS for this server.</p>}
          <span role="status" className="streamer-copy-status">{notice}</span>
        </div>}
      </section>
      <footer className="streamer-footer">Medialooks Video SDK · Peer-to-peer WebRTC</footer>
    </main>
  );
};
