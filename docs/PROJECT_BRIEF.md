# Агентёшка — бриф из диалога (не терять контекст)

## Идея

Tamagotchi-подобная **мобильная** игра: пользователь растит **мультяшного ИИ-агента** (мишка). Не открытый чат — **жёсткий сценарий** + **календарь** (ивенты по дням недели).

## Ключевые механики (MVP → дальше)

1. **Регистрация / агент** — приветствие, анимация, базовые скины (не «сырая» генерация на клиенте).
2. **Обучение «книгами»** — раз в сутки выбор (напр. Пушкин vs Достоевский) → ветка личности / culture XP.
3. **Грейды G0–G4** — качество «генерации» скина = пресеты/слои по уровню обучения, не свободный prompt.
4. **Агент «зарабатывает»** — симуляция: мини-релиз (шаблон игры), лента ботов, сбор раз в сутки.
5. **Мультиплеер лёгкий** — зайти к другим агентам, поиграть в их мини-игры, монеты.

## Ограничения дизайна

- Свобода действий **ограничена** — контент в YAML/JSON в репо.
- LLM — короткие реплики по слотам, лимиты; не обещать «агент пишет полноценные приложения» на старте.
- Ориентация **книжная** (portrait), PWA → позже Capacitor.

## Стек (выбран)

- **Web:** Vite + React + TS + Tailwind, Phaser (`catch_coins`).
- **API:** Fastify + Prisma + PostgreSQL (OSPanel PG-16 `127.0.1.43:5432` или Docker `5433`).
- **Monorepo:** `apps/web`, `apps/api`, `packages/content`, `packages/shared`.

## Название

**Агентёшка** — slug `agentyoshka`, папка `D:\OSPanel\home\agentyoshka`.

## Уже сделано в репо

- `packages/content/calendar.yaml` — ивенты Пн–Вс.
- API: `/health`, `/calendar/today`, `/demo/agent`, `POST /demo/lesson-choice` (+ DB fallback).
- Prisma: `User`, `Agent`, `DailyState`; миграция `20251008120000_init`.
- Web: portrait UI, день из календаря, урок, Phaser `catch_coins` (суббота), подсказка «сарафан» (чт).
- API: `POST /demo/minigame-complete`, `GET/POST /demo/shop`, `SCENARIO_WEEKDAY`.
- `packages/content/shop.yaml` — культура, социал, **железо** (RAM/SSD/GPU → пул дохода).
- `packages/content/production-templates.yaml` — что крутится в пуле по дням недели.
- API: `GET /demo/production`, `POST /demo/production/collect`, `POST /demo/daily-complete`.

## Тик (старт игры) и удержание

- **Тик** — первые 7 дней жизни агента: множитель пассивного дохода (`onboarding-tick.yaml`).
- **Ежедневный вход** — таблица на 7 дней, монеты + дроп железа (`POST /demo/daily-login/claim`).
- **Сервер** — RAM/GPU/SSD/HDD от покупок и дейликов; от этого **лок** мини-игр в `minigames-catalog.yaml` (~27 шт., 1 в коде).
- **Монетизация (позже)** — IAP монеты, rewarded ads, ускорение крафта; описано в YAML, без fake-креативов.

### День 1 (~1–2 ч активности) — целевой дизайн

1. Забрать дейлик → 2. Урок/ивент дня → 3. Запуск в пул → 4. Сбор → 5. Первое железо → 6. Субботняя аркада когда дойдёт календарь → 7. «Сервер» — видеть, что откроется дальше.

## Как играть (живой гайд)

- Контент: `packages/content/how-to-play.yaml` — табы Help в приложении.
- API: `GET /demo/howto`. Кнопка **?** в шапке домашнего экрана.
- При новой механике — сразу дописать пункт в YAML (не импровизировать в UI).

## Следующие шаги (очередь)

1. ~~2–3 мини-игры~~ — `tap_rhythm`, `snake_mini`, `memory_pairs` + хаб «Аркада мишки» (5 игр/день).
2. Ускорение пула за монеты — `POST /demo/production/speedup` (готово).
3. IAP / rewarded ads (заглушки в YAML).
4. ~~Каталог чужих релизов~~ + ~~auth~~ (гость / ник+пароль, Bearer-сессия).

## Голос агента

- G0–G4 caps + drift: `grade-policies.yaml`, `personality-drift.yaml`.
- `POST /demo/agent-reply` — слот `day_intro`, кэш на день, шаблон или LLM (`LLM_API_KEY`).

## Workspace / Cursor

Чат агента привязан к **окну**, а не только к папке. Чтобы **не терять диалог**: добавить `agentyoshka` в **то же окно**, где открыт чат (`vs9china`), через multi-root workspace `D:\OSPanel\home\agentyoshka-with-vs9china.code-workspace`.
