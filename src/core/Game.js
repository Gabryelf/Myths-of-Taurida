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
import { LobbyScreen } from '../ui/components/lobby/LobbyScreen.js';
import { SummonModal } from '../ui/components/lobby/SummonModal.js';
import { SaveManager } from '../domain/collection/SaveManager.js';
import { createStarterProfile } from '../domain/collection/PlayerProfileFactory.js';
import { DeckRepository } from '../domain/deck/DeckRepository.js';
import { RewardService } from '../domain/match/RewardService.js';

const FACTION_IDS = ['scythians', 'bosporus', 'chersonesos', 'rome', 'goths'];

export class Game {
  constructor({ canvas, uiRoot, toastRoot }) {
    this.logger = new Logger('Game');
    this.bus = new EventBus();

    this.profile = SaveManager.load() || createStarterProfile('scythians');
    if (!this.profile.matchConfig) {
      this.profile.matchConfig = { mode: 'ai', playerCount: 5, playerFaction: 'scythians' };
    }

    this.deckRepo = DeckRepository.fromJSON(
      this.profile.unlockedDecks,
      this.profile.collection,
    );
    for (const fid of FACTION_IDS) {
      const deck = this.deckRepo.getDeck(fid);
      if (deck.totalCount === 0) this.deckRepo.autoFill(fid);
    }

    this.rewardService = new RewardService({ profile: this.profile, bus: this.bus });

    this.world = null;
    this._humanFactions = [];
    this._playerFactionId = null;

    this.renderer = new Renderer(canvas);
    this.cameraController = new CameraController(this.renderer.camera, this.renderer.renderer);
    this.sceneBuilder = new SceneBuilder(this.renderer.scene);
    this.sound = new SoundManager();

    this.ui = new UIManager({
      root: uiRoot, toastRoot, bus: this.bus, world: null,
      onEndTurn: () => this.endTurn(),
      onRecruit: (key) => this.recruitController?.tryRecruit(key),
      battleController: null,
      marketController: null,
      sound: this.sound,
    });
    this.ui.onHire = () => this.openRecruitForSelected();
    this.ui.onMarket = () => this.openMarket();
    this.ui.onBuySettlement = (cityId) => this.buySettlement(cityId);
    this.ui.onLensToggle = (kind, enabled) => {
      this.sceneBuilder.setLens(kind, enabled);
    };

    this.input = new InputController({
      canvas, camera: this.renderer.camera,
      onTileClick: (tile, hitGeneral, hitCity) => this._onTileClick(tile, hitGeneral, hitCity),
      onTileHover: (tile, screenPos, meta) => this._onTileHover(tile, screenPos, meta),
    });
    this.input.attachCameraController(this.cameraController);

    this.bus.on('battle:finished', (r) => this._onBattleFinished(r));
    this.bus.on('battle:started', () => this.sound.play('play'));

    this.selectedGeneralId = null;
    this.selectedTileKey = null;
    this._pendingBattleCost = 0;
    this._hoveredGeneralId = null;
    this._hoveredCityId = null;
    this._running = false;
    this._aiBusy = false;

    this.lobby = null;
    this.summonModal = null;
  }

  start(_factionId = 'scythians') {
    this._showLobby();
    this._loop();
  }

  _showLobby() {
    this.lobby = new LobbyScreen(this.ui.root, {
      profile: this.profile,
      decks: this.deckRepo,
      onPlay: (factionId) => this._startGame(factionId),
      onSummon: () => this._openSummon(),
      onSave: (opts) => {
        this.profile.unlockedDecks = this.deckRepo.toJSON();
        SaveManager.save(this.profile);
        if (opts?.error) this.bus.emit('toast:show', { text: opts.error });
      },
    });
    this.lobby.show();
  }

  _openSummon() {
    if (!this.summonModal) {
      this.summonModal = new SummonModal(this.ui.root, {
        profile: this.profile,
        onSummoned: () => {
          this.profile.unlockedDecks = this.deckRepo.toJSON();
          SaveManager.save(this.profile);
          this.lobby?._render();
        },
      });
    }
    this.summonModal.open();
  }

  _startGame(factionId) {
    const v = this.deckRepo.validate(factionId);
    if (!v.ok) {
      this.bus.emit('toast:show', { text: v.errors.join('; ') });
      return;
    }
    if (this.lobby) this.lobby.hide();
    this._initWorldForFaction(factionId);
  }

