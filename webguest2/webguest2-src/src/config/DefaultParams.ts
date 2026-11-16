export const DEFAULT_AUDIO_BITRATE = "192k";
// Cap for the guest video; 2.5M was too low for 1080p (Auto prefers 1080p now).
export const DEFAULT_VIDEO_BITRATE = "4M";
// VP9 is what the host (MConnect) negotiation is known to work with.
// H264 was tried as default (hardware encoding) but guest video did not reach the host - see git history.
export const DEFAULT_VIDEO_ENCODER = "VP9";
export const DEFAULT_LOCATION = "Web";
export const DEFAULT_MIRRORING = false;
// No self-view overlay on top of the program video (the lobby already shows the camera preview).
export const DEFAULT_SELFIE = false;
export const DEFAULT_FRAME_RATE = 30;
