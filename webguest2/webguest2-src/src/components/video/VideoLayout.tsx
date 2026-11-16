import "./assets/video-layout.scss";

import React, { FC, ReactNode, useCallback, useEffect, useState } from "react";
import { LogoIcon } from "../icons/LogoIcon";
import { NotSupported } from "../control/NotSupported";
import cx from "classnames";
import { IconButton } from "../ui/IconButton";
import { ChatIcon } from "../icons/ChatIcon";
import { FullscreenIcon } from "../icons/FullscreenIcon";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTimeout } from "../../hooks/useTimeout";
import { useSelector } from "react-redux";
import { WebRtcState } from "../../store/type";

export const VideoLayout: FC<Readonly<{
  canHide?: boolean;

  children: (showControls: boolean) => ReactNode;
  controls: (showControls: boolean) => ReactNode;

  onChatClick: () => void;
  onFullScreenClick: () => void;

  fullScreen: boolean;
  showChat: boolean;
  showFullScreen: boolean;
}>> = ({
  canHide,
  showChat,
  showFullScreen,
  children,
  controls,
  fullScreen,
  onChatClick,
  onFullScreenClick,
}) => {
  const [state, setState] = useState(true);

  const { isMobile } = useMediaQuery();
  const hasWebRTC = useSelector((state: WebRtcState) => state.hasWebRTC);

  const eventHandler = useCallback(() => {
    if (!state) {
      setState(true);
    }
  }, [state]);

  useTimeout({
    onOver: () => {
      if (state && canHide) {
        setState(false);
      }
    },
    delay: 5000,
    deps: [state, canHide],
  });

  useEffect(() => {
    const { body } = document;

    body.addEventListener("click", eventHandler);
    body.addEventListener("keypress", eventHandler);
    body.addEventListener("mousemove", eventHandler);

    return () => {
      body.removeEventListener("click", eventHandler);
      body.removeEventListener("keypress", eventHandler);
      body.removeEventListener("mousemove", eventHandler);
    };
  }, [eventHandler]);

  return (
    <div className="d-flex flex-column flex-1 position-absolute video-layout">
      <div className="d-flex flex-column flex-1 position-relative overflow-hidden">
        <div className="position-fixed pt-4 pl-3 top-layout" />

        {!hasWebRTC && <NotSupported />}

        <div
          className={cx("d-flex flex-column flex-1 middle-layout", {
            "position-fixed mobile-middle-layout": isMobile,
          })}
        >
          <div className="flex-1 position-relative">{children(state)}</div>
        </div>

        <div className="position-fixed bottom-layout">
          <div className="d-flex position-relative">{controls(state)}</div>
        </div>

        <LogoIcon size={24} className="position-fixed logo-layout" />

        <div className="d-flex d-sm-none position-fixed control-layout">
          {!showChat && (
            <div className={cx("d-none", { "mr-3": showFullScreen })}>
              <IconButton icon={<ChatIcon />} onClick={onChatClick} />
            </div>
          )}

          {showFullScreen && (
            <IconButton onClick={onFullScreenClick} icon={<FullscreenIcon active={fullScreen} />} />
          )}
        </div>
      </div>
    </div>
  );
};
