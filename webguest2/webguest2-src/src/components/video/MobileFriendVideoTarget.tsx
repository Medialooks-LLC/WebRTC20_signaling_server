import "./assets/mobile-friend-video-target.scss";

import cx from "classnames";
import { toFinite } from "lodash";
import { useDrop, XYCoord } from "react-dnd";
import React, { FC, useCallback, useState } from "react";

import { FriendDragProps, MobileFriendVideoItem } from "./MobileFriendVideoItem";
import {
  FriendVideoItemProps,
  HORIZONTAL_VIDEO_HEIGHT,
  HORIZONTAL_VIDEO_WIDTH,
} from "./FriendVideoBase";

const getInitialPosition = (): FriendDragProps => {
  const { innerWidth } = window || {};

  return {
    top: 88,
    left: innerWidth - HORIZONTAL_VIDEO_WIDTH - 16,
  };
};

export const MobileFriendVideoTarget: FC<Readonly<FriendVideoItemProps>> = props => {
  const [startDrag, setStartDrag] = useState(false);

  const [position, setPosition] = useState<FriendDragProps>(getInitialPosition());

  const dropHandler = useCallback((item: FriendDragProps, monitor) => {
    const delta = monitor.getDifferenceFromInitialOffset() as XYCoord;

    const translateX = Math.round(toFinite(item.left) + delta.x);
    const translateY = Math.round(toFinite(item.top) + delta.y);

    const { innerWidth, innerHeight } = window || {};

    const translateTop = Math.max(0, translateY);
    const translateLeft = Math.max(0, translateX);

    const translateRight = Math.min(
      innerWidth - HORIZONTAL_VIDEO_WIDTH,
      HORIZONTAL_VIDEO_WIDTH + translateX,
    );
    const translateBottom = Math.min(
      innerHeight - HORIZONTAL_VIDEO_HEIGHT,
      HORIZONTAL_VIDEO_HEIGHT + translateY,
    );

    const left = Math.min(translateLeft, translateRight);
    const top = Math.min(translateTop, translateBottom);

    setPosition({ top: Math.max(0, top), left: Math.max(0, left) });

    return undefined;
  }, []);

  const [, drop] = useDrop(() => ({ accept: "video", drop: dropHandler }), []);

  return (
    <div
      className={cx("d-flex position-fixed mobile-friend-video-target", {
        "pointer-events-none": !startDrag,
      })}
    >
      <div className="d-flex flex-column flex-1 target-container position-relative">
        <div ref={drop} className="d-flex flex-1 position-relative">
          <MobileFriendVideoItem {...position} {...props} onTouch={setStartDrag} />
        </div>
      </div>
    </div>
  );
};
