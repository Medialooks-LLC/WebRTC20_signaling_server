import { DndProvider } from "react-dnd";
import React, { FC, ReactNode, useMemo } from "react";
import { TouchBackend } from "react-dnd-touch-backend";
import { HTML5Backend } from "react-dnd-html5-backend";

import { useMediaQuery } from "../hooks/useMediaQuery";

export const DndContainer: FC<Readonly<{
  readonly children: ReactNode;
}>> = ({ children }) => {
  const { isMobile } = useMediaQuery();

  const backend = useMemo(() => {
    if (isMobile) {
      return TouchBackend;
    }

    return HTML5Backend;
  }, [isMobile]);

  return <DndProvider backend={backend}>{children}</DndProvider>;
};
