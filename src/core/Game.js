import { EventBus } from './EventBus.js';
import { World } from '../domain/world/World.js';
import { Renderer } from '../infrastructure/three/Renderer.js';
import { CameraController } from '../infrastructure/three/CameraController.js';
import { SceneBuilder } from '../infrastructure/three/SceneBuilder.js';
import { InputController } from '../input/InputController.js';
import { UIManager } from '../ui/UIManager.js';
import { Logger } from './Logger.js';
import { Theme } from '../infrastructure/config/ThemeConfig.js';
import { RecruitController } from '../application/RecruitController.js';
import { BattleController } from '../application/BattleController.js';

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
      world: this.world,
      onEndTurn: () => this.endTurn(),
      onRecruit: (key) => this.recruitController.tryRecruit(key),
    });

    // Ввод
    this.input = new InputController({
      canvas,
      camera: this.renderer.camera,
      onTileClick: (tile, hitGeneral) => this._onTileClick(tile, hitGeneral),
      onTileHover: (tile, screenPos) => this._onTileHover(tile, screenPos),
    });
    this.input.attachCameraController(this.cameraController);

    this.recruitController = new RecruitController({
      world: this.world,
      bus: this.bus,
    });

    this.battleController = new BattleController({
      world: this.world,
      bus: this.bus,
    });
    
    this.bus.on('battle:finished', (result) => this._onBattleFinished(result));

    // Состояние выбора
    this.selectedGeneralId = null;
    this.selectedTileKey = null;

    this._running = false;
  }

  start(factionId = 'scythians') {
    this.world.selectPlayerFaction(factionId);
    const pool = this.world.resourcePools.get(this.world.playerFactionId);
    this.ui.bindResources(pool);
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
  
    // Если на гексе вражеский полководец — бой
    const enemyGen = this.world.getGeneralAt(tile.hex);
    if (enemyGen && enemyGen.factionId !== general.factionId) {
      this._selectGeneral(null);
      this.battleController.open({
        attackerGen: general,
        targetTile: tile,
        defenderFactionId: enemyGen.factionId,
      });
      return;
    }
  
    general.spendMove(distance);
    general.moveTo(tile.hex);
  
    if (!tile.factionId) tile.setFaction(general.factionId);
  
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.sceneBuilder.setMovementOverlays(null, false);
    this.sceneBuilder.setGeneralSelected(general.id, false);
    this.selectedGeneralId = null;
  
    this.bus.emit('general:moved', { general, fromKey, toKey: tile.key, cost: distance });
  
    if (general.movePoints > 0) this._selectGeneral(general);
  }
  
  _onBattleFinished(result) {
    const { winner, targetTile, attackerGen } = result;
    if (winner === 'attacker') {
      if (targetTile) {
        targetTile.setFaction(attackerGen.factionId);
        // Убираем защитника
        const def = this.world.generals.find((g) => g.hex.key === targetTile.key);
        if (def && def !== attackerGen) def.lives = 0;
      }
      attackerGen.moveTo(targetTile.hex);
      attackerGen.spendMove(1);
      this.bus.emit('toast:show', { text: 'Победа! Территория захвачена' });
    } else if (winner === 'defender') {
      attackerGen.lives = Math.max(0, attackerGen.lives - 1);
      this.bus.emit('toast:show', { text: 'Поражение. -1 жизнь полководца' });
    }
  
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.sceneBuilder.rebuild(this.world);
    this.input.setPickables(this.sceneBuilder.getPickables());
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
  }

  // ─── Ход (end turn) ───
  endTurn() {
    this.world.endTurn();
    this._selectGeneral(null);
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.bus.emit('turn:ended', { turn: this.world.turn });
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
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