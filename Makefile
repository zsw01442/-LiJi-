# 浜烘儏寰€鏉ョ郴缁?Makefile
# 鐢ㄤ簬鏋勫缓鍜屾帹閫?Docker 闀滃儚

# 閰嶇疆鍙橀噺
DOCKER_USERNAME ?= zsw01442
IMAGE_NAME ?= liji
VERSION ?= 2.0.0
PLATFORMS ?= linux/amd64,linux/arm64
IMAGE_TAG ?= $(DOCKER_USERNAME)/$(IMAGE_NAME)

# 榛樿鐩爣
.PHONY: help
help:
	@echo "浜烘儏寰€鏉ョ郴缁?- Docker 闀滃儚绠＄悊"
	@echo ""
	@echo "鍙敤鍛戒护:"
	@echo "  make build       - 鏋勫缓 Docker 闀滃儚锛堝綋鍓嶅钩鍙帮級"
	@echo "  make build-multi - 鏋勫缓澶氭灦鏋勯暅鍍?
	@echo "  make build-push  - 鏋勫缓骞舵帹閫佸鏋舵瀯闀滃儚"
	@echo "  make run         - 杩愯瀹瑰櫒"
	@echo "  make push        - 鎺ㄩ€侀暅鍍忓埌 Docker Hub锛堝崟鏋舵瀯锛?
	@echo "  make push-multi  - 鎺ㄩ€佸鏋舵瀯闀滃儚"
	@echo "  make push-latest - 鎺ㄩ€?latest 鏍囩"
	@echo "  make push-version - 鎺ㄩ€佺増鏈爣绛?
	@echo "  make clean       - 娓呯悊瀹瑰櫒鍜岄暅鍍?
	@echo "  make login       - 鐧诲綍 Docker Hub"
	@echo ""
	@echo "鐜鍙橀噺:"
	@echo "  DOCKER_USERNAME  - Docker Hub 鐢ㄦ埛鍚?(榛樿: your-dockerhub-username)"
	@echo "  VERSION          - 鐗堟湰鍙?(榛樿: 1.9.1)"
	@echo "  PLATFORMS        - 鐩爣骞冲彴 (榛樿: linux/amd64,linux/arm64)"

# 鏋勫缓闀滃儚锛堝崟鏋舵瀯锛岀敤浜庡揩閫熸祴璇曪級
.PHONY: build
build:
	docker build -t $(IMAGE_TAG):latest .
	docker build -t $(IMAGE_TAG):v$(VERSION) .

# 澶氭灦鏋勬瀯寤?
.PHONY: build-multi
build-multi:
	docker buildx build --platform $(PLATFORMS) -t $(IMAGE_TAG):latest -t $(IMAGE_TAG):v$(VERSION) . --load

# 澶氭灦鏋勬瀯寤哄苟鎺ㄩ€?
.PHONY: build-push
build-push:
	docker buildx build --platform $(PLATFORMS) -t $(IMAGE_TAG):latest -t $(IMAGE_TAG):v$(VERSION) . --push

# 杩愯瀹瑰櫒
.PHONY: run
run:
	docker run -d \
		--name $(IMAGE_NAME) \
		-p 3000:3000 \
		-v $(PWD)/data:/app/data \
		--restart unless-stopped \
		$(IMAGE_TAG):latest

# 鐧诲綍 Docker Hub
.PHONY: login
login:
	docker login

# 鎺ㄩ€?latest 鏍囩
.PHONY: push-latest
push-latest:
	docker push $(IMAGE_TAG):latest

# 鎺ㄩ€佺増鏈爣绛?
.PHONY: push-version
push-version:
	docker push $(IMAGE_TAG):v$(VERSION)

# 鎺ㄩ€佹墍鏈夋爣绛撅紙鍗曟灦鏋勶級
.PHONY: push
push: push-latest push-version

# 鎺ㄩ€佸鏋舵瀯闀滃儚
.PHONY: push-multi
push-multi: build-push

# 娓呯悊瀹瑰櫒鍜岄暅鍍?
.PHONY: clean
clean:
	docker stop $(IMAGE_NAME) 2>/dev/null || true
	docker rm $(IMAGE_NAME) 2>/dev/null || true
	docker rmi $(IMAGE_TAG):latest 2>/dev/null || true
	docker rmi $(IMAGE_TAG):v$(VERSION) 2>/dev/null || true

# 鏌ョ湅鏃ュ織
.PHONY: logs
logs:
	docker logs -f $(IMAGE_NAME)

# 鏌ョ湅瀹瑰櫒鐘舵€?
.PHONY: status
status:
	docker ps -a | grep $(IMAGE_NAME)

# 娴嬭瘯闀滃儚
.PHONY: test
test:
	@echo "娴嬭瘯闀滃儚鏋勫缓..."
	docker run --rm -p 3001:3000 $(IMAGE_TAG):latest &
	sleep 5
	curl -f http://localhost:3001/health && echo "\n鉁?闀滃儚娴嬭瘯閫氳繃" || echo "\n鉂?闀滃儚娴嬭瘯澶辫触"
	docker stop $(shell docker ps -q --filter "publish=3001") 2>/dev/null || true

# 鏄剧ず闀滃儚淇℃伅
.PHONY: info
info:
	@echo "闀滃儚淇℃伅:"
	@docker images | grep $(IMAGE_NAME) || echo "鏈壘鍒伴暅鍍?

# 榛樿鐩爣
.DEFAULT_GOAL := help

