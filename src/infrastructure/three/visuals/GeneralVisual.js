import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

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

    // ─── Сдвиг в сторону от центра гекса ───
    // Полководец стоит на «площадке» со смещением +0.35*size вправо.
    const shiftX = size * 0.35;
    const shiftZ = size * 0.15;

    // Пьедестал
    const pedGeo = new THREE.CylinderGeometry(size * 0.22, size * 0.26, size * 0.10, 12);
    const pedMat = new THREE.MeshStandardMaterial({
      color: cfg.pedestalColor, roughness: 0.6, metalness: 0.5,
      emissive: cfg.pedestalEmissive, emissiveIntensity: 0.3,
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.set(shiftX, size * 0.05, shiftZ);
    ped.castShadow = true;
    ped.receiveShadow = true;
    this.group.add(ped);

    // Цветной диск
    const discGeo = new THREE.CylinderGeometry(
      size * cfg.discRadius * 0.55,
      size * cfg.discRadius * 0.65,
      size * cfg.discHeight,
      8,
    );
    const discMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.5,
      roughness: 0.3, metalness: 0.7,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(shiftX, size * 0.18, shiftZ);
    disc.castShadow = true;
    this.group.add(disc);

    // Знамя
    const poleGeo = new THREE.CylinderGeometry(
      size * 0.012, size * 0.012, size * cfg.flagHeight * 0.8, 6,
    );
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(shiftX + size * 0.18, size * 0.35, shiftZ);
    this.group.add(pole);

    const bannerGeo = new THREE.PlaneGeometry(
      size * cfg.bannerWidth * 0.8,
      size * cfg.bannerHeight * 0.8,
    );
    const bannerMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.35, side: THREE.DoubleSide,
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(shiftX + size * 0.32, size * 0.7, shiftZ);
    this.group.add(banner);

    // Кольцо выбора (скрыто)
    const selGeo = new THREE.RingGeometry(size * 0.28, size * 0.34, 32);
    const selMat = new THREE.MeshBasicMaterial({
      color: cfg.selectedGlow, side: THREE.DoubleSide,
      transparent: true, opacity: 0.9, depthWrite: false,
    });
    this._selRing = new THREE.Mesh(selGeo, selMat);
    this._selRing.rotation.x = -Math.PI / 2;
    this._selRing.position.set(shiftX, size * 0.15, shiftZ);
    this._selRing.visible = false;
    this._selRing.renderOrder = 3;
    this.group.add(this._selRing);

    // Свет для выбранного
    this._light = new THREE.PointLight(0xf5d57a, 0, size * 4);
    this._light.position.set(shiftX, size * 0.25, shiftZ);
    this.group.add(this._light);

    // Hover-свет (включается при наведении)
    this._hoverLight = new THREE.PointLight(0x58a6ff, 0, size * 3);
    this._hoverLight.position.set(shiftX, size * 0.25, shiftZ);
    this.group.add(this._hoverLight);

    // ─── userData: general + hoverable ───
    this.group.traverse((c) => {
      if (c.isMesh || c.isSprite) {
        c.userData = c.userData || {};
        c.userData.general = general;
        c.userData.hoverable = 'general';
        c.userData.generalShiftX = shiftX;   // запоминаем сдвиг (для hover-подсветки)
        c.userData.generalShiftZ = shiftZ;
      }
    });
  }

  setPosition(x, z) {
    this.group.position.set(x, 0, z);
  }

  setSelected(isSelected) {
    this._selRing.visible = isSelected;
    this._light.intensity = isSelected ? 1.0 : 0;
  }

  /** Вызывается из SceneBuilder при hover/hoverOut */
  setHovered(isHovered) {
    this._hoverLight.intensity = isHovered ? 1.2 : 0;
  }

  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
}