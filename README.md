# 礼记

一个用于记录和管理随礼还礼的智能 Web 应用。

## ✨ 功能特点

- 📝 **记录管理**: 收礼/送礼记录，支持编辑和删除
- 📖 **礼薄功能**: 办事收礼登记，宾客管理
- 👥 **智能输入**: 姓名联想、自动填充
- 📊 **统计分析**: 年度统计、事由分析
- 🔐 **密码保护**: 默认密码 admin，首次登录提示修改
- 💾 **数据持久化**: Docker 卷挂载，数据永久保存
- 📱 **响应式设计**: 支持移动端访问
- 🔄 **数据同步**: 礼薄与记录双向同步

---

## 🚀 快速部署

### 方案一：Docker Compose 部署（推荐）

#### 1. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  renqing-app:
    image: zsw01442/liji:latest
    container_name: liji
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/app/data
    restart: unless-stopped
```

#### 2. 启动服务

```bash
# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps
```

#### 3. 访问应用

浏览器打开：`http://localhost:3000`

默认密码：`admin`

---

## 📋 使用说明

### 首次登录

1. 打开浏览器访问应用地址
2. 输入默认密码：`admin`
3. 登录后会提示修改密码
4. **强烈建议立即修改密码**

### 主要功能

#### 1. 添加记录
- 收礼记录：记录别人给你的礼金
- 送礼记录：记录你给别人的礼金
- 支持关联礼薄：自动填充事由和日期
- 智能联想：输入姓名时自动提示历史记录

#### 2. 礼薄管理
- 创建礼薄：记录自己办事时的收礼情况
- 添加宾客：自动创建收礼记录
- 编辑信息：礼薄和记录双向同步
- 导出功能：导出为文本格式

#### 3. 统计分析
- 年份统计：查看各年度收支情况
- 事由统计：分类统计各类事由
- 收支明细：详细的收支记录

### 密码管理

#### 修改密码
1. 在登录页点击"修改密码"
2. 输入旧密码和新密码
3. 确认后返回登录页

#### 忘记密码
如果忘记密码，可通过以下方式重置：

**方法1: 清除浏览器数据**
```javascript
// 浏览器控制台(F12)执行：
localStorage.removeItem('renqing-password');
localStorage.removeItem('renqing-first-time');
// 刷新页面，密码重置为 admin
```

---

## 🔧 高级配置

### 端口配置

修改端口（编辑 docker-compose.yml）：
```yaml
ports:
  - "8080:3000"  # 将 3000 改为你想要的端口
```

### 数据目录

数据存储在挂载的卷中：
- `records.json` - 人情往来记录
- `giftbooks.json` - 礼薄数据
- `password.json` - 密码文件

### 环境变量

在 docker-compose.yml 中配置：
- `NODE_ENV`: 运行环境（production）
- `PORT`: 应用端口（3000）
- `DATA_DIR`: 数据存储目录（/app/data）

---

## 🔄 升级与维护

### 升级到最新版本

```bash
# 停止容器
docker-compose down

# 拉取最新镜像
docker-compose pull

# 重新启动
docker-compose up -d
```

### 数据备份

```bash
# 备份数据
tar -czf renqing-backup-$(date +%Y%m%d).tar.gz ./data

# 恢复数据
tar -xzf renqing-backup-20231207.tar.gz -C .
```

---

## 📝 更新日志

### v1.9.1 (2026-02-27)

- 优化农历显示格式，新增生肖显示，格式统一为：`公历（农历YYYY干支生肖年X月XX）`
- 规范化农历月份与日期显示：如 `十月15 -> 十月十五`、`腊月7 -> 腊月初七`
- 保持所有日期展示入口一致（记录列表、礼薄列表、导出文本）
- 发布多架构镜像：`linux/amd64`、`linux/arm64`

### v1.9.0 (2026-02-27)

- 在页面公历日期后新增农历日期显示
- 前端日期展示函数统一输出“公历 + 农历”格式
- 发布镜像标签：`zsw01442/liji:latest`、`zsw01442/liji:v1.9.0`

---

## 📊 监控与日志

### 查看日志

```bash
# 实时查看日志
docker-compose logs -f

# 查看最近100行
docker-compose logs --tail 100
```

### 监控容器状态

```bash
# 查看容器状态
docker-compose ps

# 查看资源使用
docker stats liji
```

---

## 🔒 安全建议

1. **立即修改默认密码**: 首次登录后务必修改 admin 密码
2. **限制网络访问**: 使用防火墙限制访问来源
3. **定期备份**: 设置自动备份任务
4. **监听本地**: 如非必要，只监听 127.0.0.1
   ```bash
   ports:
     - "127.0.0.1:3000:3000"
   ```

---

## 🗑 卸载

```bash
# 停止并删除容器
docker-compose down

# 删除数据（可选，注意会永久删除数据）
rm -rf ./data
```

---

## 💡 技术栈

### 前端
- HTML5
- CSS3 (响应式设计)
- JavaScript (原生，无框架)

### 后端
- Node.js 18
- Express.js
- Body-parser

### 存储
- JSON 文件持久化
- Docker 卷挂载

### 容器化
- Docker
- Docker Compose
- Alpine Linux 基础镜像

---

## 📞 技术支持

- **Docker Hub**: [zsw01442/liji](https://hub.docker.com/r/zsw01442/liji)

---

## 📄 许可证

MIT License
