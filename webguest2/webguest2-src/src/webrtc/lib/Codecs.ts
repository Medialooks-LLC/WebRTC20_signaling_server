import * as constants from "../constants";
import adapter from "webrtc-adapter";

const trickleEncoder = (sdp: string, encoder: string): string => {
  //Find codec id
  let strCodecId = "";
  let nFound = sdp.indexOf(encoder.toUpperCase());
  if (nFound === -1) nFound = sdp.indexOf(encoder.toLowerCase());
  if (nFound !== -1) {
    strCodecId = sdp.substr(nFound - 10, 10);
    nFound = strCodecId.indexOf(":");
    if (nFound !== -1) {
      strCodecId = strCodecId.substr(nFound + 1, strCodecId.length - nFound);
      strCodecId = strCodecId.replace(" ", "");
    }
  }

  if (strCodecId) {
    //Find codecs string
    nFound = sdp.indexOf("m=video");
    if (nFound !== -1) {
      const strBegin = sdp.substr(0, nFound);
      let strSDP = sdp.substr(nFound, sdp.length - nFound);
      nFound = strSDP.indexOf("\r\n");
      const strEnd = strSDP.substr(nFound, strSDP.length - nFound);
      strSDP = strSDP.substr(0, nFound);
      let strSAVPF = "SAVPF";
      nFound = strSDP.indexOf(strSAVPF);
      if (nFound === -1) {
        strSAVPF = strSAVPF.toLowerCase();
        nFound = strSDP.indexOf(strSAVPF);
      }
      if (nFound !== -1) {
        //Modify codecs string
        strSDP = strSDP.replace(strCodecId + " ", "");
        strSDP = strSDP.replace("SAVPF", `SAVPF ${strCodecId}`);
        return strBegin + strSDP + strEnd;
      }
    }
  }

  return sdp;
};

const convertBitrate = (bitrate: string): number => {
  let br = parseFloat(bitrate);
  if (bitrate.toUpperCase().includes("K")) br = br * 1000;
  if (bitrate.toUpperCase().includes("M")) br = br * 1000000;
  return br;
};

const trickleAudioBitrate = (sdp: string, audioBitrate: string): string => {
  const bandwidth = convertBitrate(audioBitrate);
  if (bandwidth > 0) {
    const result = sdp.match(/a=fmtp:111\s(.*)\r\n/);
    if (result && result[1]) {
      const settings = result[1].split(";").filter(s => s.indexOf("maxaveragebitrate=") === -1);
      settings.push(`maxaveragebitrate=${bandwidth}`);
      sdp = sdp.replace(/a=fmtp:111.*\r\n/g, `a=fmtp:111 ${settings.join(";")}\r\n`);
    }
  }
  return sdp;
};

const trickleVideoBitrate = (sdp: string, videoBitrate: string): string => {
  let bandwidth = convertBitrate(videoBitrate);
  if (bandwidth > 0) {
    let modifier = "AS";
    bandwidth = bandwidth / 1000;
    if (adapter.browserDetails.browser === "firefox") {
      bandwidth = bandwidth >>> 0;
      modifier = "TIAS";
    }
    if (sdp.indexOf("b=" + modifier + ":") === -1) {
      // insert b= after c= line
      sdp = sdp.replace(
        /m=video (.*)\r\nc=IN (.*)\r\n/,
        "m=video $1\r\nc=IN $2\r\nb=" + modifier + ":" + bandwidth + "\r\n",
      );
    } else {
      sdp = sdp.replace(new RegExp(`b=${modifier}:.*\r\n`), `b=${modifier}:${bandwidth}\r\n`);
    }
    if (modifier === "AS") sdp = addVideoStartBitrate(sdp, Math.min(1500, Math.round(bandwidth / 2)));
  }
  return sdp;
};

// Chrome starts a call at ~300 kbps and ramps up slowly, so the first seconds are soft.
// It reads x-google-start-bitrate (kbps) from the remote description's video fmtp lines.
const addVideoStartBitrate = (sdp: string, startKbps: number): string => {
  if (startKbps <= 0) return sdp;
  return sdp
    .split(/(?=\r\nm=)/)
    .map(section => {
      if (!section.replace(/^\r\n/, "").startsWith("m=video")) return section;
      return section.replace(/(a=fmtp:\d+ )([^\r\n]*)/g, (line, prefix: string, params: string) =>
        /x-google-start-bitrate=/.test(params) || /apt=/.test(params)
          ? line
          : `${prefix}${params};x-google-start-bitrate=${startKbps}`,
      );
    })
    .join("");
};

