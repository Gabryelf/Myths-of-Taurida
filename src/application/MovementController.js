import { Theme } from '../infrastructure/config/ThemeConfig.js';

/**
 * Пошаговое движение генерала: BFS-путь + анимация.
 * Не эмитит события напрямую — их эмитит Game после вызова.
 */
export class MovementController {
  constructor({ world, sceneBuilder, cameraController, input, ui, bus, sceneSync }) {
    this.world = world;
    this.sceneBuilder = sceneBuilder;
    this.cameraController = cameraController;
    this.input = input;
    this.ui = ui;
    this.bus = bus;
    this.sceneSync = sceneSync;
    this._moving = false;
  }

  get isMoving() { return this._moving; }

  /**
   * Выполнить движение. Возвращает Promise<boolean> — дошёл ли до цели.
   * onComplete(general, capturedAny) — колбэк после движения.
   */
  async executeMove(general, targetTile, { onComplete } = {}) {
    if (!this.world || !general || !targetTile) return false;
    if (this._moving) return false;
    this._moving = true;
    const factionId = general.factionId;

    this.sceneBuilder.setMovementOverlays(null, false);
    this.sceneBuilder.setAttackOverlays(null, false);
    this.sceneBuilder.setGeneralSelected(general.id, false);

    const path = this.findPath(general, targetTile);
    if (!path || path.length === 0) {
      this.bus.emit('toast:show', { text: 'Нет пути' });
      this._moving = false;
      onComplete?.(general, false);
      return false;
    }

    let capturedAny = false;
    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      const tile = step.tile;
      const cost = step.cost;

      if (general.movePoints < cost) {
        this.bus.emit('toast:show', { text: 'Не хватает очков движения' });
        this.bus.emit('general:no-move-points', {
          general, needed: cost, have: general.movePoints,
        });
        break;
      }

      general.spendMove(cost);
      const fromHex = general.hex;
      general.moveTo(tile.hex);
      this.sceneBuilder.updateGeneralBars?.(this.world);   // ← новая строка

      const captured = this.world.captureTile(tile, factionId);

      if (captured) capturedAny = true;
      this.animateGeneralMove(general, fromHex, tile.hex);

      if (captured) {
        const v = this.sceneBuilder._tileVisuals.get(tile.key);
        if (v && typeof v.setFactionColor === 'function') {
          v.setFactionColor(factionId);
          v.setFactionRingVisible(true);
        }
        this.world.recomputeVisibility();
        this.sceneBuilder.updateFog(this.world);
        this.sceneBuilder.refreshBorders();
        this.bus.emit('tile:captured', { tile, factionId, by: general.id });
      }

      await this._sleep(280);
    }

    // ─── Финальная синхронизация: движение не меняет ресурсы и владельцев
    // городов, поэтому resources: false и rebuild: false ───
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.world.recomputeVisibility();
    this.sceneSync.run(this.world, { rebuild: false, resources: false });

    this.bus.emit('general:moved', { general });
    this._moving = false;
    onComplete?.(general, capturedAny);
    return true;
  }

  findPath(general, targetTile) {
    const start = general.hex;
    if (start.key === targetTile.key) return [];
    const queue = [{ hex: start, prev: null }];
    const visited = new Set([start.key]);
    let goalNode = null;

    while (queue.length > 0) {
      const cur = queue.shift();
      for (const n of cur.hex.neighbors()) {
        if (visited.has(n.key)) continue;
        const t = this.world.map.get(n.q, n.r);
        if (!t || !t.isLand) continue;
        const occ = this.world.getGeneralAt(n);
        if (occ && occ.id !== general.id) continue;
        if (this.world.movement.isForeignCityTile(t, general.factionId)) continue;

        visited.add(n.key);
        const node = { hex: n, prev: cur, tile: t };
        if (n.key === targetTile.key) {
          goalNode = node;
          break;
        }
        queue.push(node);
      }
      if (goalNode) break;
    }

    if (!goalNode) return null;
    const path = [];
    let node = goalNode;
    while (node && node.hex.key !== start.key) {
      path.unshift({
        tile: node.tile,
        cost: this.world.movement.tileCost(node.tile),
      });
      node = node.prev;
    }
    return path;
  }

  animateGeneralMove(general, fromHex, toHex) {
    const visual = this.sceneBuilder._generalVisuals.get(general.id);
    if (!visual) return;

    const from = fromHex.toWorld(Theme.hexSize);
    const to = toHex.toWorld(Theme.hexSize);
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const angle = Math.atan2(dx, dz);
    const startX = from.x;
    const startZ = from.z;
    const startTime = performance.now();
    const duration = 260;

    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = startX + dx * ease;
      const z = startZ + dz * ease;
      visual.group.position.set(x, 0, z);
      visual.group.rotation.y = angle;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        visual.group.position.set(to.x, 0, to.z);
        visual.group.rotation.y = angle;
      }
    };
    requestAnimationFrame(tick);
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
