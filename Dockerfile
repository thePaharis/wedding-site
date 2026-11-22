FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS tools
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY scripts ./scripts
COPY lib ./lib
COPY database ./database
USER node
CMD ["node", "scripts/deploy-check.mjs", "--database"]

FROM base AS web
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "const h=require('node:http');const r=h.get('http://127.0.0.1:3000/api/health',s=>{s.resume();process.exit(s.statusCode===200?0:1)});r.on('error',()=>process.exit(1));r.setTimeout(4000,()=>r.destroy());"
CMD ["node", "server.js"]
