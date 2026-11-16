import React, { FC } from "react";
import cx from "classnames";
import { useDrop } from "react-dnd";

import { FriendVideoItem } from "../video/FriendVideoItem";
import { FriendVideoItemProps } from "../video/FriendVideoBase";
import { FriendDragProps } from "../video/MobileFriendVideoItem";

export interface DndTargetProps extends Omit<FriendVideoItemProps, "className">, FriendDragProps {
  onDrop: () => void;
  showVideo: boolean;
  className?: string;
  videoClassName?: string;
}

export const DndTarget: FC<Readonly<DndTargetProps>> = ({
  onDrop,
  showVideo,
  className,
  videoClassName,
  ...props
}) => {
  const [, drop] = useDrop({
    accept: "video",
    drop: onDrop,
  });

  return (
    <div
      ref={drop}
      // eslint-disable-next-line
      role="DraggableBox"
      className={cx("d-flex flex-1 pointer-events-auto", className)}
    >
      {showVideo && <FriendVideoItem {...props} className={videoClassName} />}
    </div>
  );
};
