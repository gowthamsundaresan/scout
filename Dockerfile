# Scout — one image for all services; compose overrides `command` per service.
# bookworm, not alpine: @temporalio/core-bridge is a glibc native module (musl unsupported).

FROM node:20-bookworm-slim

WORKDIR /app

ARG CI_BUILD_VERSION
ENV SCOUT_VERSION=$CI_BUILD_VERSION

COPY package.json package-lock.json ./
COPY packages ./packages

RUN npm ci

# tsx runs the TypeScript entrypoint directly
CMD ["npx", "tsx", "packages/api/src/index.ts"]
