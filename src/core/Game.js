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
import { TurnManager } from '../domain/ai/TurnManager.js';
import { SoundManager } from '../infrastructure/audio/SoundManager.js';
import { ConfirmDialog } from '../ui/components/ConfirmDialog.js';
import { MarketController } from '../application/MarketController.js';

export class Game {
  constructor({ canvas, uiRoot, toastRoot }) {
    this.logger = new Logger('Game');
    this.bus = new EventBus();
    this.world = new World({ seed: Date.now() & 0xffff, radius: 6 });

    this.renderer = new Renderer(canvas);
    this.cameraController = new CameraController(this.renderer.camera, this.renderer.renderer);
    this.sceneBuilder = new SceneBuilder(this.renderer.scene);

    this.sound = new SoundManager();
    this.turnManager = new TurnManager({ world: this.world, bus: this.bus });

    // ─── Контроллеры (приложение) ───
    this.recruitController = new RecruitController({ world: this.world, bus: this.bus });
    this.marketController = new MarketController({ world: this.world, bus: this.bus });
    this.battleController = new BattleController({ world: this.world, bus: this.bus });

    // ─── UI ───
    this.ui = new UIManager({
      root: uiRoot, toastRoot, bus: this.bus, world: this.world,
      onEndTurn: () => this.endTurn(),
      onRecruit: (key) => this.recruitController.tryRecruit(key),
      battleController: this.battleController,
      marketController: this.marketController,
      sound: this.sound,
    });
    this.ui.onHire = () => this.openRecruitForSelected();
    this.ui.onMarket = () => this.openMarket();

    // ─── Ввод ───
    this.input = new InputController({
      canvas, camera: this.renderer.camera,
      onTileClick: (tile, hitGeneral, hitCity) => this._onTileClick(tile, hitGeneral, hitCity),
      onTileHover: (tile, screenPos, meta) => this._onTileHover(tile, screenPos, meta),
    });
    this.input.attachCameraController(this.cameraController);

    // ─── Подписки ───
    this.bus.on('battle:finished', (r) => this._onBattleFinished(r));
    this.bus.on('battle:started', () => this.sound.play('play'));

    // ─── Состояние ───
    this.selectedGeneralId = null;
    this.selectedTileKey = null;
    this._pendingBattleCost = 0;
    this._hoveredGeneralId = null;
    this._hoveredCityId = null;
    this._running = false;
    this._aiBusy = false;
  }

  start(factionId = 'scythians') {
    this.world.selectPlayerFaction(factionId);
    const pool = this.world.resourcePools.get(this.world.playerFactionId);
    this.ui.bindResources(pool);

    this.world.recomputeVisibility();
    this.sceneBuilder.rebuild(this.world);
    this.sceneBuilder.updateFog(this.world);
    this.input.setPickables(this.sceneBuilder.getPickables());

    const player = this.world.playerFaction;
    if (player?.startHex) {
      this.cameraController.centerOn(player.startHex, Theme.hexSize);
    }

    // ─── Мини-карта ───
    this.ui.initMinimap({
      cameraController: this.cameraController,
      onCenter: (tile) => {
        if (tile) this.cameraController.centerOn(tile.hex, Theme.hexSize);
      },
    });

    // ─── Туториал (обновлённый ключ) ───
    if (!localStorage.getItem('tavrida_tutorial_v1')) {
      this.ui.showTutorial(() => {
        this.input.setPickables(this.sceneBuilder.getPickables());
      });
    }

    this._updateHireButton();
    this._loop();
    this.bus.emit('game:started', { faction: factionId });
    this.logger.info('Game started:', factionId);
  }

  // ═══════════════════════════════════════════
  //  ВВОД
  // ═══════════════════════════════════════════
  _onTileClick(tile, hitGeneral, hitCity) {
    const playerFactionId = this.world.playerFactionId;

    // 1) Полководец имеет приоритет
    if (hitGeneral) {
      if (hitGeneral.factionId !== playerFactionId) {
        if (this.selectedGeneralId) {
          const mine = this.world.generals.find((g) => g.id === this.selectedGeneralId);
          if (mine && mine.factionId === playerFactionId) {
            const enemyTile = this.world.map.get(hitGeneral.hex.q, hitGeneral.hex.r);
            if (enemyTile && this.world.movement.canAttack(mine, enemyTile)) {
              const dist = this.world.movement.attackCostTo(mine, enemyTile);
              this._confirmAttack(mine, enemyTile, dist);
              return;
            }
          }
        }
        this.bus.emit('toast:show', { text: 'Это полководец другой фракции' });
        return;
      }
      const isSame = this.selectedGeneralId === hitGeneral.id;
      this._selectGeneral(isSame ? null : hitGeneral);
      return;
    }

    // 2) Город/деревня
    if (hitCity && tile?.cityId) {
      this._openCity(tile, hitCity);
      return;
    }

    // 3) Ход/атака
    if (this.selectedGeneralId && tile) {
      const general = this.world.generals.find((g) => g.id === this.selectedGeneralId);
      if (!general) return;
      const enemyGen = this.world.getGeneralAt(tile.hex);
      if (enemyGen && enemyGen.factionId !== general.factionId) {
        if (this.world.movement.canAttack(general, tile)) {
          const dist = this.world.movement.attackCostTo(general, tile);
          this._confirmAttack(general, tile, dist);
          return;
        }
        this.bus.emit('toast:show', { text: 'Слишком далеко — не дойти до врага' });
        return;
      }
      if (this.world.movement.canMove(general, tile)) {
        const distance = this.world.movement.costTo(general, tile);
        this._executeMove(general, tile, distance);
        return;
      }
    }

    if (!tile) {
      this._selectTile(null);
      this._selectGeneral(null);
      return;
    }
    this._selectGeneral(null);
    this._selectTile(tile);
  }

