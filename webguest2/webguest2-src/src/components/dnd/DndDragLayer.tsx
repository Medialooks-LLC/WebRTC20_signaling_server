import "./assets/dnd-drag-layer.scss";

import React, { FC, useMemo } from "react";
import { useDragLayer } from "react-dnd";

import {
  FriendVideoBase,
  FriendVideoItemProps,
  HORIZONTAL_VIDEO_HEIGHT,
  HORIZONTAL_VIDEO_WIDTH,
} from "../video/FriendVideoBase";

export const DndDragLayer: FC<Readonly<FriendVideoItemProps>> = props => {
  const { isDragging, initialOffset, currentOffset } = useDragLayer(monitor => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getSourceClientOffset(),
    initialOffset: monitor.getInitialSourceClientOffset(),
  }));

  const styles = useMemo(() => {
    if (!initialOffset || !currentOffset) {
      return {
        display: "none",
      };
    }

    const { innerWidth, innerHeight } = window || {};

    const translateTop = Math.max(0, currentOffset.y);
    const translateLeft = Math.max(0, currentOffset.x);

    const translateRight = Math.min(
      innerWidth - HORIZONTAL_VIDEO_WIDTH,
      HORIZONTAL_VIDEO_WIDTH + currentOffset.x,
    );
    const translateBottom = Math.min(
      innerHeight - HORIZONTAL_VIDEO_HEIGHT,
      HORIZONTAL_VIDEO_HEIGHT + currentOffset.y,
    );

    const translateX = Math.min(translateLeft, translateRight);
    const translateY = Math.min(translateTop, translateBottom);

    const transform = `translate(${translateX}px, ${translateY}px)`;

    return {
      transform,
      WebkitTransform: transform,
    };
  }, [currentOffset, initialOffset]);

  if (!isDragging) {
    return null;
  }

  return (
    <div className="position-fixed pointer-events-none dnd-drag-layer">
      <div style={styles}>
        {/* eslint-disable-next-line */}
        <div role="BoxPreview">
          <FriendVideoBase {...props} />
        </div>
      </div>
    </div>
  );
};
