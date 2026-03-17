FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/users.db

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl python3 python3-pip \
	&& ln -sf /usr/bin/python3 /usr/bin/python \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

RUN pip3 install --no-cache-dir -r py/requirements.txt

RUN mkdir -p /app/data /app/uploads

RUN npm run prisma:generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
