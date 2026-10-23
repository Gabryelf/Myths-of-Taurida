import { HexVisual } from './visuals/HexVisual.js';
import { Theme } from '../config/ThemeConfig.js';

/**
 * Строит сцену из домена. Единственное место, где домен превращается в Three.js.
 * Если нужен новый рендер — просто заменить SceneBuilder.
 */
export class SceneBuilder {
  constructor(scene) {
    this.scene = scene;
    this._visuals = [];
  }

  rebuild(world) {
    this._clear();
    for (const tile of world.map.all()) {
      if (!tile.isLand) continue;   // море — отдельный слой (в будущем)
      const v = new HexVisual(tile, Theme.hexSize);
      v.addTo(this.scene);
      this._visuals.push(v);
    }
  }

  _clear() {
    for (const v of this._visuals) v.removeFrom(this.scene);
    this._visuals = [];
  }
}