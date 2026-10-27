FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG BASE_PATH=/
RUN npm run build -- --base="${BASE_PATH}"

FROM node:24-bookworm-slim AS runtime
ARG BASE_PATH=/
ENV NODE_ENV=production PORT=3000 BASE_PATH=${BASE_PATH}
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm ci --omit=dev --prefix backend && npm cache clean --force
COPY --chown=node:node backend/ ./backend/
COPY --from=frontend-build --chown=node:node /app/frontend/dist ./frontend/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "backend/server.js"]
