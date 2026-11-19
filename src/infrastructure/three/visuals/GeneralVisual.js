import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';
import {
  generalPortraitUrl,
  generalModelUrl,
  generalModelFallbackUrl,
} from '../../../config.js';
import { ModelLoader } from '../ModelLoader.js';

export class GeneralVisual {
  constructor(general, size) {
    this.general = general;
    this.size = size;
    this.group = new THREE.Group();
    this._portraitTexture = null;
    this._modelObj = null;
    this._disposed = false;
    this._build();
  }

  _build() {
    const { size, general } = this;
    const cfg = Theme.general;
    const color = Theme.faction[general.factionId] || 0xd4a94c;
    const shiftX = size * 0.35;
    const shiftZ = size * 0.15;

    // ─── Пьедестал ───
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

    // ─── Цветной диск ───
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

    this._loadGeneralModel(general, size, shiftX, shiftZ);

    // ─── Портрет с дугами (круглый, сверху жизни, снизу движение) ───
    this._portrait = this._createPortraitSprite(general, size, shiftX, shiftZ);

    // ─── Кольцо выбора ───
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
    this._light.castShadow = false;
    this._light.decay = 0;
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

  _loadGeneralModel(general, size, shiftX, shiftZ) {
    const presetIndex = this._presetIndexFor(general);
    const primaryUrl = generalModelUrl(presetIndex);
    const fallbackUrl = generalModelFallbackUrl();

    const tryLoad = (url, isFallback) => {
      return ModelLoader.load(url)
        .then((scene) => {
          if (this._disposed || !this.group) return;
          const inst = scene.clone(true);
          this._placeGeneralModel(inst, size, shiftX, shiftZ);
        })
        .catch((err) => {
          if (this._disposed || !this.group) return;
          if (!isFallback) {
            console.warn(`[GeneralVisual] ${url} not found, using fallback ${fallbackUrl}`);
            return tryLoad(fallbackUrl, true);
          }
          console.warn(`[GeneralVisual] fallback ${url} failed, using procedural`);
          const color = Theme.faction[general.factionId] || 0xd4a94c;
          this._addProceduralRider(general, size, shiftX, shiftZ, color);
        });
    };

    tryLoad(primaryUrl, false);
  }

  _placeGeneralModel(obj, size, shiftX, shiftZ) {
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);

    const box0 = new THREE.Box3().setFromObject(obj);
    const sizeV = new THREE.Vector3();
    box0.getSize(sizeV);

    const targetHeight = size * 0.9;
    const scale = sizeV.y > 0.001 ? targetHeight / sizeV.y : 1;
    obj.scale.setScalar(scale);

    const box1 = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box1.getCenter(center);
    obj.position.x += -center.x + shiftX;
    obj.position.z += -center.z + shiftZ;
    obj.position.y += (size * 0.22 - box1.min.y);

    obj.traverse((c) => {
      if (!c.isMesh) return;
      c.castShadow = true;
      c.receiveShadow = false;
      c.userData = c.userData || {};
      c.userData.general = this.general;
      c.userData.hoverable = 'general';
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if (!m) continue;
        if ('metalness' in m && m.metalness > 0.4) m.metalness = 0.3;
        if ('roughness' in m && m.roughness < 0.4) m.roughness = 0.7;
        if ('emissiveIntensity' in m && m.emissiveIntensity > 0.1) {
          m.emissiveIntensity = 0.1;
        }
        m.needsUpdate = true;
      }
    });

    this.group.add(obj);
    this._modelObj = obj;
  }

  _addProceduralRider(general, size, shiftX, shiftZ, color) {
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

    const rider = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.16, size * 0.2, size * 0.14),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 }),
    );
    rider.position.set(shiftX, size * 0.62, shiftZ);
    rider.castShadow = true;
    this.group.add(rider);

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
  }

  // ═══════════════ ПОРТРЕТ С ДУГАМИ ═══════════════

  _createPortraitSprite(general, size, shiftX, shiftZ) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    this._portraitCanvas = canvas;
    this._portraitCtx = canvas.getContext('2d');
    this._portraitImg = null;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this._portraitTexture = texture;

    const url = generalPortraitUrl(general.factionId, this._presetIndexFor(general));
    if (url) {
      const img = new Image();
      img.onload = () => {
        if (this._disposed) return;
        this._portraitImg = img;
        this._drawPortrait();
      };
      img.src = url;
    }
    this._drawPortrait();

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: false, depthWrite: false,
    }));
    sprite.position.set(shiftX, size * 1.75, shiftZ);
    sprite.scale.set(size * 1.24, size * 1.24, 1);
    sprite.renderOrder = 10;
    sprite.userData = { general, hoverable: 'general' };
    this.group.add(sprite);
    return sprite;
  }

  /**
   * Перерисовать портрет и дуги. Вызывается извне при изменении
   * жизней/очков движения (SceneBuilder.updateGeneralBars).
   */
  updateBars() {
    if (this._disposed || !this._portraitCanvas) return;
    this._drawPortrait();
  }

  _drawPortrait() {
    const ctx = this._portraitCtx;
    if (!ctx) return;
    const g = this.general;   // ← ЭТА СТРОКА ПОТЕРЯЛАСЬ — теперь на месте
    const C = 160;            // центр
    const R_IMG = 72;         // радиус портрета
    const R_ARC = 110;        // радиус дуг
    const W_ARC = 18;         // толщина дуги

    ctx.clearRect(0, 0, 320, 320);

    // ─── Портрет: круг с обводкой ───
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, R_IMG, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (this._portraitImg) {
      const img = this._portraitImg;
      const scale = Math.max((R_IMG * 2) / img.width, (R_IMG * 2) / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, C - w / 2, C - h * 0.62, w, h);
    } else {
      const color = Theme.faction[g.factionId] || 0xd4a94c;
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 320, 320);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((g.name || '?')[0] || '?', C, C);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(C, C, R_IMG, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.stroke();

    // ─── Верхняя дуга: жизни (ячейки) ───
    this._drawArcSegments(ctx, C, C, R_ARC, W_ARC, -Math.PI, 0,
      g.maxLives, g.lives, '#e74c3c');

    // ─── Нижняя дуга: очки движения (ячейки) ───
    this._drawArcSegments(ctx, C, C, R_ARC, W_ARC, 0, Math.PI,
      g.maxMovePoints, g.movePoints, '#58a6ff');

    if (this._portraitTexture) this._portraitTexture.needsUpdate = true;
  }

  /**
   * Дуга из ячеек. from..to — углы в радианах (0 = вправо, y вниз):
   * жизни: -PI..0 (верх), движение: 0..PI (низ).
   */
  _drawArcSegments(ctx, cx, cy, r, w, from, to, max, value, fill) {
    if (max <= 0) return;
    const span = to - from;
    const gap = Math.min(0.06, (span / max) * 0.25);
    for (let i = 0; i < max; i++) {
      const a0 = from + (span / max) * i + gap / 2;
      const a1 = from + (span / max) * (i + 1) - gap / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.lineWidth = w;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = i < value ? fill : 'rgba(20,20,25,0.65)';
      ctx.stroke();
    }
    // Тонкая подложка-ободок под дугой
    ctx.beginPath();
    ctx.arc(cx, cy, r, from, to);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();
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
    this._hoverLight.intensity = isHovered ? 1000.2 : 0;
  }
  addTo(scene) { scene.add(this.group); return this; }
  removeFrom(scene) {
    this._disposed = true;
    scene.remove(this.group);
  }
}
