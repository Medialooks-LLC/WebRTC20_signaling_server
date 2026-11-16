import "./assets/video.scss";

import React, { forwardRef } from "react";
import cx from "classnames";

export interface VideoProps
  extends React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> {
  readonly mirror: boolean;
}

export const Video = forwardRef(
  (
    { className, mirror, muted, ...props }: Readonly<VideoProps>,
    ref: React.Ref<HTMLVideoElement>,
  ) => {
    return (
      <video
        ref={ref}
        {...props}
        className={cx("custom-video", className)}
        autoPlay={true}
        loop={true}
        playsInline={true}
        style={mirror ? { transform: "scaleX(-1)" } : {}}
        muted={muted}
      />
    );
  },
);

Video.displayName = "Video";
