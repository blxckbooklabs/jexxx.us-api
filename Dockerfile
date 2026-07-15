# blxckbook.jexxx.us-api/Dockerfile
# Base image
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate

# Install ffmpeg for audio processing
RUN apk add --no-cache ffmpeg

# Build stage
FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN pnpm install --frozen-lockfile --ignore-scripts
# Build API (prebuild vendors jexxx.us-cli from committed vendor/ when sibling absent)
WORKDIR /usr/src/app/packages/jexxxus-api
RUN npm run build
WORKDIR /usr/src/app

# Production stage
FROM base AS production
ENV CI=true
# Install ffmpeg for audio processing
RUN apk add --no-cache ffmpeg
COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app
# Prune dev dependencies (skip prepare scripts like husky)
RUN pnpm prune --prod --ignore-scripts
ENV PORT=8080
EXPOSE 8080
WORKDIR /usr/src/app/packages/jexxxus-api
CMD [ "node", "dist/index.js" ]