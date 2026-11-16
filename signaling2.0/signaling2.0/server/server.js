"use strict";

const listenSockets = require("./signaling20");
const config = require("getconfig");
const nodeStatic = require("node-static");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

if (config.uid) process.setuid(config.uid);

const fileServer = new nodeStatic.Server(path.resolve(__dirname, "../public"), {
  cache: false
});

const serverHandler = function(req, res) {
  fileServer.serve(req, res, function(e) {
    if (e && e.status === 404) {
      fileServer.serveFile(
        "/index.html",
        200,
        {
          "Content-Type": "text/html; charset=utf-8"
        },
        req,
        res
      );
    }
  });
};

// Create an http(s) server instance to that socket.io can listen to
const server = config.server.secure
  ? require("https").Server(
      {
        key: fs.readFileSync(path.resolve(__dirname, "..", config.server.key)),
        cert: fs.readFileSync(
          path.resolve(__dirname, "..", config.server.cert)
        ),
        passphrase: config.server.password
      },
      serverHandler
    )
  : require("http").Server();

const ioOptions = {
  allowEIO3: true
};

if (process.env.CORS || config.server.CORS) {
  console.log("CORS enabled");
  ioOptions.cors = {
    origin: "*",
    methods: ["GET", "POST"]
  };
}

const io = new Server(server, ioOptions);

listenSockets(io);

const port = parseInt(process.env.PORT || config.server.port, 10);

server.listen(port);

const httpUrl = `http${config.server.secure ? "s" : ""}://localhost:` + port;
console.log(`Server is listening on ${httpUrl}`);
