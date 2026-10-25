import { HexVisual } from './visuals/HexVisual.js';
import { GeneralVisual } from './visuals/GeneralVisual.js';
import { MovementOverlay } from './visuals/MovementOverlay.js';
import { HighlightService } from './HighlightService.js';
import { Theme } from '../config/ThemeConfig.js';

/**
 * Строит сцену из домена. Кэширует визуалы по ключу.
 * С v0.0.4 добавлены полководцы и оверлеи движения.
 */
export class SceneBuilder {
  constructor(scene) {
    this.scene = scene;
    this._tileVisuals = new Map();     // key -> HexVisual
    this._generalVisuals = new Map();  // generalId -> GeneralVisual
    this._movementOverlays = new Map(); // key -> MovementOverlay
    this.highlight = new HighlightService(Theme.hexSize);
  }

  rebuild(world) {
    this._clearTiles();
    for (const tile of world.map.all()) {
      if (!tile.isLand) continue;
      const v = new HexVisual(tile, Theme.hexSize);
      const { x, z } = tile.hex.toWorld(Theme.hexSize);
      v.setPosition(x, 0, z);
      v.addTo(this.scene);
      this._tileVisuals.set(tile.key, v);
    }
    this.highlight.bindVisuals(this._tileVisuals);

    this._clearGenerals();
    this._renderGenerals(world);
  }

  _renderGenerals(world) {
    for (const gen of world.generals) {
      if (!gen.alive) continue;
      const v = new GeneralVisual(gen, Theme.hexSize);
      const { x, z } = gen.hex.toWorld(Theme.hexSize);
      v.setPosition(x, z);
      v.addTo(this.scene);
      this._generalVisuals.set(gen.id, v);
    }
  }

  /** Обновить позиции полководцев без пересборки всей сцены. */
  updateGeneralPositions(world) {
    for (const gen of world.generals) {
      const v = this._generalVisuals.get(gen.id);
      if (!v) continue;
      const { x, z } = gen.hex.toWorld(Theme.hexSize);
      v.setPosition(x, z);
    }
  }

  /** Показать/скрыть оверлеи движения на гексах. */
  setMovementOverlays(reachableMap, isVisible) {
    // Скрыть старые
    for (const ov of this._movementOverlays.values()) {
      ov.setVisible(false);
    }
    if (!isVisible || !reachableMap) return;

    for (const key of reachableMap.keys()) {
      let ov = this._movementOverlays.get(key);
      if (!ov) {
        const visual = this._tileVisuals.get(key);
        if (!visual) continue;
        ov = new MovementOverlay(Theme.hexSize);
        ov.addTo(visual.group);
        this._movementOverlays.set(key, ov);
      }
      ov.setVisible(true);
    }
  }

  setGeneralSelected(generalId, isSelected) {
    const v = this._generalVisuals.get(generalId);
    v?.setSelected(isSelected);
  }

  getPickables() {
    const arr = [];
    for (const v of this._generalVisuals.values()) {
      v.group.traverse((c) => { if (c.isMesh) arr.push(c); });
    }
    for (const v of this._tileVisuals.values()) {
      v.group.traverse((c) => { if (c.isMesh) arr.push(c); });
    }
    return arr;
  }

  _clearTiles() {
    for (const v of this._tileVisuals.values()) v.removeFrom(this.scene);
    this._tileVisuals.clear();
    this._movementOverlays.clear();
  }

  _clearGenerals() {
    for (const v of this._generalVisuals.values()) v.removeFrom(this.scene);
    this._generalVisuals.clear();
  }

  /** Для совместимости с v0.0.2/v0.0.3 */
  get _visuals() { return this._tileVisuals; }
}