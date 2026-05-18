# ── Stage 1 : dépendances (compilation des modules natifs) ──────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2 : build de l'application ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ── Stage 3 : runner de production ──────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Réinstaller uniquement les dépendances de production
# (recompile better-sqlite3 pour cette version Alpine)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Build Next.js et assets statiques
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Prisma : schéma + migrations (nécessaires pour prisma migrate deploy)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts

# Script de démarrage
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Dossier uploads (monté en volume — persisté hors conteneur)
RUN mkdir -p public/uploads

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
