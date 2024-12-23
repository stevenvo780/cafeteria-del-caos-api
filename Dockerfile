# Build stage
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para la compilación
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copiar archivos necesarios para la instalación
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./

# Instalar dependencias con cache optimizado
RUN npm ci

# Copiar el código fuente
COPY . .

# Construir la aplicación con optimización
RUN npm run build:prod
RUN npm prune --production

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copiar los artefactos de construcción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Configuración de producción
ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_OPTIONS="--max-old-space-size=512 --no-warnings"

# Health check para garantizar el uptime en Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:${PORT}/health || exit 1

# Exponer el puerto
EXPOSE ${PORT}

# Comando de inicio
CMD ["node", "dist/main.js"]
