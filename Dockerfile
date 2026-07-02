# syntax=docker/dockerfile:1.7

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml .npmrc ./

ENV NODE_ENV=development
# Le token GitHub Packages est passé via BuildKit secret (jamais dans une couche d'image), et
# écrit dans le .npmrc utilisateur : pnpm refuse d'expandre des env vars dans un .npmrc committé
# au repo (mesure de sécurité), donc le ${NODE_AUTH_TOKEN} du .npmrc projet ne suffit pas seul.
RUN --mount=type=secret,id=npm_token,required=true \
    pnpm config set "//npm.pkg.github.com/:_authToken" "$(cat /run/secrets/npm_token)" && \
    pnpm install --frozen-lockfile --prod=false

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