  _initWorldForFaction(factionId) {
    const playerDeck = this.deckRepo.getDeck(factionId);
    const cfg = this.profile.matchConfig || { mode: 'ai', playerCount: 5 };
    const playerCount = Math.max(2, Math.min(5, cfg.playerCount || 5));
    const activeFactions = FACTION_IDS.slice(0, playerCount);

    this._humanFactions = cfg.mode === 'hotseat'
      ? activeFactions.slice()
      : [factionId];
    this._playerFactionId = factionId;

    this.world = new World({
      seed: 1337,
      radius: 14,
      playerDeck,
      playerGeneralPreset: this.profile.starterGeneralByFaction?.[factionId] ?? 0,
      activeFactions,
    });

    this.world.onFactionEliminated = (fid) => {
      const f = this.world.factions.find((x) => x.id === fid);
      this.bus.emit('toast:show', { text: `⚔ Фракция «${f?.name || fid}» выбыла` });
    };
    this.world.onMarketAutoOffer = ({ text }) => {
      this.bus.emit('toast:show', { text });
    };

    this.turnManager = new TurnManager({ world: this.world, bus: this.bus });
    this.recruitController = new RecruitController({ world: this.world, bus: this.bus });
    this.marketController = new MarketController({ world: this.world, bus: this.bus });
    this.battleController = new BattleController({ world: this.world, bus: this.bus });

    this.ui.setWorld(this.world);
    this.ui.battleController = this.battleController;
    this.ui.marketController = this.marketController;
    this.ui.onBuySettlement = (cityId) => this.buySettlement(cityId);
    this.ui.onAttackCity = (cityId, defenderFactionId) => this._attackCityById(cityId, defenderFactionId);
    if (this.ui.battleModal) this.ui.battleModal.controller = this.battleController;
    if (this.ui.marketPanel) {
      this.ui.marketPanel.controller = this.marketController;
      this.ui.marketPanel.world = this.world;
    }
    if (this.ui.factionsPanel) this.ui.factionsPanel.world = this.world;
    if (this.ui.quickJump) {
      this.ui.quickJump.theme = { hexSize: Theme.hexSize };
      this.ui.quickJump.cameraController = this.cameraController;
    }

    this._startWorld(factionId);
  }

  _startWorld(factionId) {
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

    this.ui.initMinimap({
      cameraController: this.cameraController,
      onCenter: (tile) => {
        if (tile) this.cameraController.centerOn(tile.hex, Theme.hexSize);
      },
    });

    if (!localStorage.getItem('tavrida_tutorial_v1')) {
      this.ui.showTutorial(() => {
        this.input.setPickables(this.sceneBuilder.getPickables());
      });
    }

    this._updateHireButton();
    this.bus.emit('game:started', { faction: factionId });
    this.logger.info('Game started:', factionId,
      'mode=', this.profile.matchConfig.mode,
      'playerCount=', this.profile.matchConfig.playerCount);
  }

