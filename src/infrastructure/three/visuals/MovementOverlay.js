import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Плоское кольцо-подсветка доступного гекса.
 * Используется, когда выбран полководец и видны его варианты хода.
 */
export class MovementOverlay {
    constructor(size) {
        const cfg = Theme.movement;
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