FROM node:22-slim

WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente completo y compilar frontend + backend
COPY . .
RUN npm run build

# Crear directorios persistentes para SQLite, documentos privados y respaldos
RUN mkdir -p /app/data /app/storage/uploads /app/storage/backups

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist-server/index.js"]
