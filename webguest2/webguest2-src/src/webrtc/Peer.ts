import adapter from "webrtc-adapter";
import { applySenderParameters, trickleEncoders } from "./lib";
import * as constants from "../webrtc/constants";
import * as actions from "../actions";
import { joinRoom, removePeer } from "../actions";
import * as actionTypes from "../actions/constants";
import { StoreType } from "../store";
import { PeerProps, PeerType } from "./types";
import { shouldRestart } from "../helpers";

export class Peer {
  public readonly id: string;
  public readonly secure: boolean;
  private stream?: MediaStream;
  private closed = false;
  public pc: RTCPeerConnection;
  public ptype: PeerType;
  private readonly signalingPtype: PeerType;
  private messageQueue: Promise<void> = Promise.resolve();
  private pendingCandidates: (RTCIceCandidateInit | null)[] = [];
  private iceRestart = false;
  private store: StoreType;

  constructor({ id, secure, store, ptype, signalingPtype }: PeerProps) {
    this.emit = this.emit.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.start = this.start.bind(this);
    this.end = this.end.bind(this);
    this.handleStreamRemoved = this.handleStreamRemoved.bind(this);
    this.onCreateSessionDescriptionError = this.onCreateSessionDescriptionError.bind(this);
    this.run = this.run.bind(this);
    this.addTrack = this.addTrack.bind(this);
    this.bindTracks = this.bindTracks.bind(this);
    this.onConnectionStateChanged = this.onConnectionStateChanged.bind(this);
    this.onIceCandidate = this.onIceCandidate.bind(this);
    this.onIceConnectionStateChange = this.onIceConnectionStateChange.bind(this);
    this.onIceGatheringStateChange = this.onIceGatheringStateChange.bind(this);
    this.onGotRemoteTrack = this.onGotRemoteTrack.bind(this);
    this.handleOffer = this.handleOffer.bind(this);
    this.handleAnswer = this.handleAnswer.bind(this);
    this.handleCandidate = this.handleCandidate.bind(this);
    this.checkConnectionStateFailed = this.checkConnectionStateFailed.bind(this);
    this.checkClosed = this.checkClosed.bind(this);
    this.changeRemoteDescription = this.changeRemoteDescription.bind(this);
    this.makeOffer = this.makeOffer.bind(this);
    this.handleError = this.handleError.bind(this);

    this.id = id;
    this.store = store;
    this.secure = secure;
    this.ptype = ptype;
    this.signalingPtype = signalingPtype ?? ptype;
    const state = store.getState();
    this.pc = new RTCPeerConnection({ ...state.peerConnectionConfig });
    this.pc.onicecandidate = this.onIceCandidate;
    this.pc.onicecandidateerror = error => {
      this.store.dispatch(actions.logMessage("Candidate error", { error }));
    };
    this.pc.onconnectionstatechange = this.onConnectionStateChanged;
    this.pc.oniceconnectionstatechange = this.onIceConnectionStateChange;
    this.pc.onicegatheringstatechange = this.onIceGatheringStateChange;
    this.pc.ontrack = this.onGotRemoteTrack;
  }

  public run() {
    const state = this.store.getState();
    if (this.secure) {
      this.store.dispatch(actions.setSecuredPeer(this));
      if (state.guestPassword) {
        this.start();
      } else {
        this.store.dispatch(actions.setShowSecuredLinkSettings(true));
      }
    } else {
      if (state.autoJoin) {
        this.start();
      } else {
        this.store.dispatch(actions.setAutoJoin(true));
        this.store.dispatch(actions.setShowBannerForm(true));
      }
    }
  }

  onIceCandidate(e: RTCPeerConnectionIceEvent) {
    if (this.closed) return;
    const ice = e.candidate;
    if (ice) {
      const candidate = {
        candidate: {
          candidate: ice.candidate,
          sdpMid: ice.sdpMid,
          sdpMLineIndex: ice.sdpMLineIndex,
        },
      };
      const pcConfig = this.store.getState().peerConnectionConfig;
      if (
        adapter.browserDetails.browser === constants.FIREFOX &&
        pcConfig &&
        pcConfig.iceTransportPolicy &&
        candidate.candidate &&
        candidate.candidate.candidate &&
        candidate.candidate.candidate.indexOf(pcConfig.iceTransportPolicy) < 0
      ) {
        this.store.dispatch(
          actions.logMessage(
            `Ignoring ice candidate not matching pcConfig iceTransports type: ${pcConfig.iceTransportPolicy}`,
          ),
        );
      } else {
        this.send(constants.CANDIDATE, candidate);
      }
    } else {
      this.send(constants.END_OF_CANDIDATES, e);
    }
  }

