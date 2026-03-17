FROM python:3.11-slim AS infer-builder

WORKDIR /build

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends build-essential \
	&& rm -rf /var/lib/apt/lists/*

COPY py ./py

RUN pip install --no-cache-dir --upgrade pip \
	&& pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu \
	&& pip install --no-cache-dir macls -U -i https://pypi.tuna.tsinghua.edu.cn/simple \
	&& pip install --no-cache-dir pyinstaller

RUN pyinstaller --clean --noconfirm --onefile --name aiwater_infer \
	--collect-all macls \
	--collect-all paddlespeech \
	py/predict.py

FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/users.db
ENV AI_INFERENCE_BIN=/app/bin/aiwater_infer

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
COPY --from=infer-builder /build/dist/aiwater_infer /app/bin/aiwater_infer

RUN chmod +x /app/bin/aiwater_infer \
	&& mkdir -p /app/data /app/uploads

RUN npm run prisma:generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
