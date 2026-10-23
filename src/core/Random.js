/**
 * Детерминированный ГПСЧ (mulberry32). Единый интерфейс для всех случайностей,
 * чтобы можно было воспроизвести мир по seed.
 */
 export class Random {
    constructor(seed = 1337) {
      this._seed = seed >>> 0;
      this._state = this._seed;
    }
  
    next() {
      let t = (this._state += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  
    int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    chance(p) { return this.next() < p; }
    reset() { this._state = this._seed; }
  }