# Задание дизайнеру: иконки узлов дерева технологий

Интегратор уже подключил светлый UI и подставил общие иконки веток (`book` / `server` / `profile`) на все узлы. Нужен **набор уникальных иконок** в том же стиле, что `/public/art/icon-*.png` (мягкий 3D / chunky, светлый стол).

## Формат

- PNG, прозрачный фон, ~256×256 (или 512)
- Имя файла = `id` товара из `packages/content/shop.yaml`
- Кладём в `apps/web/public/art/tech/`

## Список (приоритет)

### Культура
- `upgrade_vocab` — чип словаря
- `upgrade_epigram` — короткая фраза / бирка
- `upgrade_quotes` — карман цитат
- `upgrade_rhetoric` — риторика II

### Социальное
- `upgrade_charm` — харизма
- `upgrade_smile` — улыбка / тон
- `upgrade_emoji` — эмодзи-разметка
- `upgrade_network` — сарафан-antenna

### Железо
- `hw_ram_4`, `hw_ram_16` — планки RAM
- `hw_ssd_256` — SSD
- `hw_cooling` — кулер
- `hw_gpu_basic` — GPU
- `hw_npu` — NPU

### Старты веток (опционально)
- `starter_culture`, `starter_social`, `starter_hardware`

## Не делать

- Не менять API / shop.yaml без согласования
- Не уходить в тёмный cyber-стиль
- Один стиль со всеми `icon-*.png` home

Когда файлы появятся в `public/art/tech/` — напиши интегратору: он подключит пути в `TechTreeView`.
