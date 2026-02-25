FROM node:18-alpine

LABEL maintainer="your-email@example.com"
LABEL description="礼记 - 管理随礼还礼的智能工具"
LABEL version="1.7.1"

WORKDIR /app

# 复制 package.json 并安装依赖
COPY package.json .
RUN npm install --production && \
    npm cache clean --force

# 复制服务器代码和前端文件
COPY server.js .
COPY public ./public

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV TZ=Asia/Shanghai

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动应用
CMD ["npm", "start"]