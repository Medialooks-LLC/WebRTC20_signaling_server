import { createAction } from "@reduxjs/toolkit";

export const messageReceived = createAction<any>("message/received");
