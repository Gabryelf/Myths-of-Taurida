import { HexMath } from './HexMath.js';

/**
 * Гексагональная координата (axial). Иммутабельная.
 * Только математика — без рендера.
 */
export class Hex {
  constructor(q, r) {
    this.q = q;
    this.r = r;
  }

  get s() { return -this.q - this.r; }
  get key() { return `${this.q},${this.r}`; }

  add(other) { return new Hex(this.q + other.q, this.r + other.r); }
  sub(other) { return new Hex(this.q - other.q, this.r - other.r); }
  equals(other) { return this.q === other.q && this.r === other.r; }
  distance(other) { return HexMath.distance(this, other); }
  neighbors() { return HexMath.neighbors(this); }
  toWorld(size) { return HexMath.toWorld(this, size); }

  toString() { return `Hex(${this.q}, ${this.r})`; }
}