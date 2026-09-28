FROM node:24-bookworm-slim AS deps

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json .npmrc ./
RUN npm ci


FROM node:24-bookworm-slim AS builder

WORKDIR /app
ARG CELTRONICS_PUBLIC_URL=http://localhost:3100
ENV NEXT_TELEMETRY_DISABLED=1 \
    AUTH_SECRET=docker-build-only-auth-secret \
    NEXTAUTH_SECRET=docker-build-only-nextauth-secret \
    NEXTAUTH_URL=${CELTRONICS_PUBLIC_URL} \
    NEXT_PUBLIC_APP_URL=${CELTRONICS_PUBLIC_URL} \
    ADMIN_BOOTSTRAP_PASSWORD=docker-build-only-bootstrap-password \
    CELTRONICS_DB_PATH=/app/src/data/db.json \
    CELTRONICS_UPLOAD_ROOT=/tmp/celtronics-uploads

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p /tmp/celtronics-uploads && npm run build


FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0 \
    CELTRONICS_DB_PATH=/app/var/celtronics/db.json \
    CELTRONICS_UPLOAD_ROOT=/app/var/celtronics/uploads \
    CELTRONICS_DB_BACKUP_DIR=/app/var/celtronics/backups

RUN mkdir -p /app/var/celtronics /app/seed && chown -R node:node /app

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/src/data/db.json ./seed/db.json
COPY --from=builder --chown=node:node /app/scripts/storage ./scripts/storage
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --chown=node:node scripts/docker/bootstrap-state.cjs ./bootstrap-state.cjs
COPY --chown=node:node scripts/docker/entrypoint.sh ./docker-entrypoint.sh

RUN sed -i 's/\r$//' /app/docker-entrypoint.sh \
    && chmod 0755 /app/docker-entrypoint.sh

USER node

EXPOSE 3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]
