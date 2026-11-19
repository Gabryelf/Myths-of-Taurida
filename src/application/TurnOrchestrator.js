import { Theme } from '../infrastructure/config/ThemeConfig.js';

/**
 * Ходы: игрок, AI, hot-seat. Самый «толстый» сервис,
 * но всё ещё в 3 раза меньше прежнего Game.
 */
export class TurnOrchestrator {
  constructor({
    world, bus, turnManager, profile, ui, sound, sceneBuilder,
    cameraController, input, selection, movementController, battleController, sceneSync,
  }) {
    this.world = world;
    this.bus = bus;
    this.turnManager = turnManager;
    this.profile = profile;
    this.ui = ui;
    this.sound = sound;
    this.sceneBuilder = sceneBuilder;
    this.cameraController = cameraController;
    this.input = input;
    this.selection = selection;
    this.movement = movementController;
    this.battleController = battleController;
    this.sceneSync = sceneSync;
    this.humanFactions = [];
    this.playerFactionId = null;
    this._aiBusy = false;
    this.onMatchFinished = null;   // колбэк от Game
  }

  setHumanFactions(list, playerId) {
    this.humanFactions = list;
    this.playerFactionId = playerId;
  }

  get isBusy() { return this._aiBusy; }

  endTurn() {
    if (!this.world) return;
    if (this.movement.isMoving) return;
    if (this._aiBusy) {
      this._aiBusy = false;
      if (this.turnManager) this.turnManager.isRunning = false;
    }
    const cfg = this.profile.matchConfig || { mode: 'ai' };
    if (cfg.mode === 'hotseat') { this.endTurnForHotseat(); return; }

    this.world.endTurn();
    this.selection.selectGeneral(null);
    this.sceneBuilder.updateGeneralPositions(this.world);
    this.bus.emit('turn:ended', { turn: this.world.turn });
    this.bus.emit('resources:changed', { factionId: this.world.playerFactionId });
    this.ui.quickJump?.refreshMinimap();
    this.runAITurns();
  }

  endTurnForHotseat() {
    const humans = this.humanFactions || [];
    if (humans.length < 2) { this.world.endTurn(); this.runAITurns(); return; }
    this.selection.selectGeneral(null);
    const nextId = this.world.nextHumanFaction(humans);
    const isFirstHuman = humans[0] === nextId && this.world.playerFactionId === humans[humans.length - 1];
    this.world.switchToFaction(nextId);
    this.playerFactionId = nextId;
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
    this.sceneSync.run(this.world, { factionId: nextId });
    this.ui.quickJump?.setWorld(this.world);
    this.selection.updateHireButton();

    const f = this.world.factions.find((x) => x.id === nextId);
    this.bus.emit('toast:show', { text: `Ход: ${f?.name || nextId}` });
    this.sound.play('turn');
    this.ui.turnIndicator.show(`Ход: ${f?.name || nextId}`);
    setTimeout(() => this.ui.turnIndicator.hide(), 1500);
    if (isFirstHuman) this.runAITurns();
  }

