import * as THREE from 'three';
import { imgUrl, CARD_IMAGES } from '../../../config.js';

/**
 * Загрузчик картинок карт с кэшем.
 * Не знает о домене — только key → texture.
 */
export class CardImageLoader {
    constructor() {
        this._cache = new Map();
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

    getUrl(imageKey) {
        return imgUrl(CARD_IMAGES[imageKey]);
    }
}