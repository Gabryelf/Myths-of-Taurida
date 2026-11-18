import { Theme } from '../infrastructure/config/ThemeConfig.js';

/**
 * Клики и наведение на гексы/генералов.
 * Связывает выбор, движение, бой, город.
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
        this.bus.emit('toast:show', { text: `Сначала победите защитников ${city.name}` });
        return;
      }
      if (city && city.factionId === null && city.settlement) {
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

    // Обычный гекс — двигаем
    if (this.world.movement.canMove(general, tile)) {
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

    // Не хватает очков
    const needed = this.world.movement.costTo(general, tile);
    if (needed != null && needed > general.movePoints) {
      this.bus.emit('general:no-move-points', {
        general, needed, have: general.movePoints,
      });
    }
  }

  onTileHover(tile, screenPos, meta = {}) {
    if (this._hoveredGeneralId) {
      this.sceneBuilder.setGeneralHovered(this._hoveredGeneralId, false);
      this._hoveredGeneralId = null;
    }
    if (this._hoveredCityId) {
      this.sceneBuilder.setCityHovered(this._hoveredCityId, false);
      this._hoveredCityId = null;
    }
    if (meta.hoverType === 'general' && meta.general) {
      this._hoveredGeneralId = meta.general.id;
      this.sceneBuilder.setGeneralHovered(this._hoveredGeneralId, true);
    } else if (meta.hoverType === 'city' && tile?.cityId) {
      this._hoveredCityId = tile.cityId;
      this.sceneBuilder.setCityHovered(this._hoveredCityId, true);
    }
    this.sceneBuilder.highlight.setHovered(tile ? tile.key : null);

    if (meta.hoverType === 'haloIcon' && meta.halo) {
      this.bus.emit('halo:hovered', { halo: meta.halo, screenPos });
    } else {
      this.bus.emit('halo:hovered', { halo: null, screenPos });
    }
  }
}