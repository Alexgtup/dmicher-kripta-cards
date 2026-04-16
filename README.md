# dmicher-kripta-cards

dev-сборка модуля foundry vtt для интеграции с kripta cards web api.

## структура
- `module.json`
- `scripts/`
- `styles/`
- `templates/`
- `lang/`

## что уже реализовано
- world settings для server url, writer/reader и привязок игроков
- меню "карточки крипты" в scene controls
- окно настроек подключения
- управление игроками и реестр игроков
- каталог карточек
- мои карточки
- запрос, выдача и использование карточек через чат
- совместимый каркас под foundry 13/14 без сборщика

## установка вручную
положить папку `dmicher-kripta-cards` в `Data/modules/` и включить модуль в мире.

## установка через manifest
заполнить в `module.json` поля `manifest`, `download`, `url`, `bugs`, `readme`,
выложить zip в github release и установить модуль в foundry по ссылке на manifest.
