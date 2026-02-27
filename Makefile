# 人情往来系统 Makefile
# 用于构建和推送 Docker 镜像

# 配置变量
DOCKER_USERNAME ?= zsw01442
IMAGE_NAME ?= liji
VERSION ?= 1.9.1
PLATFORMS ?= linux/amd64,linux/arm64
IMAGE_TAG ?= $(DOCKER_USERNAME)/$(IMAGE_NAME)

# 默认目标
.PHONY: help
help:
	@echo "人情往来系统 - Docker 镜像管理"
	@echo ""
	@echo "可用命令:"
	@echo "  make build       - 构建 Docker 镜像（当前平台）"
	@echo "  make build-multi - 构建多架构镜像"
	@echo "  make build-push  - 构建并推送多架构镜像"
	@echo "  make run         - 运行容器"
	@echo "  make push        - 推送镜像到 Docker Hub（单架构）"
	@echo "  make push-multi  - 推送多架构镜像"
	@echo "  make push-latest - 推送 latest 标签"
	@echo "  make push-version - 推送版本标签"
	@echo "  make clean       - 清理容器和镜像"
	@echo "  make login       - 登录 Docker Hub"
	@echo ""
	@echo "环境变量:"
	@echo "  DOCKER_USERNAME  - Docker Hub 用户名 (默认: your-dockerhub-username)"
	@echo "  VERSION          - 版本号 (默认: 1.9.1)"
	@echo "  PLATFORMS        - 目标平台 (默认: linux/amd64,linux/arm64)"

# 构建镜像（单架构，用于快速测试）
.PHONY: build
build:
	docker build -t $(IMAGE_TAG):latest .
	docker build -t $(IMAGE_TAG):v$(VERSION) .

# 多架构构建
.PHONY: build-multi
build-multi:
	docker buildx build --platform $(PLATFORMS) -t $(IMAGE_TAG):latest -t $(IMAGE_TAG):v$(VERSION) . --load

# 多架构构建并推送
.PHONY: build-push
build-push:
	docker buildx build --platform $(PLATFORMS) -t $(IMAGE_TAG):latest -t $(IMAGE_TAG):v$(VERSION) . --push

# 运行容器
.PHONY: run
run:
	docker run -d \
		--name $(IMAGE_NAME) \
		-p 3000:3000 \
		-v $(PWD)/data:/app/data \
		--restart unless-stopped \
		$(IMAGE_TAG):latest

# 登录 Docker Hub
.PHONY: login
login:
	docker login

# 推送 latest 标签
.PHONY: push-latest
push-latest:
	docker push $(IMAGE_TAG):latest

# 推送版本标签
.PHONY: push-version
push-version:
	docker push $(IMAGE_TAG):v$(VERSION)

# 推送所有标签（单架构）
.PHONY: push
push: push-latest push-version

# 推送多架构镜像
.PHONY: push-multi
push-multi: build-push

# 清理容器和镜像
.PHONY: clean
clean:
	docker stop $(IMAGE_NAME) 2>/dev/null || true
	docker rm $(IMAGE_NAME) 2>/dev/null || true
	docker rmi $(IMAGE_TAG):latest 2>/dev/null || true
	docker rmi $(IMAGE_TAG):v$(VERSION) 2>/dev/null || true

# 查看日志
.PHONY: logs
logs:
	docker logs -f $(IMAGE_NAME)

# 查看容器状态
.PHONY: status
status:
	docker ps -a | grep $(IMAGE_NAME)

# 测试镜像
.PHONY: test
test:
	@echo "测试镜像构建..."
	docker run --rm -p 3001:3000 $(IMAGE_TAG):latest &
	sleep 5
	curl -f http://localhost:3001/health && echo "\n✅ 镜像测试通过" || echo "\n❌ 镜像测试失败"
	docker stop $(shell docker ps -q --filter "publish=3001") 2>/dev/null || true

# 显示镜像信息
.PHONY: info
info:
	@echo "镜像信息:"
	@docker images | grep $(IMAGE_NAME) || echo "未找到镜像"

# 默认目标
.DEFAULT_GOAL := help
