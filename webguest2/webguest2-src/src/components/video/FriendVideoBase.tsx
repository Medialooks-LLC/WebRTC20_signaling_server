import "./assets/friend-video-base.scss";

import cx from "classnames";
import { Transition } from "react-transition-group";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";

import { IconButton } from "../ui/IconButton";
import { MinusIcon } from "../icons/MinusIcon";
import { SwitchIcon } from "../icons/SwitchIcon";
import { MuteButtonWrapper } from "../control/MuteButtonWrapper";
import { MaximizeIcon } from "../icons/MaximizeIcon";
import { WorkingMode } from "../../dto";
import { VideoWrapper } from "../ui/webrtc/VideoWrapper";
import { useDispatch, useSelector } from "react-redux";
import { setLocalStreamMain } from "../../actions";
import { WebRtcState } from "../../store/type";

export const VERTICAL_VIDEO_WIDTH = 168;
export const VERTICAL_VIDEO_HEIGHT = 222;
export const HORIZONTAL_VIDEO_WIDTH = 267;
export const HORIZONTAL_VIDEO_HEIGHT = 185;

// const defaultVerticalContainerStyle = {
//   width: VERTICAL_VIDEO_WIDTH,
//   height: VERTICAL_VIDEO_HEIGHT,
//   transition: `all 300ms ease-in-out`,
//   transitionProperty: "width, height",
// };
// const transitionVerticalContainerStyles = {
//   exited: { width: 64, height: 64 },
//   exiting: { width: 64, height: 64 },
//   entered: { width: VERTICAL_VIDEO_WIDTH, height: VERTICAL_VIDEO_HEIGHT },
//   entering: { width: VERTICAL_VIDEO_WIDTH, height: VERTICAL_VIDEO_HEIGHT },
// };

const defaultHorizontalContainerStyle = {
  width: HORIZONTAL_VIDEO_WIDTH,
  height: HORIZONTAL_VIDEO_HEIGHT,
  transition: `all 300ms ease-in-out`,
  transitionProperty: "width, height",
};
const transitionHorizontalContainerStyles = {
  exited: { width: 64, height: 64 },
  exiting: { width: 64, height: 64 },
  entered: { width: HORIZONTAL_VIDEO_WIDTH, height: HORIZONTAL_VIDEO_HEIGHT },
  entering: { width: HORIZONTAL_VIDEO_WIDTH, height: HORIZONTAL_VIDEO_HEIGHT },
};

const defaultElementsStyle = {
  opacity: 1,
  transition: `opacity 300ms ease-in-out`,
};
const transitionElementsStyles = {
  exited: { opacity: 0 },
  exiting: { opacity: 0 },
  entered: { opacity: 1 },
  entering: { opacity: 1 },
};

export interface FriendVideoItemProps {
  showControls?: boolean;
  className?: string;
  isDragging?: boolean;
  canMinimize?: boolean;
}

export const FriendVideoBase: FC<Readonly<FriendVideoItemProps>> = ({
  isDragging,
  showControls,
  canMinimize,
  className,
  ...props
}) => {
  const [show, setShow] = useState(true);

  const defaultContainerStyle = useMemo(() => {
    return defaultHorizontalContainerStyle;
  }, []);
  const transitionContainerStyles = useMemo(() => {
    return transitionHorizontalContainerStyles;
  }, []);

  const dispatch = useDispatch();

  const localStreamMain = useSelector((state: WebRtcState) => state.localStreamMain);
  const muted = useSelector((state: WebRtcState) =>
    state.localStreamMain ? state.remoteAudioMuted : true,
  );
  const mirror = useSelector((state: WebRtcState) =>
    localStreamMain ? false : state.generalSettings.mirroring ?? true,
  );
  const stream: MediaStream | null = useSelector((state: WebRtcState) => {
    switch (state.workingMode) {
      case WorkingMode.Preview:
        return null;
      case WorkingMode.Streamer:
        return null;
      case WorkingMode.Duplex:
      case WorkingMode.Publisher:
        if (state.localStreamMain) {
          return state.remoteMediaStream;
        } else {
          return state.localMediaStream;
        }
      default:
        return null;
    }
  });

  const volume = useSelector((state: WebRtcState) => {
    if (state.localStreamMain) {
      if (state.remoteAudioMuted) return 0;
      else return state.volume / 100.0;
    } else return 0;
  });

  const onSwapVideo = useCallback(() => dispatch(setLocalStreamMain(!localStreamMain)), [
    dispatch,
    localStreamMain,
  ]);

  useEffect(() => {
    if (!canMinimize && !show) {
      setShow(true);
    }
  }, [canMinimize, show]);

  return (
    <Transition in={show} timeout={300}>
      {state => (
        <div
          style={{
            ...defaultElementsStyle,
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            ...(!showControls ? transitionElementsStyles[state] : {}),
          }}
          className="friend-video-base"
        >
          <div
            className={cx(
              "overflow-hidden br-3 position-relative video-wrapper",
              { "cursor-move": isDragging },
              className,
            )}
            style={{
              ...defaultContainerStyle,
              // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
              // @ts-ignore
              ...transitionContainerStyles[state],
            }}
          >
            <div
              style={{
                ...defaultElementsStyle,
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore
                ...transitionElementsStyles[state],
              }}
              className="d-flex flex-grow-1 flex-shrink-1"
            >
              <VideoWrapper
                {...props}
                isLocal={!localStreamMain}
                muted={muted}
                mirror={mirror}
                stream={stream}
                volume={volume}
              />
            </div>

            {!isDragging && (
              <div
                role="button"
                onClick={() => {
                  if (show) {
                    onSwapVideo();
                  }
                }}
                className={cx("position-absolute d-flex video-overflow", {
                  "with-overflow cursor-pointer": show,
                })}
              >
                <div className="d-flex align-items-center justify-content-center flex-shrink-1 flex-grow-1 position-relative">
                  <SwitchIcon
                    style={{
                      ...defaultElementsStyle,
                      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                      // @ts-ignore
                      ...transitionElementsStyles[state],
                    }}
                    size={40}
                  />

                  {canMinimize && (
                    <IconButton
                      active={true}
                      icon={show ? <MinusIcon /> : <MaximizeIcon />}
                      className="position-absolute overflow-minimize-button"
                      onClick={event => {
                        event.stopPropagation();

                        setShow(x => !x);
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {Boolean(!isDragging && localStreamMain) && (
              <div
                style={{
                  ...defaultElementsStyle,
                  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                  // @ts-ignore
                  ...transitionElementsStyles[state],
                }}
                className={cx(
                  "d-flex flex-column justify-content-end position-absolute pb-6 px-3 mute-layout",
                  // {
                  //   "align-items-center":
                  //     friendCameraOrientation === VideoOrientation.Vertical && localStreamMain,
                  // },
                )}
              >
                {state !== "exited" && (
                  <MuteButtonWrapper
                    isFriend={true}
                    visible={localStreamMain && show && state === "entered"}
                    showMyCamera={false}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Transition>
  );
};
