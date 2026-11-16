import React, { FC, useEffect, useMemo } from "react";
import { DragSourceMonitor, useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";

import { FriendVideoBase, FriendVideoItemProps } from "./FriendVideoBase";

export interface FriendDragProps {
  readonly top?: number;
  readonly left?: number;
}

export const MobileFriendVideoItem: FC<Readonly<
  { onTouch?: (state: boolean) => void } & FriendVideoItemProps & FriendDragProps
>> = ({ left, top, onTouch, ...props }) => {
  const [{ isDragging }, drag, preview] = useDrag(
    {
      type: "video",
      item: { left, top },
      collect: (monitor: DragSourceMonitor) => ({
        isDragging: monitor.isDragging(),
      }),
    },
    [top, left],
  );

  const styles = useMemo(() => {
    const transform = `translate3d(${left}px, ${top}px, 0)`;

    return {
      transform,
      WebkitTransform: transform,
      height: isDragging ? 0 : "",
      opacity: isDragging ? 0 : 1,
    };
  }, [isDragging, left, top]);

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return (
    <div
      ref={drag}
      style={styles}
      // eslint-disable-next-line
      role="DraggableBox"
      className="position-absolute pointer-events-auto br-3 overflow-hidden"
      onTouchEnd={() => {
        if (onTouch) {
          onTouch(false);
        }
      }}
      onTouchStart={() => {
        if (onTouch) {
          onTouch(true);
        }
      }}
    >
      <FriendVideoBase {...props} />
    </div>
  );
};
