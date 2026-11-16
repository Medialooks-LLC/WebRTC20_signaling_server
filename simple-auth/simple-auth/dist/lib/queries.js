"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authQuery = void 0;
const config_1 = __importDefault(require("config"));
const constants_1 = require("./constants");
exports.authQuery = {
    vt_auth_user: config_1.default.has("auth.login") ? config_1.default.get("auth.login") : constants_1.AUTH_USER,
    vt_auth_pass: config_1.default.has("auth.password") ? config_1.default.get("auth.password") : constants_1.AUTH_PASSWORD
};
//# sourceMappingURL=queries.js.map