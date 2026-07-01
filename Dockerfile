# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile --prod=false

COPY prisma ./prisma
RUN pnpm prisma generate

COPY . .

RUN pnpm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .

ENV NODE_OPTIONS="--max-old-space-size=1024"
CMD ["node", "dist/main.js"]
