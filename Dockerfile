# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------
# Installs production dependencies only (no devDependencies such as
# jest/supertest -- those are only needed by the Test stage, never by
# the shipped image) and copies in the application source.
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# ---- Runtime stage -----------------------------------------------------
FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=8000

COPY --from=build /usr/src/app ./
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

EXPOSE 8000

# Run as the non-root 'node' user that ships built-in with the official
# Node.js images, rather than as root (the image's default if no USER
# is set). This is a security hazard otherwise: if an attacker were ever
# able to control this process, running as root would give them control
# over the whole container rather than just an unprivileged process
# inside it. This USER instruction must be the last one before CMD so
# that the process this container actually runs never runs as root.
USER node

CMD ["node", "server.js"]
