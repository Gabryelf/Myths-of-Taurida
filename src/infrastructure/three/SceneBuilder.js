import { HexVisual } from './visuals/HexVisual.js';
import { GeneralVisual } from './visuals/GeneralVisual.js';
import { MovementOverlay } from './visuals/MovementOverlay.js';
import { FogVisual } from './visuals/FogVisual.js';
import { CityVisual } from './visuals/CityVisual.js';
import { VillageVisual } from './visuals/VillageVisual.js';
import { RoadVisual } from './visuals/RoadVisual.js';
import { BorderVisual } from './visuals/BorderVisual.js';
import { HaloVisual } from './visuals/HaloVisual.js';
import { HighlightService } from './HighlightService.js';
import { Theme } from '../config/ThemeConfig.js';
import { ModelLoader } from './ModelLoader.js';
import { terrainModelUrls } from '../../config.js';

export class SceneBuilder {
  constructor(scene) {
    this.scene = scene;
    this.world = null;
    this._tileVisuals = new Map();
    this._generalVisuals = new Map();
    this._cityVisuals = new Map();
    this._roadVisuals = [];
    this._movementOverlays = new Map();
    this._attackOverlays = new Map();
    this._fogVisuals = new Map();
    this._borderVisual = null;
    this._haloVisual = null;

    // ─── Единый режим линз: 'none' | 'borders' | 'halos' ───
    this._lensMode = 'none';

    this.highlight = new HighlightService(Theme.hexSize);
  }

  rebuild(world) {
    this.world = world;
    this._clearAll();

    const toPreload = [
      ...terrainModelUrls('mountain'),
      ...terrainModelUrls('forest'),
    ];
    if (toPreload.length) ModelLoader.preload(toPreload);

    for (const tile of world.map.all()) {
      if (!tile.isLand) continue;
      const v = new HexVisual(tile, Theme.hexSize);
      const { x, z } = tile.hex.toWorld(Theme.hexSize);
      v.setPosition(x, 0, z);
      v.addTo(this.scene);
      this._tileVisuals.set(tile.key, v);
    }
    this.highlight.bindVisuals(this._tileVisuals);

    const drawn = new Set();
    for (const tile of world.map.all()) {
      if (!tile.hasRoad) continue;
      for (const n of tile.hex.neighbors()) {
        const nt = world.map.get(n.q, n.r);
        if (!nt || !nt.hasRoad) continue;
        const key = [tile.key, nt.key].sort().join('|');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const road = new RoadVisual(tile, nt, Theme.hexSize);
        road.addTo(this.scene);
        this._roadVisuals.push(road);
      }
    }

    for (const city of world.cities) {
      if (!city.tileKey) continue;
      const tile = world.map.getByKey(city.tileKey);
      if (!tile) continue;
      const v = city.isCity
        ? new CityVisual(city, Theme.hexSize)
        : new VillageVisual(city, Theme.hexSize);
      const { x, z } = tile.hex.toWorld(Theme.hexSize);
      v.group.position.set(x, 0, z);
      v.addTo(this.scene);
      this._cityVisuals.set(city.id, v);
    }

    this._renderGenerals(world);

    for (const tile of world.map.all()) {
      if (!tile.isLand) continue;
      const visual = this._tileVisuals.get(tile.key);
      if (!visual) continue;
      const fog = new FogVisual(Theme.hexSize);
      fog.addTo(visual.group);
      this._fogVisuals.set(tile.key, fog);
    }
    this.updateFog(world);

    // ─── Линзы создаются всегда, но видимость регулируется режимом ───
    this._borderVisual = new BorderVisual(world, Theme.hexSize).addTo(this.scene);
    this._haloVisual = new HaloVisual(world, Theme.hexSize).addTo(this.scene);

    this._applyLensMode();
  }

  /** Установить режим линз: 'none' | 'borders' | 'halos'. */
  setLensMode(mode) {
    if (!['none', 'borders', 'halos'].includes(mode)) mode = 'none';
    this._lensMode = mode;
    this._applyLensMode();
  }

  getLensMode() { return this._lensMode; }

