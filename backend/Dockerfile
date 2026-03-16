FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run prisma:generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
