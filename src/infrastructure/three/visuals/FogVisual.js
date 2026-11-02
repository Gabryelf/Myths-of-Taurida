import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Один плоский диск тумана. Накладывается поверх гекса, если !isVisible.
 */
export class FogVisual {
  constructor(size) {
    const geo = new THREE.CircleGeometry(size * 0.96, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: Theme.fog.color,
      transparent: true,
      opacity: Theme.fog.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.rotation.z = Math.PI / 6;
    this.mesh.position.y = 1.0;
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
  }
  addTo(group) { group.add(this.mesh); }
  setVisible(v) { this.mesh.visible = v; }
}