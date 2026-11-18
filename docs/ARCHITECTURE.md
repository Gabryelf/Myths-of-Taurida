# ARCHITECTURE — Таврида · Легенды полуострова

> Карта проекта. Обновлять при изменении структуры. Версия документа: v0.2.1

## 1. Обзор

Карточно-стратегическая игра на гексах: кампания в 3D-сцене (Three.js) + карточные бои (Gwent-подобные). Сборка — Vite, язык — JavaScript (ES-модули), бэкенда нет: профиль и сохранения в `localStorage`.

## 2. Слои и правила зависимостей

Направление стрелок — «кто может импортировать кого»:

```
main.js
  └─ core/Game.js  ← корневая сборка (композиция), знает обо всех слоях
       ├─ application/*  ← оркестрация сценариев (клики, ходы, бои, рынки)
       │    ├─ domain/*        ← чистая логика (домен не знает о UI и Three.js)
       │    ├─ core/*          ← инфраструктура ядра (EventBus, Random, Logger)
       │    ├─ infrastructure/* ← Three.js, звук, темы (не импортирует application)
       │    └─ ui/*            ← DOM-компоненты (общается с application через колбэки и шину)
```

Жёсткие правила:
- **domain/** не импортирует ничего из `application`, `ui`, `infrastructure`. Только `core`.
- **ui/** не знает о `Game`. Взаимодействие — через EventBus и колбэки, которые навешивает `Game`.
- **infrastructure/three/** — только визуал. Логику решений туда не заносить.
- Единственный, кто «видит всех», — `core/Game.js` (композиция). Он же — точка внедрения зависимостей.

## 3. Ключевые модули

### core/
| Модуль | Роль |
|---|---|
| `Game.js` | Сборка приложения: создаёт все сервисы, связывает шину, запускает мир |
| `EventBus.js` | Шина событий. `emit` обёрнут в try/catch — падение одного слушателя не роняет игру |
| `Random.js` | Детерминированный генератор (mulberry32) с seed — мир воспроизводим |
| `VisibilityService.js` | Пересчёт тумана войны и видимости |

### application/ (оркестрация)
| Модуль | Роль |
|---|---|
| `TurnOrchestrator.js` | Ходы: игрок → AI-фракции → hot-seat. Самый «толстый» сервис |
| `BattleOrchestrator.js` | Открытие/завершение боёв, применение последствий побед |
| `BattleController.js` | Прокладка к `Battle`: selectCard/playCard/endTurn, планирование ходов ИИ |
| `TileInteractionService.js` | Клики и наведение на гексы/генералов (диспетчер ввода) |
| `CityInteractionService.js` | Клик по городу, покупка поселений |
| `MovementController.js` | Пошаговое движение: BFS-путь + анимация |
| `SelectionController.js` | Выбор генерала/гекса, оверлеи перемещения и атаки |
| `MarketController.js`, `RecruitController.js` | Рынок и найм — тонкие прокси к домену |

### domain/
- **battle/** — карточный бой: `Battle` (состояние), `BattleBoard`, правила (`GeneralDamageRule`, `LineBonus`, `ColumnBonus`, `TerrainBattleModifier`), `BattleAI`, фабрики (`BattleFactory`, `AbilityFactory`).
- **world/** — генерация карты: `WorldGenerator`, `TauridaMap`, `HaloGenerator` (интересные места), `NeutralDefenders`, `ConnectivityService` (целостность дорог/территорий).
- **economy/** — `EconomyService`, `Market`, `RecruitService/Pool`, `ResourcePool`, `RoadService`, `CityDefense`.
- **hex/** — `Hex`, `HexMap`, `HexMath`, `Tile`: чистая геометрия и контейнер карты.
- **ai/** — `AIController` + `AIStrategy` (стратегия хода ИИ), `BotTurnPlanner`, `TurnManager` (пошаговый прогон ходов ботов).
- **card/, deck/, collection/** — карты, колоды, профиль игрока, `SaveManager` (localStorage).
- **general/** — `General` + `MovementService` (правила перемещения/атаки).
- **city/, faction/** — сущности городов и фракций + фабрики.

### infrastructure/
- **three/** — `Renderer`, `CameraController`, `SceneBuilder` (сборка и обновление 3D-сцены), `HighlightService`, `ModelLoader`.
- **three/visuals/** — один визуальный класс на сущность (`HexVisual`, `CityVisual`, `GeneralVisual`, `FogVisual`, `BorderVisual`, `RoadVisual` и др.).
- **audio/SoundManager.js**, **config/ThemeConfig.js**.

### ui/
- `UIManager.js` — корень UI: HUD, панели, делегирование кликов.
- **components/** — панели (`CityPanel`, `MarketPanel`, `RecruitModal`), модалки боя (`BattleModal`, `BattleHand`), `Minimap`, `Toast`, `ConfirmDialog`, лобби.

## 4. Каталог событий EventBus

Шина — главный способ связать слои. События, встречающиеся в коде:

| Событие | Кто эмитит | Кто слушает |
|---|---|---|
| `battle:started` / `battle:updated` / `battle:finished` | BattleController, BattleOrchestrator | UI (BattleModal), UIManager |
| `turn:ended` | TurnOrchestrator | QuickJump (миникарта) |
| `general:selected` / `general:moved` | SelectionController, MovementController | UI |
| `general:no-move-points` | TileInteractionService, MovementController | UI |
| `tile:captured` | MovementController | — (лог/звук) |
| `resources:changed` | многие | ResourceBar |
| `market:changed` | MarketController | MarketPanel |
| `deck:changed` / `card:recruited` | RecruitController | DeckPanel |
| `world:generalsChanged` | домен (найм генерала) | Game → пересборка сцены |
| `toast:show` / `notification:show` | многие | Toast / NotificationCenter |
| `halo:hovered` | TileInteractionService | UI (тултип гало) |
| `ai:step:move` / `ai:step:attack` | TurnOrchestrator | анимация ИИ |

## 5. Синхронизация сцены (важно!)

После изменения мира нужно обновить: туман, города, границы, пикабельные объекты, миникарту и полоску ресурсов. Раньше этот набор копировался вручную в 7+ местах — источник «плавающих» багов.

**Теперь:** единый сервис `application/SceneSync.js`:

```js
sync.run(world, { rebuild = true, resources = true, factionId = null })
```

- `rebuild: false` — только обновить без полной пересборки (движение).
- `resources: false` — не эмитить `resources:changed` (шаги ИИ).
- `factionId` — чьи ресурсы обновить (hot-seat: следующий игрок).

Правило: любое изменение мира → `world.recomputeVisibility()` (если меняется видимость) → `sceneSync.run(world)`.

## 6. Конвенции

- Детерминизм: любые случайности в мире — только через `Random` (mulberry32) с seed, не `Math.random()`.
- Комментарии вида «КРИТИЧНО/ВАЖНО» фиксируют инварианты — при рефакторинге не удалять, а переносить в это место (или делать инвариант кодом).
- Коммиты: версия в сообщении (`v0.2.2: <что>`), main — рабочая dev-ветка, страховочные ветки — для экспериментов.
- Каждое изменение — маленькое и отдельно тестируемое.
