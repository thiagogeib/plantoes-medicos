FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY apps/api/package.json ./
RUN npm install

COPY apps/api/prisma ./prisma
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./

RUN npx prisma generate
RUN npx tsc

EXPOSE 3333

CMD ["node", "dist/server.js"]
