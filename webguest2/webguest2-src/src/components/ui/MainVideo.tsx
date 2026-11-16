import "./assets/video.scss";

import cx from "classnames";
import React, { FC } from "react";
import { Watermark } from "./Watermark";
import { VideoWrapper, VideoWrapperProps } from "./webrtc/VideoWrapper";

export const MainVideo: FC<Readonly<{
  disabled?: boolean;
  containerClassName?: string;
}> &
  Readonly<VideoWrapperProps>> = ({ containerClassName, disabled, ...videoWrapperProps }) => (
  <div className={cx("d-flex custom-video-container", { disabled }, containerClassName)}>
    <VideoWrapper {...videoWrapperProps} />
    <Watermark />
  </div>
);
