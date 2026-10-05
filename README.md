# Pikabu Return Minus
Возвращает минусы на пикабу, а также добавляет фильтрацию постов по рейтингу.

[Телеграм-канал скрипта](https://t.me/return_pikabu)

## Разработка
Исходники лежат в `src/` (ES-модули, точка входа `src/main.ts`). Единый userscript-файл собирается командой `npm run build` в `dist/index.js` (esbuild, заголовок метаданных берётся из `src/header.txt`). `npm run typecheck` — только проверка типов.