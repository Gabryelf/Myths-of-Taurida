import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Singleton-загрузчик GLTF/GLB моделей.
 * Кэширует промисы, чтобы не грузить одну модель дважды.
 * Нормализует PBR-материалы: убирает «пластиковый» вид из Tinkercad.
 */
class _ModelLoader {
  constructor() {
    this._loader = new GLTFLoader();
    this._cache = new Map();     // url → Promise<GLTF>
    this._instances = new Map(); // url → template scene
  }

  load(url) {
    if (!url) return Promise.reject(new Error('ModelLoader: empty url'));
    if (this._cache.has(url)) return this._cache.get(url).then((g) => g.scene);

    const p = new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          this._normalizeMaterials(gltf.scene);
          this._instances.set(url, gltf.scene);
          resolve(gltf);
        },
        undefined,
        (err) => {
          console.warn('[ModelLoader] failed:', url, err);
          this._cache.delete(url);
          reject(err);
        },
      );
    });

    this._cache.set(url, p);
    return p.then((g) => g.scene);
  }

  /**
   * Нормализация материалов после загрузки.
   * Проблема: Tinkercad экспортирует .glb с завышенным metalness
   * и низким roughness, из-за чего модели выглядят «пластиковыми»
   * и меняют цвет при разном освещении.
   */
  _normalizeMaterials(root) {
    const COLOR_DARKEN = 0.55;   // 0.55 = на 45% темнее; 0.7 = мягче; 0.4 = жёстче

    root.traverse((c) => {
      if (!c.isMesh || !c.material) return;
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if (!m) continue;

        // Природные модели — не металл
        if ('metalness' in m && m.metalness > 0.15) m.metalness = 0.0;
        if ('roughness' in m && m.roughness < 0.6) m.roughness = 0.85;

        // ─── ЗАТЕМНЕНИЕ БАЗОВОГО ЦВЕТА ───
        // Tinkercad экспортирует светлые пастельные цвета.
        // Умножаем на коэффициент, чтобы они не «светились» под общим светом.
        if (m.color) {
          m.color.multiplyScalar(COLOR_DARKEN);
        }
        // Если у материала есть emissive — тоже приглушаем
        if ('emissiveIntensity' in m && m.emissiveIntensity > 0) {
          m.emissiveIntensity = Math.min(m.emissiveIntensity, 0.05);
        }

        if (m.isMeshStandardMaterial && !m.envMap) m.envMap = null;
        m.needsUpdate = true;
      }
    });
  }

  instance(url) {
    const tpl = this._instances.get(url);
    if (!tpl) return null;
    return tpl.clone(true);
  }

  isLoaded(url) { return this._instances.has(url); }

  preload(urls) {
    for (const u of urls) this.load(u).catch(() => { });
  }
}

export const ModelLoader = new _ModelLoader();