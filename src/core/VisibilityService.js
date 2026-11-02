import { Hex } from '../domain/hex/Hex.js';

/**
 * Туман войны. У каждого полководца радиус обзора = 3 гекса.
 * Гекс виден, если в радиусе обзора хотя бы одного своего полководца.
 * Explored — если когда-либо был виден.
 */
export class VisibilityService {
  constructor({ world }) {
    this.world = world;
    this.viewRadius = 3;
  }

  recompute() {
    // Сброс
    for (const tile of this.world.map.all()) {
      tile.isVisible = false;
    }
    for (const gen of this.world.generals) {
      if (!gen.alive) continue;
      const center = gen.hex;
      for (const tile of this.world.map.all()) {
        if (tile.hex.distance(center) <= this.viewRadius) {
          tile.isVisible = true;
          tile.isExplored = true;
        }
      }
    }
  }

  isVisible(tile) { return !!tile?.isVisible; }
  isExplored(tile) { return !!tile?.isExplored; }
}