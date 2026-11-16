export const iceServerUpdate = (
  clientProps: { turn_server?: string },
  iceServersConfig?: RTCIceServer[],
): RTCIceServer[] => {
  if (!clientProps.turn_server || clientProps.turn_server.length === 0) {
    return iceServersConfig ?? [];
  }

  const updatedServers: { [k: string]: RTCIceServer & { url?: string } } = {};

  if (iceServersConfig) {
    iceServersConfig.forEach(config => {
      const url = typeof config.urls === "string" ? config.urls : config.urls[0];
      updatedServers[`${config.username}:${config.credential}@${url}`] = config;
    });
  }

  clientProps.turn_server.split(";").forEach(turn => {
    const at = turn.indexOf("@");
    const colon = turn.indexOf(":");
    const username = turn.substring(0, at);
    const credential = turn.substring(at + 1, colon);
    const url = `turn:${turn.substring(colon + 1)}`;
    updatedServers[`${username}:${credential}@${url}`] = {
      username,
      credential,
      urls: [url],
    };
  });

  return Object.values(updatedServers);
};
