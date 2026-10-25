import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Визуальный оверлей подсветки. Один инстанс на состояние:
 * hover, selected, neighbor. Накладывается поверх гекса.
 *
 * Использует RingGeometry (плоское кольцо) — не мешает видеть плиту.
 */
export class HighlightOverlay {
    constructor(size, kind) {
        this.kind = kind;
        const cfg = Theme.highlight[kind];
      
        const geo = new THREE.RingGeometry(size * 0.78, size * 0.94, 6);
        const mat = new THREE.MeshBasicMaterial({
          color: cfg.color,
          transparent: true,
          opacity: cfg.opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.rotation.z = Math.PI / 6;   // ← было rotation.y, стало rotation.z
        this.mesh.position.y = 0.21;
        this.mesh.visible = false;
        this.mesh.renderOrder = 2;
      
        if (kind === 'selected') {
          const glowGeo = new THREE.CircleGeometry(size * 0.9, 6);
          const glowMat = new THREE.MeshBasicMaterial({
            color: cfg.color,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          this.glow = new THREE.Mesh(glowGeo, glowMat);
          this.glow.rotation.x = -Math.PI / 2;
          this.glow.rotation.z = Math.PI / 6;
          this.glow.position.y = 0.205;
          this.glow.visible = false;
          this.glow.renderOrder = 1;
        }
      }

    setVisible(v) {
        this.mesh.visible = v;
        if (this.glow) this.glow.visible = v;
    }

    addTo(group) {
        group.add(this.mesh);
        if (this.glow) group.add(this.glow);
    }
}