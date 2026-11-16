'use strict';
const port = process.env.PORT || '8080';
fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(3000) })
  .then(response => process.exit(response.status === 200 ? 0 : 1))
  .catch(() => process.exit(1));
