# База на этапе теста (SQLite)

Пока OSPanel Postgres недоступен (конфликт admin / PG), API использует **SQLite** — один файл `apps/api/prisma/dev.db`. Прогресс сохраняется, MySQL и `hosts` не трогаем.

## Запуск

```bash
cd apps/api
copy .env.example .env   # DATABASE_URL="file:./dev.db"
npx prisma db push
cd ../..
npm run dev:api
npm run dev:web
```

## Вернуть PostgreSQL (OSPanel)

1. В `apps/api/prisma/schema.prisma`: `provider = "postgresql"`.
2. В `.env`: `DATABASE_URL="postgresql://postgres@127.0.1.43:5432/agentyoshka?schema=public"`.
3. `npm run db:deploy:postgres` в `apps/api`.
4. OSPanel **без** администратора → модуль PostgreSQL-16 **запущен**.

## OSPanel и hosts

- Dev-игра: **http://127.0.0.1:5180** — локальные домены в `hosts` не обязательны.
- PG и MySQL — разные модули; включение Postgres **не обнуляет** MySQL.