  _onTileClick(tile, hitGeneral, hitCity) {
    if (!this.world) return;
    const playerFactionId = this.world.playerFactionId;

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

    if (hitCity && tile?.cityId) {
      this._handleCityClick(tile, hitCity);
      return;
    }

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
        if (tile.cityId) {
          const city = this.world.getCity(tile.cityId);
          if (city && city.factionId !== general.factionId && city.factionId !== null) {
            this.bus.emit('toast:show', { text: `Сначала победите защитников ${city.name}` });
            return;
          }
          if (city && city.factionId === null && city.settlement) {
            if (this.world.movement.canAttack(general, tile)) {
              const dist = this.world.movement.attackCostTo(general, tile);
              this._confirmSettlementAttack(general, tile, city, dist);
            } else {
              this.bus.emit('toast:show', { text: `Сначала победите или купите ${city.name}` });
            }
            return;
          }
        }
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
  
    // ─── Тултип ТОЛЬКО для выделенного гекса ───
    const isSelected = tile && this.selectedTileKey === tile.key;
    if (isSelected) {
      this.bus.emit('tile:hovered', { tile, screenPos });
    } else {
      this.bus.emit('tile:hovered', { tile: null, screenPos });
    }
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
      onCancel: () => {},
    });
  }

  _confirmSettlementAttack(general, tile, city, cost) {
    const defenderName = city.neutralFaction === 'cimmerians' ? 'Киммерийцы' : 'Тавры';
    new ConfirmDialog(document.getElementById('ui-root'), {
      title: 'Напасть на поселение?',
      text: `${general.name} атакует ${city.name} (${defenderName}). Генерал-защитник будет обороняться. Потрачено ${cost} очка движения.`,
      confirmText: 'Напасть',
      cancelText: 'Отмена',
      onConfirm: () => this._executeBattle(general, tile, cost, city.neutralFaction || 'tauri'),
      onCancel: () => {},
    });
  }

  _handleCityClick(tile, city) {
    const playerFactionId = this.world.playerFactionId;
    const isMine = city.factionId === playerFactionId;
    if (isMine) {
      this._openCity(tile, city);
      return;
    }
    if (this.selectedGeneralId) {
      const general = this.world.generals.find((g) => g.id === this.selectedGeneralId);
      if (general && this.world.movement.canAttack(general, tile)) {
        const cost = this.world.movement.attackCostTo(general, tile);
        const defenderFactionId = city.settlement
          ? (city.neutralFaction || 'tauri')
          : (city.factionId || 'goths');
        const kind = city.settlement ? 'поселение' : city.isCity ? 'город' : 'деревню';
        const canBuy = city.settlement;
        new ConfirmDialog(document.getElementById('ui-root'), {
          title: `Атаковать ${kind}?`,
          text: `${general.name} может атаковать ${city.name}. `
              + `Потратится ${cost} очка движения.`
              + (canBuy ? ` Или купить за 40 💰 (только для поселения).` : ''),
          confirmText: 'Атаковать',
          cancelText: canBuy ? 'Купить / Отмена' : 'Отмена',
          onConfirm: () => this._executeBattle(general, tile, cost, defenderFactionId),
          onCancel: () => {
            if (canBuy) {
              new ConfirmDialog(document.getElementById('ui-root'), {
                title: `Купить ${city.name}?`,
                text: `Купить поселение за 40 золота? Генерал-защитник исчезнет.`,
                confirmText: 'Купить',
                cancelText: 'Отмена',
                onConfirm: () => this.buySettlement(city.id),
                onCancel: () => {},
              });
            }
          },
        });
        return;
      }
    }
    this._openCity(tile, city);
  }

  _attackCityById(cityId, defenderFactionId) {
    const city = this.world.getCity(cityId);
    if (!city || !city.tileKey) return;
    const tile = this.world.map.getByKey(city.tileKey);
    if (!tile) return;
    const general = this.selectedGeneralId
      ? this.world.generals.find((g) => g.id === this.selectedGeneralId)
      : null;
    if (!general) {
      this.bus.emit('toast:show', { text: 'Сначала выберите полководца' });
      return;
    }
    if (!this.world.movement.canAttack(general, tile)) {
      this.bus.emit('toast:show', { text: 'Слишком далеко' });
      return;
    }
    const cost = this.world.movement.attackCostTo(general, tile);
    this._executeBattle(general, tile, cost, defenderFactionId);
  }

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
      // ─── Камера к полководцу ───
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
    this._updateHireButton();
  }

  _selectTile(tile) {
    this.selectedTileKey = tile ? tile.key : null;
    if (!tile) {
      this.sceneBuilder.highlight.setSelected(null);
      return;
    }
    // ─── Камера к гексу ───
    this.cameraController.centerOn(tile.hex, Theme.hexSize);
    const neighbors = tile.hex.neighbors()
      .map((n) => this.world.map.get(n.q, n.r))
      .filter((t) => t && t.isLand)
      .map((t) => t.key);
    this.sceneBuilder.highlight.setSelected(tile.key, neighbors);
  }

  _executeMove(general, tile, distance) {
    const fromKey = general.hex.key;
    general.spendMove(distance);
    general.moveTo(tile.hex);
    if (!tile.factionId) {
      const city = tile.cityId ? this.world.getCity(tile.cityId) : null;
      if (!city || city.factionId === general.factionId) {
        tile.setFaction(general.factionId);
      }
    }
    this.world.recomputeVisibility();
    this.sceneBuilder.updateFog(this.world);
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.sceneBuilder.setMovementOverlays(null, false);
    this.sceneBuilder.setAttackOverlays(null, false);
    this.sceneBuilder.setGeneralSelected(general.id, false);
    this.sceneBuilder.refreshBorders();   // ← границы сразу
    this.selectedGeneralId = null;
    this.bus.emit('general:moved', { general, fromKey, toKey: tile.key, cost: distance });
    this.ui.quickJump?.refreshMinimap();
    if (general.movePoints > 0) this._selectGeneral(general);
    else this._updateHireButton();
  }

  _executeBattle(general, tile, cost, defenderFactionOverride = null) {
    this._pendingBattleCost = cost ?? 1;
    this.sceneBuilder.setMovementOverlays(null, false);
    this.sceneBuilder.setAttackOverlays(null, false);
    this.sceneBuilder.setGeneralSelected(general.id, false);
    this.selectedGeneralId = null;
    this.bus.emit('general:selected', { general: null });
    this._updateHireButton();
    const defenderFactionId = defenderFactionOverride
      || tile.factionId
      || 'goths';
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
  
    // Игрок
    const playerWon =
      (playerSide === 'attacker' && winner === 'attacker') ||
      (playerSide === 'defender' && winner === 'defender');
    const playerGen = playerSide === 'attacker' ? attackerGen : defenderGen;
  
    // ─── Опыт и звук для игрока ───
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
  
    // ─── Последствия боя (универсально, независимо от playerSide) ───
    if (winner === 'attacker') {
      this._applyAttackerVictory(attackerGen, defenderGen, targetTile);
    } else if (winner === 'defender') {
      this._applyDefenderVictory(attackerGen, defenderGen, targetTile);
    }
  
    // ─── Тост для игрока ───
    if (winner !== 'draw') {
      this.bus.emit('toast:show', { text: playerWon ? 'Победа!' : 'Поражение' });
    } else {
      this.bus.emit('toast:show', { text: 'Ничья' });
    }
  
    this.world._checkElimination();
  
    if (this.world.winner) {
      this._finishMatchRewards();
    }
  
    this.world.recomputeVisibility();
    this.sceneBuilder.rebuild(this.world);
    this.sceneBuilder.updateFog(this.world);
    this.sceneBuilder.updateCityFaction(this.world);
    this.sceneBuilder.refreshBorders();
    this.input.setPickables(this.sceneBuilder.getPickables());
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
    this.ui.quickJump?.refreshMinimap();
    this._updateHireButton();
    if (this._aiBusy) this._afterAITurns();
  }
  
  /** Атакующий победил: захват гекса/города, шаг на гекс, потеря очков движения. */
  _applyAttackerVictory(attackerGen, defenderGen, targetTile) {
    if (!attackerGen || !targetTile) return;
    if (defenderGen && defenderGen.id !== attackerGen.id) {
      defenderGen.lives = 0;
    }
    // Захват города
    const capturedCity = targetTile.cityId ? this.world.getCity(targetTile.cityId) : null;
    if (capturedCity) {
      this.world.captureCity(capturedCity.id, attackerGen.factionId);
      this.bus.emit('toast:show', { text: `🏛 Захвачен ${capturedCity.name}` });
    } else {
      targetTile.setFaction(attackerGen.factionId);
    }
    // Генерал делает шаг на гекс
    attackerGen.moveTo(targetTile.hex);
    // Списываем движение — но не больше, чем есть
    const cost = this._pendingBattleCost || 0;
    if (cost > 0) attackerGen.spendMove(cost);
  }
  
  /** Защитник победил: атакующий теряет жизнь и не двигается. */
  _applyDefenderVictory(attackerGen, defenderGen, targetTile) {
    if (!attackerGen) return;
    attackerGen.lives = Math.max(0, attackerGen.lives - 1);
    const cost = this._pendingBattleCost || 0;
    if (cost > 0) attackerGen.spendMove(cost);
    // Гекс остаётся за защитником (если был город — он и так его)
    if (targetTile && defenderGen) {
      targetTile.setFaction(defenderGen.factionId);
    }
  }

  _finishMatchRewards() {
    const cfg = this.profile.matchConfig || { mode: 'ai' };
    const winner = this.world.winner;
    const defeated = this.world.factions
      .filter((f) => !f.neutral && f.eliminated && f.id !== winner)
      .map((f) => f.id);

    this.rewardService.applyMatchRewards({
      winnerFactionId: winner,
      playerFactionId: this._playerFactionId || this.world.playerFactionId,
      mode: cfg.mode,
      defeatedByPlayerFaction: defeated,
      humanFactionIds: this._humanFactions || [],
    });

    setTimeout(() => {
      this.ui.root.querySelectorAll('.battle-modal-overlay, .battle-result-overlay')
        .forEach((e) => e.remove());
      this.world = null;
      this._humanFactions = [];
      this._showLobby();
    }, 1500);
  }

  _openCity(tile, city) {
    if (this.world) this.world.selectedGeneralId = this.selectedGeneralId;
    this.ui.openCityPanel({ tile, city, world: this.world });
  }

  openMarket() {
    if (!this.world) return;
    this.ui.marketPanel.open();
  }

  openRecruitForSelected() {
    if (!this.world) return;
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
    if (!general || !this.world) return null;
    const tile = this.world.map.get(general.hex.q, general.hex.r);
    if (!tile?.cityId) return null;
    const city = this.world.getCity(tile.cityId);
    if (!city || city.factionId !== general.factionId) return null;
    return { tile, city };
  }

  _updateHireButton() {
    const general = this.selectedGeneralId && this.world
      ? this.world.generals.find((g) => g.id === this.selectedGeneralId)
      : null;
    const own = general ? this._isGeneralInOwnCity(general) : null;
    this.ui.setHireEnabled(!!own);
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

  // ═══════════════════════════════════════════
  //  КОНЕЦ ХОДА + ИИ + HOT-SEAT
  // ═══════════════════════════════════════════
  endTurn() {
    if (this._aiBusy || !this.world) return;
    const cfg = this.profile.matchConfig || { mode: 'ai' };

    if (cfg.mode === 'hotseat') {
      this._endTurnForHotseat();
      return;
    }

    this.world.endTurn();
    this._selectGeneral(null);
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.bus.emit('turn:ended', { turn: this.world.turn });
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
    this.ui.quickJump?.refreshMinimap();
    this._runAITurns();
  }

  _endTurnForHotseat() {
    const humans = this._humanFactions || [];
    if (humans.length < 2) {
      this.world.endTurn();
      this._runAITurns();
      return;
    }
    this._selectGeneral(null);

    const nextId = this.world.nextHumanFaction(humans);
    const isFirstHuman = humans[0] === nextId && this.world.playerFactionId === humans[humans.length - 1];

    this.world.switchToFaction(nextId);
    this._playerFactionId = nextId;
    this.profile.lastPlayedFaction = nextId;

    if (isFirstHuman) {
      this.world.turn += 1;
      for (const g of this.world.generals) g.resetTurn();
      this.world.recruitPointsUsedMap.clear();
      for (const f of this.world.factions) {
        if (f.eliminated || f.neutral) continue;
        const pool = this.world.resourcePools.get(f.id);
        const income = this.world.economy.computeIncome(this.world, f.id);
        pool.add(income);
        this.world.recruitPools.get(f.id)?.addTurnIncome(this.world);
        const created = this.world.market.autoCreateOffers(f.id);
        for (const offer of created) {
          const label = offer.goods === 'weapons' ? 'оружия' : 'провизии';
          this.bus.emit('toast:show', {
            text: `Излишки ${label} ушли на рынок: ${offer.amount} за ${offer.price}💰`,
          });
        }
      }
      this.world._aiMarketTurn();
      this.world._checkElimination();
      this.bus.emit('turn:ended', { turn: this.world.turn });
    }

    this.world.recomputeVisibility();
    this.sceneBuilder.rebuild(this.world);
    this.sceneBuilder.updateFog(this.world);
    this.sceneBuilder.updateCityFaction(this.world);
    this.input.setPickables(this.sceneBuilder.getPickables());
    this.bus.emit('resources:changed', { factionId: nextId });
    this.ui.quickJump?.setWorld(this.world);
    this.ui.quickJump?.refreshMinimap();
    this._updateHireButton();

    const f = this.world.factions.find((x) => x.id === nextId);
    this.bus.emit('toast:show', { text: `Ход: ${f?.name || nextId}` });
    this.sound.play('turn');
    this.ui.turnIndicator.show(`Ход: ${f?.name || nextId}`);
    setTimeout(() => this.ui.turnIndicator.hide(), 1500);

    if (isFirstHuman) this._runAITurns();
  }

  async _runAITurns() {
    if (!this.world) return;
    const humanFactions = this._humanFactions || [this.world.playerFactionId];
    const aiFactionIds = this.world.factions
      .filter((f) => !f.neutral && !f.eliminated && !humanFactions.includes(f.id))
      .map((f) => f.id);
    if (aiFactionIds.length === 0) {
      this._afterAITurns();
      return;
    }
    this._aiBusy = true;
    this.ui.turnIndicator.show('Ход противника…');
    this.sound.play('turn');
    const battleAction = await this.turnManager.runAITurns(aiFactionIds, {
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
    if (!this.world) return;
    const humans = this._humanFactions || [];
    if (humans.length > 0) {
      this.world.switchToFaction(humans[0]);
      this._playerFactionId = humans[0];
    }
    this.world.recomputeVisibility();
    this.sceneBuilder.updateFog(this.world);
    this.sceneBuilder.rebuild(this.world);
    this.sceneBuilder.updateCityFaction(this.world);
    this.sceneBuilder.refreshBorders();
    this.input.setPickables(this.sceneBuilder.getPickables());
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
    this.ui.quickJump?.refreshMinimap();
    this._updateHireButton();
  }

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