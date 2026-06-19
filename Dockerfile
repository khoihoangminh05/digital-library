# ── Build stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Native deps required to compile bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production stage ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Reuse the fully-installed (and prisma-generated) modules from the builder so
# the Prisma CLI is available for `db push` / `seed` on container start.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3002
# Sync schema to the database, then launch the API
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
