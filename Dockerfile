FROM node:22-alpine

RUN apk add --no-cache curl git

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci 2>/dev/null || npm install

COPY . .

RUN git config --global user.name "Memara" && \
	git config --global user.email "github@memara.io" && \
	git config --global init.defaultBranch main

EXPOSE 3000

CMD ["sh", "-c", "npm run build && node dist/cli.js --help"]
