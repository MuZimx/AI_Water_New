FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./db/users.db

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p /app/db /app/uploads

RUN npm run prisma:generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
