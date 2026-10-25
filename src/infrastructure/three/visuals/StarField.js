import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Звёздное небо. Points на сфере вокруг сцены.
 * Медленно вращается — создаёт «жизнь» в статичной сцене.
 */
export class StarField {
    constructor() {
        const cfg = Theme.sky;
        const positions = [];
        const count = cfg.starsCount;

        for (let i = 0; i < count; i++) {
            const r = cfg.starsRadiusMin + Math.random() * (cfg.starsRadiusMax - cfg.starsRadiusMin);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1); // равномерно по сфере
            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.cos(phi) * 0.45 + 30,   // чуть сплюснуть по Y
                r * Math.sin(phi) * Math.sin(theta),
            );
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        this.material = new THREE.PointsMaterial({
            color: cfg.starsColor,
            size: cfg.starsSize,
            transparent: true,
            opacity: cfg.starsOpacity,
            sizeAttenuation: true,
            depthWrite: false,
        });

        this.points = new THREE.Points(geo, this.material);
        this.points.renderOrder = -2;
    }

    update(time) {
        this.points.rotation.y = time * 0.005;
    }

    addTo(scene) { scene.add(this.points); return this; }
    removeFrom(scene) { scene.remove(this.points); }
}