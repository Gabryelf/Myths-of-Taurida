import * as THREE from 'three';

/**
 * Камера как в Civilization:
 *  - фиксированный азимут (юг → север),
 *  - фиксированный наклон,
 *  - скролл меняет только дистанцию,
 *  - панорамирование — сдвиг target'а по плоскости.
 */
export class CameraController {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;
    this.target = new THREE.Vector3(0, 0, 0);

    // Камера смотрит с юга на север, наклон ~50°.
    // angle — азимут (0 = смотрит на север, +Z), pitch — угол наклона от вертикали.
    this.angle = 0;
    this.pitch = 0.95;        // 0 = сверху, PI/2 = горизонтально
    this.distance = 140;
    this.minDistance = 40;
    this.maxDistance = 260;

    this._update();
  }

  /** Поставить цель камеры на гекс. */
  centerOn(hex, size) {
    const sqrt3 = Math.sqrt(3);
    this.target.x = size * (sqrt3 * hex.q + (sqrt3 / 2) * hex.r);
    this.target.z = size * (1.5 * hex.r);
    this._update();
  }

  /**
   * Панорамирование. dx, dy — экранные пиксели.
   * Сдвигаем target в плоскости карты по направлению, перпендикулярному взгляду.
   */
  pan(dx, dy) {
    // Масштаб сдвига зависит от дистанции (чем дальше — тем быстрее)
    const scale = this.distance * 0.0012;

    // Проекция экранных dx,dy на плоскость XZ.
    // С учётом азимута:
    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);

    // Вправо (dx) — по X с учётом азимута
    const rightX =  cosA;
    const rightZ = -sinA;
    // Вперёд (dy>0 — «вниз по экрану», на юг) — против взгляда
    const fwdX =  sinA;
    const fwdZ =  cosA;

    this.target.x += (dx * rightX + dy * fwdX) * scale;
    this.target.z += (dx * rightZ + dy * fwdZ) * scale;
    this._update();
  }

  /** Только зум. */
  zoom(delta) {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + delta * 0.1));
    this._update();
  }

  _update() {
    // Камера на сфере вокруг target.
    // angle = 0 → камера с юга (+Z), смотрит на север (−Z).
    const horizontal = Math.sin(this.pitch) * this.distance;
    const vertical = Math.cos(this.pitch) * this.distance;

    this.camera.position.set(
      this.target.x + Math.sin(this.angle) * horizontal,
      this.target.y + vertical,
      this.target.z + Math.cos(this.angle) * horizontal,
    );
    this.camera.lookAt(this.target);
  }
}