FROM node:18-alpine

LABEL maintainer="your-email@example.com"
LABEL description="礼记 - 管理随礼还礼的智能工具"
LABEL version="1.0.0"

WORKDIR /app

# 安装编译依赖（支持 better-sqlite3 原生模块编译）
RUN apk add --no-cache python3 make g++

# 复制 package.json 并安装依赖
COPY package.json .
RUN npm install && \
    npm cache clean --force

# 复制服务器代码和前端文件
COPY server.js .
COPY public ./public

# 创建数据目录
RUN mkdir -p /app/data

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# 启动应用
CMD ["npm", "start"]