  /** Применить текущий режим к визуалам. */
  _applyLensMode() {
    const bordersOn = this._lensMode === 'borders';
    const halosOn = this._lensMode === 'halos';

    // Границы фракций
    this._borderVisual?.setVisible(bordersOn);
    // Ореолы (границы + иконки)
    this._haloVisual?.setVisible(halosOn);

    // При включённых границах — скрываем фракционные кольца на гексах
    for (const v of this._tileVisuals.values()) {
      v.setFactionRingVisible(!bordersOn && !halosOn ? true : false);
    }
  }

  refreshBorders() {
    if (!this._borderVisual || !this.world) return;
    this._borderVisual.refresh();
    this._haloVisual?.refresh();
    this._applyLensMode();
    for (const tile of this.world.map.all()) {
      if (!tile.isLand) continue;
      const v = this._tileVisuals.get(tile.key);
      if (!v) continue;
      if (tile.factionId) v.setFactionColor(tile.factionId);
      else v.setFactionRingVisible(false);
    }
  }

  updateFog(world) {
    for (const tile of world.map.all()) {
      const fog = this._fogVisuals.get(tile.key);
      if (!fog) continue;
      fog.setVisible(!tile.isVisible);
    }
  }

  updateCityFaction(world) {
    for (const v of this._cityVisuals.values()) v.removeFrom(this.scene);
    this._cityVisuals.clear();
    for (const city of world.cities) {
      if (!city.tileKey) continue;
      const tile = world.map.getByKey(city.tileKey);
      if (!tile) continue;
      const v = city.isCity
        ? new CityVisual(city, Theme.hexSize)
        : new VillageVisual(city, Theme.hexSize);
      const { x, z } = tile.hex.toWorld(Theme.hexSize);
      v.group.position.set(x, 0, z);
      v.addTo(this.scene);
      this._cityVisuals.set(city.id, v);
    }
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

  setMovementOverlays(map, visible) {
    for (const ov of this._movementOverlays.values()) ov.setVisible(false);
    if (!visible || !map) return;
    for (const key of map.keys()) {
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

  setAttackOverlays(map, visible) {
    for (const ov of this._attackOverlays.values()) ov.setVisible(false);
    if (!visible || !map) return;
    for (const key of map.keys()) {
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
    this._generalVisuals.get(generalId)?.setSelected(isSelected);
  }

  getPickables() {
    const arr = [];
    for (const v of this._generalVisuals.values()) {
      v.group.traverse((c) => { if (c.isMesh || c.isSprite) arr.push(c); });
    }
    for (const v of this._tileVisuals.values()) {
      v.group.traverse((c) => { if (c.isMesh || c.isSprite) arr.push(c); });
    }
    for (const v of this._cityVisuals.values()) {
      v.group.traverse((c) => { if (c.isMesh || c.isSprite) arr.push(c); });
    }
    return arr;
  }

  _clearAll() {
    for (const v of this._tileVisuals.values()) v.removeFrom(this.scene);
    this._tileVisuals.clear();
    for (const v of this._generalVisuals.values()) v.removeFrom(this.scene);
    this._generalVisuals.clear();
    for (const v of this._cityVisuals.values()) v.removeFrom(this.scene);
    this._cityVisuals.clear();
    for (const v of this._roadVisuals) v.removeFrom(this.scene);
    this._roadVisuals = [];
    for (const ov of this._movementOverlays.values()) {
      if (ov.mesh?.parent) ov.mesh.parent.remove(ov.mesh);
    }
    this._movementOverlays.clear();
    for (const ov of this._attackOverlays.values()) {
      if (ov.mesh?.parent) ov.mesh.parent.remove(ov.mesh);
    }
    this._attackOverlays.clear();
    this._fogVisuals.clear();
    if (this._borderVisual) {
      this._borderVisual.removeFrom(this.scene);
      this._borderVisual = null;
    }
    if (this._haloVisual) {
      this._haloVisual.removeFrom(this.scene);
      this._haloVisual = null;
    }
  }

  setGeneralHovered(generalId, isHovered) {
    const v = this._generalVisuals.get(generalId);
    if (v) v.setHovered(isHovered);
  }

  setCityHovered(cityId, isHovered) {
    const v = this._cityVisuals.get(cityId);
    if (!v) return;
    v.group.position.y = isHovered ? 0.3 : 0;
  }
}