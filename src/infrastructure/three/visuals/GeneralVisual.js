import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';
import { generalPortraitUrl } from '../../../config.js';

export class GeneralVisual {
  constructor(general, size) {
    this.general = general;
    this.size = size;
    this.group = new THREE.Group();
    this._portraitTexture = null;
    this._build();
  }

  _build() {
    const { size, general } = this;
    const cfg = Theme.general;
    const color = Theme.faction[general.factionId] || 0xd4a94c;
    const shiftX = size * 0.35;
    const shiftZ = size * 0.15;

    // Пьедестал
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(size * 0.22, size * 0.26, size * 0.1, 12),
      new THREE.MeshStandardMaterial({
        color: cfg.pedestalColor, roughness: 0.6, metalness: 0.5,
        emissive: cfg.pedestalEmissive, emissiveIntensity: 0.3,
      }),
    );
    ped.position.set(shiftX, size * 0.05, shiftZ);
    ped.castShadow = true;
    ped.receiveShadow = true;
    this.group.add(ped);

    // Цветной диск
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(
        size * cfg.discRadius * 0.55,
        size * cfg.discRadius * 0.65,
        size * cfg.discHeight, 8,
      ),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0.7,
      }),
    );
    disc.position.set(shiftX, size * 0.18, shiftZ);
    disc.castShadow = true;
    this.group.add(disc);

    // Конь
    const horseColor = 0x3a2010;
    const horseBody = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.55, size * 0.22, size * 0.22),
      new THREE.MeshStandardMaterial({ color: horseColor, roughness: 0.85 }),
    );
    horseBody.position.set(shiftX, size * 0.38, shiftZ);
    horseBody.castShadow = true;
    this.group.add(horseBody);

    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.03, size * 0.025, size * 0.22, 5),
        new THREE.MeshStandardMaterial({ color: horseColor, roughness: 0.9 }),
      );
      const dx = (i < 2 ? -1 : 1) * size * 0.18;
      const dz = (i % 2 === 0 ? -1 : 1) * size * 0.06;
      leg.position.set(shiftX + dx, size * 0.15, shiftZ + dz);
      leg.castShadow = true;
      this.group.add(leg);
    }

    const neck = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.12, size * 0.24, size * 0.12),
      new THREE.MeshStandardMaterial({ color: horseColor, roughness: 0.85 }),
    );
    neck.position.set(shiftX + size * 0.32, size * 0.5, shiftZ);
    neck.rotation.z = -0.4;
    neck.castShadow = true;
    this.group.add(neck);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.16, size * 0.1, size * 0.1),
      new THREE.MeshStandardMaterial({ color: horseColor, roughness: 0.85 }),
    );
    head.position.set(shiftX + size * 0.42, size * 0.58, shiftZ);
    head.castShadow = true;
    this.group.add(head);

    // Всадник
    const rider = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.16, size * 0.2, size * 0.14),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 }),
    );
    rider.position.set(shiftX, size * 0.62, shiftZ);
    rider.castShadow = true;
    this.group.add(rider);

    // Портрет-спрайт
    this._portrait = this._createPortraitSprite(general, size, shiftX, shiftZ);

    // Меч
    const swordPivot = new THREE.Group();
    swordPivot.position.set(shiftX + size * 0.12, size * 0.66, shiftZ);
    swordPivot.rotation.z = 0.4;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.02, size * 0.28, size * 0.015),
      new THREE.MeshStandardMaterial({
        color: 0xd0d0d0, roughness: 0.2, metalness: 0.9,
        emissive: 0x303030, emissiveIntensity: 0.2,
      }),
    );
    blade.position.y = size * 0.2;
    blade.castShadow = true;
    swordPivot.add(blade);
    this.group.add(swordPivot);

    // Кольцо выбора
    this._selRing = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.28, size * 0.34, 32),
      new THREE.MeshBasicMaterial({
        color: cfg.selectedGlow, side: THREE.DoubleSide,
        transparent: true, opacity: 0.9, depthWrite: false,
      }),
    );
    this._selRing.rotation.x = -Math.PI / 2;
    this._selRing.position.set(shiftX, size * 0.28, shiftZ);
    this._selRing.visible = false;
    this._selRing.renderOrder = 3;
    this.group.add(this._selRing);

    this._light = new THREE.PointLight(0xf5d57a, 0, size * 4);
    this._light.position.set(shiftX, size * 0.4, shiftZ);
    this.group.add(this._light);
    this._hoverLight = new THREE.PointLight(0x58a6ff, 0, size * 3);
    this._hoverLight.position.set(shiftX, size * 0.4, shiftZ);
    this.group.add(this._hoverLight);

    this.group.traverse((c) => {
      if (c.isMesh || c.isSprite) {
        c.userData = c.userData || {};
        c.userData.general = general;
        c.userData.hoverable = 'general';
      }
    });
  }

  _createPortraitSprite(general, size, shiftX, shiftZ) {
    const presetIndex = this._presetIndexFor(general);
    const url = generalPortraitUrl(general.factionId, presetIndex);
    if (!url) return null;

    const texture = new THREE.TextureLoader().load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    this._portraitTexture = texture;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(shiftX, size * 0.95, shiftZ);
    sprite.scale.set(size * 0.5, size * 0.5, 1);
    sprite.renderOrder = 10;
    sprite.userData = { general, hoverable: 'general' };
    this.group.add(sprite);
    return sprite;
  }

  _presetIndexFor(general) {
    if (typeof general.presetIndex === 'number') return general.presetIndex;
    return 0;
  }

  setPosition(x, z) {
    this.group.position.set(x, 0, z);
  }
  setSelected(isSelected) {
    this._selRing.visible = isSelected;
    this._light.intensity = isSelected ? 1.0 : 0;
  }
  setHovered(isHovered) {
    this._hoverLight.intensity = isHovered ? 1.2 : 0;
  }
  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) { scene.remove(this.group); }
}