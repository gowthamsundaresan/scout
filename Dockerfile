# Scout — one image for all services; compose overrides `command` per service.

FROM node:20-alpine

WORKDIR /app

ARG CI_BUILD_VERSION
ENV SCOUT_VERSION=$CI_BUILD_VERSION

COPY package.json package-lock.json ./
COPY packages ./packages

RUN npm ci

# tsx runs the TypeScript entrypoint directly
CMD ["npx", "tsx", "packages/api/src/index.ts"]
