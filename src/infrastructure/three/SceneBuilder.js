/**
  * Строит сцену из домена. Кэширует визуалы по ключу клетки —
  * чтобы подсветка работала без пересборки.
  *
  * Единственное место, где домен превращается в Three.js.
  */
 import { HexVisual } from './visuals/HexVisual.js';
 import { HighlightService } from './HighlightService.js';
 import { Theme } from '../config/ThemeConfig.js';
 
 export class SceneBuilder {
   constructor(scene) {
     this.scene = scene;
     this._visuals = new Map(); // key -> HexVisual
     this.highlight = new HighlightService(Theme.hexSize);
   }
 
   rebuild(world) {
     this._clear();
     for (const tile of world.map.all()) {
       if (!tile.isLand) continue;
       const v = new HexVisual(tile, Theme.hexSize);
       const { x, z } = tile.hex.toWorld(Theme.hexSize);
       v.setPosition(x, 0, z);
       v.addTo(this.scene);
       this._visuals.set(tile.key, v);
     }
     this.highlight.bindVisuals(this._visuals);
   }
 
   getVisual(key) { return this._visuals.get(key); }
 
   _clear() {
     for (const v of this._visuals.values()) v.removeFrom(this.scene);
     this._visuals.clear();
   }
 }