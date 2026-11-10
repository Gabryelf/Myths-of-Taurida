import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Singleton-загрузчик GLTF/GLB моделей.
 * Кэширует промисы, чтобы не грузить одну модель дважды.
 *
 * Использование:
 *   const model = await ModelLoader.load('/models/mountain.glb');
 *   const inst = ModelLoader.instance('/models/mountain.glb');
 */
class _ModelLoader {
  constructor() {
    this._loader = new GLTFLoader();
    this._cache = new Map();     // url → Promise<GLTF>
    this._instances = new Map(); // url → template scene
  }

  /** Асинхронно загрузить GLTF. Возвращает gltf.scene. */
  load(url) {
    if (!url) return Promise.reject(new Error('ModelLoader: empty url'));
    if (this._cache.has(url)) return this._cache.get(url).then((g) => g.scene);

    const p = new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
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
   * Создать инстанс модели (клон шаблона). Синхронный —
   * возвращает null, если модель ещё не загружена (см. load).
   */
  instance(url) {
    const tpl = this._instances.get(url);
    if (!tpl) return null;
    return tpl.clone(true);
  }

  /** Проверка: загружена ли модель. */
  isLoaded(url) { return this._instances.has(url); }

  /** Прогреть кэш заранее. */
  preload(urls) {
    for (const u of urls) this.load(u).catch(() => {});
  }
}

export const ModelLoader = new _ModelLoader();