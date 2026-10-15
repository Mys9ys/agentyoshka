# База данных — PostgreSQL

API работает на **PostgreSQL**. Локально: OSPanel PostgreSQL-16 (`127.0.1.43:5432`) или Docker (`5433`).

## OSPanel PostgreSQL-16 (рекомендуется на этой машине)

1. В OSPanel включи модуль **PostgreSQL-16** (`enabled = 1` в `D:\OSPanel\config\PostgreSQL-16\module.ini`).
2. Старт (если не крутится):

```bat
D:\OSPanel\modules\PostgreSQL-16\bin\pg_ctl.exe start -D D:\OSPanel\data\PostgreSQL-16\default -w
```

3. БД `agentyoshka` (один раз):

```bat
set PGHOST=127.0.1.43
set PGUSER=postgres
psql -c "CREATE DATABASE agentyoshka;"
```

4. API:

```bash
cd apps/api
copy .env.example .env
npx prisma migrate deploy
npx prisma generate
cd ../..
npm run dev:api
npm run dev:web
```

`DATABASE_URL`:

```
postgresql://postgres@127.0.1.43:5432/agentyoshka?schema=public
```

## Docker (если установлен)

```bash
npm run db:up
# DATABASE_URL=postgresql://agentyoshka:agentyoshka@127.0.0.1:5433/agentyoshka?schema=public
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

## Проверка

```bash
npm run db:check
curl http://127.0.0.1:3001/health
```

Гость: `POST /auth/guest` → `GET /demo/agent` с `Authorization: Bearer …` → `source: "database"`.

## Веб

- Dev: **http://127.0.0.1:5180**
- Старый SQLite `apps/api/prisma/dev.db` больше не используется схемой.
