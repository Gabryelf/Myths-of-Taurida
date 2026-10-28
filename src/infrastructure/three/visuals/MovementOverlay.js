import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Плоское кольцо-подсветка доступного гекса.
 * Используется, когда выбран полководец и видны его варианты хода/атаки.
 *
 * kind: 'move'   — синее кольцо (Theme.movement)
 *       'attack' — красное кольцо (жёстко задано)
 */
export class MovementOverlay {
  constructor(size, kind = 'move') {
    const cfg = kind === 'attack'
      ? { color: 0xf85149, opacity: 0.5, ringWidth: { inner: 0.55, outer: 0.72 } }
      : Theme.movement;

    const geo = new THREE.RingGeometry(
      size * cfg.ringWidth.inner,
      size * cfg.ringWidth.outer,
      6,
    );
    const mat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: cfg.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.rotation.z = Math.PI / 6;
    this.mesh.position.y = 0.21;
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
  }

  addTo(group) { group.add(this.mesh); }
  setVisible(v) { this.mesh.visible = v; }
}