  send(
    type: string,
    payload:
      | RTCSessionDescriptionInit
      | RTCPeerConnectionIceEvent
      | { candidate: RTCIceCandidateInit }
      | string,
  ) {
    const message = {
      to: this.id,
      type,
      payload,
      ptype: this.signalingPtype,
    };
    this.store.dispatch({ type: actionTypes.WS_MESSAGE, message });
  }

  onGotRemoteTrack(e: RTCTrackEvent) {
    e.track.onended = () => {
      this.store.dispatch(actions.logMessage("Remote track ended", { track: e.track }));
      this.stream?.removeTrack(e.track);
      if (this.isAllTracksEnded(this.stream)) {
        this.store.dispatch(actions.logMessage("All tracks ended", this.ptype));
        const state = this.store.getState();
        this.end(shouldRestart(state.workingMode, this.ptype));
      }
    };
    this.store.dispatch(
      actions.logMessage("Got remote track", { track: e.track, stream: e.streams[0] }),
    );
    if (e.streams.length > 0 && this.stream !== e.streams[0]) {
      this.stream = e.streams[0];
      this.store.dispatch(actions.setRemoteMediaStream(this.stream));
    }
  }

  isAllTracksEnded(stream?: MediaStream) {
    let isAllTracksEnded = true;
    if (!stream) return isAllTracksEnded;
    stream.getTracks().forEach(t => {
      isAllTracksEnded = t.readyState === constants.ENDED && isAllTracksEnded;
    });
    return isAllTracksEnded;
  }

  onIceGatheringStateChange(event: Event) {
    const peerConnection = event.target as RTCPeerConnection;
    this.store.dispatch(actions.iceGatheringStateChanged(peerConnection.iceGatheringState));
  }

  onConnectionStateChanged(event: Event) {
    const peerConnection = event.target as RTCPeerConnection;
    if (peerConnection.connectionState === constants.CONNECTED) {
      applySenderParameters(peerConnection, this.store.getState().localPeerInfo.vidBitrate);
    }
    this.checkConnectionStateFailed(peerConnection.connectionState);
    this.checkClosed(peerConnection.connectionState);
    this.store.dispatch(actions.connectionStateChanged(peerConnection.connectionState));
  }

  onIceConnectionStateChange(event: Event) {
    const peerConnection = event.target as RTCPeerConnection;
    this.store.dispatch(actions.iceConnectionStateChanged(peerConnection.iceConnectionState));
  }

  checkConnectionStateFailed(connectionState: RTCPeerConnectionState) {
    if (
      [constants.CONNECTED, constants.DISCONNECTED, constants.FAILED, constants.CLOSED].includes(
        connectionState,
      )
    ) {
      this.iceRestart = true;
    }
  }

  checkClosed(connectionState: RTCPeerConnectionState) {
    if ([constants.DISCONNECTED, constants.CLOSED, constants.FAILED].includes(connectionState)) {
      const state = this.store.getState();
      this.end(shouldRestart(state.workingMode, this.ptype));
    }
  }

  onCreateSessionDescriptionError(error: Error) {
    this.store.dispatch(actions.logMessage("Failed to create session description", { error }));
  }

  handleMessage({
    payload,
    type,
  }: Readonly<{
    payload?: any;
    type?: string;
  }>) {
    // Socket callbacks can deliver trickled ICE before setRemoteDescription has
    // finished. Keep descriptions/candidates ordered and buffer pre-offer ICE.
    this.messageQueue = this.messageQueue.then(async () => {
      if (this.closed) return;
      if (type === constants.OFFER && payload) {
        await this.handleOffer({ payload });
      } else if (type === constants.ANSWER && payload) {
        await this.handleAnswer({ payload });
      } else if (type === constants.CANDIDATE && payload) {
        await this.handleCandidate({ payload });
      } else if (type === constants.END_OF_CANDIDATES) {
        await this.handleCandidate({ payload: { candidate: null } });
      }
    }).catch(error => {
      if (!this.closed) this.store.dispatch(actions.logMessage("WebRTC message error", { type, error }));
    });
  }

