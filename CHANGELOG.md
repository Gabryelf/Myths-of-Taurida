# Changelog

Все значимые изменения проекта.
Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версии — [SemVer](https://semver.org/lang/ru/).

## [0.2.1] 

### Added
- Тултип ореола при наведении на иконку (доход, владелец, размер).
- `TileInteractionService` — вынесены клики/ховер из `Game`.
- `MovementController` — BFS-движение и анимация поворота модели.
- `DeckProvider` — фабрика fallback-колод для `BattleFactory`.

### Changed
- `Game.js` разгружен: 4 сервиса вместо монолита.
- `AIStrategy` разбит на стратегию + `AIScoring`.
- `BattleFactory` — `DeckProvider` вместо статических методов.

### Fixed
- Иконка ореола в режиме «Ореолы» теперь показывает тултип.
- В режиме «Без линз» убраны кольца фракций на гексах.
- Копии генералов при покупке — теперь берётся свободный `presetIndex`.

### Performance
- `setPixelRatio(min(dpr, 1.5))` — меньше пикселей, тот же визуал.
- `MeshLambertMaterial` вместо `MeshStandardMaterial` для статичных гексов.
- Убраны тени у декоративной травы и мелких камней.
- `sea.update()` — раз в 2 кадра.
- Пауза рендера при `document.hidden`.

