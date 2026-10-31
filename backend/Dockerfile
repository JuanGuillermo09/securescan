# ============================================================================
# IMAGEN DEL BACKEND (MODO DISTRIBUIDO)
# ----------------------------------------------------------------------------
# Node 22 + OpenSSL (requerido por Prisma). El cliente Prisma se genera con
# el esquema PostgreSQL, porque esta imagen solo se usa en el perfil
# distribuido. El modo simple local sigue usando tsx + SQLite.
# ============================================================================

FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Esquema PostgreSQL + cliente generado para ese proveedor.
COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.postgres.prisma

# Código fuente y frontend compilado (si existe).
COPY tsconfig.json ./
COPY src ./src
COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "src/server.ts"]
