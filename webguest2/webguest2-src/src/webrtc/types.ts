// Reconstructed: the original type-only module was not part of the build output.
import { StoreType } from "../store";

export type PeerType = "publisher" | "subscriber";

export interface PeerProps {
  id: string;
  secure: boolean;
  store: StoreType;
  ptype: PeerType;
  // The remote request's correlation label can differ from our local send/receive role.
  signalingPtype?: PeerType;
}
