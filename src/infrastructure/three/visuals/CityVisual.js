import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

// Высота плиты гекса — от неё строим город
const PLATE_H = 0.7;

export class CityVisual {
  constructor(city, size) {
    this.city = city;
    this.size = size;
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    const { size, city } = this;
    const color = Theme.faction[city.factionId] || 0xd4a94c;
    const rng = mulberry32(hashString(city.id + city.name));

    // ─── Площадка-основание ───
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.42, size * 0.45, size * 0.04, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a7a58, roughness: 0.9 }),
    );
    base.position.y = PLATE_H + size * 0.02;
    base.receiveShadow = true;
    this.group.add(base);

    // ─── Главная башня в центре ───
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.07, size * 0.09, size * 0.22, 6),
      new THREE.MeshStandardMaterial({
        color: 0xd4a94c, roughness: 0.4, metalness: 0.7,
        emissive: 0x4a3010, emissiveIntensity: 0.3,
      }),
    );
    tower.position.y = PLATE_H + size * 0.04 + size * 0.11;
    tower.castShadow = true;
    this.group.add(tower);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0xf5d57a, roughness: 0.2, metalness: 0.9,
        emissive: 0x6a4818, emissiveIntensity: 0.4,
      }),
    );
    dome.position.y = PLATE_H + size * 0.04 + size * 0.22 + size * 0.02;
    this.group.add(dome);

    // ─── Много маленьких домиков вокруг ───
    const housesCount = 7 + Math.floor(rng() * 4);   // 7..10
    for (let i = 0; i < housesCount; i++) {
      const angle = (i / housesCount) * Math.PI * 2 + rng() * 0.3;
      const dist = size * (0.10 + rng() * 0.16);
      const hx = Math.cos(angle) * dist;
      const hz = Math.sin(angle) * dist;

      const w = size * (0.05 + rng() * 0.03);
      const d = size * (0.05 + rng() * 0.03);
      const h = size * (0.05 + rng() * 0.04);

      // Домик
      const house = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color: 0xb89860, roughness: 0.85,
        }),
      );
      house.position.set(hx, PLATE_H + size * 0.02 + h / 2, hz);
      house.castShadow = true;
      house.receiveShadow = true;
      this.group.add(house);

      // Крыша
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(w * 0.85, h * 0.7, 4),
        new THREE.MeshStandardMaterial({
          color: 0x6a3a1a, roughness: 0.9, flatShading: true,
        }),
      );
      roof.position.set(hx, PLATE_H + size * 0.02 + h + h * 0.35, hz);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      this.group.add(roof);
    }

    // ─── Стены/частокол по периметру ───
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(size * 0.04, size * 0.08, size * 0.015),
        new THREE.MeshStandardMaterial({ color: 0x9a7a50, roughness: 0.85 }),
      );
      wall.position.set(
        Math.cos(a) * size * 0.38,
        PLATE_H + size * 0.04,
        Math.sin(a) * size * 0.38,
      );
      wall.rotation.y = -a + Math.PI / 2;
      wall.castShadow = true;
      this.group.add(wall);
    }

    // ─── Флаг фракции над башней ───
    if (city.factionId) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, size * 0.18, 4),
        new THREE.MeshStandardMaterial({ color: 0x3a2a15 }),
      );
      pole.position.set(0, PLATE_H + size * 0.04 + size * 0.3, 0);
      this.group.add(pole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(size * 0.14, size * 0.08),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.4, side: THREE.DoubleSide,
        }),
      );
      flag.position.set(size * 0.07, PLATE_H + size * 0.04 + size * 0.38, 0);
      this.group.add(flag);
    }

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