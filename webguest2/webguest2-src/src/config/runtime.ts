declare global {
  interface Window {
    __WEBRTC_CONFIG__?: { sdkSignalingUrl?: string | null; tlsEnabled?: boolean };
  }
}

export const sdkSignalingBase = (): string | null => {
  const configured = new URLSearchParams(window.location.search).get("sdkSignaling") ||
    window.__WEBRTC_CONFIG__?.sdkSignalingUrl || process.env.REACT_APP_SDK_SIGNALING_URL;
  if (configured) return configured;
  // The SDK requires HTTPS. HTTP-only containers can still publish to browsers.
  if (window.location.protocol !== "https:" && window.__WEBRTC_CONFIG__?.tlsEnabled === false) return null;
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  return local && window.location.port === "8080" ? "https://127.0.0.1:8443" : window.location.origin;
};
