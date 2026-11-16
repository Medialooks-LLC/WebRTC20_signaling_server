# Container smoke checks

Run from a clean checkout after building the root Dockerfile:

```sh
python3 tests/container/smoke.py --image videosdk-meet:test --report container-smoke.json
```

`sh tests/container/smoke.sh --image videosdk-meet:test` is equivalent. Only Python 3 and Docker CLI are needed on the host. HTTP and WebSocket checks run with Node inside the built image.

The check exports a separate scratch build context and inspects its file names without extracting it, audits the final `/app` tree and image environment for credentials, starts one uniquely named container on an ephemeral loopback port, waits for health, and checks all page routes and current frontend asset markers. It then verifies authenticated host/guest room joins, forwarding in both directions, rejection of an absent host, and graceful shutdown. Its containers and scratch image are removed even on failure; the application image is retained.

For a local TLS fixture, add `--tls-cert /absolute/test-cert.pem --tls-key /absolute/test-key.pem`. Both files are mounted read-only; no certificates are added to the image. Self-signed verification is disabled only in the isolated test client. HTTP and HTTPS/WebSocket tests then run in the same container.

`--skip-context-audit` is reserved for focused local reruns. CI should retain the context audit. Never pass production credentials or mount production TLS keys into this smoke test.
