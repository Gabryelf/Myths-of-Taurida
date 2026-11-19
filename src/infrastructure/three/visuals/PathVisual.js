import * as THREE from 'three';

/**
 * Превью маршрута: точки на гексах пути + маркер цели (подтверждение хода).
 * Живёт в сцене напрямую, не в группе гекса.
 *
 * ВАЖНО: меши пути НЕ входят в getPickables() — рейкаст проходит сквозь них.
 * Глубина отключена (depthTest: false): превью всегда поверх террейна и тумана.
 */
export class PathVisual {
  constructor(size) {
    this.size = size;
    this.group = new THREE.Group();
    this._dots = [];
    this._marker = null;
  }

  /** Принимает и тайл (obj.hex.toWorld), и гекс (obj.toWorld) — нормализуем. */
  static _worldPos(obj, size) {
    const hex = typeof obj?.toWorld === 'function' ? obj : obj?.hex;
    return hex?.toWorld(size) || null;
  }

  /** Точки пути. null/[] — убрать все. */
  setPath(pathKeys, getObj) {
    for (const d of this._dots) {
      this.group.remove(d);
      d.geometry.dispose();
      d.material.dispose();
    }
    this._dots = [];
    if (!pathKeys || pathKeys.length === 0) return;
    for (const key of pathKeys) {
      const pos = PathVisual._worldPos(getObj?.(key), this.size);
      if (!pos) continue;
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(this.size * 0.12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xf5d57a, transparent: true, opacity: 0.85,
          depthWrite: false, depthTest: false,
        }),
      );
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(pos.x, 0.3, pos.z);
      dot.renderOrder = 998;
      this.group.add(dot);
      this._dots.push(dot);
    }
  }

  /** Маркер цели: кольцо + точка-центр. null — убрать. */
  setMarker(targetKey, getObj) {
    if (this._marker) {
      for (const m of this._marker) {
        this.group.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      }
      this._marker = null;
    }
    if (!targetKey) return;
    const pos = PathVisual._worldPos(getObj?.(targetKey), this.size);
    if (!pos) return;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(this.size * 0.35, this.size * 0.5, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd24a, transparent: true, opacity: 0.95,
        side: THREE.DoubleSide, depthWrite: false, depthTest: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.34, pos.z);

    const center = new THREE.Mesh(
      new THREE.CircleGeometry(this.size * 0.16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffd24a, transparent: true, opacity: 0.9,
        side: THREE.DoubleSide, depthWrite: false, depthTest: false,
      }),
    );
    center.rotation.x = -Math.PI / 2;
    center.position.set(pos.x, 0.34, pos.z);

    ring.renderOrder = 999;
    center.renderOrder = 999;
    this.group.add(ring);
    this.group.add(center);
    this._marker = [ring, center];
  }

  addTo(scene) { scene.add(this.group); }

  removeFrom(scene) {
    this.setPath(null, null);
    this.setMarker(null, null);
    scene.remove(this.group);
  }
}
