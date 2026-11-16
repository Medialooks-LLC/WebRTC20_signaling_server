import { combineReducers } from "redux";

import cameras from "./cameras";
import mics from "./mics";
import generalSettings from "./generalSettings";
import localMediaConfig from "./localMediaConfig";
import peers from "./peers";
import media from "./media";
import peerConnectionConfig from "./peerConnectionConfig";
import localMediaStream from "./localMediaStream";
import remoteMediaStream from "./remoteMediaStream";
import targetId from "./targetId";
import roomName from "./roomName";
import enableDataChannels from "./enableDataChannels";
import localPeerInfo from "./localPeerInfo";
import messages from "./messages";
import online from "./online";
import hasWebRTC from "./hasWebRTC";
import hasInternet from "./hasInternet";
import loading from "./loading";
import maxAudioChannels from "./maxAudioChannels";
import showSecuredLinkSettings from "./showSecuredLinkSettings";
import encoders from "./encoders";
import securedPeer from "./securedPeer";
import guestPassword from "./guestPassword";
import guestLogin from "./guestLogin";
import sessionReady from "./sessionReady";
import readyToCall from "./readyToCall";
import showTooltip from "./showTooltip";
import localStreamMain from "./localStreamMain";
import workingMode from "./workingMode";
import awaiting from "./awaiting";
import prevMediaStreamConstraints from "./prevMediaStreamConstraints";
import defaultMedia from "./defaultMedia";
import ignorePrevConstraints from "./ignorePrevConstraints";
import signalingUrl from "./signalingUrl";
import showBannerForm from "./showBannerForm";
import remoteAudioMuted from "./remoteAudioMuted";
import autoJoin from "./autoJoin";
import volume from "./volume";
import joinInProgress from "./joinInProgress";
import vtVersion from "./vtVersion";

export default combineReducers({
  vtVersion,
  autoJoin,
  cameras,
  encoders,
  generalSettings,
  localMediaConfig,
  media,
  defaultMedia,
  mics,
  peerConnectionConfig,
  peers,
  localMediaStream,
  remoteMediaStream,
  targetId,
  roomName,
  enableDataChannels,
  localPeerInfo,
  messages,
  online,
  loading,
  awaiting,
  hasInternet,
  hasWebRTC,
  maxAudioChannels,
  showSecuredLinkSettings,
  securedPeer,
  guestLogin,
  guestPassword,
  sessionReady,
  readyToCall,
  localStreamMain,
  showTooltip,
  workingMode,
  prevMediaStreamConstraints,
  ignorePrevConstraints,
  signalingUrl,
  showBannerForm,
  remoteAudioMuted,
  volume,
  joinInProgress,
});
