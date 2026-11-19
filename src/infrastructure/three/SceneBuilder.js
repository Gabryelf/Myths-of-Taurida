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
import { PathVisual } from './visuals/PathVisual.js';

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
    this._pathVisual = null;


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

    // ─── Прогрев моделей генералов ───
    import('../../config.js').then(({ generalModelUrls }) => {
      const urls = generalModelUrls();
      if (urls.length) ModelLoader.preload(urls);
    }).catch(() => { });

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

    // Границы фракций — только в режиме 'borders'
    this._borderVisual?.setVisible(bordersOn);
    // Иконки ореолов — только в режиме 'halos'
    this._haloVisual?.setVisible(halosOn);

    // ─── Кольца фракций на гексах — ТОЛЬКО в режиме 'borders' ───
    // В 'none' и 'halos' — колец нет.
    for (const v of this._tileVisuals.values()) {
      v.setFactionRingVisible(bordersOn);
    }
  }

  refreshBorders() {
    if (!this._borderVisual || !this.world) return;
    this._borderVisual.refresh();
    this._haloVisual?.refresh();

    for (const tile of this.world.map.all()) {
      if (!tile.isLand) continue;
      const v = this._tileVisuals.get(tile.key);
      if (!v) continue;
      if (tile.factionId) v.setFactionColor(tile.factionId);
      else v.setFactionRingVisible(false);
    }

    // ─── ВАЖНО: _applyLensMode ПОСЛЕ цикла, чтобы перекрыть setFactionColor ───
    this._applyLensMode();
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
    // ─── Иконки ореолов (только если линза «Ореолы» включена) ───
    if (this._haloVisual && this._haloVisual.group.visible) {
      this._haloVisual._iconsGroup.traverse((c) => {
        if (c.isSprite) arr.push(c);
      });
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
    if (this._pathVisual) {
      this._pathVisual.removeFrom(this.scene);
      this._pathVisual = null;
    }
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

  /** Точки превью пути. null — скрыть. */
  setPathPreview(pathKeys) {
    this._ensurePathVisual();
    this._pathVisual.setPath(pathKeys, (key) => this._hexFor(key));
  }

  /** Маркер подтверждённой цели. null — скрыть. */
  setPathMarker(targetKey) {
    this._ensurePathVisual();
    this._pathVisual.setMarker(targetKey, (key) => this._hexFor(key));
  }

  clearPathPreview() {
    if (!this._pathVisual) return;
    this._pathVisual.setPath(null, null);
    this._pathVisual.setMarker(null, null);
  }

  /** Гекс по ключу: сначала домен (надёжно), затем визуал (fallback). */
  _hexFor(key) {
    const t = this.world?.map?.getByKey(key);
    if (t?.hex && typeof t.hex.toWorld === 'function') return t.hex;
    const v = this._tileVisuals.get(key);
    const hex = v?.hex ?? v?.tile?.hex ?? v?.tile;
    return hex && typeof hex.toWorld === 'function' ? hex : null;
  }

  _ensurePathVisual() {
    if (!this._pathVisual) {
      this._pathVisual = new PathVisual(Theme.hexSize);
    }
    // Идемпотентная перепривязка: если rebuild отвязал группу — вернём.
    if (this._pathVisual.group.parent !== this.scene) {
      this.scene.add(this._pathVisual.group);
    }
  }

  /** Перерисовать дуги жизней/очков у всех портретов. Дёшево: только canvas. */
  updateGeneralBars(world) {
    for (const gen of world.generals) {
      const v = this._generalVisuals.get(gen.id);
      v?.updateBars?.();
    }
  }


}