import * as THREE from 'three';
import { BaseVisual } from './BaseVisual.js';
import { Theme } from '../../config/ThemeConfig.js';
import { ModelLoader } from '../ModelLoader.js';
import {
  terrainModelUrl,
  terrainModelSettings,
} from '../../../config.js';

/**
 * Гекс с процедурным ландшафтом.
 * Для гор и леса — пытается подставить 3D-модель из public/models/.
 * Если модель не загрузилась или ещё грузится, используется процедурный декор.
 */
export class HexVisual extends BaseVisual {
  constructor(tile, size) {
    super({ tile, size });
    this._overlays = new Map();
    this._modelObj = null;
    this._disposed = false;
  }

  _build() {
    const { tile, size } = this.data;
    if (!this._decorations) this._decorations = [];
    const t = Theme.terrain[tile.terrain] || Theme.terrain.plain;
    const height = 0.7;

    // ─── Плита гекса ───
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

    // ─── Модель гор/леса ───
    const seed = hashString(tile.key);
    const modelUrl = terrainModelUrl(tile.terrain, seed);
    if (modelUrl) {
      this._loadTerrainModel(modelUrl, tile, size, height);
    } else {
      this._addTerrainDecor(tile, size, height);
    }

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

  _loadTerrainModel(url, tile, size, plateHeight) {
    const cached = ModelLoader.instance(url);
    if (cached) {
      this._placeTerrainModel(cached, tile, size, plateHeight);
      return;
    }
    ModelLoader.load(url)
      .then((scene) => {
        if (this._disposed || !this.group) return;
        const inst = scene.clone(true);
        this._placeTerrainModel(inst, tile, size, plateHeight);
      })
      .catch(() => {
        if (this._disposed || !this.group) return;
        this._addTerrainDecor(tile, size, plateHeight);
      });
  }

  _placeTerrainModel(obj, tile, size, plateHeight) {
    const cfg = terrainModelSettings(tile.terrain) || {};
    const fitToHex = cfg.fitToHex !== false;

    // Сброс трансформаций
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);

    // 1) Первый box3 — до масштабирования
    const box0 = new THREE.Box3().setFromObject(obj);
    const sizeV = new THREE.Vector3();
    box0.getSize(sizeV);

    // 2) Автоскейл по горизонтали (XZ)
    let baseScale = 1;
    if (fitToHex) {
      const maxXZ = Math.max(sizeV.x, sizeV.z) || 1;
      const target = size * 1.4;
      baseScale = target / maxXZ;
    }
    const userScale = cfg.scale ?? 1;
    const totalScale = baseScale * userScale;
    obj.scale.setScalar(totalScale);

    // 3) Центрируем по XZ и ставим низ на верх плиты
    const box1 = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box1.getCenter(center);
    obj.position.x += -center.x + (cfg.offsetX ?? 0);
    obj.position.z += -center.z + (cfg.offsetZ ?? 0);
    obj.position.y += (plateHeight - box1.min.y) + (cfg.offsetY ?? 0);

    // 4) Поворот — фиксированный или случайный по seed (анти-клон)
    let rotY = cfg.rotationY || 0;
    if (cfg.rotationYRandom) {
      const rng = mulberry32(hashString(tile.key + ':rot'));
      rotY += rng() * Math.PI * 2;
    }
    obj.rotation.y = rotY;

    // 5) ─── НОРМАЛИЗАЦИЯ PBR-МАТЕРИАЛОВ ───
    // Tinkercad экспортирует материалы с завышенной металличностью и
    // низкой шероховатостью → «пластик». Принудительно приводим к
    // природным значениям для леса/гор.
    // В _placeTerrainModel, внутри obj.traverse
    const isNatural = tile.terrain === 'forest' || tile.terrain === 'mountain';
    const DARKEN = 0.55;

    obj.traverse((c) => {
      if (!c.isMesh) return;
      c.castShadow = cfg.castShadow !== false;
      c.receiveShadow = cfg.receiveShadow !== false;
      c.userData = c.userData || {};
      c.userData.tile = tile;
      c.userData.hoverable = 'tile';

      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if (!m) continue;
        if (isNatural) {
          if ('metalness' in m) m.metalness = 0.0;
          if ('roughness' in m) m.roughness = 0.85;
        } else {
          if ('metalness' in m && m.metalness > 0.6) m.metalness = 0.6;
          if ('roughness' in m && m.roughness < 0.2) m.roughness = 0.3;
        }
        // Затемнение (если ещё не сделано в ModelLoader)
        // Проверяем флаг, чтобы не затемнять дважды
        if (m.color && !m.userData?._darkened) {
          m.color.multiplyScalar(DARKEN);
          if (m.userData) m.userData._darkened = true;
          else m.userData = { _darkened: true };
        }
        if ('emissiveIntensity' in m && m.emissiveIntensity > 0.05) {
          m.emissiveIntensity = 0.05;
        }
        m.needsUpdate = true;
      }
    });

    this.group.add(obj);
    this._modelObj = obj;
  }

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

  // ─── Процедурный декор (fallback) ───
  _addTerrainDecor(tile, size, plateHeight) {
    const rng = mulberry32(hashString(tile.key));
    const baseY = plateHeight;
    switch (tile.terrain) {
      case 'forest':
        this._addTrees(rng, size, baseY, 3 + Math.floor(rng() * 3));
        break;
      case 'mountain':
        this._addRocks(rng, size, baseY, 2 + Math.floor(rng() * 2));
        break;
      case 'plain':
        this._addGrass(rng, size, baseY, 2 + Math.floor(rng() * 3));
        break;
      case 'steppe':
        this._addGrass(rng, size, baseY, 2 + Math.floor(rng() * 2), 0xc0a040);
        break;
      case 'ruins':
        this._addRuins(rng, size, baseY);
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
        new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.95, metalness: 0 }),
      );
      trunk.position.set(x, baseY + h / 2, z);
      this.group.add(trunk);
      this._decorations.push(trunk);
      const crownColor = new THREE.Color(0x2a5a20).offsetHSL(0, 0, (rng() - 0.5) * 0.1);
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.12, h * 1.2, 5),
        new THREE.MeshStandardMaterial({ color: crownColor, roughness: 0.9, metalness: 0 }),
      );
      crown.position.set(x, baseY + h + h * 0.4, z);
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
          color: 0x7a705a, roughness: 0.95, metalness: 0,
          flatShading: true,
        }),
      );
      rock.position.set(x, baseY + h / 2, z);
      rock.rotation.y = rng() * Math.PI;
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
        new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }),
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
        new THREE.MeshStandardMaterial({ color: 0x9a8a70, roughness: 0.9, metalness: 0 }),
      );
      col.position.set(x, baseY + h / 2, z);
      col.rotation.z = (rng() - 0.5) * 0.5;
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

  removeFrom(scene) {
    this._disposed = true;
    super.removeFrom(scene);
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