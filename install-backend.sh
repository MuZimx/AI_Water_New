#!/usr/bin/env bash
set -euo pipefail

IMAGE_REPO="ghcr.io/muzimx/ai-water-backend"
IMAGE_TAG=""
IMAGE=""
CONTAINER_NAME="ai-water-backend"
HOST_PORT="3293"
APP_DIR="${PWD}/ai-water-backend-data"
DATA_DIR="${APP_DIR}/data"
UPLOADS_DIR="${APP_DIR}/uploads"
ENV_FILE="${APP_DIR}/backend-secrets.env"

ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET:-}"
REFRESH_TOKEN_SECRET="${REFRESH_TOKEN_SECRET:-}"
ACCESS_TOKEN_EXPIRES_IN="${ACCESS_TOKEN_EXPIRES_IN:-15m}"
REFRESH_TOKEN_EXPIRES_IN="${REFRESH_TOKEN_EXPIRES_IN:-7d}"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 48
    return 0
  fi

  tr -dc 'A-Za-z0-9' </dev/urandom | head -c 96
}

load_or_generate_secrets() {
  local changed=0

  if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
  fi

  if [[ -z "${ACCESS_TOKEN_SECRET:-}" ]]; then
    ACCESS_TOKEN_SECRET="$(generate_secret)"
    changed=1
  fi

  if [[ -z "${REFRESH_TOKEN_SECRET:-}" ]]; then
    REFRESH_TOKEN_SECRET="$(generate_secret)"
    changed=1
  fi

  if [[ "${changed}" -eq 1 || ! -f "${ENV_FILE}" ]]; then
    cat >"${ENV_FILE}" <<EOF
ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET}
REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
EOF
    chmod 600 "${ENV_FILE}" || true
    echo "[INFO] 已生成并保存随机密钥: ${ENV_FILE}"
  else
    echo "[INFO] 复用已存在密钥: ${ENV_FILE}"
  fi
}

resolve_latest_tag() {
  if docker manifest inspect "${IMAGE_REPO}:latest" >/dev/null 2>&1; then
    echo "latest"
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo ""
    return 0
  fi

  local token tags_json tags tags_semver tags_sha selected

  token="$(curl -fsSL "https://ghcr.io/token?scope=repository:muzimx/ai-water-backend:pull" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  if [[ -z "${token}" ]]; then
    echo ""
    return 0
  fi

  tags_json="$(curl -fsSL -H "Authorization: Bearer ${token}" "https://ghcr.io/v2/muzimx/ai-water-backend/tags/list" || true)"
  tags="$(echo "${tags_json}" | sed -n 's/.*"tags":\[\(.*\)\].*/\1/p' | tr ',' '\n' | tr -d '" ' | sed '/^$/d')"

  if [[ -z "${tags}" ]]; then
    echo ""
    return 0
  fi

  tags_semver="$(echo "${tags}" | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+([-+].*)?$' | sort -V || true)"
  if [[ -n "${tags_semver}" ]]; then
    selected="$(echo "${tags_semver}" | tail -n 1)"
    echo "${selected}"
    return 0
  fi

  tags_sha="$(echo "${tags}" | grep -E '^sha-' | sort -V || true)"
  if [[ -n "${tags_sha}" ]]; then
    selected="$(echo "${tags_sha}" | tail -n 1)"
    echo "${selected}"
    return 0
  fi

  echo "$(echo "${tags}" | head -n 1)"
}

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker 未安装，请先安装 Docker。"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[ERROR] Docker 未启动，请先启动 Docker 服务。"
  exit 1
fi

echo "[1/5] 创建持久化目录..."
mkdir -p "${DATA_DIR}" "${UPLOADS_DIR}"

load_or_generate_secrets

IMAGE_TAG="$(resolve_latest_tag)"
if [[ -z "${IMAGE_TAG}" ]]; then
  echo "[ERROR] 无法解析 ${IMAGE_REPO} 的最新可用标签。"
  echo "        请检查网络、GHCR 访问权限，或手动指定镜像标签后重试。"
  exit 1
fi

IMAGE="${IMAGE_REPO}:${IMAGE_TAG}"

echo "[2/5] 拉取镜像: ${IMAGE}"
docker pull "${IMAGE}"

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[3/5] 发现已有容器 ${CONTAINER_NAME}，正在停止并删除..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null
else
  echo "[3/5] 未发现旧容器，跳过清理。"
fi

echo "[4/5] 启动容器..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "${HOST_PORT}:3001" \
  -e PORT=3001 \
  -e DATABASE_URL='file:./data/users.db' \
  -e ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET}" \
  -e REFRESH_TOKEN_SECRET="${REFRESH_TOKEN_SECRET}" \
  -e ACCESS_TOKEN_EXPIRES_IN="${ACCESS_TOKEN_EXPIRES_IN}" \
  -e REFRESH_TOKEN_EXPIRES_IN="${REFRESH_TOKEN_EXPIRES_IN}" \
  -v "${DATA_DIR}:/app/data" \
  -v "${UPLOADS_DIR}:/app/uploads" \
  "${IMAGE}"

echo "[5/5] 安装完成。"
echo "容器名: ${CONTAINER_NAME}"
echo "API 地址: http://localhost:${HOST_PORT}/api"
echo "数据目录: ${APP_DIR}"
echo

echo "常用命令:"
echo "  查看日志: docker logs -f ${CONTAINER_NAME}"
echo "  停止服务: docker stop ${CONTAINER_NAME}"
echo "  启动服务: docker start ${CONTAINER_NAME}"
echo "  删除服务: docker rm -f ${CONTAINER_NAME}"
