# v1.0.14 部署脚本
# 解决权限问题，使用init容器模式

Write-Host "开始部署 v1.0.14 版本..." -ForegroundColor Green

# 停止现有容器
Write-Host "1. 停止现有容器..." -ForegroundColor Yellow
docker-compose down 2>$null
Write-Host "   ✓ 容器已停止"

# 拉取最新镜像
Write-Host "2. 拉取最新镜像..." -ForegroundColor Yellow
docker-compose pull
Write-Host "   ✓ 镜像拉取完成"

# 确保数据目录存在
Write-Host "3. 确保数据目录存在..." -ForegroundColor Yellow
if (-not (Test-Path "./data")) {
    New-Item -ItemType Directory -Path "./data" -Force | Out-Null
    Write-Host "   ✓ 创建数据目录: ./data"
} else {
    Write-Host "   ✓ 数据目录已存在: ./data"
}

# 启动容器
Write-Host "4. 启动容器..." -ForegroundColor Yellow
docker-compose up -d

# 等待几秒钟让容器启动
Start-Sleep -Seconds 5

# 检查容器状态
Write-Host "5. 检查容器状态..." -ForegroundColor Yellow
$containers = docker-compose ps
Write-Host $containers

# 检查容器日志
Write-Host "6. 检查容器日志..." -ForegroundColor Yellow
$logs = docker-compose logs
if ($logs -match "应用启动完成") {
    Write-Host "   ✓ 应用启动成功" -ForegroundColor Green
} else {
    Write-Host "   ⚠ 应用可能启动异常，请检查日志" -ForegroundColor Red
    Write-Host "   日志摘要:"
    Write-Host ($logs -split "`n" | Select-Object -Last 20)
}

Write-Host ""
Write-Host "部署完成!" -ForegroundColor Green
Write-Host "访问地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "默认密码: admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "重要提醒:" -ForegroundColor Yellow
Write-Host "1. 首次登录后请立即修改默认密码"
Write-Host "2. 数据将持久化保存在 ./data 目录中"
Write-Host "3. 如需停止服务，运行: docker-compose down"