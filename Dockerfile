# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54

FROM ${NODE_IMAGE} AS web-build
WORKDIR /build/web
ENV CI=true \
    NODE_OPTIONS=--openssl-legacy-provider \
    DISABLE_ESLINT_PLUGIN=true \
    GENERATE_SOURCEMAP=false
COPY webguest2/webguest2-src/package.json webguest2/webguest2-src/package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY webguest2/webguest2-src/tsconfig.json ./
COPY webguest2/webguest2-src/public ./public
COPY webguest2/webguest2-src/src ./src
RUN npm run typecheck && npm run build

FROM ${NODE_IMAGE} AS signaling-deps
WORKDIR /build/signaling
COPY signaling2.0/signaling2.0/package.json signaling2.0/signaling2.0/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM ${NODE_IMAGE} AS auth-deps
WORKDIR /build/auth
COPY simple-auth/simple-auth/package.json simple-auth/simple-auth/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM ${NODE_IMAGE} AS container-deps
WORKDIR /build/runtime
COPY runtime/package.json runtime/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM ${NODE_IMAGE} AS runtime
RUN apt-get update \
    && apt-get install --no-install-recommends -y tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8080 TLS_PORT=8443
WORKDIR /app
COPY --chown=node:node --from=container-deps /build/runtime/node_modules ./runtime/node_modules
COPY --chown=node:node --from=signaling-deps /build/signaling/node_modules ./signaling/node_modules
COPY --chown=node:node --from=auth-deps /build/auth/node_modules ./auth/node_modules
COPY --chown=node:node runtime/*.cjs ./runtime/
COPY --chown=node:node signaling2.0/signaling2.0/server ./signaling/server
COPY --chown=node:node signaling2.0/signaling2.0/public ./signaling/public
COPY --chown=node:node simple-auth/simple-auth/dist ./auth/dist
COPY --chown=node:node --from=web-build /build/web/build ./web
ARG VERSION=dev
ARG VCS_REF=unknown
ARG SOURCE_DATE_EPOCH
LABEL org.opencontainers.image.title="Medialooks WebRTC 2.0 Signaling Server" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.source="https://github.com/Medialooks-LLC/WebRTC20_signaling_server"
USER node
EXPOSE 8080 8443
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
    CMD ["node", "/app/runtime/healthcheck.cjs"]
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/bin/tini", "--", "node", "/app/runtime/main.cjs"]
