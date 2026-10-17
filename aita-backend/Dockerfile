FROM node:22-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev --no-audit --no-fund
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

COPY . .
RUN npm run build && mkdir -p /app/temp /app/uploads /app/storage && chown -R node:node /app/temp /app/uploads /app/storage
USER node

EXPOSE 3001

CMD ["sh", "-c", "npm run db:migrate && exec node --import tsx src/server.ts"]
