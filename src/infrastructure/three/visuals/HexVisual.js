import * as THREE from 'three';
import { BaseVisual } from './BaseVisual.js';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Гекс с процедурным ландшафтом. На каждом гексе — своя детализация:
 *  - дерево (forest)
 *  - скалы (mountain)
 *  - деревья/трава (plain/steppe)
 *  - руины (ruins)
 * Всё рандомится по seed от tile.key — соседние гексы выглядят по-разному.
 */
export class HexVisual extends BaseVisual {
  constructor(tile, size) {
    super({ tile, size });
    this._overlays = new Map();
  }

  _build() {
    const { tile, size } = this.data;

    // ─── КРИТИЧНО: инициализируем поля ДО первого использования ───
    // (super() уже вызвал _build(), поэтому constructor-инициализация
    //  _decorations не успевает — делаем это здесь)
    if (!this._decorations) this._decorations = [];

    const t = Theme.terrain[tile.terrain] || Theme.terrain.plain;

    // ─── Плита выше (0.7 вместо 0.4) — волны не дотягиваются ───
    const height = 0.7;
    const geo = new THREE.CylinderGeometry(size * 0.94, size * 0.94, height, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: t.color, roughness: t.roughness, metalness: 0.05,
    });
    const plate = new THREE.Mesh(geo, mat);
    plate.rotation.y = Math.PI;
    plate.position.y = height / 2;
    plate.receiveShadow = true;
    plate.castShadow = true;
    plate.userData = { tile, hoverable: 'tile' };
    this.group.add(plate);

    // ─── Ландшафт-декор ───
    this._addTerrainDecor(tile, size, height);

    // ─── Фракционное кольцо ───
    this._factionRing = null;
    if (tile.factionId && Theme.faction[tile.factionId]) {
      const color = Theme.faction[tile.factionId];
      const ringGeo = new THREE.RingGeometry(size * 0.72, size * 0.82, 6);
      const ringMat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.4,
        roughness: 0.4, metalness: 0.5,
        side: THREE.DoubleSide, transparent: true, opacity: 0.9,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.rotation.z = Math.PI / 6;
      ring.position.y = height + 0.01;
      this.group.add(ring);
      this._factionRing = ring;
    }
  }

  /** Скрыть/показать фракционный ring (для линзы границ). */
  setFactionRingVisible(v) {
    if (this._factionRing) this._factionRing.visible = !!v;
  }
  
  setFactionColor(factionId) {
    if (!this._factionRing) return;
    if (!factionId || !Theme.faction[factionId]) {
      this._factionRing.visible = false;
      return;
    }
    const color = Theme.faction[factionId];
    this._factionRing.material.color.setHex(color);
    this._factionRing.material.emissive.setHex(color);
    this._factionRing.visible = true;
  }

  _addTerrainDecor(tile, size, plateHeight) {
    // Детерминированный seed от tile.key
    const rng = mulberry32(hashString(tile.key));
    const baseY = plateHeight;

    switch (tile.terrain) {
      case 'forest':
        this._addTrees(rng, size, baseY, 3 + Math.floor(rng() * 3));   // 3..5 
        break;
      case 'mountain':
        this._addRocks(rng, size, baseY, 2 + Math.floor(rng() * 2));   // 2..3 
        break;
      case 'plain':
        this._addGrass(rng, size, baseY, 2 + Math.floor(rng() * 3));   // 2..4 
        break;
      case 'steppe':
        this._addGrass(rng, size, baseY, 2 + Math.floor(rng() * 2), 0xc0a040);
        break;
      case 'ruins':
        this._addRuins(rng, size, baseY);   // 2..3 
        break;
    }
  }

  _addTrees(rng, size, baseY, count) {
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const r = rng() * size * 0.45;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const h = size * (0.15 + rng() * 0.1);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.015, size * 0.025, h, 4),
        new THREE.MeshStandardMaterial({ color: 0x3a2010 }),
      );
      trunk.position.set(x, baseY + h / 2, z);
      trunk.castShadow = false;
      this.group.add(trunk);
      this._decorations.push(trunk);

      const crownColor = new THREE.Color(0x2a5a20).offsetHSL(0, 0, (rng() - 0.5) * 0.1);
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.12, h * 1.2, 5),
        new THREE.MeshStandardMaterial({ color: crownColor, roughness: 0.9 }),
      );
      crown.position.set(x, baseY + h + h * 0.4, z);
      crown.castShadow = false;
      this.group.add(crown);
      this._decorations.push(crown);
    }
  }

  _addRocks(rng, size, baseY, count) {
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const r = rng() * size * 0.4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const h = size * (0.15 + rng() * 0.25);

      const rock = new THREE.Mesh(
        new THREE.ConeGeometry(size * (0.08 + rng() * 0.06), h, 5),
        new THREE.MeshStandardMaterial({
          color: 0x7a705a, roughness: 0.95, flatShading: true,
        }),
      );
      rock.position.set(x, baseY + h / 2, z);
      rock.rotation.y = rng() * Math.PI;
      rock.castShadow = false;
      this.group.add(rock);
      this._decorations.push(rock);
    }
  }

  _addGrass(rng, size, baseY, count, color = 0x8aaa40) {
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const r = rng() * size * 0.55;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const h = size * (0.04 + rng() * 0.05);

      const blade = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.02, h, 3),
        new THREE.MeshStandardMaterial({ color, roughness: 1 }),
      );
      blade.position.set(x, baseY + h / 2, z);
      this.group.add(blade);
      this._decorations.push(blade);
    }
  }

  _addRuins(rng, size, baseY) {
    const count = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const r = rng() * size * 0.4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const h = size * (0.15 + rng() * 0.2);

      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.05, size * 0.06, h, 6),
        new THREE.MeshStandardMaterial({ color: 0x9a8a70, roughness: 0.9 }),
      );
      col.position.set(x, baseY + h / 2, z);
      col.rotation.z = (rng() - 0.5) * 0.5;
      col.castShadow = false;
      this.group.add(col);
      this._decorations.push(col);
    }
  }

  attachOverlay(kind, overlay) {
    if (!this._overlays) this._overlays = new Map();
    this._overlays.set(kind, overlay);
    overlay.addTo(this.group);
  }

  setOverlayVisible(kind, visible) {
    const o = this._overlays?.get(kind);
    if (o) o.setVisible(visible);
  }

  
}

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}