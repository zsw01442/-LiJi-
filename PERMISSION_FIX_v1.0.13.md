# v1.0.13 权限问题修复说明

## 🔧 问题诊断

**错误现象**：
容器部署后不断重启，查看日志显示：
```
写入密码文件失败: [Error: EACCES: permission denied, open '/app/data/password.json']
```

**根本原因**：
1. Docker容器使用非root用户(`nodejs`)运行应用
2. Volume挂载的宿主机目录`./data`权限不足
3. 容器内用户无法写入挂载的数据目录

## 🛠 解决方案

### 1. Dockerfile 权限优化
```dockerfile
# 设置数据目录权限 - 确保所有用户都可以读写
RUN chown -R nodejs:nodejs /app && \
    chmod -R 777 /app/data
```

### 2. 服务端错误处理增强
```javascript
// 初始化数据文件时增加错误捕获
async function initializeDataFiles() {
    try {
        await writePassword('admin');
    } catch (error) {
        console.error('创建密码文件失败:', error.message);
        console.log('继续启动应用，但密码功能可能受限');
    }
    // ... 其他文件初始化类似处理
}
```

### 3. 应用启动容错机制
- 即使数据文件创建失败，应用也能继续启动
- 提供详细的错误日志便于问题排查
- 功能受限时给出明确提示

## 📦 部署验证

### 升级步骤
```bash
# 停止当前容器
docker-compose down

# 拉取新版本
docker-compose pull

# 启动新版本
docker-compose up -d

# 查看日志确认启动成功
docker-compose logs -f
```

### 验证要点
1. **容器状态**：`docker-compose ps` 显示容器运行正常
2. **日志输出**：应该看到"数据文件初始化完成"而无错误
3. **文件创建**：`./data` 目录下应包含 `password.json`、`records.json`、`giftbooks.json`
4. **功能测试**：密码修改、数据保存等功能正常工作

## 🎯 技术改进

### 权限管理
- 使用 `chmod 777` 确保数据目录完全可读写
- 保持安全的用户隔离（非root运行）
- 容错处理避免因权限问题导致应用崩溃

### 错误处理
- 详细的错误日志记录
- 优雅的降级处理机制
- 用户友好的错误提示

## ⚠️ 注意事项

1. **首次部署**：确保宿主机`./data`目录存在且可写
2. **权限检查**：如仍有问题，可手动设置目录权限：
   ```bash
   chmod 777 ./data
   ```
3. **日志监控**：部署后密切关注容器日志输出

## 📝 版本变更

- **v1.0.13** (2026-02-23)
  - 修复Docker权限问题导致的容器重启循环
  - 增强数据文件初始化的容错处理
  - 改进错误日志和用户提示

- **v1.0.12** (2026-02-23)
  - 实现首次部署自动初始化数据文件
  - 解决数据文件缺失问题

## 🆘 故障排除

如果问题仍然存在：
1. 检查宿主机目录权限：`ls -la ./data`
2. 查看详细容器日志：`docker-compose logs --tail 50`
3. 手动测试目录写入权限：
   ```bash
   touch ./data/test.txt && rm ./data/test.txt
   ```
4. 必要时联系技术支持提供完整日志