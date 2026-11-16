"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("./lib");
const auth = (0, lib_1.prepareAuth)();
process.once("SIGINT", function () {
    console.log("Closing socket");
    auth.close();
});
process.once("SIGTERM", function () {
    console.log("Closing socket");
    auth.close();
});
//# sourceMappingURL=index.js.map