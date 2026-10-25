import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Маркер полководца: пьедестал + цветной диск + знамя + кольцо выбора.
 * Цвет — из фракции. Не знает о домене, получает только данные.
 */
export class GeneralVisual {
    constructor(general, size) {
        this.general = general;
        this.size = size;
        this.group = new THREE.Group();
        this._build();
    }

    _build() {
        const { size, general } = this;
        const cfg = Theme.general;
        const color = Theme.faction[general.factionId] || 0xd4a94c;

        // Пьедестал
        const pedGeo = new THREE.CylinderGeometry(
            size * 0.28, size * 0.32, size * 0.14, 12,
        );
        const pedMat = new THREE.MeshStandardMaterial({
            color: cfg.pedestalColor,
            roughness: 0.6,
            metalness: 0.5,
            emissive: cfg.pedestalEmissive,
            emissiveIntensity: 0.3,
        });
        const ped = new THREE.Mesh(pedGeo, pedMat);
        ped.position.y = size * 0.07;
        ped.castShadow = true;
        ped.receiveShadow = true;
        ped.userData = { general };
        this.group.add(ped);

        // Цветной диск (символ полководца)
        const discGeo = new THREE.CylinderGeometry(
            size * cfg.discRadius * 0.7,
            size * cfg.discRadius * 0.8,
            size * cfg.discHeight,
            8,
        );
        const discMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.7,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.position.y = size * 0.25;
        disc.castShadow = true;
        disc.userData = { general };
        this.group.add(disc);

        // Знамя
        const poleGeo = new THREE.CylinderGeometry(
            size * 0.015, size * 0.015, size * cfg.flagHeight, 6,
        );
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(size * 0.25, size * 0.45, 0);
        this.group.add(pole);

        const bannerGeo = new THREE.PlaneGeometry(
            size * cfg.bannerWidth, size * cfg.bannerHeight,
        );
        const bannerMat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.35,
            side: THREE.DoubleSide,
        });
        const banner = new THREE.Mesh(bannerGeo, bannerMat);
        banner.position.set(
            size * 0.25 + size * cfg.bannerWidth / 2,
            size * 0.9,
            0,
        );
        this.group.add(banner);

        // Кольцо выбора (скрыто)
        const selGeo = new THREE.RingGeometry(size * 0.36, size * 0.44, 32);
        const selMat = new THREE.MeshBasicMaterial({
            color: cfg.selectedGlow,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        });
        this._selRing = new THREE.Mesh(selGeo, selMat);
        this._selRing.rotation.x = -Math.PI / 2;
        this._selRing.position.y = 0.21;
        this._selRing.visible = false;
        this._selRing.renderOrder = 3;
        this.group.add(this._selRing);

        // Свет для выбранного (скрыт)
        this._light = new THREE.PointLight(0xf5d57a, 0, size * 5);
        this._light.position.y = size * 0.3;
        this.group.add(this._light);
    }

    setPosition(x, z) {
        this.group.position.set(x, 0, z);
    }

    setSelected(isSelected) {
        this._selRing.visible = isSelected;
        this._light.intensity = isSelected ? 0.9 : 0;
    }

    addTo(scene) { scene.add(this.group); return this; }
    removeFrom(scene) { scene.remove(this.group); }
}