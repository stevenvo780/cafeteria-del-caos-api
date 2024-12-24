# Build stage
FROM node:18-alpine AS builder

# Instalar dependencias necesarias para la compilación
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copiar archivos necesarios para la instalación
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./

# Definir argumentos para las variables sensibles
ARG DISCORD_BOT_TOKEN
ARG DISCORD_WATCHED_CHANNELS

# Pasar los argumentos como variables de entorno
ENV DISCORD_BOT_TOKEN=$DISCORD_BOT_TOKEN
ENV DISCORD_WATCHED_CHANNELS=$DISCORD_WATCHED_CHANNELS

# Instalar dependencias con cache optimizado
RUN npm ci

# Copiar el código fuente
COPY . .

# Construir la aplicación con optimización
RUN npm run build:prod

# Registrar comandos (requiere variables de entorno)
RUN npm run register-commands

# Prune para producción
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
