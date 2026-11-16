import "./assets/friend-video.scss";

import cx from "classnames";
import React, { FC, useCallback, useEffect, useState } from "react";

import { DndTarget } from "../dnd/DndTarget";
import { FriendVideoItemProps } from "./FriendVideoBase";
import { useMediaQuery } from "../../hooks/useMediaQuery";

enum VideoPosition {
  TopLeft = "top-left",
  TopRight = "top-right",
  BottomLeft = "bottom-left",
  BottomRight = "bottom-right",
}

export const FriendVideo: FC<Readonly<FriendVideoItemProps>> = ({ className }) => {
  const [canShow, setCanShow] = useState(true);
  const [position, setPosition] = useState(VideoPosition.TopRight);
  const { isMobile } = useMediaQuery();

  const resizeHandler = useCallback(({ target }) => {
    setCanShow(target.innerWidth > 576 ? target.innerHeight > 200 : target.innerHeight > 300);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    addEventListener("resize", resizeHandler);

    // eslint-disable-next-line
    return () => removeEventListener("resize", resizeHandler);
  }, [resizeHandler]);

  return (
    <div className="d-flex position-absolute friend-video-wrapper">
      <div
        className={cx("d-flex position-relative flex-1 p-3 friend-video", {
          "vertical-orientation": false,
          "invisible pointer-events-none": !canShow,
        })}
      >
        {!isMobile && (
          <>
            <div className="d-flex flex-column flex-1 target-container">
              <DndTarget
                top={0}
                left={0}
                className={className}
                showVideo={position === VideoPosition.TopLeft}
                onDrop={() => setPosition(VideoPosition.TopLeft)}
              />
              <DndTarget
                className="align-items-end"
                showVideo={position === VideoPosition.BottomLeft}
                onDrop={() => setPosition(VideoPosition.BottomLeft)}
              />
            </div>
            <div className="d-flex flex-1 flex-column target-container">
              <DndTarget
                canMinimize={!isMobile}
                className="dnd-target justify-content-end"
                showVideo={position === VideoPosition.TopRight}
                onDrop={() => setPosition(VideoPosition.TopRight)}
              />
              <DndTarget
                className="justify-content-end align-items-end"
                showVideo={position === VideoPosition.BottomRight}
                onDrop={() => setPosition(VideoPosition.BottomRight)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
