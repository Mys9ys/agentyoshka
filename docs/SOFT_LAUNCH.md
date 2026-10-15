# Soft-launch чеклист (веб / PWA)

Цель к **13 ноября**: игра открывается по URL, прогресс в Postgres, PWA ставится на телефон.

## 1. База

- [ ] OSPanel PostgreSQL-16 запущен (`127.0.1.43:5432`) **или** Docker `npm run db:up` (порт 5433)
- [ ] БД `agentyoshka` создана
- [ ] `apps/api/.env` из `.env.example` с верным `DATABASE_URL`
- [ ] `npx prisma migrate deploy` (из `apps/api`)
- [ ] `curl http://127.0.0.1:3001/health` → `{"ok":true}`

См. [DEV_DATABASE.md](./DEV_DATABASE.md).

## 2. API (prod)

```bash
cd apps/api
npm run build
# HOST=0.0.0.0 PORT=3001 node dist/index.js
# или process manager / OSPanel backend
```

Проверить:

- [ ] `POST /auth/guest` → token
- [ ] `GET /demo/agent` с `Authorization: Bearer …` → `source:"database"`
- [ ] CORS: origin фронта разрешён (`@fastify/cors` сейчас `origin: true` — ок для soft)

## 3. Web (prod)

```bash
cd apps/web
# Указать публичный API (без слэша в конце):
# Windows: set VITE_API_URL=https://api.example.com
# или относительный /api через nginx:
# set VITE_API_URL=/api
npm run build
# артефакт: apps/web/dist
```

- [ ] `apps/web/dist/index.html` есть
- [ ] manifest / SW в билде (vite-plugin-pwa)
- [ ] На телефоне: «Добавить на экран» / Install

## 4. Nginx / OSPanel

Конфиг: [`.osp/nginx/agentyoshka.conf`](../.osp/nginx/agentyoshka.conf)

- [ ] `root` → `apps/web/dist`
- [ ] `location /api/` → proxy на Fastify `:3001` (rewrite без `/api`)
- [ ] Перезапуск Nginx в OSPanel
- [ ] Открыть домен проекта **agentyoshka**

## 5. Smoke «День 1» (5–10 мин)

1. Чистый браузер / инкогнито → онбординг «Привет» → Поехали  
2. Забрать **дейлик**  
3. Закрыть ивент дня (урок / аркада / «в пул»)  
4. **Пул** → Собрать  
5. Баннер «Сохрани прогресс» → ник+пароль (или Позже)  
6. **Лента** → одна игра NPC  
7. **Аркада** → одна свободная партия  
8. **Сервер** → видно «Открыто / Что дальше»  
9. **?** → таб «День» / «Аккаунт»  
10. Перезагрузка → тот же гость/ник и монеты

## 6. Ещё не в soft

- Реальные AdMob / IAP SDK  
- Capacitor / сторы  
- Живые игроки вместо NPC  

## Env шпаргалка

| Где | Ключ | Пример |
|-----|------|--------|
| api | `DATABASE_URL` | `postgresql://postgres@127.0.1.43:5432/agentyoshka?schema=public` |
| api | `PORT` / `HOST` | `3001` / `0.0.0.0` |
| web build | `VITE_API_URL` | `/api` или `https://host:3001` |
