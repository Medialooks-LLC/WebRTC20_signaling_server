import { createStore, applyMiddleware, Store } from "redux";
import reducer from "../reducers";
import { createLogger } from "redux-logger";
import thunkMiddleware from "redux-thunk";
import {
  createEventsMiddleware,
  createMediaMiddleware,
  createWebocketMiddleware,
} from "../middleware";
import { DispatchType, WebRtcState } from "./type";

const websocketMiddleware = createWebocketMiddleware();
const mediaMiddleware = createMediaMiddleware();
const eventsMiddleware = createEventsMiddleware();

const middleware: any[] = [thunkMiddleware, websocketMiddleware, eventsMiddleware, mediaMiddleware];

if (
  process.env.NODE_ENV === "development" ||
  (localStorage && localStorage.getItem("DEBUG") !== null)
) {
  const loggerMiddleware = createLogger({
    collapsed: () => false, //(_getState, _action) => false
  });
  middleware.push(loggerMiddleware);
}

export type StoreType = Store<WebRtcState> & {
  dispatch: DispatchType;
};

const store: StoreType = createStore(reducer, applyMiddleware(...middleware));

export default store;
