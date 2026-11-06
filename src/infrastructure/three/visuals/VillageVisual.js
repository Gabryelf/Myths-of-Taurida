import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

const PLATE_H = 0.7;

export class VillageVisual {
  constructor(city, size) {
    this.city = city;
    this.size = size;
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    const { size, city } = this;
    const rng = mulberry32(hashString(city.id + city.name));

    // ─── Площадка ───
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.3, size * 0.32, size * 0.03, 6),
      new THREE.MeshStandardMaterial({ color: 0x7a6a48, roughness: 0.95 }),
    );
    base.position.y = PLATE_H + size * 0.015;
    base.receiveShadow = true;
    this.group.add(base);

    // ─── 3–4 домика ───
    const housesCount = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < housesCount; i++) {
      const angle = (i / housesCount) * Math.PI * 2 + rng() * 0.5;
      const dist = size * (0.08 + rng() * 0.1);
      const hx = Math.cos(angle) * dist;
      const hz = Math.sin(angle) * dist;
      const w = size * (0.06 + rng() * 0.03);
      const d = size * (0.06 + rng() * 0.03);
      const h = size * (0.05 + rng() * 0.03);

      const house = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: 0xb89860, roughness: 0.85 }),
      );
      house.position.set(hx, PLATE_H + size * 0.015 + h / 2, hz);
      house.castShadow = true;
      this.group.add(house);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(w * 0.85, h * 0.7, 4),
        new THREE.MeshStandardMaterial({
          color: 0x6a3a1a, roughness: 0.9, flatShading: true,
        }),
      );
      roof.position.set(hx, PLATE_H + size * 0.015 + h + h * 0.35, hz);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      this.group.add(roof);
    }

    // ─── Флаг: у своего поселения — фракция; у нейтрального — цвет нейтрала ───
    const flagFaction = city.factionId || city.neutralFaction;
    if (flagFaction) {
      const color = Theme.faction[flagFaction] || 0xd4a94c;
      // Полюшко
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, size * 0.18, 4),
        new THREE.MeshStandardMaterial({ color: 0x3a2a15 }),
      );
      pole.position.set(0, PLATE_H + size * 0.09, 0);
      this.group.add(pole);
      // Полотно
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(size * 0.1, size * 0.06),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.4, side: THREE.DoubleSide,
        }),
      );
      flag.position.set(size * 0.06, PLATE_H + size * 0.16, 0);
      this.group.add(flag);
    }

    // ─── userData: city + hoverable ───
    this.group.traverse((c) => {
      if (c.isMesh || c.isSprite) {
        c.userData = c.userData || {};
        c.userData.city = city;
        c.userData.hoverable = 'city';
      }
    });
  }

  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
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