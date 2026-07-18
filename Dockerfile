FROM node:20-alpine AS frontend-builder

WORKDIR /app/redirect
ENV GENERATE_SOURCEMAP=false
COPY redirect/package*.json ./
RUN npm ci --legacy-peer-deps
COPY redirect/ ./
RUN npm run build

FROM node:20-alpine AS backend-deps

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup -S nodejs && adduser -S nodeapp -G nodejs

WORKDIR /app/backend
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend-builder /app/redirect/build ./build

RUN mkdir -p uploads tmp/digital-temp tmp/chat-files tmp/voice tmp/status-media \
  && chown -R nodeapp:nodejs /app/backend

USER nodeapp

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health >/dev/null || exit 1

CMD ["npm", "start"]
