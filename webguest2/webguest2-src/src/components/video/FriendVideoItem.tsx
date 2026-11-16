import { useDrag } from "react-dnd";
import React, { FC, useEffect } from "react";

import { getEmptyImage } from "react-dnd-html5-backend";
import { FriendDragProps } from "./MobileFriendVideoItem";
import { FriendVideoBase, FriendVideoItemProps } from "./FriendVideoBase";

export const FriendVideoItem: FC<Readonly<
  { containerClassName?: string } & FriendVideoItemProps & FriendDragProps
>> = ({ top, left, containerClassName, ...props }) => {
  const [{ isDragging }, drag, preview] = useDrag(
    {
      type: "video",
      item: { top, left },
      collect: monitor => ({ isDragging: monitor.isDragging() }),
    },
    [top, left],
  );

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return (
    <div ref={drag} className={containerClassName}>
      <FriendVideoBase {...props} isDragging={isDragging} />
    </div>
  );
};
