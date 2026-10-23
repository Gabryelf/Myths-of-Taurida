import { Hex } from './Hex.js';

/**
 * Чистая математика гексов. Pointy-top.
 * Отдельный модуль — легко расширять (например, добавить cube-координаты).
 */
export const HexMath = {
  SQRT3: Math.sqrt(3),

  distance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  },

  neighbors(hex) {
    const dirs = [
      { q: +1, r: 0 }, { q: +1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 },
    ];
    return dirs.map((d) => new Hex(hex.q + d.q, hex.r + d.r));
  },

  toWorld(hex, size) {
    return {
      x: size * (HexMath.SQRT3 * hex.q + (HexMath.SQRT3 / 2) * hex.r),
      z: size * (1.5 * hex.r),
    };
  },

  fromWorld(x, z, size) {
    const q = ((HexMath.SQRT3 / 3) * x - (1 / 3) * z) / size;
    const r = ((2 / 3) * z) / size;
    return HexMath.round(q, r);
  },

  round(q, r) {
    let x = q, z = r, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;
    return new Hex(rx, rz);
  },
};