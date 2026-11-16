"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareAuth = void 0;
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const nanoid_1 = require("nanoid");
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("config"));
const constants_1 = require("./constants");
const queries_1 = require("./queries");
const signalingUrl = config_1.default.has("signaling.serverUrl")
    ? config_1.default.get("signaling.serverUrl")
    : constants_1.DEFAULT_SIGNALING_URL;
const prepareAuth = () => {
    const auth = (0, socket_io_client_1.default)(signalingUrl, {
        transports: ["websocket"],
        query: Object.assign(Object.assign({}, queries_1.authQuery), { id: (0, nanoid_1.nanoid)() }),
        reconnection: true,
    });
    auth.on("connect", () => {
        console.log(`Auth client ${auth.id} has connected successfully to ${signalingUrl}`);
    });
    auth.on("connect_error", (err) => {
        console.log(`Error connecting to ${signalingUrl}`, err);
    });
    auth.on("authorize", (privateProps, cb) => {
        cb(null, { username: privateProps.username, role: "user", proof: (0, uuid_1.v4)() });
    });
    return auth;
};
exports.prepareAuth = prepareAuth;
//# sourceMappingURL=auth.js.map