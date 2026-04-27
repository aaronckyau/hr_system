#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.production ]; then
  echo ".env.production not found" >&2
  exit 1
fi

set -a
. ./.env.production
set +a

POSTGRES_DB="${POSTGRES_DB:-hr_system}"
POSTGRES_USER="${POSTGRES_USER:-hr_user}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output_file="$BACKUP_DIR/${POSTGRES_DB}_${timestamp}.dump"

docker compose --env-file .env.production -f docker-compose.prod.yml exec -T hr-db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl \
  > "$output_file"

echo "$output_file"
