import React, { FC, useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { Video, VideoProps } from "../Video";
import { updateGeneralSettings } from "../../../actions";
import { CameraResolutions } from "../../../dto";
import { resolutions } from "../../../config/WebRTC";
import { PlayVideoClick } from "../PlayVideoClick";
import adapter from "webrtc-adapter";

export interface VideoWrapperProps extends VideoProps {
  stream: MediaStream | null;
  isLocal: boolean;
  readonly volume: number;
}

export const VideoWrapper: FC<Readonly<VideoWrapperProps>> = ({
  stream,
  isLocal,
  volume,
  muted,
  ...props
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dispatch = useDispatch();

  const dimensions = useCallback(() => {
    if (videoRef.current?.videoWidth && videoRef.current?.videoHeight) {
      const resolution = `${videoRef.current.videoWidth}x${videoRef.current?.videoHeight}`;
      if (resolution in resolutions) {
        dispatch(updateGeneralSettings({ resolution: resolution as CameraResolutions }));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (stream) {
        video.srcObject = stream;
        if (adapter.browserDetails.browser === "safari") {
          setTimeout(() => {
            video.style.display = "none";
            setTimeout(() => (video.style.display = "block"), 100);
          }, 1000);
        }
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && isLocal) {
      videoElement.addEventListener("loadedmetadata", dimensions);
    }

    return () => {
      if (videoElement && isLocal) videoElement.removeEventListener("loadedmetadata", dimensions);
    };
  }, [dimensions, isLocal]);

  return (
    <>
      <Video
        data-cy={isLocal ? "local-video" : "remote-video"}
        {...props}
        muted={muted}
        ref={videoRef}
      />
      {!!videoRef.current && !isLocal && <PlayVideoClick videoEl={videoRef.current} />}
    </>
  );
};
