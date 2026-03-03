FROM --platform=$TARGETPLATFORM node:18-alpine

LABEL maintainer="zsw01442"
LABEL description="礼记 - 管理随礼还礼的智能工具"
LABEL version="2.0.0"
LABEL architecture="multi-arch"

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./
COPY public ./public

RUN mkdir -p /app/data && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV TZ=Asia/Shanghai

EXPOSE 3000

RUN apk add --no-cache curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

USER node
CMD ["npm", "start"]

