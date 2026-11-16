import cx from "classnames";
import React, { FC } from "react";
import { useEffect, useState } from "react";

import { PlayIcon } from "../icons/PlayIcon";
import { checkVideoPlaying } from "../../helpers";

import styles from "./PlayVideoClick.module.scss";

export const PlayVideoClick: FC<Readonly<{
  className?: string;
  videoEl: HTMLVideoElement;
}>> = ({ videoEl, className }) => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      if (checkVideoPlaying(videoEl)) {
        setShow(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [videoEl]);

  const playVideo = () => {
    videoEl.play();
    setShow(false);
  };

  if (!show) return null;
  if (checkVideoPlaying(videoEl)) setShow(false);

  return (
    <div data-cy="play-icon" className={cx(styles.playVideoClick, className)} onClick={playVideo}>
      <PlayIcon size={100} />
    </div>
  );
};
