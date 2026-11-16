import "./assets/general-settings.scss";

import cx from "classnames";
import { update } from "immupdate";
import React, { FC, useCallback, useMemo, useState } from "react";

import { Input } from "../ui/Input";
import { MenuGroup } from "../menu/MenuGroup";
import { useTimeout } from "../../hooks/useTimeout";
import { MenuMainItem } from "../menu/MenuMainItem";
import { EncoderSettings } from "./EncoderSettings";
import { VideoBitrateSettings } from "./VideoBitrateSettings";
import { ResolutionSettings } from "./ResolutionSettings";
import { GeneralSettingsProps } from "../../dto";
import { OrientationType, useMediaQuery } from "../../hooks/useMediaQuery";
import { WorkingMode } from "../../dto";
import { AudioChannelSettings } from "./AudioChannelSettings";
import { MenuSwitcherItem } from "../menu/MenuSwitcherItem";
import { AudioBitrateSettings } from "./AudioBitrateSettings";
import { MicSettings } from "./MicSettings";
import { CameraSettings } from "./CameraSettings";
import i18n from "../../i18n/i18n_config";
import { useDispatch, useSelector } from "react-redux";
import { settingsChanged } from "../../actions";
import { WebRtcState } from "../../store/type";
import { FpsSettings } from "./FpsSettings";

export enum GeneralSettingsState {
  Main = "main",
  Camera = "camera",
  Encoder = "encoder",
  VideoBitrate = "videoBitrate",
  Resolution = "resolution",
  AudioChannels = "audioChannels",
  AudioBitrate = "audioBitrate",
  AudioInput = "audioInput",
  FrameRate = "frameRate",
  AudioEnhancements = "audioEnhancements",
}

