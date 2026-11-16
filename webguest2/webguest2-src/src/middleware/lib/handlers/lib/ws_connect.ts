import { io, Socket } from "socket.io-client";
import { bindEventHandlers } from "../../socket_handlers";
import { WebRtcState } from "../../../../store/type";
import { DEFAULT_NOTIFY, DEFAULT_VER, DEFAULT_VISIBILITY } from "../constants";
import { WorkingMode } from "../../../../dto";
import { StoreType } from "../../../../store";

const prepareQuery = (state: WebRtcState) => {
  const query: { [key: string]: string } = {
    public: JSON.stringify(state.localPeerInfo),
    visible: DEFAULT_VISIBILITY,
    notify: DEFAULT_NOTIFY,
    ver: DEFAULT_VER,
    id: state.generalSettings.id ?? "",
  };

  if (state.workingMode === WorkingMode.Publisher) {
    query["id"] = state.targetId;
    // A source is an authenticated host, not a guest of an existing access_id.
    // The configured auth service decides whether to accept this host.
    query["auth"] = JSON.stringify({});
  } else query["access_id"] = state.targetId;

  return query;
};

export const onWsConnect = (store: StoreType, action: {}, socket?: Socket) => {
  if (!socket) {
    const state = store.getState();
    const query = prepareQuery(state);
    socket = io(state.signalingUrl, { query, transports: ["websocket"] });
    bindEventHandlers(store, socket);

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    window.socket = socket;
  }
  return socket;
};
