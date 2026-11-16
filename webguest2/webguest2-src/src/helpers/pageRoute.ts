// Keep the player prefix separate from the peer ID used by signaling and credentials.
export const getPageRoute = (pathname = window.location.pathname) => {
  const parts = pathname.split("/").filter(Boolean);
  const first = (parts[0] || "").toLowerCase();
  const isPlayer = first === "player";
  const isStreamer = first === "streamer";
  const isSender = /^(wg|webguest|wg2|duplex|webguest2|pb|publisher)$/.test(first);
  const rawId = (isStreamer ? "" : isPlayer || isSender ? parts[1] : parts[0]) || "";
  let targetId = rawId;
  try {
    targetId = decodeURIComponent(rawId);
  } catch (_) {
    // A malformed escape must not prevent the page from rendering.
  }
  return { isPlayer, isStreamer, isSender, targetId };
};
