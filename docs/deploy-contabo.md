# Contabo Deployment

## Target

- Frontend: `https://www.4mstrategy.com/hr`
- Backend proxy: `https://www.4mstrategy.com/hr-api`

## Server directory

```bash
cd ~/apps
git clone https://github.com/aaronckyau/hr_system.git
cd hr_system
cp .env.production.example .env.production
```

## Required env

Edit `.env.production`:

```bash
JWT_SECRET_KEY=<long-random-secret>
POSTGRES_DB=hr_system
POSTGRES_USER=hr_user
POSTGRES_PASSWORD=<long-random-postgres-password>
NEXT_PUBLIC_API_BASE_URL=/hr-api/api
NEXT_PUBLIC_BASE_PATH=/hr
CORS_ORIGINS=https://www.4mstrategy.com,https://4mstrategy.com
```

Production uses PostgreSQL in Docker service `hr-db`.

- PostgreSQL container: `hr_postgres`
- Internal database URL: `postgresql+psycopg://<user>:<password>@hr-db:5432/<db>`
- Host-bound PostgreSQL port: `127.0.0.1:5302`
- Persistent data volume: `hr_postgres_data`

## Start containers

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## Health checks

```bash
curl http://127.0.0.1:5301/health
curl -I http://127.0.0.1:5300/hr/login
docker exec hr_postgres pg_isready -U hr_user -d hr_system
```

## Nginx

Add these locations inside `/etc/nginx/sites-available/4mstrategy.com` in the `server 443` block:

```nginx
location = /hr {
    proxy_pass http://127.0.0.1:5300/hr;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /hr/ {
    proxy_pass http://127.0.0.1:5300;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /hr-api/ {
    proxy_pass http://127.0.0.1:5301/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Reload Nginx:

```bash
nginx -t && systemctl reload nginx
```

## Update later

```bash
cd ~/apps/hr_system
git pull --ff-only origin main
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Alembic migrations

Production schema changes should be managed by Alembic.

For an existing database that was already created before Alembic was added, stamp it once:

```bash
cd ~/apps/hr_system
docker compose --env-file .env.production -f docker-compose.prod.yml exec hr-backend alembic -c alembic.ini stamp head
```

For future schema updates:

```bash
cd ~/apps/hr_system
docker compose --env-file .env.production -f docker-compose.prod.yml exec hr-backend alembic -c alembic.ini upgrade head
```

Create a new migration locally from `backend/`:

```bash
alembic -c alembic.ini revision --autogenerate -m "describe change"
```

## PostgreSQL backup and restore

Create a production backup:

```bash
cd ~/apps/hr_system
bash scripts/hr-postgres-backup.sh
```

Restore from a backup file:

```bash
cd ~/apps/hr_system
CONFIRM_RESTORE=YES bash scripts/hr-postgres-restore.sh backups/hr_system_YYYYMMDDTHHMMSSZ.dump
```

Backups are written to `~/apps/hr_system/backups/` and are ignored by Git.
