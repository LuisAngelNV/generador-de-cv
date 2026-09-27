# API of the CV generator: Express + Prisma + Puppeteer (Chromium for the PDFs).
# Build context: the backend/ folder.

# ---- Build: compile TypeScript and generate the Prisma client ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Chromium is installed in the runtime image, not here.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- Runtime ----
FROM node:22-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/home/node/.cache/puppeteer

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Chromium pinned by Puppeteer plus its system libraries, and fonts metrically
# compatible with Arial (used by the CV template).
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-liberation ca-certificates \
    && npx puppeteer browsers install chrome --install-deps \
    && chown -R node:node /home/node/.cache \
    && rm -rf /var/lib/apt/lists/*

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
