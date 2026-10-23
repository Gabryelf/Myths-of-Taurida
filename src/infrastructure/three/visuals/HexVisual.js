import * as THREE from 'three';
import { BaseVisual } from './BaseVisual.js';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Визуал гекса: плита, бордюр, фракционное кольцо.
 * Всё из Theme. Легко заменить на «красивый» визуал в будущем.
 */
export class HexVisual extends BaseVisual {
  constructor(tile, size) {
    super({ tile, size });
  }

  _build() {
    const { tile, size } = this.data;
    const t = Theme.terrain[tile.terrain] || Theme.terrain.plain;

    const hexGeo = new THREE.CylinderGeometry(size * 0.94, size * 0.94, 0.4, 6);
    const hexMat = new THREE.MeshStandardMaterial({
      color: t.color,
      roughness: t.roughness,
      metalness: 0.05,
      flatShading: false,
    });
    const plate = new THREE.Mesh(hexGeo, hexMat);
    plate.rotation.y = Math.PI / 6;
    plate.receiveShadow = true;
    plate.castShadow = true;
    plate.userData = { tile };
    this.group.add(plate);

    if (tile.factionId && Theme.faction[tile.factionId]) {
      const color = Theme.faction[tile.factionId];
      const ringGeo = new THREE.RingGeometry(size * 0.72, size * 0.82, 6);
      const ringMat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.4,
        roughness: 0.4, metalness: 0.5,
        side: THREE.DoubleSide, transparent: true, opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.rotation.z = Math.PI / 6;
      ring.position.y = 0.22;
      this.group.add(ring);
    }
  }
}