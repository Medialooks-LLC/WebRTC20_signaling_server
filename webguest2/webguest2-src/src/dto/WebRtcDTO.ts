export interface CommonPeerProps {
  readonly name?: string;
  readonly vidEncoder?: string;
  readonly audEncoder?: string;
  readonly vidBitrate?: string;
  readonly audBitrate?: string;
  readonly location?: string;
  readonly id?: string;
  readonly webrtc_src_fps?: number;
  // Whether this guest sends a picture; the host shows a "camera is off" placeholder when "off"
  readonly camera?: "on" | "off";
}

export interface LocalPeerProps extends CommonPeerProps {
  readonly submode: string;
  readonly mode?: string;
}

export interface SecuredPeerProps extends LocalPeerProps {
  readonly guest_login: string | null;
  readonly guest_password: string | null;
}

export enum WorkingMode {
  Preview = "preview",
  Streamer = "webguest",
  Duplex = "duplex",
  Publisher = "publisher",
}

export type PeerInfo = Partial<LocalPeerProps> &
  Partial<{ guest_login: string; guest_password: string }>;
