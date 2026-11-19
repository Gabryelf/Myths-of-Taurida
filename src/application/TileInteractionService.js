import { Theme } from '../infrastructure/config/ThemeConfig.js';

/**
 * Клики и наведение на гексы/генералов.
 * Связывает выбор, движение, бой, город.
 * Держит состояние «подтверждённого хода»: первый клик закрепляет цель
 * (маркер), второй клик по гексу с маркером запускает движение.
 */
export class TileInteractionService {
  constructor({
    world, bus, sceneBuilder, cameraController, input,
    selection, movementController, battleOrchestrator,
    cityService, ui,
  }) {
    this.world = world;
    this.bus = bus;
    this.sceneBuilder = sceneBuilder;
    this.cameraController = cameraController;
    this.input = input;
    this.selection = selection;
    this.movement = movementController;
    this.battle = battleOrchestrator;
    this.city = cityService;
    this.ui = ui;
    this._hoveredGeneralId = null;
    this._hoveredCityId = null;
    // ─── Превью пути + подтверждение хода ───
    this._confirmedTargetKey = null; // закреплённая цель (маркер)
    this._lastPathKey = null;        // последняя показанная точка пути (для дедупликации)
    this._hintShown = false;
    this.bus.on('general:selected', () => this._clearPathState());
  }

  _clearPathState() {
    this._confirmedTargetKey = null;
    this._lastPathKey = null;
    this.sceneBuilder.clearPathPreview();
  }

  /** Пересчитать превью пути под наведённый гекс (или убрать точки). */
  _updatePathPreview(tile) {
    const general = this.selection.getSelectedGeneral();
    if (!general || !general.alive || !tile) {
      this.sceneBuilder.setPathPreview(null);
      return;
    }
    if (!this.world.movement.canMove(general, tile)) {
      this.sceneBuilder.setPathPreview(null);
      return;
    }
    const path = this.movement.findPath(general, tile);
    if (!path || path.length === 0) {
      this.sceneBuilder.setPathPreview(null);
      return;
    }
    const keys = path.map((s) => s.tile.key);
    const joined = keys.join('|');
    if (joined === this._lastPathKey) return;
    this._lastPathKey = joined;
    this.sceneBuilder.setPathPreview(keys);
  }

