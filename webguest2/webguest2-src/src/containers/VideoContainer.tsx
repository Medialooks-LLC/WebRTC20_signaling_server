import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthModal } from "../components/auth/AuthModal";
import { FriendVideo } from "../components/video/FriendVideo";
import { VideoLayout } from "../components/video/VideoLayout";
import { WorkingMode } from "../dto";
import { LayoutControl } from "../components/control/LayoutControl";
import { GeneralSettings } from "../components/control/GeneralSettings";
import { DndContainer } from "./DndContainer";
import { MobileFriendVideoTarget } from "../components/video/MobileFriendVideoTarget";
import { DndDragLayer } from "../components/dnd/DndDragLayer";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSelector } from "react-redux";
import { WebRtcState } from "../store/type";
import { BannerModal } from "../components/banner/BannerModal";
import { SoundSettingsWrapper } from "../components/control/SoundSettingsWrapper";
import { MainVideoWrapper } from "../components/ui/MainVideoWrapper";

export const VideoContainer: FC = () => {
  const { isMobile } = useMediaQuery();

  const remoteAudioMuted = useSelector((state: WebRtcState) => state.remoteAudioMuted);
  const online = useSelector((state: WebRtcState) => state.online);
  const awaiting = useSelector((state: WebRtcState) => state.awaiting);
  const loading = useSelector((state: WebRtcState) => state.loading);
  const showSecuredLinkSettings = useSelector(
    (state: WebRtcState) => state.showSecuredLinkSettings,
  );
  const generalSettings = useSelector((state: WebRtcState) => state.generalSettings);

  const [showChat, setShowChat] = useState(false);
  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(remoteAudioMuted);

  const canHideControls = useMemo(() => online && !showGeneralSettings, [
    online,
    showGeneralSettings,
  ]);

  const containerRef = useRef<
    HTMLDivElement & {
      webkitRequestFullscreen?: any;
      oRequestFullscreen?: any;
      msRequestFullscreen?: any;
      mozRequestFullscreen?: any;
    }
  >(null);
  const fullScreenRef = useRef<boolean>(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current?.requestFullscreen({ navigationUI: "hide" });
      } else if (containerRef.current?.webkitRequestFullscreen) {
        await containerRef.current?.webkitRequestFullscreen({ navigationUI: "hide" });
      } else if (containerRef.current?.oRequestFullscreen) {
        await containerRef.current?.oRequestFullscreen({ navigationUI: "hide" });
      } else if (containerRef.current?.msRequestFullscreen) {
        await containerRef.current?.msRequestFullscreen({ navigationUI: "hide" });
      } else if (containerRef.current?.mozRequestFullscreen) {
        await containerRef.current?.mozRequestFullscreen({ navigationUI: "hide" });
      }
    } catch (_) { /* The browser can deny fullscreen; keep the windowed player usable. */ }
  }, []);

  const exitFullScreen = useCallback(async () => {
    try {
      if (containerRef.current?.requestFullscreen) {
        await document.exitFullscreen();
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
      } else if (document.webkitExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        await document.webkitExitFullscreen();
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
      } else if (document.oExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        await document.oExitFullscreen();
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
      } else if (document.msExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        await document.msExitFullscreen();
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
      } else if (document.mozCancelFullscreen) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        await document.mozCancelFullscreen();
      }
    } catch (_) { /* The browser may already have left fullscreen. */ }
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (containerRef.current) {
      if (fullScreenRef.current) {
        exitFullScreen();
      } else {
        enterFullscreen();
      }
    }
  }, [enterFullscreen, exitFullScreen]);

  const onFullscreenChanged = useCallback(() => {
    fullScreenRef.current = !fullScreenRef.current;
    setFullScreen(fullScreenRef.current);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    setFullscreenSupported(Boolean(container && (
      container.requestFullscreen || container.webkitRequestFullscreen || container.oRequestFullscreen ||
      container.msRequestFullscreen || container.mozRequestFullscreen
    )));
    if (container) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      if (container.requestFullscreen) {
        container.addEventListener("fullscreenchange", onFullscreenChanged);
      } else if (container.webkitRequestFullscreen) {
        container.addEventListener("webkitfullscreenchange", onFullscreenChanged);
      } else if (container.oRequestFullscreen) {
        container.addEventListener("ofullscreenchange", onFullscreenChanged);
      } else if (container.msRequestFullscreen) {
        container.addEventListener("msfullscreenchange", onFullscreenChanged);
      } else if (container.mozRequestFullscreen) {
        container.addEventListener("mozfullscreenchange", onFullscreenChanged);
      }
    }
    return () => {
      if (container) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        if (container.requestFullscreen) {
          container.removeEventListener("fullscreenchange", onFullscreenChanged);
        } else if (container.webkitRequestFullscreen) {
          container.removeEventListener("webkitfullscreenchange", onFullscreenChanged);
        } else if (container.oRequestFullscreen) {
          container.removeEventListener("ofullscreenchange", onFullscreenChanged);
        } else if (container.msRequestFullscreen) {
          container.removeEventListener("msfullscreenchange", onFullscreenChanged);
        } else if (container.mozRequestFullscreen) {
          container.removeEventListener("mozfullscreenchange", onFullscreenChanged);
        }
      }
    };
  }, [onFullscreenChanged]);

  const showFriendVideo = useSelector((state: WebRtcState) =>
    Boolean(
      [WorkingMode.Duplex, WorkingMode.Publisher].includes(state.workingMode) &&
        state.generalSettings.selfie &&
        (!state.localMediaConfig.cameraMuted || state.localStreamMain),
    ),
  );

  return (
    <div className="d-flex flex-1 bg-dark overflow-hidden video-container" ref={containerRef}>
      <DndContainer>
        <div className="d-flex flex-1 flex-column position-relative">
          <MainVideoWrapper />
          <VideoLayout
            showChat={showChat}
            showFullScreen={fullscreenSupported}
            fullScreen={fullScreen}
            canHide={canHideControls}
            onChatClick={() => setShowChat(true)}
            onFullScreenClick={toggleFullScreen}
            controls={showControls => (
              <LayoutControl
                onShowSoundSettings={() => setShowSoundSettings(true)}
                disabledControls={showSecuredLinkSettings}
                fullScreen={fullScreen}
                showChat={showChat}
                showControls={showControls}
                showFullScreen={fullscreenSupported}
                onChatClick={() => setShowChat(true)}
                showGeneralSettings={showGeneralSettings}
                onSettingsClick={() => setShowGeneralSettings(true)}
                onFullScreenClick={toggleFullScreen}
              />
            )}
          >
            {showControls => <>{showFriendVideo && <FriendVideo showControls={showControls} />}</>}
          </VideoLayout>
        </div>

        {showFriendVideo && (
          <>
            {isMobile && <MobileFriendVideoTarget />}

            <DndDragLayer />
          </>
        )}
      </DndContainer>

      <GeneralSettings
        show={showGeneralSettings}
        settings={generalSettings}
        onClose={() => setShowGeneralSettings(false)}
        disabled={loading || awaiting}
      />

      {!isMobile && (
        <SoundSettingsWrapper
          show={showSoundSettings}
          disabled={loading || awaiting}
          onClose={() => setShowSoundSettings(false)}
        />
      )}

      <AuthModal />
      <BannerModal />
    </div>
  );
};
