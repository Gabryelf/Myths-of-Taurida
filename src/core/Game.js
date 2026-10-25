import { EventBus } from './EventBus.js';
import { World } from '../domain/world/World.js';
import { Renderer } from '../infrastructure/three/Renderer.js';
import { CameraController } from '../infrastructure/three/CameraController.js';
import { SceneBuilder } from '../infrastructure/three/SceneBuilder.js';
import { InputController } from '../input/InputController.js';
import { UIManager } from '../ui/UIManager.js';
import { Logger } from './Logger.js';
import { Theme } from '../infrastructure/config/ThemeConfig.js';

/**
 * Оркестратор. Собирает слои. Не содержит бизнес-логики —
 * только выбор, ход и связывание событий.
 */
export class Game {
  constructor({ canvas, uiRoot, toastRoot }) {
    this.logger = new Logger('Game');
    this.bus = new EventBus();
    this.world = new World({ seed: Date.now() & 0xffff, radius: 4 });

    // Рендер
    this.renderer = new Renderer(canvas);
    this.cameraController = new CameraController(this.renderer.camera, this.renderer.renderer);
    this.sceneBuilder = new SceneBuilder(this.renderer.scene);

    // UI
    this.ui = new UIManager({
      root: uiRoot,
      toastRoot,
      bus: this.bus,
      onEndTurn: () => this.endTurn(),
    });

    // Ввод
    this.input = new InputController({
      canvas,
      camera: this.renderer.camera,
      onTileClick: (tile, hitGeneral) => this._onTileClick(tile, hitGeneral),
      onTileHover: (tile, screenPos) => this._onTileHover(tile, screenPos),
    });
    this.input.attachCameraController(this.cameraController);

    // Состояние выбора
    this.selectedGeneralId = null;
    this.selectedTileKey = null;

    this._running = false;
  }

  start(factionId = 'scythians') {
    this.world.selectPlayerFaction(factionId);
    this.sceneBuilder.rebuild(this.world);
    this.input.setPickables(this.sceneBuilder.getPickables());

    const player = this.world.playerFaction;
    if (player?.startHex) {
      this.cameraController.centerOn(player.startHex, Theme.hexSize);
    }

    this._loop();
    this.bus.emit('game:started', { faction: factionId });
    this.logger.info('Game started:', factionId);
  }

  // ─── Ввод ───
  _onTileClick(tile, hitGeneral) {
    // 1) Клик по полководцу
    if (hitGeneral) {
      const isSame = this.selectedGeneralId === hitGeneral.id;
      this._selectGeneral(isSame ? null : hitGeneral);
      return;
    }

    // 2) Если полководец выбран — попытка хода
    if (this.selectedGeneralId) {
      const general = this.world.generals.find((g) => g.id === this.selectedGeneralId);
      if (general && tile && this.world.movement.canMove(general, tile)) {
        const distance = this.world.movement.costTo(general, tile);
        this._executeMove(general, tile, distance);
        return;
      }
    }

    // 3) Клик по пустой клетке — выбор/снятие
    if (!tile) {
      this._selectTile(null);
      this._selectGeneral(null);
      return;
    }
    this._selectGeneral(null);
    this._selectTile(tile);
  }

  _onTileHover(tile, screenPos) {
    this.sceneBuilder.highlight.setHovered(tile ? tile.key : null);
    this.bus.emit('tile:hovered', { tile, screenPos });
  }

  // ─── Выбор ───
  _selectGeneral(general) {
    if (this.selectedGeneralId) {
      this.sceneBuilder.setGeneralSelected(this.selectedGeneralId, false);
    }
    this.selectedGeneralId = general ? general.id : null;
    this.selectedTileKey = null;
    this.sceneBuilder.highlight.setSelected(null);

    if (general) {
      this.sceneBuilder.setGeneralSelected(general.id, true);
      const reachable = this.world.movement.reachable(general);
      this.sceneBuilder.setMovementOverlays(reachable, true);
      this.bus.emit('general:selected', { general });
    } else {
      this.sceneBuilder.setMovementOverlays(null, false);
      this.bus.emit('general:selected', { general: null });
    }
  }

  _selectTile(tile) {
    this.selectedTileKey = tile ? tile.key : null;
    if (!tile) {
      this.sceneBuilder.highlight.setSelected(null);
      return;
    }
    const neighbors = tile.hex.neighbors()
      .map((n) => this.world.map.get(n.q, n.r))
      .filter((t) => t && t.isLand)
      .map((t) => t.key);
    this.sceneBuilder.highlight.setSelected(tile.key, neighbors);
  }

  // ─── Ход ───
  _executeMove(general, tile, distance) {
    const fromKey = general.hex.key;
    general.spendMove(distance);
    general.moveTo(tile.hex);

    // Если гекс нейтральный — захват
    if (!tile.factionId) {
      tile.setFaction(general.factionId);
    }

    this.sceneBuilder.updateGeneralPositions(this.world);
    this.sceneBuilder.setMovementOverlays(null, false);
    this.sceneBuilder.setGeneralSelected(general.id, false);
    this.selectedGeneralId = null;

    this.bus.emit('general:moved', {
      general, fromKey, toKey: tile.key, cost: distance,
    });

    // Если ещё есть очки — можно снова выбрать
    if (general.movePoints > 0) {
      this._selectGeneral(general);
    }
  }

  // ─── Ход (end turn) ───
  endTurn() {
    this.world.endTurn();
    this._selectGeneral(null);
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.bus.emit('turn:ended', { turn: this.world.turn });
    this.bus.emit('toast:show', { text: `Ход ${this.world.turn}` });
  }

  // ─── Цикл ───
  _loop() {
    if (this._running) return;
    this._running = true;
    const tick = () => {
      if (!this._running) return;
      this.renderer.tick();
      requestAnimationFrame(tick);
    };
    tick();
  }

  stop() { this._running = false; }
}