  async handleOffer({ payload }: { payload: RTCSessionDescriptionInit }) {
    const sessionDescription = this.trickleEncoders({
      sdp: payload.sdp,
      type: payload.type,
    });
    await this.pc.setRemoteDescription(sessionDescription);
    if (this.closed) return;
    await this.flushCandidates();
    const answer = await this.pc.createAnswer();
    if (this.closed) return;
    await this.pc.setLocalDescription(answer);
    if (!this.closed) this.send(constants.ANSWER, answer);
  }

  async handleAnswer({ payload }: { payload: RTCSessionDescriptionInit }) {
    const sessionDescription = this.trickleEncoders({
      sdp: payload.sdp,
      type: payload.type,
    });
    await this.pc.setRemoteDescription(sessionDescription);
    if (!this.closed) await this.flushCandidates();
  }

  async handleCandidate({ payload }: { payload: { candidate: RTCIceCandidateInit | null } }) {
    const ice = payload.candidate;
    if (!this.pc.remoteDescription) {
      this.pendingCandidates.push(ice);
      return;
    }
    await this.addCandidate(ice);
  }

  private async flushCandidates() {
    while (!this.closed && this.pendingCandidates.length) {
      await this.addCandidate(this.pendingCandidates.shift()!);
    }
  }

  private async addCandidate(ice: RTCIceCandidateInit | null) {
    const candidate = ice
      ? new RTCIceCandidate({
          sdpMLineIndex: ice.sdpMLineIndex,
          sdpMid: ice.sdpMid,
          candidate: ice.candidate,
        })
      : ice;
    await this.pc
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      .addIceCandidate(candidate)
      .catch(error =>
        this.store.dispatch(actions.logMessage("addIceCandidate error", { candidate, error })),
      );
  }

  handleError(error: string) {
    if (error.indexOf("eVTR_E_") >= 0) {
      this.end();
    }
  }

  start(iceRestart = false) {
    const state = this.store.getState();
    let offerToReceive = this.ptype === "subscriber";
    if (state.vtVersion.isLegacy) {
      offerToReceive = this.ptype === "publisher";
    }
    this.makeOffer(
      {
        offerToReceiveAudio: offerToReceive,
        offerToReceiveVideo: offerToReceive,
        iceRestart: iceRestart || this.iceRestart,
      },
      offer => this.send(constants.OFFER, offer),
    );
  }

  restart() {
    this.start(true);
  }

  changeRemoteDescription() {
    this.makeOffer();
  }

  makeOffer(offerOptions?: RTCOfferOptions, onDone?: (offer: RTCSessionDescriptionInit) => void) {
    this.pc
      .createOffer(offerOptions)
      .then(offer => {
        this.pc
          .setLocalDescription(offer)
          .then(() => {
            if (onDone) onDone(offer);
          })
          .catch(error =>
            this.store.dispatch(actions.logMessage("setLocalDescription error", { error })),
          );
      })
      .then(() => {
        if (this.pc.remoteDescription) {
          return this.pc
            .setRemoteDescription(this.trickleEncoders(this.pc.remoteDescription))
            .then(() => {
              this.store.dispatch(
                actions.logMessage("Applied bandwidth restriction to setRemoteDescription", {
                  sdp: this.pc.remoteDescription?.sdp,
                }),
              );
            });
        }
      })
      .catch((error: Event) => {
        this.store.dispatch(actions.logMessage("createOffer error", { error }));
      });
  }

  end(reconnect?: boolean) {
    if (this.closed) return;
    this.handleStreamRemoved();
    if (reconnect) this.store.dispatch(joinRoom());
  }

  trickleEncoders(sessionDescription: RTCSessionDescriptionInit) {
    const state = this.store.getState();
    return trickleEncoders(
      sessionDescription,
      state.localPeerInfo.vidEncoder,
      state.localPeerInfo.audEncoder,
      state.localPeerInfo.vidBitrate,
      state.localPeerInfo.audBitrate,
    );
  }

  handleStreamRemoved() {
    this.closed = true;
    this.pendingCandidates = [];
    this.pc.close();
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    window.peer = null;
    this.store.dispatch(removePeer(this));
  }

  emit(eventName: string, payload?: object | string) {
    this.store.dispatch({
      type: eventName,
      payload,
    });
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    if (this.ptype === "subscriber") throw new Error("Track cannot be added to subscriber");
    this.store.dispatch(actions.logMessage(`Adding ${track.kind} track`, { track }));
    this.pc.addTrack(track, stream);
  }

  bindTracks(stream: MediaStream) {
    const tracks = stream.getTracks();
    if (tracks.length > 0) tracks.forEach(t => this.addTrack(t, stream));
  }
}
