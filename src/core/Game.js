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
import { MarketController } from '../application/MarketController.js';
import { LobbyScreen } from '../ui/components/lobby/LobbyScreen.js';
import { SummonModal } from '../ui/components/lobby/SummonModal.js';
import { SaveManager } from '../domain/collection/SaveManager.js';
import { createStarterProfile } from '../domain/collection/PlayerProfileFactory.js';
import { DeckRepository } from '../domain/deck/DeckRepository.js';
import { RewardService } from '../domain/match/RewardService.js';
import { NotificationCenter } from '../ui/components/NotificationCenter.js';

// ─── Сервисы ───
import { SelectionController } from '../application/SelectionController.js';
import { MovementController } from '../application/MovementController.js';
import { BattleOrchestrator } from '../application/BattleOrchestrator.js';
import { CityInteractionService } from '../application/CityInteractionService.js';
import { TileInteractionService } from '../application/TileInteractionService.js';
import { TurnOrchestrator } from '../application/TurnOrchestrator.js';

const FACTION_IDS = ['scythians', 'bosporus', 'chersonesos', 'rome', 'goths'];

export class Game {
  constructor({ canvas, uiRoot, toastRoot }) {
    this.logger = new Logger('Game');
    this.bus = new EventBus();
    this.profile = SaveManager.load() || createStarterProfile('scythians');
    if (!this.profile.matchConfig) {
      this.profile.matchConfig = { mode: 'ai', playerCount: 5, playerFaction: 'scythians' };
    }
    this.deckRepo = DeckRepository.fromJSON(this.profile.unlockedDecks, this.profile.collection);
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
      onEndTurn: () => this.turnOrchestrator?.endTurn(),
      onRecruit: (key) => this.recruitController?.tryRecruit(key),
      battleController: null, marketController: null, sound: this.sound,
    });
    this.ui.onHire = () => this.openRecruitForSelected();
    this.ui.onMarket = () => this.openMarket();
    this.ui.onBuySettlement = (cityId) => this.cityService?.buySettlement(cityId);
    this.ui.onLensModeChange = (mode) => {
      this.sceneBuilder.setLensMode(mode);
      this.input.setPickables(this.sceneBuilder.getPickables());
    };

    this.input = new InputController({
      canvas, camera: this.renderer.camera,
      onTileClick: (tile, hitGeneral, hitCity) => this.tileService?.onTileClick(tile, hitGeneral, hitCity),
      onTileHover: (tile, screenPos, meta) => this.tileService?.onTileHover(tile, screenPos, meta),
    });
    this.input.attachCameraController(this.cameraController);

    this.notifications = new NotificationCenter(uiRoot, { max: 8 });
    this.bus.on('toast:show', ({ text }) => this.notifications.push({ text, kind: 'info' }));
    this.bus.on('notification:show', ({ text, kind }) => this.notifications.push({ text, kind }));
    this.bus.on('battle:finished', (r) => this.battleOrchestrator?.onBattleFinished(r));
    this.bus.on('battle:started', () => this.sound.play('play'));

    this._running = false;
    this.lobby = null;
    this.summonModal = null;

    // ─── Сервисы уровня мира ───
    this.selection = null;
    this.movement = null;
    this.battleOrchestrator = null;
    this.cityService = null;
    this.tileService = null;
    this.turnOrchestrator = null;
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
    const cfg = this.profile.matchConfig || { mode: 'ai', playerCount: 5 };
    if (cfg.mode === 'hotseat') {
      const list = cfg.hotseatFactions || [];
      if (list.length === 0) {
        this.bus.emit('toast:show', { text: 'Не выбраны фракции для hot-seat' });
        return;
      }
      const ids = list.map((x) => x.factionId);
      if (new Set(ids).size !== ids.length) {
        this.bus.emit('toast:show', { text: 'Фракции игроков должны быть уникальны' });
        return;
      }
      for (const item of list) {
        const v = this.deckRepo.validate(item.factionId);
        if (!v.ok) {
          this.bus.emit('toast:show', { text: v.errors.join('; ') });
          return;
        }
      }
      if (this.lobby) this.lobby.hide();
      this._initWorldForFaction(list[0].factionId);
      return;
    }
    if (!factionId) {
      this.bus.emit('toast:show', { text: 'Фракция не выбрана' });
      return;
    }
    const v = this.deckRepo.validate(factionId);
    if (!v.ok) {
      this.bus.emit('toast:show', { text: v.errors.join('; ') });
      return;
    }
    if (this.lobby) this.lobby.hide();
    this._initWorldForFaction(factionId);
  }

  _initWorldForFaction(factionId) {
    const cfg = this.profile.matchConfig || { mode: 'ai', playerCount: 5 };
    const playerCount = Math.max(2, Math.min(5, cfg.playerCount || 5));
    let activeFactions;
    if (cfg.mode === 'hotseat') {
      const list = (cfg.hotseatFactions || []).map((x) => x.factionId);
      activeFactions = list.length ? list : FACTION_IDS.slice(0, playerCount);
    } else {
      activeFactions = FACTION_IDS.slice(0, playerCount);
    }
    this._humanFactions = cfg.mode === 'hotseat' ? activeFactions.slice() : [factionId];
    const firstFaction = cfg.mode === 'hotseat' ? activeFactions[0] : factionId;
    this._playerFactionId = firstFaction;
    const playerDeck = this.deckRepo.getDeck(firstFaction);

    this.world = new World({
      seed: 1337, radius: 14, playerDeck,
      playerGeneralPreset: this.profile.starterGeneralByFaction?.[firstFaction] ?? 0,
      activeFactions,
    });
    this.world.onFactionEliminated = (fid) => {
      const f = this.world.factions.find((x) => x.id === fid);
      this.bus.emit('toast:show', { text: `⚔ Фракция «${f?.name || fid}» выбыла` });
    };
    this.world.onMarketAutoOffer = ({ text }) => {
      this.bus.emit('notification:show', { text, kind: 'trade' });
    };
    this.world.onConnectivityEvent = (ev) => {
      if (ev.text) {
        this.bus.emit('notification:show', {
          text: ev.text,
          kind: ev.type === 'city' ? 'danger' : 'info',
        });
      }
    };

    // ─── Контроллеры ───
    this.turnManager = new TurnManager({ world: this.world, bus: this.bus });
    this.recruitController = new RecruitController({ world: this.world, bus: this.bus });
    this.marketController = new MarketController({ world: this.world, bus: this.bus });
    this.battleController = new BattleController({ world: this.world, bus: this.bus });

    // ─── Сервисы ───
    this.selection = new SelectionController({
      world: this.world, bus: this.bus,
      sceneBuilder: this.sceneBuilder, cameraController: this.cameraController, ui: this.ui,
    });

    this.movement = new MovementController({
      world: this.world, sceneBuilder: this.sceneBuilder,
      cameraController: this.cameraController,
      input: this.input, ui: this.ui, bus: this.bus,
    });

    this.battleOrchestrator = new BattleOrchestrator({
      world: this.world, bus: this.bus, battleController: this.battleController,
      sceneBuilder: this.sceneBuilder, cameraController: this.cameraController,
      input: this.input, ui: this.ui, sound: this.sound,
      profile: this.profile, humanFactions: this._humanFactions,
      pendingBattle: { cost: 0, defenderFactionId: null },
    });
    this.battleOrchestrator.onMatchFinished = () => this._finishMatchRewards();
    this.battleOrchestrator.onAfterAITurns = () => {
      if (this.turnOrchestrator?.isBusy) this.turnOrchestrator.afterAITurns();
    };

    this.cityService = new CityInteractionService({
      world: this.world, bus: this.bus,
      battleOrchestrator: this.battleOrchestrator,
      selection: this.selection, ui: this.ui,
      sceneBuilder: this.sceneBuilder,
      cameraController: this.cameraController,
      input: this.input, sound: this.sound,
    });

    this.tileService = new TileInteractionService({
      world: this.world, bus: this.bus,
      sceneBuilder: this.sceneBuilder,
      cameraController: this.cameraController, input: this.input,
      selection: this.selection, movementController: this.movement,
      battleOrchestrator: this.battleOrchestrator,
      cityService: this.cityService, ui: this.ui,
    });

    this.turnOrchestrator = new TurnOrchestrator({
      world: this.world, bus: this.bus, turnManager: this.turnManager,
      profile: this.profile, ui: this.ui, sound: this.sound,
      sceneBuilder: this.sceneBuilder, cameraController: this.cameraController,
      input: this.input, selection: this.selection,
      movementController: this.movement, battleController: this.battleController,
    });
    this.turnOrchestrator.setHumanFactions(this._humanFactions, firstFaction);
    this.turnOrchestrator.onMatchFinished = () => this._finishMatchRewards();

    // ─── UI-связки ───
    this.ui.setWorld(this.world);
    this.ui.battleController = this.battleController;
    this.ui.marketController = this.marketController;
    this.ui.onBuySettlement = (cityId) => this.cityService.buySettlement(cityId);
    this.ui.onAttackCity = (cityId, defenderFactionId) => this.cityService.attackCityById(cityId, defenderFactionId);
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

    // ─── Найм генерала → перестроить сцену ───
    this.bus.on('world:generalsChanged', ({ general }) => {
      if (!this.world) return;
      this.sceneBuilder.rebuild(this.world);
      this.sceneBuilder.updateFog(this.world);
      this.sceneBuilder.updateCityFaction(this.world);
      this.sceneBuilder.refreshBorders();
      this.input.setPickables(this.sceneBuilder.getPickables());
      this.world.recomputeVisibility();
      if (general) {
        this.cameraController.centerOn(general.hex, Theme.hexSize);
        this.selection.selectGeneral(general);
      }
    });

    this._startWorld(firstFaction);
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
    if (player?.startHex) this.cameraController.centerOn(player.startHex, Theme.hexSize);
    this.ui.initMinimap({
      cameraController: this.cameraController,
      onCenter: (tile) => { if (tile) this.cameraController.centerOn(tile.hex, Theme.hexSize); },
    });
    if (!localStorage.getItem('tavrida_tutorial_v1')) {
      this.ui.showTutorial(() => { this.input.setPickables(this.sceneBuilder.getPickables()); });
    }
    this.selection.updateHireButton();
    this.bus.emit('game:started', { faction: factionId });
  }

  // ─── Публичные API ───

  openMarket() { if (this.world) this.ui.marketPanel.open(); }

  openRecruitForSelected() {
    if (!this.world) return;
    const general = this.selection.getSelectedGeneral();
    if (!general) {
      this.bus.emit('toast:show', { text: 'Сначала выберите полководца' });
      return;
    }
    const own = this.selection.isGeneralInOwnCity(general);
    if (!own) {
      this.bus.emit('toast:show', { text: 'Полководец должен стоять в вашем городе/деревне' });
      return;
    }
    this.ui.openRecruitModal({ factionId: this.world.playerFactionId, general, world: this.world });
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
      this.ui.root.querySelectorAll('.battle-modal-overlay, .battle-result-overlay').forEach((e) => e.remove());
      this.world = null;
      this._humanFactions = [];
      this._showLobby();
    }, 1500);
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