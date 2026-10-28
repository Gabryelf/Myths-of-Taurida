import { HexVisual } from './visuals/HexVisual.js';
import { GeneralVisual } from './visuals/GeneralVisual.js';
import { MovementOverlay } from './visuals/MovementOverlay.js';
import { HighlightService } from './HighlightService.js';
import { Theme } from '../config/ThemeConfig.js';

export class SceneBuilder {
  constructor(scene) {
    this.scene = scene;
    this._tileVisuals = new Map();
    this._generalVisuals = new Map();
    this._movementOverlays = new Map();
    this._attackOverlays = new Map();
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

  updateGeneralPositions(world) {
    for (const gen of world.generals) {
      const v = this._generalVisuals.get(gen.id);
      if (!v) continue;
      const { x, z } = gen.hex.toWorld(Theme.hexSize);
      v.setPosition(x, z);
    }
  }

  setMovementOverlays(reachableMap, isVisible) {
    for (const ov of this._movementOverlays.values()) ov.setVisible(false);
    if (!isVisible || !reachableMap) return;
    for (const key of reachableMap.keys()) {
      let ov = this._movementOverlays.get(key);
      if (!ov) {
        const visual = this._tileVisuals.get(key);
        if (!visual) continue;
        ov = new MovementOverlay(Theme.hexSize, 'move');
        ov.addTo(visual.group);
        this._movementOverlays.set(key, ov);
      }
      ov.setVisible(true);
    }
  }

  setAttackOverlays(attacksMap, isVisible) {
    for (const ov of this._attackOverlays.values()) ov.setVisible(false);
    if (!isVisible || !attacksMap) return;
    for (const key of attacksMap.keys()) {
      let ov = this._attackOverlays.get(key);
      if (!ov) {
        const visual = this._tileVisuals.get(key);
        if (!visual) continue;
        ov = new MovementOverlay(Theme.hexSize, 'attack');
        ov.addTo(visual.group);
        this._attackOverlays.set(key, ov);
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
      v.group.traverse((c) => { if (c.isMesh || c.isSprite) arr.push(c); });
    }
    for (const v of this._tileVisuals.values()) {
      v.group.traverse((c) => { if (c.isMesh || c.isSprite) arr.push(c); });
    }
    return arr;
  }

  _clearTiles() {
    for (const v of this._tileVisuals.values()) v.removeFrom(this.scene);
    this._tileVisuals.clear();
    for (const ov of this._movementOverlays.values()) {
      if (ov.mesh?.parent) ov.mesh.parent.remove(ov.mesh);
    }
    this._movementOverlays.clear();
    for (const ov of this._attackOverlays.values()) {
      if (ov.mesh?.parent) ov.mesh.parent.remove(ov.mesh);
    }
    this._attackOverlays.clear();
  }

  _clearGenerals() {
    for (const v of this._generalVisuals.values()) v.removeFrom(this.scene);
    this._generalVisuals.clear();
  }

  get _visuals() { return this._tileVisuals; }
}