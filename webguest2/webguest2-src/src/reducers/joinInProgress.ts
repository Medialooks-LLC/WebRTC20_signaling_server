import { joinRoomAction, roomJoinCompleted, roomJoinErrorAction } from "../actions";
import { createReducer } from "@reduxjs/toolkit";

export default createReducer<boolean>(false, builder => {
  builder.addCase(joinRoomAction, () => true);
  builder.addCase(roomJoinErrorAction, () => false);
  builder.addCase(roomJoinCompleted, () => false);
});
