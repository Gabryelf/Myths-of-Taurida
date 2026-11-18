import { ConfirmDialog } from '../ui/components/ConfirmDialog.js';
import { Theme } from '../infrastructure/config/ThemeConfig.js';

/**
 * Оркестрация боёв: открытие, завершение, победы/поражения.
 * Знает о BattleController и world, но не о Game.
 */
export class BattleOrchestrator {
    constructor({ world, bus, battleController, sceneBuilder, cameraController, input, ui, sound, profile, humanFactions, pendingBattle, sceneSync }) {
        this.world = world;
        this.bus = bus;
        this.battleController = battleController;
        this.sceneBuilder = sceneBuilder;
        this.cameraController = cameraController;
        this.input = input;
        this.ui = ui;
        this.sound = sound;
        this.profile = profile;
        this.humanFactions = humanFactions;
        this.pendingBattle = pendingBattle;   // { cost: 0, defenderFactionId: null }
        this.sceneSync = sceneSync;
        this.onMatchFinished = null;          // колбэк от Game
        this.onAfterAITurns = null;           // колбэк от Game
    }


    /**
     * Подтверждение атаки на генерала.
     */
    confirmAttack(general, tile, cost, onConfirm) {
        const enemy = this.world.getGeneralAt(tile.hex);
        const enemyName = enemy?.name || 'Вражеский полководец';
        let defenderFactionId = enemy?.factionId;
        if (!defenderFactionId && tile.cityId) {
            const city = this.world.getCity(tile.cityId);
            defenderFactionId = city?.settlement
                ? (city.neutralFaction || 'tauri')
                : (city?.factionId || null);
        }
        if (!defenderFactionId) defenderFactionId = tile.factionId || null;

        new ConfirmDialog(document.getElementById('ui-root'), {
            title: 'Начать бой?',
            text: `${general.name} атакует ${enemyName}. Потрачено ${cost} очка движения.`,
            confirmText: 'Атаковать', cancelText: 'Отмена',
            onConfirm: () => onConfirm(defenderFactionId),
            onCancel: () => { },
        });
    }

    confirmSettlementAttack(general, tile, city, cost, onConfirm) {
        const defenderName = city.neutralFaction === 'cimmerians' ? 'Киммерийцы' : 'Тавры';
        new ConfirmDialog(document.getElementById('ui-root'), {
            title: 'Напасть на поселение?',
            text: `${general.name} атакует ${city.name} (${defenderName}). Генерал-защитник будет обороняться. Потрачено ${cost} очка движения.`,
            confirmText: 'Напасть', cancelText: 'Отмена',
            onConfirm: () => onConfirm(city.neutralFaction || 'tauri'),
            onCancel: () => { },
        });
    }

    executeBattle(general, tile, cost, defenderFactionOverride, selection) {
        this.pendingBattle.cost = cost ?? 1;

        let defenderFactionId = defenderFactionOverride;
        if (!defenderFactionId) {
            const enemyGen = this.world.getGeneralAt(tile.hex);
            if (enemyGen) {
                defenderFactionId = enemyGen.factionId;
            } else if (tile.cityId) {
                const city = this.world.getCity(tile.cityId);
                defenderFactionId = city?.settlement
                    ? (city.neutralFaction || 'tauri')
                    : (city?.factionId || null);
            } else {
                defenderFactionId = tile.factionId || null;
            }
        }
        if (!defenderFactionId) {
            this.bus.emit('toast:show', { text: 'Некого атаковать' });
            return;
        }
        this.pendingBattle.defenderFactionId = defenderFactionId;

        this.sceneBuilder.setMovementOverlays(null, false);
        this.sceneBuilder.setAttackOverlays(null, false);
        this.sceneBuilder.setGeneralSelected(general.id, false);
        selection.selectedGeneralId = null;
        this.bus.emit('general:selected', { general: null });
        selection.updateHireButton();

        const cfg = this.profile.matchConfig || { mode: 'ai' };
        const humans = this.humanFactions || [];
        const attackerHuman = humans.includes(general.factionId);
        const defenderHuman = cfg.mode === 'hotseat' ? humans.includes(defenderFactionId) : false;
        const playerSide = attackerHuman ? 'attacker' : 'defender';
        this.battleController.open({
            attackerGen: general, targetTile: tile, defenderFactionId, playerSide,
            humanSides: { attacker: attackerHuman, defender: defenderHuman },
        });
    }

    onBattleFinished(result) {
        const { winner, targetTile, attackerGen, defenderGen, playerSide, activeSide, humanSides } = result;
        const cost = this.pendingBattle.cost || 0;
        this.pendingBattle.cost = 0;
        this.pendingBattle.defenderFactionId = null;
        const side = activeSide || playerSide || 'attacker';
        const isHumanFight = humanSides?.attacker || humanSides?.defender;
        let playerWon = false;
        if (isHumanFight) {
            playerWon = (side === 'attacker' && winner === 'attacker') || (side === 'defender' && winner === 'defender');
        } else {
            playerWon = (playerSide === 'attacker' && winner === 'attacker') || (playerSide === 'defender' && winner === 'defender');
        }
        const playerGen = side === 'attacker' ? attackerGen : defenderGen;
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
        if (winner === 'attacker') this.applyAttackerVictory(attackerGen, defenderGen, targetTile, cost);
        else if (winner === 'defender') this.applyDefenderVictory(attackerGen, defenderGen, targetTile, cost);
        if (winner !== 'draw') this.bus.emit('toast:show', { text: playerWon ? 'Победа!' : 'Поражение' });
        else this.bus.emit('toast:show', { text: 'Ничья' });
        const connEvents = this.world.connectivity.enforceForAll();
        for (const ev of connEvents) {
            if (ev.text) this.bus.emit('notification:show', {
                text: ev.text,
                kind: ev.type === 'city' ? 'danger' : 'info',
            });
        }
        this.world._checkElimination();
        if (this.world.winner) this.onMatchFinished?.();
        this.world.recomputeVisibility();
        this.sceneSync.run(this.world);
        this.onAfterAITurns?.();
    }


    applyAttackerVictory(attackerGen, defenderGen, targetTile, cost) {
        if (!attackerGen || !targetTile) return;
        const enemyGenOnTile = this.world.getGeneralAt(targetTile.hex);
        if (enemyGenOnTile && enemyGenOnTile.id !== attackerGen.id
            && enemyGenOnTile.factionId !== attackerGen.factionId) {
            enemyGenOnTile.lives = 0;
        }
        if (defenderGen && defenderGen.id !== attackerGen.id
            && defenderGen.factionId !== attackerGen.factionId) {
            defenderGen.lives = 0;
        }
        const capturedCity = targetTile.cityId ? this.world.getCity(targetTile.cityId) : null;
        if (capturedCity) {
            if (capturedCity.factionId !== attackerGen.factionId) {
                this.world.captureCity(capturedCity.id, attackerGen.factionId);
                this.bus.emit('toast:show', { text: `🏛 Захвачен ${capturedCity.name}` });
            }
        } else {
            targetTile.setFaction(attackerGen.factionId);
        }
        attackerGen.moveTo(targetTile.hex);
        if (cost > 0) attackerGen.spendMove(cost);
    }

    applyDefenderVictory(attackerGen, defenderGen, targetTile, cost) {
        if (!attackerGen) return;
        attackerGen.lives = Math.max(0, attackerGen.lives - 1);
        if (cost > 0) attackerGen.spendMove(cost);
        // targetTile не трогаем
    }
}