import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

export class VillageVisual {
  constructor(city, size) {
    this.city = city;
    this.size = size;
    this.group = new THREE.Group();
    this._build();
  }
  _build() {
    const { size, city } = this;
    const r = size * 0.5;
    // Домик
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(r, r * 0.7, r * 0.8),
      new THREE.MeshStandardMaterial({ color: 0xb89860, roughness: 0.85 }),
    );
    house.position.y = 0.42 + r * 0.35;
    house.castShadow = true;
    this.group.add(house);
    // Крыша
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.85, r * 0.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x6a3a1a, roughness: 0.9, flatShading: true }),
    );
    roof.position.y = 0.42 + r * 0.9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.group.add(roof);
    if (city.factionId) {
      const color = Theme.faction[city.factionId] || 0xd4a94c;
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(r * 0.6, r * 0.35),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, side: THREE.DoubleSide }),
      );
      flag.position.set(r * 0.6, 0.42 + r * 1.0, 0);
      this.group.add(flag);
    }
  }
  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
}