  async runAITurns() {
    if (!this.world) return;
    if (this._aiBusy) {
      this._aiBusy = false;
      if (this.turnManager) this.turnManager.isRunning = false;
    }

    const humans = this.humanFactions || [this.world.playerFactionId];
    const aiFactionIds = this.world.factions
      .filter((f) => !f.neutral && !f.eliminated && !humans.includes(f.id))
      .map((f) => f.id);

    if (aiFactionIds.length === 0) {
      this.afterAITurns();
      return;
    }

    this._aiBusy = true;
    this.ui.turnIndicator.show('Ход противника…');
    this.sound.play('turn');

    try {
      const battleStep = await this.turnManager.runAITurns(aiFactionIds, {
        onAITurnStart: (id) => {
          const f = this.world.factions.find((x) => x.id === id);
          this.ui.turnIndicator.show(`Ход: ${f?.name || id}`);
        },
        onAIStep: (step) => {
          try { this.onAIStep(step); }
          catch (e) { console.error('[TurnOrchestrator.onAIStep]', e, step); }
        },
        onAITurnEnd: () => this.sceneBuilder.refreshBorders(),
      });

      if (battleStep) {
        this.ui.turnIndicator.hide();
        if (!battleStep.general) {
          battleStep.general = this.world.generals.find((g) => g.id === battleStep.generalId);
        }
        if (!battleStep.general) {
          console.error('[TurnOrchestrator] battleStep without general');
          this.afterAITurns();
        } else {
          try {
            const result = await this.battleController.autoResolve({
              attackerGen: battleStep.general,
              targetTile: battleStep.targetTile,
              defenderFactionId: battleStep.defenderFactionId || 'goths',
              playerSide: 'defender',
            });
            const atkName = battleStep.general?.name || 'Противник';
            const winner = result.winner === 'attacker' ? atkName : 'защитник';
            const targetCity = battleStep.targetTile?.cityId
              ? this.world.getCity(battleStep.targetTile.cityId)
              : null;
            const place = targetCity?.name || 'территория';
            this.bus.emit('notification:show', {
              text: `${atkName} атаковал ${place}: победа ${winner}`,
              kind: result.winner === 'attacker' ? 'danger' : 'success',
            });
          } catch (e) {
            console.error('[TurnOrchestrator.runAITurns autoResolve]', e);
            battleStep.general.movePoints = 0;
            this.afterAITurns();
          }
        }
      } else {
        this.ui.turnIndicator.hide();
        this.afterAITurns();
      }
    } catch (e) {
      console.error('[TurnOrchestrator.runAITurns]', e);
      this.ui.turnIndicator.hide();
      this.afterAITurns();
    } finally {
      this._aiBusy = false;
    }
  }

  onAIStep(step) {
    if (!this.world) return;
    try {
      if (step.action === 'move') {
        const gen = step.generalId
          ? this.world.generals.find((g) => g.id === step.generalId)
          : null;
        if (gen && step.fromHex && step.toHex) {
          this.movement.animateGeneralMove(gen, step.fromHex, step.toHex);
        }
        if (step.captured && step.toHex) {
          const tile = this.world.map.get(step.toHex.q, step.toHex.r);
          if (tile) {
            const v = this.sceneBuilder._tileVisuals.get(tile.key);
            if (v && typeof v.setFactionColor === 'function') {
              if (tile.factionId) v.setFactionColor(tile.factionId);
              v.setFactionRingVisible(true);
            }
          }
        }
        this.sceneBuilder.refreshBorders();
        this.world.recomputeVisibility();
        this.sceneBuilder.updateFog(this.world);
        this.sceneBuilder.updateGeneralBars?.(this.world);   // ← новая строка
        this.bus.emit('ai:step:move', { step });
      } else if (step.action === 'attack-city' || step.action === 'attack') {
        const gen = step.generalId
          ? this.world.generals.find((g) => g.id === step.generalId)
          : null;
        if (gen) this.sceneBuilder.updateGeneralPositions(this.world);
        this.sceneBuilder.refreshBorders();
        this.bus.emit('ai:step:attack', { step });
      } else if (step.action === 'recruit') {
        this.bus.emit('notification:show', {
          text: 'Противник нанял карту',
          kind: 'info',
        });
    } else if (step.action === 'hire-general') {
        this.sceneSync.run(this.world, { resources: false });
        this.bus.emit('notification:show', {
          text: 'Противник нанял полководца',
          kind: 'danger',
        });
      } else if (step.action === 'buy-settlement') {
        this.bus.emit('notification:show', {
          text: `Противник купил поселение «${step.cityName}»`,
          kind: 'danger',
        });
        this.sceneSync.run(this.world, { resources: false });
      }

    } catch (e) {
      console.error('[TurnOrchestrator.onAIStep]', e, step);
    }
  }

  afterAITurns() {
    if (!this.world) return;
    const humans = this.humanFactions || [];
    if (humans.length > 0) {
      this.world.switchToFaction(humans[0]);
      this.playerFactionId = humans[0];
    }
    this.world.recomputeVisibility();
    this.sceneSync.run(this.world);
    this.selection.updateHireButton();
    this.selection.autoSelectAfterAITurns();
  }

}