  _onTileHover(tile, screenPos, meta = {}) {
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
    this.bus.emit('tile:hovered', { tile, screenPos });
  }

  _confirmAttack(general, tile, cost) {
    const enemy = this.world.getGeneralAt(tile.hex);
    const enemyName = enemy?.name || 'Вражеский полководец';
    new ConfirmDialog(document.getElementById('ui-root'), {
      title: 'Начать бой?',
      text: `${general.name} атакует ${enemyName}. Потрачено ${cost} очка движения.`,
      confirmText: 'Атаковать',
      cancelText: 'Отмена',
      onConfirm: () => this._executeBattle(general, tile, cost),
      onCancel: () => { },
    });
  }

  // ═══════════════════════════════════════════
  //  ВЫБОР
  // ═══════════════════════════════════════════
  _selectGeneral(general) {
    if (general && general.factionId !== this.world.playerFactionId) general = null;
    if (this.selectedGeneralId) {
      this.sceneBuilder.setGeneralSelected(this.selectedGeneralId, false);
    }
    this.selectedGeneralId = general ? general.id : null;
    this.selectedTileKey = null;
    this.sceneBuilder.highlight.setSelected(null);

    if (general) {
      this.sceneBuilder.setGeneralSelected(general.id, true);
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
    this._updateHireButton();
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

  // ═══════════════════════════════════════════
  //  ХОД
  // ═══════════════════════════════════════════
  _executeMove(general, tile, distance) {
    const fromKey = general.hex.key;
    general.spendMove(distance);
    general.moveTo(tile.hex);
    if (!tile.factionId) tile.setFaction(general.factionId);

    this.world.recomputeVisibility();
    this.sceneBuilder.updateFog(this.world);
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.sceneBuilder.setMovementOverlays(null, false);
    this.sceneBuilder.setAttackOverlays(null, false);
    this.sceneBuilder.setGeneralSelected(general.id, false);
    this.selectedGeneralId = null;

    this.bus.emit('general:moved', { general, fromKey, toKey: tile.key, cost: distance });
    this.ui.minimap?.refresh();

    if (general.movePoints > 0) this._selectGeneral(general);
    else this._updateHireButton();
  }

  _executeBattle(general, tile, cost) {
    this._pendingBattleCost = cost ?? 1;
    this.sceneBuilder.setMovementOverlays(null, false);
    this.sceneBuilder.setAttackOverlays(null, false);
    this.sceneBuilder.setGeneralSelected(general.id, false);
    this.selectedGeneralId = null;
    this.bus.emit('general:selected', { general: null });
    this._updateHireButton();

    const defenderFactionId = tile.factionId || 'goths';
    this.battleController.open({
      attackerGen: general,
      targetTile: tile,
      defenderFactionId,
      playerSide: 'attacker',
    });
  }

  _onBattleFinished(result) {
    const { winner, targetTile, attackerGen, defenderGen, playerSide } = result;
    const cost = this._pendingBattleCost || 0;
    this._pendingBattleCost = 0;
    const playerWon =
      (playerSide === 'attacker' && winner === 'attacker') ||
      (playerSide === 'defender' && winner === 'defender');

    // ─── Опыт и повышение уровня ───
    const playerGen = playerSide === 'attacker' ? attackerGen : defenderGen;
    if (playerGen && playerWon) {
      const events = playerGen.addXp(10);
      for (const ev of events) {
        if (ev.kind === 'level') {
          this.bus.emit('toast:show', { text: `⭐ ${playerGen.name}: уровень ${ev.level}!` });
          this.sound.play('victory');
        } else if (ev.kind === 'perk') {
          this.bus.emit('toast:show', { text: `🏅 Новый перк: ${ev.perkName}` });
        }
      }
      this.bus.emit('general:selected', { general: playerGen });
    }

    if (playerWon) this.sound.play('victory');
    else if (winner !== 'draw') this.sound.play('defeat');
    else this.bus.emit('toast:show', { text: 'Бой завершился ничьей' });

    if (playerWon) {
      if (playerSide === 'attacker') {
        if (targetTile) {
          targetTile.setFaction(attackerGen.factionId);
          const def = this.world.generals.find((g) => g.hex.key === targetTile.key);
          if (def && def !== attackerGen) def.lives = 0;
        }
        attackerGen.spendMove(cost);
        attackerGen.moveTo(targetTile.hex);
      }
      this.bus.emit('toast:show', { text: 'Победа!' });
    } else if (winner !== 'draw') {
      if (playerSide === 'attacker') {
        attackerGen.spendMove(cost);
        attackerGen.lives = Math.max(0, attackerGen.lives - 1);
      } else if (targetTile) {
        targetTile.setFaction(defenderGen.factionId);
      }
      this.bus.emit('toast:show', { text: 'Поражение' });
    } else {
      this.bus.emit('toast:show', { text: 'Ничья' });
    }

    this.world.recomputeVisibility();
    this.sceneBuilder.rebuild(this.world);
    this.sceneBuilder.updateFog(this.world);
    this.input.setPickables(this.sceneBuilder.getPickables());
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
    this.ui.minimap?.refresh();
    this._updateHireButton();
    if (this._aiBusy) this._afterAITurns();
  }

  // ═══════════════════════════════════════════
  //  ГОРОДА, НАЙМ, РЫНОК
  // ═══════════════════════════════════════════
  _openCity(tile, city) {
    this.ui.openCityPanel({ tile, city, world: this.world });
  }

  openMarket() {
    const general = this.selectedGeneralId
      ? this.world.generals.find((g) => g.id === this.selectedGeneralId)
      : this.world.generals.find((g) => g.factionId === this.world.playerFactionId && g.alive);
    if (!general) {
      this.bus.emit('toast:show', { text: 'Нет полководца' });
      return;
    }
    this.ui.marketPanel.open({ general });
  }

  openRecruitForSelected() {
    const general = this.selectedGeneralId
      ? this.world.generals.find((g) => g.id === this.selectedGeneralId)
      : null;
    if (!general) {
      this.bus.emit('toast:show', { text: 'Сначала выберите полководца' });
      return;
    }
    const own = this._isGeneralInOwnCity(general);
    if (!own) {
      this.bus.emit('toast:show', { text: 'Полководец должен стоять в вашем городе/деревне' });
      return;
    }
    this.ui.openRecruitModal({
      factionId: this.world.playerFactionId,
      general,
      world: this.world,
    });
  }

  _isGeneralInOwnCity(general) {
    if (!general) return null;
    const tile = this.world.map.get(general.hex.q, general.hex.r);
    if (!tile?.cityId) return null;
    const city = this.world.getCity(tile.cityId);
    if (!city || city.factionId !== general.factionId) return null;
    return { tile, city };
  }

  _updateHireButton() {
    const general = this.selectedGeneralId
      ? this.world.generals.find((g) => g.id === this.selectedGeneralId)
      : null;
    const own = general ? this._isGeneralInOwnCity(general) : null;
    this.ui.setHireEnabled(!!own);
  }

  // ═══════════════════════════════════════════
  //  КОНЕЦ ХОДА + ИИ
  // ═══════════════════════════════════════════
  endTurn() {
    if (this._aiBusy) return;
    this.world.endTurn();
    this._selectGeneral(null);
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.bus.emit('turn:ended', { turn: this.world.turn });
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
    this.ui.minimap?.refresh();
    this._runAITurns();
  }

  async _runAITurns() {
    this._aiBusy = true;
    this.ui.turnIndicator.show('Ход противника…');
    this.sound.play('turn');
    const battleAction = await this.turnManager.runAITurns(this.world.playerFactionId, {
      onAITurnStart: (id) => this.ui.turnIndicator.show(`Ход: ${id}`),
    });
    if (battleAction) {
      this.ui.turnIndicator.hide();
      this.battleController.open({
        attackerGen: battleAction.attackerGen,
        targetTile: battleAction.targetTile,
        defenderFactionId: battleAction.defenderFactionId,
        playerSide: 'defender',
      });
    } else {
      this.ui.turnIndicator.hide();
      this._afterAITurns();
    }
    this._aiBusy = false;
  }

  _afterAITurns() {
    this.world.recomputeVisibility();
    this.sceneBuilder.updateFog(this.world);
    this.sceneBuilder.rebuild(this.world);
    this.input.setPickables(this.sceneBuilder.getPickables());
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
    this.ui.minimap?.refresh();
    this._updateHireButton();
  }

  // ═══════════════════════════════════════════
  //  ЦИКЛ
  // ═══════════════════════════════════════════
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