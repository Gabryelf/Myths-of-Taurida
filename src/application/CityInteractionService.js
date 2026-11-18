import { ConfirmDialog } from '../ui/components/ConfirmDialog.js';

/**
 * Клики по городам и покупка поселений.
 */
export class CityInteractionService {
  constructor({ world, bus, battleOrchestrator, selection, ui, sceneBuilder, cameraController, input, sound }) {
    this.world = world;
    this.bus = bus;
    this.battleOrchestrator = battleOrchestrator;
    this.selection = selection;
    this.ui = ui;
    this.sceneBuilder = sceneBuilder;
    this.cameraController = cameraController;
    this.input = input;
    this.sound = sound;
  }

  handleCityClick(tile, city) {
    const playerFactionId = this.world.playerFactionId;
    const isMine = city.factionId === playerFactionId;

    if (isMine) {
      this.openCity(tile, city);
      this.selection.selectGeneral(null);
      return;
    }

    const general = this.selection.getSelectedGeneral();
    if (general && this.world.movement.canAttack(general, tile)) {
      const cost = this.world.movement.attackCostTo(general, tile);
      const defenderFactionId = city.settlement
        ? (city.neutralFaction || 'tauri')
        : (city.factionId || 'goths');
      const kind = city.settlement ? 'поселение' : city.isCity ? 'город' : 'деревню';
      const canBuy = city.settlement;

      new ConfirmDialog(document.getElementById('ui-root'), {
        title: `Атаковать ${kind}?`,
        text: `${general.name} может атаковать ${city.name}. Потратится ${cost} очка движения.` +
              (canBuy ? ' Или купить за 40 💰 (только для поселения).' : ''),
        confirmText: 'Атаковать',
        cancelText: canBuy ? 'Купить / Отмена' : 'Отмена',
        onConfirm: () => this.battleOrchestrator.executeBattle(
          general, tile, cost, defenderFactionId, this.selection
        ),
        onCancel: () => {
          if (canBuy) {
            new ConfirmDialog(document.getElementById('ui-root'), {
              title: `Купить ${city.name}?`,
              text: `Купить поселение за 40 золота? Генерал-защитник исчезнет.`,
              confirmText: 'Купить', cancelText: 'Отмена',
              onConfirm: () => this.buySettlement(city.id),
              onCancel: () => {},
            });
          }
        },
      });
      return;
    }

    this.openCity(tile, city);
    this.selection.selectGeneral(null);
  }

  attackCityById(cityId, defenderFactionId) {
    const city = this.world.getCity(cityId);
    if (!city || !city.tileKey) return;
    const tile = this.world.map.getByKey(city.tileKey);
    if (!tile) return;
    const general = this.selection.getSelectedGeneral();
    if (!general) {
      this.bus.emit('toast:show', { text: 'Сначала выберите полководца' });
      return;
    }
    if (!this.world.movement.canAttack(general, tile)) {
      this.bus.emit('toast:show', { text: 'Слишком далеко' });
      return;
    }
    const cost = this.world.movement.attackCostTo(general, tile);
    this.battleOrchestrator.executeBattle(general, tile, cost, defenderFactionId, this.selection);
  }

  openCity(tile, city) {
    if (this.world) this.world.selectedGeneralId = this.selection.selectedGeneralId;
    this.ui.openCityPanel({ tile, city, world: this.world });
  }

  buySettlement(cityId) {
    if (!this.world) return;
    const city = this.world.getCity(cityId);
    if (!city || !city.settlement) return;
    const res = this.world.buySettlement(cityId, this.world.playerFactionId, 40);
    if (!res.ok) {
      this.bus.emit('toast:show', { text: res.reason });
      return;
    }
    this.bus.emit('toast:show', { text: `🏛 Куплено: ${city.name} (-40💰)` });
    this.world.recomputeVisibility();
    this.sceneBuilder.rebuild(this.world);
    this.sceneBuilder.updateFog(this.world);
    this.sceneBuilder.updateCityFaction(this.world);
    this.sceneBuilder.refreshBorders();
    this.input.setPickables(this.sceneBuilder.getPickables());
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
    this.ui.quickJump?.refreshMinimap();
  }
}