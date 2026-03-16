FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/users.db

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p /app/data /app/uploads

RUN npm run prisma:generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