  onTileClick(tile, hitGeneral, hitCity) {
    if (!this.world || this.movement.isMoving) return;
    const playerFactionId = this.world.playerFactionId;

    // ─── Клик по генералу ───
    if (hitGeneral) {
      if (hitGeneral.factionId !== playerFactionId) {
        const mine = this.selection.getSelectedGeneral();
        if (mine && mine.factionId === playerFactionId) {
          const enemyTile = this.world.map.get(hitGeneral.hex.q, hitGeneral.hex.r);
          if (enemyTile && this.world.movement.canAttack(mine, enemyTile)) {
            const dist = this.world.movement.attackCostTo(mine, enemyTile);
            this.battle.confirmAttack(mine, enemyTile, dist, (defenderFactionId) => {
              this.battle.executeBattle(mine, enemyTile, dist, defenderFactionId, this.selection);
            });
            return;
          }
        }
        this.bus.emit('toast:show', { text: 'Это полководец другой фракции' });
        return;
      }
      if (this.selection.selectedGeneralId === hitGeneral.id) {
        this.cameraController.centerOn(hitGeneral.hex, Theme.hexSize);
        return;
      }
      this.selection.selectGeneral(hitGeneral);
      return;
    }

    // ─── Клик по городу ───
    if (hitCity && tile?.cityId) {
      this.city.handleCityClick(tile, hitCity);
      return;
    }

    // ─── Клик по гексу ───
    if (!tile) return;

    const general = this.selection.getSelectedGeneral();
    if (!general || !general.alive) return;

    // Враг на гексе?
    const enemyGen = this.world.getGeneralAt(tile.hex);
    if (enemyGen && enemyGen.factionId !== general.factionId) {
      this._clearPathState();
      if (this.world.movement.canAttack(general, tile)) {
        const dist = this.world.movement.attackCostTo(general, tile);
        this.battle.confirmAttack(general, tile, dist, (defenderFactionId) => {
          this.battle.executeBattle(general, tile, dist, defenderFactionId, this.selection);
        });
        return;
      }
      this.bus.emit('toast:show', { text: 'Слишком далеко — не дойти до врага' });
      return;
    }

    // Чужой город без генерала?
    if (tile.cityId) {
      const city = this.world.getCity(tile.cityId);
      if (city && city.factionId !== general.factionId && city.factionId !== null) {
        this._clearPathState();
        this.bus.emit('toast:show', { text: `Сначала победите защитников ${city.name}` });
        return;
      }
      if (city && city.factionId === null && city.settlement) {
        this._clearPathState();
        if (this.world.movement.canAttack(general, tile)) {
          const dist = this.world.movement.attackCostTo(general, tile);
          this.battle.confirmSettlementAttack(general, tile, city, dist, (defenderFactionId) => {
            this.battle.executeBattle(general, tile, dist, defenderFactionId, this.selection);
          });
        } else {
          this.bus.emit('toast:show', { text: `Сначала победите или купите ${city.name}` });
        }
        return;
      }
    }

    // ─── Обычный гекс: два клика — закрепить, подтвердить ───
    if (this.world.movement.canMove(general, tile)) {
      if (this._confirmedTargetKey === tile.key) {
        this._clearPathState();
        this.movement.executeMove(general, tile, {
          onComplete: (g) => {
            if (g.movePoints > 0 && g.alive) {
              this.selection.selectGeneral(g);
            } else {
              this.selection.selectGeneral(null);
            }
            this.selection.updateHireButton();
          },
        });
        return;
      }
      // Первый клик: закрепляем цель. Если пути на экране ещё нет
      // (например, тач-экран без hover) — рисуем его сразу.
      this._confirmedTargetKey = tile.key;
      this.sceneBuilder.setPathMarker(tile.key);
      this._updatePathPreview(tile);
      if (!this._hintShown) {
        this._hintShown = true;
        this.bus.emit('toast:show', {
          text: 'Ещё раз кликните по клетке с маркером — генерал пойдёт',
        });
      }
      return;
    }

    // Не хватает очков — сбрасываем закрепление
    this._clearPathState();
    const needed = this.world.movement.costTo(general, tile);
    if (needed != null && needed > general.movePoints) {
      this.bus.emit('general:no-move-points', {
        general, needed, have: general.movePoints,
      });
    }
  }

  onTileHover(tile, screenPos, meta = {}) {
    // ─── Сначала сбрасываем прошлые подсветки (безопасно) ───
    if (this._hoveredGeneralId) {
      if (typeof this.sceneBuilder.setGeneralHovered === 'function') {
        this.sceneBuilder.setGeneralHovered(this._hoveredGeneralId, false);
      }
      this._hoveredGeneralId = null;
    }
    if (this._hoveredCityId) {
      if (typeof this.sceneBuilder.setCityHovered === 'function') {
        this.sceneBuilder.setCityHovered(this._hoveredCityId, false);
      }
      this._hoveredCityId = null;
    }
    // ─── Превью пути: считаем ДО подсветок, чтобы ничего не могло
    // прервать его исполнение ───
    if (this.movement.isMoving || meta.hoverType === 'haloIcon') {
      this.sceneBuilder.setPathPreview(null);
    } else if (!meta.hoverType) {
      this._updatePathPreview(tile);
    } else {
      // hover по генералу/городу — точки убираем, маркер закрепления остаётся
      this.sceneBuilder.setPathPreview(null);
    }

    // ─── Подсветки (безопасные вызовы) ───
    if (meta.hoverType === 'general' && meta.general) {
      this._hoveredGeneralId = meta.general.id;
      if (typeof this.sceneBuilder.setGeneralHovered === 'function') {
        this.sceneBuilder.setGeneralHovered(this._hoveredGeneralId, true);
      }
    } else if (meta.hoverType === 'city' && tile?.cityId) {
      this._hoveredCityId = tile.cityId;
      if (typeof this.sceneBuilder.setCityHovered === 'function') {
        this.sceneBuilder.setCityHovered(this._hoveredCityId, true);
      }
    }
    this.sceneBuilder.highlight.setHovered(tile ? tile.key : null);

    if (meta.hoverType === 'haloIcon' && meta.halo) {
      this.bus.emit('halo:hovered', { halo: meta.halo, screenPos });
    } else {
      this.bus.emit('halo:hovered', { halo: null, screenPos });
    }
  }

}
