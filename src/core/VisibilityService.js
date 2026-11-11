/**
 * Туман войны. Радиус обзора = 3 гекса от каждого своего полководца.
 * Все города (isCity=true) видны всегда — это публичная информация.
 */
 export class VisibilityService {
  constructor({ world }) {
    this.world = world;
    this.viewRadius = 3;
  }

  recompute() {
    for (const tile of this.world.map.all()) {
      tile.isVisible = false;
    }

    // ─── Обзор от полководцев ───
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

    // ─── Все города и поселения видны всегда ───
    for (const city of this.world.cities) {
      if (!city.tileKey) continue;
      const tile = this.world.map.getByKey(city.tileKey);
      if (!tile) continue;
      tile.isVisible = true;
      tile.isExplored = true;
      // Ореол вокруг города раскрыт в тумане
      for (const n of tile.hex.neighbors()) {
        const nt = this.world.map.get(n.q, n.r);
        if (nt && nt.isLand) nt.isExplored = true;
      }
    }
  }

  isVisible(tile) { return !!tile?.isVisible; }
  isExplored(tile) { return !!tile?.isExplored; }
}