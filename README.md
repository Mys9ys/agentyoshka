# Агентёшка (`agentyoshka`)

Мобильная PWA (книжная ориентация) + API: сценарный тамагочи-агент, календарь ивентов, прокачка через «уроки» классики.

## Структура

- `apps/web` — Vite + React + TypeScript (PWA)
- `apps/api` — Fastify + Prisma + PostgreSQL
- `packages/content` — YAML-сценарии и календарь
- `packages/shared` — общие типы

## Быстрый старт

```bash
# из корня репозитория
npm install
# БД для теста: SQLite (файл apps/api/prisma/dev.db), без OSPanel Postgres
cd apps/api && copy .env.example .env && npx prisma db push
# Позже OSPanel PG: schema.prisma → postgresql, .env → DATABASE_URL postgres, npm run db:deploy:postgres
npm run dev:api        # http://127.0.0.1:3001
npm run dev:web        # http://127.0.0.1:5180 (прокси /api; 5173 — другие проекты)

**OSPanel:** после `npm run build` — сайт из `apps/web/dist`, прокси `/api` в `.osp/nginx/`.
Открой домен проекта **agentyoshka** (или `http://127.0.0.1:5180` в dev). Перезапусти Nginx в OSPanel, если только что добавили `.osp`.
```

## Cursor / workspace

### Не терять чат с агентом

Чат Cursor живёт в **том окне**, где вы общались. Если открыть только `agentyoshka` в **новом** окне — диалог там не появится.

**Рекомендуется:** в окне, где открыт этот чат (сейчас часто `vs9china`):

1. **File → Open Workspace from File…**
2. Выбери **`D:\OSPanel\home\agentyoshka-with-vs9china.code-workspace`**

В Explorer будут обе папки; **чат останется**. Рабочий код — в **Агентёшка**.

Либо только игра: **`D:\OSPanel\home\agentyoshka\agentyoshka.code-workspace`** (новое окно = новый чат).
