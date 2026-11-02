import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Город на гексе. Домик с башней и флагом.
 */
export class CityVisual {
  constructor(city, size) {
    this.city = city;
    this.size = size;
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    const { size, city } = this;
    const cfg = Theme.city;

    // База
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.28, size * 0.32, size * 0.12, 6),
      new THREE.MeshStandardMaterial({ color: 0xa88850, roughness: 0.8 }),
    );
    base.position.y = 0.42 + size * 0.06;
    base.castShadow = true;
    this.group.add(base);

    // Стены
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(size * 0.08, size * 0.14, size * 0.02),
        new THREE.MeshStandardMaterial({ color: 0xc9a860, roughness: 0.75 }),
      );
      wall.position.set(
        Math.cos(a) * size * 0.3, 0.42 + size * 0.13, Math.sin(a) * size * 0.3,
      );
      wall.rotation.y = -a + Math.PI / 2;
      wall.castShadow = true;
      this.group.add(wall);
    }

    // Башня
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.08, size * 0.1, size * 0.34, 6),
      new THREE.MeshStandardMaterial({
        color: 0xd4a94c, roughness: 0.4, metalness: 0.7,
        emissive: 0x4a3010, emissiveIntensity: 0.3,
      }),
    );
    tower.position.y = 0.42 + size * 0.24;
    tower.castShadow = true;
    this.group.add(tower);

    // Купол
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0xf5d57a, roughness: 0.2, metalness: 0.9,
        emissive: 0x6a4818, emissiveIntensity: 0.4,
      }),
    );
    dome.position.y = 0.42 + size * 0.42;
    this.group.add(dome);

    // Флаг (цвет фракции, если назначена)
    if (city.factionId) {
      const color = Theme.faction[city.factionId] || 0xd4a94c;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, size * 0.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x3a2a15 }),
      );
      pole.position.set(size * 0.22, 0.42 + size * 0.5, 0);
      this.group.add(pole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(size * 0.28, size * 0.16),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.4, side: THREE.DoubleSide,
        }),
      );
      flag.position.set(size * 0.36, 0.42 + size * 0.7, 0);
      this.group.add(flag);
    }
  }
  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
}