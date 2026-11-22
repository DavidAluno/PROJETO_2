# Build do frontend separado para manter a imagem de produção compacta.
FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

ENV NODE_ENV=production
ENV STATIC_DIR=/app/backend/public
EXPOSE 3001
CMD ["sh", "-c", "node database/init.js && node server.js"]
