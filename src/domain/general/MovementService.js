import { Theme } from '../../infrastructure/config/ThemeConfig.js';

export class MovementService {
  constructor(world) {
    this.world = world;
  }

  tileCost(tile) {
    const t = Theme.terrain[tile.terrain] || Theme.terrain.plain;
    let cost = t.moveCost;
    if (tile.hasRoad && cost > 1) cost = 1;
    return cost;
  }

  isInZoc(tile, factionId) {
    for (const n of tile.hex.neighbors()) {
      const nt = this.world.map.get(n.q, n.r);
      if (!nt) continue;
      const gen = this.world.getGeneralAt(nt.hex);
      if (gen && gen.factionId !== factionId) return true;
    }
    return false;
  }

  /** Чужая или нейтральная цель — город/деревня/поселение. */
  isForeignCityTile(tile, factionId) {
    if (!tile?.cityId) return false;
    const city = this.world.getCity(tile.cityId);
    if (!city) return false;
    if (city.factionId === factionId) return false;
    return true;
  }

  reachable(general) {
    const result = new Map();
    if (!general || !general.alive) return result;
    const max = general.maxMovePoints;
    const start = general.hex;
    const pq = [{ hex: start, cost: 0 }];
    const best = new Map([[start.key, 0]]);
    while (pq.length > 0) {
      pq.sort((a, b) => a.cost - b.cost);
      const cur = pq.shift();
      if (cur.cost >= max) continue;
      for (const neighbor of cur.hex.neighbors()) {
        const tile = this.world.map.get(neighbor.q, neighbor.r);
        if (!tile || !tile.isLand) continue;
        const occupant = this.world.getGeneralAt(neighbor);
        if (occupant && occupant.id !== general.id) continue;
        // В чужой город/поселение нельзя «войти» без боя
        if (this.isForeignCityTile(tile, general.factionId)) continue;
        let step = this.tileCost(tile);
        const zoc = this.isInZoc({ hex: cur.hex }, general.factionId);
        if (zoc) step = Math.max(step, max - cur.cost);
        const next = cur.cost + step;
        if (next > max) continue;
        if (best.has(tile.key) && best.get(tile.key) <= next) continue;
        best.set(tile.key, next);
        result.set(tile.key, { tile, distance: next });
        pq.push({ hex: neighbor, cost: next });
      }
    }
    result.delete(start.key);
    return result;
  }

  reachableForMove(general) { return this.reachable(general); }

  reachableForAttack(general) {
    const result = new Map();
    if (!general || !general.alive) return result;
    const max = general.maxMovePoints;
    const pq = [{ hex: general.hex, cost: 0 }];
    const best = new Map([[general.hex.key, 0]]);
    while (pq.length > 0) {
      pq.sort((a, b) => a.cost - b.cost);
      const cur = pq.shift();
      if (cur.cost >= max) continue;
      for (const neighbor of cur.hex.neighbors()) {
        const tile = this.world.map.get(neighbor.q, neighbor.r);
        if (!tile || !tile.isLand) continue;
        const occupant = this.world.getGeneralAt(neighbor);
        // Цель — вражеский генерал
        if (occupant && occupant.id !== general.id) {
          if (occupant.factionId !== general.factionId) {
            const next = cur.cost + this.tileCost(tile);
            if (next <= max) {
              result.set(neighbor.key, { tile, general: occupant, distance: next });
            }
          }
          continue;
        }
        // Цель — чужой город/деревня/поселение (без генерала)
        if (this.isForeignCityTile(tile, general.factionId)) {
          const next = cur.cost + this.tileCost(tile);
          if (next <= max) {
            const city = this.world.getCity(tile.cityId);
            result.set(neighbor.key, { tile, city, distance: next });
          }
          continue;
        }
        // Обычный проход
        const step = this.tileCost(tile);
        const next = cur.cost + step;
        if (next > max) continue;
        if (best.has(tile.key) && best.get(tile.key) <= next) continue;
        best.set(tile.key, next);
        pq.push({ hex: neighbor, cost: next });
      }
    }
    return result;
  }

  canMove(general, tile) {
    if (!general || !general.alive || !tile) return false;
    return this.reachableForMove(general).has(tile.key);
  }

  costTo(general, tile) {
    return this.reachableForMove(general).get(tile?.key)?.distance ?? null;
  }

  canAttack(general, tile) {
    if (!general || !general.alive || !tile) return false;
    return this.reachableForAttack(general).has(tile.key);
  }

  attackCostTo(general, tile) {
    return this.reachableForAttack(general).get(tile?.key)?.distance ?? null;
  }
}