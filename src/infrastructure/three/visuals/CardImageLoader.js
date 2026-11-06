/**
 * Загрузчик картинок карт с кэшем.
 * Не знает о домене — только key → texture.
 */
 import * as THREE from 'three';
 import { imgUrl, CARD_IMAGES } from '../../../config.js';
 
 const FALLBACK_COLORS = {
   warrior: ['#5a1e14', '#2a0a06'],
   archer:  ['#2a4a6a', '#0a1a2a'],
   support: ['#2a5a2c', '#0a1a0a'],
   special: ['#4a2a5a', '#1a0a2a'],
 };
 
 export class CardImageLoader {
   constructor() {
     this._cache = new Map();
     this._missing = new Set();
     this._loader = new THREE.TextureLoader();
   }
 
   getTexture(imageKey) {
     if (this._cache.has(imageKey)) return this._cache.get(imageKey);
     const file = CARD_IMAGES[imageKey];
     const url = imgUrl(file);
     if (!url) return null;
     const tex = this._loader.load(url);
     tex.colorSpace = THREE.SRGBColorSpace;
     this._cache.set(imageKey, tex);
     return tex;
   }
 
   /** URL картинки или null. */
   getUrl(imageKey) {
     const file = CARD_IMAGES[imageKey];
     return imgUrl(file);
   }
 
   /**
    * Inline-style для `style="..."` (без trailing `;` и без вложенных `"`).
    * Если картинки нет — линейный градиент.
    * ВАЖНО: возвращает `background-image:url('/images/x.png')` (БЕЗ завершающей ;),
    * чтобы безопасно вставить в `style="${...}"`.
    */
   getCssBackground(imageKey, cardType = 'warrior') {
     const url = this.getUrl(imageKey);
     if (url) return `background-image:url('${url}')`;
     const [a, b] = FALLBACK_COLORS[cardType] || FALLBACK_COLORS.warrior;
     return `background:linear-gradient(135deg, ${a}, ${b})`;
   }
 
   /** Установить фон напрямую на DOM-элемент (безопаснее, чем шаблон). */
   applyBackground(el, imageKey, cardType = 'warrior') {
     if (!el) return;
     const url = this.getUrl(imageKey);
     if (url) {
       el.style.backgroundImage = `url('${url}')`;
       el.style.backgroundSize = 'cover';
       el.style.backgroundPosition = 'center top';
       el.style.backgroundRepeat = 'no-repeat';
     } else {
       const [a, b] = FALLBACK_COLORS[cardType] || FALLBACK_COLORS.warrior;
       el.style.backgroundImage = `linear-gradient(135deg, ${a}, ${b})`;
     }
   }
 }