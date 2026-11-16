export const en = {
  errors: {
    roomJoin: {
      title: "Room join error",
      message: "Unknown error",
    },
    connectivity: {
      title: "Connectivity Error",
      message: "Connection is not allowed",
    },
    callReadiness: {
      title: "Unable to call",
      message: "Application was not ready",
    },
    overconstrained: {
      title: "Overconstrained error",
    },
    unauthorized: {
      title: "Not authorized",
      message: "You are not authorized",
    },
    signaling: {
      title: "Signalling server error",
      message: "No signalling server connection",
    },
  },
  labels: {
    camera: {
      turnOn: "Turn on camera",
      turnOff: "Turn off camera",
    },
    fullscreen: {
      turnOff: "Turn off fullscreen",
      turnOn: "Turn on fullscreen",
    },
    mic: {
      turnOff: "Turn off microphone",
      turnOn: "Turn on microphone",
    },
    sound: {
      turnOn: "Turn the sound on",
      volume: "Volume",
    },
    connection: {
      no: "No Signalling Server Connection",
    },
    webRtc: {
      notSupported: "WebRTC is not supported in your browser",
    },
  },
  remoteSettings: {
    name: "Name",
    location: "Location",
    resolution: "Resolution",
    frameRate: "Frame Rate",
    audioInput: "Select a mic",
    videoInput: "Select a camera",
    videoBitrate: "Video Bitrate",
    encoder: "Video Encoder",
    audioBitrate: "Audio Bitrate",
    mirroring: "Mirroring",
    audioChannels: "Audio Channels",
    cameraMuted: "Camera Off",
    micOff: "Microphone Off",
    audioEnhancements: "Audio Enhancements",
    otherChannels: "Other channels",
  },
  securedClient: {
    disconnectReasons: {
      title: "Guest Disconnected",
      // eslint-disable-next-line @typescript-eslint/camelcase
      not_authorized: "You are not authorized to access this link",
      // eslint-disable-next-line @typescript-eslint/camelcase
      time_after_expire: "Link has expired",
      // eslint-disable-next-line @typescript-eslint/camelcase
      time_before_start: "Link is pending activation",
      // eslint-disable-next-line @typescript-eslint/camelcase
      time_expired: "Link has expired",
      // eslint-disable-next-line @typescript-eslint/camelcase
      max_connections_exceeded: "Can't connect: maximum connections limit exceeded",
      // eslint-disable-next-line @typescript-eslint/camelcase
      connection_limit_exceeded: "Can't connect: connection limit exceeded",
      // eslint-disable-next-line @typescript-eslint/camelcase
      duplicated_name: "Name [name] is already in use",
      // eslint-disable-next-line @typescript-eslint/camelcase
      sfu_not_available: "Stream is not supported by SFU. Check you video/audio devices",
      // eslint-disable-next-line @typescript-eslint/camelcase
      auth_validate_connect_failed: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        eVTR_E_SGN_UsersChannelsExceded: "Can't connect: maximum connections limit exceeded",
        // eslint-disable-next-line @typescript-eslint/camelcase
        eVTR_E_SGN_ChannelsExceeded: "Can't connect: maximum connections limit exceeded",
        // eslint-disable-next-line @typescript-eslint/camelcase
        eVTR_E_SGN_ChannelsExceded: "Can't connect: maximum connections limit exceeded",
        // eslint-disable-next-line @typescript-eslint/camelcase
        eVTR_E_Timeout: "Authorization provider timed out",
      },
      unknown: "Can't connect: unknown reason",
    },
  },
  forms: {
    auth: {
      enterYourName: "Enter your name",
      enterYourLogin: "Enter your login",
      enterYourPassword: "Enter your password",
      enterYourLocation: "Enter your location",
    },
    audioChannels: {
      title: "Audio Channels",
      otherChannelsPlaceholder: "all",
    },
    cameraSettings: {
      title: "Camera",
      screenLabel: "Screen",
    },
    encoderSettings: {
      title: "Video Encoder",
    },
    micSettings: {
      title: "Audio Input",
    },
  },
  formErrors: {
    wrongName: "Wrong name",
    wrongLogin: "Wrong login",
    wrongLocation: "Wrong location",
    wrongPassword: "Wrong password",
    noInternetConnection: "No internet connection",
  },
  securedLinkSettings: {
    guestLogin: "Guest Login",
    guestPassword: "Guest Password",
  },
};