const isScreenTrack = (track: MediaStreamTrack) => {
  const settings = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
  return Boolean(settings.displaySurface) || /screen|window|tab/i.test(track.label);
};

// Applied once the connection is up:
//  - the same cap as b=AS through the standard API
//  - what to protect under CPU/network pressure: a camera keeps its frame rate (a person at 10 fps
//    looks worse than at 720p in a mixed program), a screen share keeps its resolution (text).
export const applySenderParameters = (pc: RTCPeerConnection, videoBitrate?: string) => {
  if (!pc.getSenders) return;
  const maxBitrate = videoBitrate ? convertBitrate(videoBitrate) : 0;
  pc.getSenders()
    .filter(sender => sender.track?.kind === "video" && sender.getParameters)
    .forEach(sender => {
      const track = sender.track as MediaStreamTrack;
      const screen = isScreenTrack(track);
      if ("contentHint" in track) track.contentHint = screen ? "detail" : "motion";

      const params = sender.getParameters() as RTCRtpSendParameters & { degradationPreference?: string };
      if (!params.encodings || params.encodings.length === 0) return;
      if (maxBitrate > 0) params.encodings.forEach(encoding => (encoding.maxBitrate = maxBitrate));
      params.degradationPreference = screen ? "maintain-resolution" : "maintain-framerate";
      sender.setParameters(params).catch(() => {
        /* b=AS in the SDP and the browser defaults still apply */
      });
    });
};

export const trickleEncoders = (
  sessionDescription: RTCSessionDescriptionInit,
  videoEncoder?: string,
  audioEncoder?: string,
  videoBitrate?: string,
  audioBitrate?: string,
) => {
  if (!sessionDescription.sdp) return new RTCSessionDescription(sessionDescription);
  let sdp = sessionDescription.sdp.toString();
  if (videoEncoder && videoEncoder.toUpperCase() !== constants.DEFAULT_VIDEO_ENCODER) {
    sdp = trickleEncoder(sdp, videoEncoder);
  }

  if (audioEncoder && audioEncoder.toUpperCase() !== constants.DEFAULT_AUDIO_ENCODER) {
    sdp = trickleEncoder(sdp, audioEncoder);
  }

  if (audioBitrate && audioBitrate.toLowerCase() !== constants.DEFAULT_AUDIO_BITRATE) {
    sdp = trickleAudioBitrate(sdp, audioBitrate);
  }

  if (videoBitrate && videoBitrate.toLowerCase() !== constants.DEFAULT_VIDEO_BITRATE) {
    sdp = trickleVideoBitrate(sdp, videoBitrate);
  }
  return new RTCSessionDescription({ sdp, type: sessionDescription.type });
};

const preferCodec = (codecs: RTCRtpCodecCapability[], mimeType: string) => {
  const otherCodecs: RTCRtpCodecCapability[] = [];
  const sortedCodecs: RTCRtpCodecCapability[] = [];

  codecs.forEach(codec => {
    if (codec.mimeType === mimeType) {
      sortedCodecs.push(codec);
    } else {
      otherCodecs.push(codec);
    }
  });

  return sortedCodecs.concat(otherCodecs);
};

export const changeVideoCodec = (pc: RTCPeerConnection, mimeType: string) => {
  if (!RTCRtpSender.getCapabilities) return;

  const transceivers = pc.getTransceivers();

  transceivers.forEach(transceiver => {
    if (transceiver.sender.track) {
      const kind = transceiver.sender.track.kind;
      const sendCapabilities = RTCRtpSender.getCapabilities(kind);
      const receiveCapabilities = RTCRtpReceiver.getCapabilities(kind);
      if (sendCapabilities && receiveCapabilities) {
        let sendCodecs = sendCapabilities.codecs;
        let recvCodecs = receiveCapabilities.codecs;
        if (kind === constants.VIDEO) {
          sendCodecs = preferCodec(sendCodecs, mimeType);
          recvCodecs = preferCodec(recvCodecs, mimeType);
          const codecs = [...sendCodecs, ...recvCodecs];
          transceiver.setCodecPreferences(codecs);
        }
      }
    }
  });
  if (pc.onnegotiationneeded) {
    pc.onnegotiationneeded(new Event("negotiationneeded"));
  }
};
