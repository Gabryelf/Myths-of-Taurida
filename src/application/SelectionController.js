import { Theme } from '../infrastructure/config/ThemeConfig.js';

/**
 * Отвечает за выбор генерала, гекса и обновление кнопки «Найм».
 * Не трогает сцену напрямую — только через sceneBuilder.
 */
export class SelectionController {
  constructor({ world, bus, sceneBuilder, cameraController, ui }) {
    this.world = world;
    this.bus = bus;
    this.sceneBuilder = sceneBuilder;
    this.cameraController = cameraController;
    this.ui = ui;
    this.selectedGeneralId = null;
    this.selectedTileKey = null;
    this._lastSelectedId = null; // помним, кем играли последним
  }

  selectGeneral(general) {
    if (general && general.factionId !== this.world.playerFactionId) general = null;
    if (this.selectedGeneralId) this.sceneBuilder.setGeneralSelected(this.selectedGeneralId, false);
    this.selectedGeneralId = general ? general.id : null;
    this.selectedTileKey = null;
    this.sceneBuilder.highlight.setSelected(null);
    if (general) {
      this._lastSelectedId = general.id;
      this.sceneBuilder.setGeneralSelected(general.id, true);
      this.cameraController.centerOn(general.hex, Theme.hexSize);
      const moves = this.world.movement.reachableForMove(general);
      const attacks = this.world.movement.reachableForAttack(general);
      this.sceneBuilder.setMovementOverlays(moves, true);
      this.sceneBuilder.setAttackOverlays(attacks, true);
      this.bus.emit('general:selected', { general });
    } else {
      this.sceneBuilder.setMovementOverlays(null, false);
      this.sceneBuilder.setAttackOverlays(null, false);
      this.bus.emit('general:selected', { general: null });
    }
    this.updateHireButton();
  }

  /**
   * После хода ИИ вернуть выделение: кто ходил последним, а если погиб —
   * первый живой генерал игрока.
   */
  autoSelectAfterAITurns() {
    if (!this.world) return;
    const mine = this.world.generals.filter(
      (g) => g.alive && g.factionId === this.world.playerFactionId,
    );
    if (mine.length === 0) return;
    const last = mine.find((g) => g.id === this._lastSelectedId) || null;
    this.selectGeneral(last || mine[0]);
  }

  selectTile(tile) {
    this.selectedTileKey = tile ? tile.key : null;
    if (!tile) { this.sceneBuilder.highlight.setSelected(null); return; }
    this.cameraController.centerOn(tile.hex, Theme.hexSize);
    const neighbors = tile.hex.neighbors()
      .map((n) => this.world.map.get(n.q, n.r))
      .filter((t) => t && t.isLand)
      .map((t) => t.key);
    this.sceneBuilder.highlight.setSelected(tile.key, neighbors);
  }

  getSelectedGeneral() {
    if (!this.selectedGeneralId) return null;
    return this.world.generals.find((g) => g.id === this.selectedGeneralId) || null;
  }

  isGeneralInOwnCity(general) {
    if (!general || !this.world) return null;
    const tile = this.world.map.get(general.hex.q, general.hex.r);
    if (!tile?.cityId) return null;
    const city = this.world.getCity(tile.cityId);
    if (!city || city.factionId !== general.factionId) return null;
    return { tile, city };
  }

  updateHireButton() {
    const general = this.getSelectedGeneral();
    const own = general ? this.isGeneralInOwnCity(general) : null;
    this.ui.setHireEnabled(!!own);
  }
}
