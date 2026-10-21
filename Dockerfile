# Container image for the hosted login UI (Next.js standalone server).
#
# Production is deployed by Vercel (deploy.yml) and does not use this file. The
# image is built by ci.yml on release/** branches and run by the qeet-id-deploy
# test kit (DEV / TEST / STAGING). Runtime configuration (no rebuild per
# environment):
#   PUBLIC_API_URL   browser-facing Qeet ID API origin (src/lib/public-config.ts)
#   PORT / HOSTNAME  listen address (defaults 3000 / 0.0.0.0)
# Health: GET /healthz -> 200.

# Dependencies are installed by Bun in its own image (Bun fails to extract
# packages when run inside the Node image under BuildKit), natively on the build
# platform.
FROM --platform=$BUILDPLATFORM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS deps
WORKDIR /app
COPY package.json bun.lock ./
# Retried: Bun intermittently fails to extract large tarballs (e.g. `next`) on
# some build networks; a lockfile install is idempotent.
RUN for attempt in 1 2 3; do \
      bun install --frozen-lockfile && exit 0; \
      echo "bun install failed (attempt $attempt); retrying" >&2; rm -rf node_modules; sleep 3; \
    done; exit 1

# The build also runs natively. Its output is JavaScript except for sharp, which
# Next traces into the standalone bundle: that one native dependency is
# reinstalled for the TARGET architecture below, and the build fails if any
# native addon of another architecture remains.
FROM --platform=$BUILDPLATFORM node:24.21.0-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG TARGETARCH
RUN ./node_modules/.bin/next build \
 && case "$TARGETARCH" in amd64) arch=x64 ;; arm64) arch=arm64 ;; *) echo "unsupported $TARGETARCH" >&2; exit 1 ;; esac \
 && sharp=$(node -p "require('sharp/package.json').version") \
 && mkdir /tmp/sharp && cd /tmp/sharp \
 && npm install --no-save --no-package-lock --no-audit --no-fund \
      --os=linux --cpu="$arch" --libc=glibc "sharp@$sharp" \
 && rm -rf /app/.next/standalone/node_modules/@img \
 && cp -R /tmp/sharp/node_modules/@img /app/.next/standalone/node_modules/@img \
 && cd /app \
 && wrong=$(find .next/standalone -name '*.node' | grep -v -- "-linux-$arch" || true) \
 && if [ -n "$wrong" ]; then echo "native addons for another architecture:" >&2; echo "$wrong" >&2; exit 1; fi

FROM node:24.21.0-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
ARG VERSION=""
ARG REVISION=""
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    QEET_BUILD_VERSION=$VERSION \
    QEET_BUILD_REVISION=$REVISION
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
