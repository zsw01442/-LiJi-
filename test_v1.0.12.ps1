# v1.0.12 版本测试脚本
# 测试首次部署时数据文件是否正确初始化

Write-Host "开始测试 v1.0.12 版本数据文件初始化功能..." -ForegroundColor Green

# 清理测试环境
Write-Host "1. 清理测试环境..." -ForegroundColor Yellow
docker-compose down 2>$null
Remove-Item -Path "./data" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   ✓ 测试环境清理完成"

# 拉取最新镜像
Write-Host "2. 拉取最新镜像..." -ForegroundColor Yellow
docker-compose pull
Write-Host "   ✓ 镜像拉取完成"

# 启动容器
Write-Host "3. 启动容器..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep -Seconds 10
Write-Host "   ✓ 容器启动完成"

# 检查容器状态
Write-Host "4. 检查容器状态..." -ForegroundColor Yellow
$containerStatus = docker-compose ps
Write-Host $containerStatus

# 检查数据文件是否创建
Write-Host "5. 检查数据文件初始化..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

if (Test-Path "./data/password.json") {
    Write-Host "   ✓ password.json 文件已创建"
    $passwordContent = Get-Content "./data/password.json" -Raw
    Write-Host "     内容: $passwordContent"
} else {
    Write-Host "   ✗ password.json 文件未创建" -ForegroundColor Red
}

if (Test-Path "./data/records.json") {
    Write-Host "   ✓ records.json 文件已创建"
    $recordsContent = Get-Content "./data/records.json" -Raw
    Write-Host "     内容: $recordsContent"
} else {
    Write-Host "   ✗ records.json 文件未创建" -ForegroundColor Red
}

if (Test-Path "./data/giftbooks.json") {
    Write-Host "   ✓ giftbooks.json 文件已创建"
    $giftbooksContent = Get-Content "./data/giftbooks.json" -Raw
    Write-Host "     内容: $giftbooksContent"
} else {
    Write-Host "   ✗ giftbooks.json 文件未创建" -ForegroundColor Red
}

# 检查容器日志
Write-Host "6. 检查容器启动日志..." -ForegroundColor Yellow
$logs = docker-compose logs
if ($logs -match "数据文件初始化完成") {
    Write-Host "   ✓ 数据文件初始化成功完成" -ForegroundColor Green
} else {
    Write-Host "   ✗ 数据文件初始化可能失败" -ForegroundColor Red
    Write-Host "   容器日志:"
    Write-Host $logs
}

# 测试API功能
Write-Host "7. 测试API功能..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/password/status" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ 密码状态API正常工作"
        Write-Host "     响应: $($response.Content)"
    } else {
        Write-Host "   ✗ 密码状态API返回错误状态码: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ 密码状态API调用失败: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/records" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ 记录API正常工作"
    } else {
        Write-Host "   ✗ 记录API返回错误状态码: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ 记录API调用失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试密码修改功能
Write-Host "8. 测试密码修改功能..." -ForegroundColor Yellow
try {
    $body = @{
        oldPassword = "admin"
        newPassword = "test123"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/password" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ 密码修改功能正常工作"
        Write-Host "     响应: $($response.Content)"
    } else {
        Write-Host "   ✗ 密码修改返回错误状态码: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ 密码修改功能测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 清理测试
Write-Host "9. 清理测试环境..." -ForegroundColor Yellow
docker-compose down
Write-Host "   ✓ 测试完成，环境已清理"

Write-Host ""
Write-Host "测试总结:" -ForegroundColor Green
Write-Host "- v1.0.12 版本应该在首次启动时自动创建所有必要的数据文件"
Write-Host "- 密码文件: password.json (默认密码: admin)"
Write-Host "- 记录文件: records.json (空数组)"
Write-Host "- 礼薄文件: giftbooks.json (空数组)"
Write-Host "- 所有API功能应该正常工作"