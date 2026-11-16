import "./assets/layout-control.scss";

import cx from "classnames";
import { animated, useSpring } from "react-spring";
import React, { FC, useCallback, useMemo } from "react";

import { PlayButton } from "./PlayButton";
import { MuteButtonWrapper } from "./MuteButtonWrapper";
import { WorkingMode } from "../../dto";
import { MicButton } from "./MicButton";
import { CameraButton } from "./CameraButton";
import { FullscreenButton } from "./FullscreenButton";
import { ChatButton } from "./ChatButton";
import { SettingsButton } from "./SettingsButton";
import { ScreenShareButton } from "./ScreenShareButton";
import { canShareScreen, cameraToReturnTo, rememberCamera, SCREEN_SHARE } from "../../helpers/screenShare";
import { useDispatch, useSelector } from "react-redux";
import { WebRtcState } from "../../store/type";
import i18n from "../../i18n/i18n_config";
import { store as notificationsStore } from "react-notifications-component";
import { notificationsCommonProps } from "../../helpers";
import { joinRoom, leaveRoom, settingsChanged, toggleCamera, toggleMute } from "../../actions";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const LayoutControl: FC<Readonly<{
  disabledControls?: boolean;

  showControls: boolean;
  showChat: boolean;

  showFullScreen: boolean;
  fullScreen: boolean;
  showGeneralSettings: boolean;

  onChatClick: () => void;
  onFullScreenClick: () => void;
  onSettingsClick: () => void;
  onShowSoundSettings: () => void;
}>> = ({
  disabledControls,
  showControls,
  fullScreen,
  showChat,
  onChatClick,
  showFullScreen,
  onSettingsClick,
  onFullScreenClick,
  showGeneralSettings,
  onShowSoundSettings,
}) => {
  const mediaQuery = useMediaQuery();

  const online = useSelector((state: WebRtcState) => state.online);
  const loading = useSelector((state: WebRtcState) => state.loading);
  const localMediaSettings = useSelector((state: WebRtcState) => state.localMediaConfig);
  const readyToCall = useSelector((state: WebRtcState) => state.readyToCall);
  const hasInternet = useSelector((state: WebRtcState) => state.hasInternet);
  const localStreamMain = useSelector((state: WebRtcState) => state.localStreamMain);
  const workingMode = useSelector((state: WebRtcState) => state.workingMode);
  const generalSettings = useSelector((state: WebRtcState) => state.generalSettings);
  const videoInput = generalSettings.videoInput;
  const cameras = useSelector((state: WebRtcState) => state.cameras);
  const sharingScreen = videoInput === SCREEN_SHARE;

  const disabled = useMemo(() => !hasInternet || loading || !readyToCall, [
    loading,
    hasInternet,
    readyToCall,
  ]);

  const animatedStyles = useSpring({
    bottom: showControls ? 0 : -96,
  });

  const dispatch = useDispatch();

  const showNotification = useCallback((title, message, type = "danger") => {
    notificationsStore.addNotification({
      title: title,
      message: message,
      type: type,
      ...notificationsCommonProps,
    });
  }, []);

  const onActionClick = useCallback(() => {
    if (!readyToCall) {
      showNotification(
        i18n.t("errors.callReadiness.title"),
        i18n.t("errors.callReadiness.message"),
      );
      return;
    }
    try {
      if (online) dispatch(leaveRoom());
      else dispatch(joinRoom());
    } catch (e) {
      showNotification(
        i18n.t("errors.roomJoin.title"),
        (e as Error).message ?? (i18n.t("errors.roomJoin.message") as string),
      );
    }
  }, [readyToCall, showNotification, online, dispatch]);

  const onScreenShareToggle = useCallback(() => {
    // Same path as picking a camera in Settings: updates the settings and switches the device
    if (sharingScreen) {
      const camera = cameraToReturnTo(cameras);
      if (camera) dispatch(settingsChanged({ ...generalSettings, videoInput: camera }));
    } else {
      rememberCamera(videoInput);
      dispatch(settingsChanged({ ...generalSettings, videoInput: SCREEN_SHARE }));
    }
  }, [dispatch, sharingScreen, cameras, videoInput, generalSettings]);

  const onCameraMuteToggle = useCallback(() => {
    dispatch(toggleCamera(!localMediaSettings.cameraMuted));
  }, [dispatch, localMediaSettings.cameraMuted]);

  const onMuteToggle = useCallback(() => {
    dispatch(toggleMute(!localMediaSettings.micOff));
  }, [dispatch, localMediaSettings.micOff]);

  const showMuteButton = useSelector((state: WebRtcState) =>
    Boolean(!state.localStreamMain && state.workingMode !== WorkingMode.Streamer),
  );

  return (
    <animated.div
      style={animatedStyles}
      className="d-flex flex-1 position-absolute align-items-center px-3 layout-control"
    >
      {Boolean(showMuteButton && !mediaQuery.isMobile) && (
        <div className={cx("d-flex", { placeholder: mediaQuery.isTablet })}>
          <MuteButtonWrapper
            visible={!localStreamMain}
            onShowSoundSettings={onShowSoundSettings}
            showMyCamera={!localStreamMain}
            tooltipHidden={!showControls}
            disabled={disabledControls}
            className={cx("mr-sm-3", {
              "mr-3": localStreamMain,
            })}
          />
        </div>
      )}

      <div
        className={cx("d-flex flex-1", {
          "justify-content-around justify-content-sm-center": workingMode !== WorkingMode.Streamer,
          "justify-content-center": workingMode === WorkingMode.Streamer,
        })}
      >
        {Boolean(showMuteButton && mediaQuery.isMobile) && (
          <div className="d-flex">
            <MuteButtonWrapper
              visible={!localStreamMain}
              showMyCamera={!localStreamMain}
              tooltipHidden={!showControls}
              disabled={disabledControls}
              className={cx("mr-sm-3", {
                "mr-3": localStreamMain,
              })}
            />
          </div>
        )}

        {workingMode !== WorkingMode.Preview && (
          <>
            <CameraButton
              active={!localMediaSettings.cameraMuted}
              onClick={onCameraMuteToggle}
              disabled={disabledControls}
              className={cx("mr-sm-3", {
                "mr-3": localStreamMain || workingMode === WorkingMode.Streamer,
              })}
            />
            <MicButton
              active={!localMediaSettings.micOff}
              onClick={onMuteToggle}
              disabled={disabledControls}
              className={cx("mr-sm-3", {
                "mr-3": localStreamMain || workingMode === WorkingMode.Streamer,
              })}
            />
            {/* Phones' browsers can't capture the screen */}
            {!mediaQuery.isMobile && canShareScreen() && (
              <ScreenShareButton
                sharing={sharingScreen}
                onClick={onScreenShareToggle}
                disabled={disabledControls}
                className={cx("mr-sm-3", {
                  "mr-3": localStreamMain || workingMode === WorkingMode.Streamer,
                })}
              />
            )}
          </>
        )}

        <SettingsButton
          onClick={onSettingsClick}
          active={showGeneralSettings}
          disabled={disabledControls}
          className={cx("mr-sm-3", {
            "mr-3": localStreamMain || workingMode === WorkingMode.Streamer,
          })}
        />

        {workingMode !== WorkingMode.Preview && (
          <PlayButton
            workingMode={workingMode}
            online={online}
            loading={loading}
            disabled={disabled || disabledControls}
            onClick={onActionClick}
          />
        )}
      </div>

      {workingMode === WorkingMode.Preview && <div className="d-flex d-sm-none placeholder" />}

      <div className="d-none d-sm-flex justify-content-end placeholder">
        {!showChat && (
          <div className={cx("d-none", { "mr-3": showFullScreen })}>
            <ChatButton onClick={onChatClick} disabled={disabledControls} />
          </div>
        )}

        {showFullScreen && (
          <FullscreenButton
            disabled={disabledControls}
            onClick={onFullScreenClick}
            active={fullScreen}
          />
        )}
      </div>
    </animated.div>
  );
};
