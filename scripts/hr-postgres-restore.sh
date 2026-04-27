#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
  echo "Refusing restore. Run with CONFIRM_RESTORE=YES." >&2
  exit 1
fi

if [ "$#" -ne 1 ]; then
  echo "Usage: CONFIRM_RESTORE=YES $0 /path/to/backup.dump" >&2
  exit 1
fi

backup_file="$1"
if [ ! -f "$backup_file" ]; then
  echo "Backup file not found: $backup_file" >&2
  exit 1
fi

if [ ! -f .env.production ]; then
  echo ".env.production not found" >&2
  exit 1
fi

set -a
. ./.env.production
set +a

POSTGRES_DB="${POSTGRES_DB:-hr_system}"
POSTGRES_USER="${POSTGRES_USER:-hr_user}"

cat "$backup_file" | docker compose --env-file .env.production -f docker-compose.prod.yml exec -T hr-db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl

echo "Restored $backup_file to $POSTGRES_DB"
