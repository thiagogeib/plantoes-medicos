FROM node:20-alpine
WORKDIR /app

COPY apps/api/package.json ./
RUN npm install

COPY apps/api/prisma ./prisma
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./

RUN npx prisma generate
RUN npx tsc

EXPOSE 3333

CMD ["node", "dist/server.js"]
