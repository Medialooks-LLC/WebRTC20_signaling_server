export const checkVideoPlaying = (videoEl: HTMLVideoElement) => {
  return videoEl.currentTime > 0 && !videoEl.paused && !videoEl.ended && videoEl.readyState > 2;
};
