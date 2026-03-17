FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/users.db

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl python3 python3-pip python3-venv python3-dev build-essential \
	&& ln -sf /usr/bin/python3 /usr/bin/python \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

RUN python3 -m venv /opt/venv \
	&& /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
	&& /opt/venv/bin/pip install --no-cache-dir -r py/requirements.txt

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON_BIN=/opt/venv/bin/python

RUN mkdir -p /app/data /app/uploads

RUN npm run prisma:generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
