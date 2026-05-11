FROM node:20-alpine
WORKDIR /app

# Copia os manifests do monorepo e dos workspaces relevantes
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/

# Instala apenas as dependências dos workspaces necessários
RUN npm install --workspace=apps/api --workspace=packages/types

# Copia o código-fonte
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Compila a API
RUN npm run build --workspace=apps/api

# Gera o Prisma Client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

EXPOSE 3333

CMD ["node", "apps/api/dist/server.js"]
