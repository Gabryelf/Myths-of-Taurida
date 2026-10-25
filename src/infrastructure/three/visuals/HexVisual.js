import * as THREE from 'three';
import { BaseVisual } from './BaseVisual.js';
import { Theme } from '../../config/ThemeConfig.js';

export class HexVisual extends BaseVisual {
  constructor(tile, size) {
    super({ tile, size });
    this._overlays = new Map();
  }

  _build() {
    const { tile, size } = this.data;
    const t = Theme.terrain[tile.terrain] || Theme.terrain.plain;
  
    // ─── Плита (pointy-top гекс) ───
    const geo = new THREE.CylinderGeometry(size * 0.94, size * 0.94, 0.4, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: t.color,
      roughness: t.roughness,
      metalness: 0.05,
    });
    const plate = new THREE.Mesh(geo, mat);
    plate.rotation.y = Math.PI ;   // вершина вверх (pointy-top)
    plate.receiveShadow = true;
    plate.castShadow = true;
    plate.userData = { tile };
    this.group.add(plate);
  
    // ─── Фракционное кольцо: RingGeometry лежит в XZ, поворот X = -π/2 ───
    if (tile.factionId && Theme.faction[tile.factionId]) {
      const color = Theme.faction[tile.factionId];
      const ringGeo = new THREE.RingGeometry(size * 0.72, size * 0.82, 6);
      const ringMat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.4,
        roughness: 0.4, metalness: 0.5,
        side: THREE.DoubleSide, transparent: true, opacity: 0.9,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;    
      ring.rotation.z = Math.PI / 6;     
      ring.position.y = 0.21;
      this.group.add(ring);
    }
  }

  /** Регистрирует оверлей подсветки для дальнейшего управления. */
  attachOverlay(kind, overlay) {
    this._overlays.set(kind, overlay);
    overlay.addTo(this.group);
  }

  /** Показывает/скрывает оверлей нужного типа. */
  setOverlayVisible(kind, visible) {
    const o = this._overlays.get(kind);
    if (o) o.setVisible(visible);
  }
}