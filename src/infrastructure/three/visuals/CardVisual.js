import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Плоская карта в 3D. Пригодится в бою (примерно v0.0.6).
 * Пока не используется в сцене стратегии — но готова.
 */
export class CardVisual {
    constructor(card, texture = null) {
        this.card = card;
        this.group = new THREE.Group();
        this._build(texture);
    }

    _build(texture) {
        const { width, height } = Theme.card;
        const typeColor = Theme.card.typeColor[this.card.type] || 0xd4a94c;

        // Задняя панель
        const backGeo = new THREE.PlaneGeometry(width, height);
        const backMat = new THREE.MeshBasicMaterial({
            color: typeColor,
            side: THREE.DoubleSide,
        });
        this.group.add(new THREE.Mesh(backGeo, backMat));

        // Лицо
        if (texture) {
            const faceGeo = new THREE.PlaneGeometry(width * 0.94, height * 0.94);
            const faceMat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
            });
            const face = new THREE.Mesh(faceGeo, faceMat);
            face.position.z = 0.01;
            this.group.add(face);
        }
    }

    addTo(scene) { scene.add(this.group); return this; }
    removeFrom(scene) { scene.remove(this.group); }
    setPosition(x, y, z) { this.group.position.set(x, y, z); }
    setRotation(rx, ry, rz) { this.group.rotation.set(rx, ry, rz); }
}