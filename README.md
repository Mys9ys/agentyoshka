# Агентёшка (`agentyoshka`)

Мобильная PWA (книжная ориентация) + API: сценарный тамагочи-агент, календарь ивентов, прокачка через «уроки» классики.

## Структура

- `apps/web` — Vite + React + TypeScript (PWA)
- `apps/api` — Fastify + Prisma + **PostgreSQL**
- `packages/content` — YAML-сценарии и календарь
- `packages/shared` — общие типы

## Быстрый старт (dev)

```bash
npm install

# Postgres: OSPanel PG-16 или Docker — см. docs/DEV_DATABASE.md
cd apps/api
copy .env.example .env
npx prisma migrate deploy
npx prisma generate
cd ../..

npm run dev:api        # http://127.0.0.1:3001
npm run dev:web        # http://127.0.0.1:5180
```

Soft-launch / prod: **[docs/SOFT_LAUNCH.md](docs/SOFT_LAUNCH.md)**.

**OSPanel:** после `npm run build` — сайт из `apps/web/dist`, прокси `/api` в `.osp/nginx/`.  
Открой домен проекта **agentyoshka** (или `http://127.0.0.1:5180` в dev).

## Cursor / workspace

Чат Cursor живёт в **том окне**, где вы общались. Чтобы не терять диалог: multi-root workspace `agentyoshka-with-vs9china.code-workspace` или только `agentyoshka.code-workspace`.