export const GeneralSettings: FC<Readonly<{
  readonly show: boolean;
  readonly onClose: () => void;
  readonly settings: GeneralSettingsProps;
  readonly disabled: boolean;
}>> = ({ show, onClose, settings, disabled }) => {
  const [state, setState] = useState<GeneralSettingsState>(GeneralSettingsState.Main);

  const cameras = useSelector((state: WebRtcState) => state.cameras);
  const mics = useSelector((state: WebRtcState) => state.mics);
  const videoEncoders = useSelector((state: WebRtcState) => state.encoders);
  const localStream = useSelector((state: WebRtcState) => state.localMediaStream);
  const workingMode = useSelector((state: WebRtcState) => state.workingMode);

  const isMain = useMemo(() => state === GeneralSettingsState.Main, [state]);
  const isEncoder = useMemo(() => state === GeneralSettingsState.Encoder, [state]);
  const isBitrate = useMemo(() => state === GeneralSettingsState.VideoBitrate, [state]);
  const isResolution = useMemo(() => state === GeneralSettingsState.Resolution, [state]);
  const isAudioChannels = useMemo(() => state === GeneralSettingsState.AudioChannels, [state]);
  const isAudioBitrate = useMemo(() => state === GeneralSettingsState.AudioBitrate, [state]);
  const isAudioInput = useMemo(() => state === GeneralSettingsState.AudioInput, [state]);
  const isCamera = useMemo(() => state === GeneralSettingsState.Camera, [state]);
  const isFps = useMemo(() => state === GeneralSettingsState.FrameRate, [state]);
  const videoMissing = useMemo(() => !localStream || localStream.getVideoTracks().length < 1, [
    localStream,
  ]);
  const audioMissing = useMemo(() => !localStream || localStream.getAudioTracks().length < 1, [
    localStream,
  ]);

  const dispatch = useDispatch();

  const onChange = useCallback(
    (generalSettings: GeneralSettingsProps) => {
      dispatch(settingsChanged(generalSettings));
    },
    [dispatch],
  );

  useTimeout({
    delay: 500,
    deps: [show],
    onOver: () => {
      if (!show) {
        setState(GeneralSettingsState.Main);
      }
    },
  });

  const { isMobile, orientation } = useMediaQuery();

  const isMobileLandscape = useMemo(() => isMobile && orientation === OrientationType.Landscape, [
    isMobile,
    orientation,
  ]);

  const audioChannelsVal = useMemo(() => {
    if (settings.audioChannels) {
      if (settings.audioChannels === -1) return settings.otherChannels;
      else return `${settings.audioChannels * 2 + 1}, ${settings.audioChannels * 2 + 2}`;
    }
  }, [settings.audioChannels, settings.otherChannels]);

  const videoInputLabel = useMemo(() => {
    return settings.videoInput === "screenShare"
      ? i18n.t("forms.cameraSettings.screenLabel")
      : cameras.find(cam => cam.deviceId === settings.videoInput)?.label;
  }, [cameras, settings.videoInput]);

  const audioInputLabel = useMemo(() => {
    return mics.find(mic => mic.deviceId === settings.audioInput)?.label;
  }, [mics, settings.audioInput]);

  return (
    <MenuGroup
      testId="general-settings"
      show={show}
      onClose={onClose}
      className={cx("general-settings", {
        "desktop-settings": !isMobileLandscape,
        "main-landscape": workingMode !== WorkingMode.Preview && isMobileLandscape,
        "mb-2": !isMobileLandscape,
        active: show,
      })}
    >
      <div
        className={cx("d-flex hidden-scrollbar", {
          "flex-row h-100": isMobileLandscape,
          "flex-column overflow-x-hidden": !isMobileLandscape,
        })}
      >
        {Boolean(workingMode !== WorkingMode.Preview && (isMain || isMobileLandscape)) && (
          <div
            className={cx("px-3", {
              "pt-4": !isMobileLandscape,
              "d-flex main-landscape-item": isMobileLandscape,
            })}
          >
            <div className="d-flex flex-1 flex-column justify-content-center">
              <Input
                data-cy="name-input"
                label={i18n.t("remoteSettings.name")}
                className="mb-3"
                value={settings.name ?? ""}
                labelClassName="font-weight-semi-bold"
                onChange={name => onChange(update(settings, { name }))}
              />
              <Input
                data-cy="location-input"
                label={i18n.t("remoteSettings.location")}
                className="mb-3"
                value={settings.location ?? ""}
                labelClassName="font-weight-semi-bold"
                onChange={location => onChange(update(settings, { location }))}
              />
            </div>
          </div>
        )}

        <div
          className={cx("d-flex flex-1 flex-column hidden-scrollbar", {
            "flex-1 overflow-x-hidden": isMobileLandscape,
          })}
        >
          {isMain && (
            <>
              {workingMode !== WorkingMode.Preview && (
                <>
                  <MenuMainItem
                    testId="resolution"
                    title={i18n.t("remoteSettings.resolution")}
                    value={settings.resolution ?? ""}
                    onClick={() => setState(GeneralSettingsState.Resolution)}
                    disabled={disabled || videoMissing}
                  />
                  <MenuMainItem
                    testId="frameRate"
                    title={i18n.t("remoteSettings.frameRate")}
                    value={settings.frameRate ? `${settings.frameRate} FPS` : ""}
                    onClick={() => setState(GeneralSettingsState.FrameRate)}
                    disabled={disabled || videoMissing}
                  />
                  <MenuMainItem
                    testId="audioInput"
                    title={i18n.t("remoteSettings.audioInput")}
                    value={audioInputLabel}
                    onClick={() => setState(GeneralSettingsState.AudioInput)}
                    disabled={disabled}
                  />
                  <MenuMainItem
                    testId="videoInput"
                    title={i18n.t("remoteSettings.videoInput")}
                    value={videoInputLabel}
                    onClick={() => setState(GeneralSettingsState.Camera)}
                    disabled={disabled}
                  />
                  {videoEncoders.length > 0 && (
                    <MenuMainItem
                      testId="videoBitrate"
                      title={i18n.t("remoteSettings.videoBitrate")}
                      value={videoMissing || !settings.videoBitrate ? "" : settings.videoBitrate}
                      onClick={() => setState(GeneralSettingsState.VideoBitrate)}
                      disabled={disabled || videoEncoders.length <= 1 || videoMissing}
                    />
                  )}
                  {videoEncoders.length > 0 && (
                    <MenuMainItem
                      testId="encoder"
                      title={i18n.t("remoteSettings.encoder")}
                      value={videoMissing || !settings.encoder ? "" : settings.encoder}
                      onClick={() => setState(GeneralSettingsState.Encoder)}
                      disabled={
                        disabled ||
                        videoEncoders.length <= 1 ||
                        workingMode === WorkingMode.Streamer ||
                        videoMissing
                      }
                    />
                  )}
                  <MenuMainItem
                    testId="audioBitrate"
                    title={i18n.t("remoteSettings.audioBitrate")}
                    value={audioMissing || !settings.audioBitrate ? "" : settings.audioBitrate}
                    onClick={() => setState(GeneralSettingsState.AudioBitrate)}
                    disabled={disabled || audioMissing}
                  />
                  <MenuSwitcherItem
                    testId="audioEnhancements"
                    title={i18n.t("remoteSettings.audioEnhancements")}
                    value={settings.audioEnhancements}
                    onChange={audioEnhancements =>
                      onChange(update(settings, { audioEnhancements }))
                    }
                    disabled={disabled}
                  />
                  <MenuSwitcherItem
                    testId="mirroring"
                    title={i18n.t("remoteSettings.mirroring")}
                    value={settings.mirroring ?? false}
                    onChange={mirroring => onChange(update(settings, { mirroring }))}
                    disabled={disabled || videoMissing}
                  />
                </>
              )}
              {workingMode !== WorkingMode.Streamer && (
                <MenuMainItem
                  testId="audioChannels"
                  title={i18n.t("remoteSettings.audioChannels")}
                  value={audioChannelsVal}
                  onClick={() => setState(GeneralSettingsState.AudioChannels)}
                  disabled={disabled}
                />
              )}
            </>
          )}
          {isResolution && (
            <ResolutionSettings
              value={settings.resolution}
              onBack={() => setState(GeneralSettingsState.Main)}
              onChange={resolution => onChange(update(settings, { resolution }))}
              disabled={disabled || videoMissing}
            />
          )}
          {isEncoder && (
            <EncoderSettings
              value={settings.encoder}
              onBack={() => setState(GeneralSettingsState.Main)}
              onChange={encoder => onChange(update(settings, { encoder }))}
              encoders={videoEncoders}
              disabled={disabled || videoMissing}
            />
          )}
          {isBitrate && (
            <VideoBitrateSettings
              value={settings.videoBitrate}
              onBack={() => setState(GeneralSettingsState.Main)}
              onChange={videoBitrate => onChange(update(settings, { videoBitrate }))}
              disabled={disabled || videoMissing}
            />
          )}
          {isAudioChannels && (
            <AudioChannelSettings
              value={settings.audioChannels}
              onBack={() => setState(GeneralSettingsState.Main)}
              onChange={audioChannels => onChange(update(settings, { audioChannels }))}
              onOtherChannelsChange={otherChannels => onChange(update(settings, { otherChannels }))}
              otherChannels={settings.otherChannels}
              disabled={disabled}
            />
          )}
          {isAudioBitrate && (
            <AudioBitrateSettings
              value={settings.audioBitrate}
              onBack={() => setState(GeneralSettingsState.Main)}
              onChange={audioBitrate => onChange(update(settings, { audioBitrate }))}
              disabled={disabled || audioMissing}
            />
          )}
          {isAudioInput && (
            <MicSettings
              devices={mics}
              value={settings.audioInput}
              onChange={audioInput => onChange(update(settings, { audioInput }))}
              onBack={() => setState(GeneralSettingsState.Main)}
              disabled={disabled}
            />
          )}
          {isCamera && (
            <CameraSettings
              onBack={() => setState(GeneralSettingsState.Main)}
              devices={cameras}
              onChange={videoInput => onChange(update(settings, { videoInput }))}
              currentDeviceId={settings.videoInput}
              disabled={disabled}
            />
          )}
          {isFps && (
            <FpsSettings
              value={settings.frameRate}
              onBack={() => setState(GeneralSettingsState.Main)}
              onChange={frameRate => onChange(update(settings, { frameRate }))}
              disabled={disabled || videoMissing}
            />
          )}
        </div>
      </div>
    </MenuGroup>
  );
};
