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
# БД: OSPanel PostgreSQL-16 (127.0.1.43:5432) — см. apps/api/.env.example
# либо Docker: npm run db:up → localhost:5433
cd apps/api && copy .env.example .env && npx prisma migrate deploy
npm run dev:api        # http://127.0.0.1:3001
npm run dev:web        # http://127.0.0.1:5173 (прокси /api)

**OSPanel:** после `npm run build` — сайт из `apps/web/dist`, прокси `/api` в `.osp/nginx/`.
Открой домен проекта **agentyoshka** (или `http://127.0.0.1:5173` в dev). Перезапусти Nginx в OSPanel, если только что добавили `.osp`.
```

## Cursor / workspace

### Не терять чат с агентом

Чат Cursor живёт в **том окне**, где вы общались. Если открыть только `agentyoshka` в **новом** окне — диалог там не появится.

**Рекомендуется:** в окне, где открыт этот чат (сейчас часто `vs9china`):

1. **File → Open Workspace from File…**
2. Выбери **`D:\OSPanel\home\agentyoshka-with-vs9china.code-workspace`**

В Explorer будут обе папки; **чат останется**. Рабочий код — в **Агентёшка**.

Либо только игра: **`D:\OSPanel\home\agentyoshka\agentyoshka.code-workspace`** (новое окно = новый чат).
