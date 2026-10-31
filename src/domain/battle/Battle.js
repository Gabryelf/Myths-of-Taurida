import { BattleBoard } from './BattleBoard.js';
import { CardInstance } from './CardInstance.js';
import { AbilityFactory } from './AbilityFactory.js';
import { BattleEvents } from './BattleEvents.js';
import { LineBonus } from './LineBonus.js';
import { ColumnBonus } from './ColumnBonus.js';
import { GeneralDamageRule } from './GeneralDamageRule.js';

/**
 * Бой. Карты не «ходят» — они триггерят события.
 * Игрок разыгрывает карты, обилки срабатывают автоматически.
 */
export class Battle {
    constructor({
        attackerGen, defenderGen,
        attackerFaction, defenderFaction,
        targetTile, attackerDeck, defenderDeck,
        playerSide = 'attacker',
        maxIdleTurns = 3,
    }) {
        this.attackerGen = attackerGen;
        this.defenderGen = defenderGen;
        this.attackerFaction = attackerFaction;
        this.defenderFaction = defenderFaction;
        this.targetTile = targetTile;
        this.playerSide = playerSide;
        this.maxIdleTurns = maxIdleTurns;

        this.attacker = this._makeSide(attackerGen, attackerDeck);
        this.defender = this._makeSide(defenderGen, defenderDeck);

        this.lineBonus = { attacker: new LineBonus(), defender: new LineBonus() };
        this.columnBonus = { attacker: new ColumnBonus(), defender: new ColumnBonus() };
        this.generalDamage = { attacker: new GeneralDamageRule(), defender: new GeneralDamageRule() };

        this.turn = 'attacker';                 // нападающий ходит первым
        this.turnCount = 1;
        this.idleTurns = 0;                     // счётчик пропусков подряд
        this.log = [];
        this.finished = false;
        this.winner = null;
        this.selectedCard = null;

        // Стартовая рука — 3 карты
        this._drawOpeningHand('attacker', 3);
        this._drawOpeningHand('defender', 3);

        // Очки тактики: старт 1 + 1 + support
        this._refreshTactic('attacker');
        this._refreshTactic('defender');

        this._checkLineBonus();
        this._checkColumnBonus();
        this._emit(BattleEvents.TURN_STARTED, { side: this.turn, turn: this.turnCount });
    }

    // ─── Инициализация ───
    _makeSide(gen, deck) {
        return {
            gen,
            lives: gen.lives,
            maxLives: gen.maxLives,
            board: new BattleBoard(),
            hand: [],
            deck: deck.map((c) => this._makeCard(c)),
        };
    }

    _makeCard(c) {
        const instance = new CardInstance(c);
        instance.abilities = (c.abilityKeys || []).map((k) => AbilityFactory.create(k)).filter(Boolean);
        return instance;
    }

    _drawOpeningHand(side, count) {
        const data = this[side];
        const cheap = data.deck.filter((c) => c.str <= 1);
        const mid = data.deck.filter((c) => c.str === 2);
        const rest = data.deck.filter((c) => c.str > 2);
        const order = [...cheap, ...mid, ...rest];
        const hand = [];
        for (let i = 0; i < count && order.length > 0; i++) hand.push(order.shift());
        data.deck = order;
        data.hand = hand;
    }

    _drawToHand(side) {
        const d = this[side];
        if (d.deck.length === 0) return null;
        const card = d.deck.pop();
        d.hand.push(card);
        return card;
    }

    _refreshTactic(side) {
        const d = this[side];
        const supportCount = d.board.count('support');
        d.tacticPoints = 1 + supportCount + 1;
    }

    // ─── Геттеры ───
    get isPlayerTurn() { return this.turn === this.playerSide && !this.finished; }
    get playerData() { return this[this.playerSide]; }
    get enemyData() { return this[this.playerSide === 'attacker' ? 'defender' : 'attacker']; }
    get enemySide() { return this.playerSide === 'attacker' ? 'defender' : 'attacker'; }

    // ─── Действия игрока ───
    selectCard(card) {
        if (!this.isPlayerTurn) return false;
        if (card.str > this.playerData.tacticPoints) return false;
        this.selectedCard = this.selectedCard === card ? null : card;
        return true;
    }

    playCard(card, lane, index) {
        if (!this.isPlayerTurn) return false;
        if (card.str > this.playerData.tacticPoints) return false;

        const side = this.playerSide;
        const board = this[side].board;
        if (!board.place(lane, index, card)) return false;

        this[side].tacticPoints -= card.str;
        this[side].hand = this[side].hand.filter((c) => c.id !== card.id);
        this.selectedCard = null;

        this._log(`${card.name} → ${laneLabel(lane)}`);
        this._emit(BattleEvents.CARD_PLAYED, { card, side, lane, index });

        this._checkLineBonus();
        this._checkColumnBonus();
        this._checkVictory();
        return true;
    }

    // ─── Конец хода ───
    endPlayerTurn() {
        if (!this.isPlayerTurn) return false;
        this.selectedCard = null;
        this._endTurn(this.playerSide);
        return true;
    }

    skipTurn() {
        if (!this.isPlayerTurn) return false;
        this.idleTurns++;
        this.selectedCard = null;
        this._log('Игрок пропустил ход');
        this._endTurn(this.playerSide);
        return true;
    }

    _endTurn(side) {
        this._emit(BattleEvents.TURN_ENDED, { side });
        this._applyTurnEndEffects(side);
        this._applyTurnStartEffects(this._otherSide(side));

        if (this.finished) return;

        // Проверка пата
        if (this.idleTurns >= this.maxIdleTurns) {
            this.finished = true;
            this.winner = 'draw';
            this._log('Обе стороны пропустили 3 хода — ничья');
            return;
        }

        this.turn = this._otherSide(side);
        if (this.turn === 'attacker') this.turnCount++;

        this._refreshTactic(this.turn);
        this.generalDamage[this.turn].resetTurn();
        this.columnBonus[this.turn].resetTurn();

        this._checkLineBonus();
        this._checkColumnBonus();
        this._emit(BattleEvents.TURN_STARTED, { side: this.turn, turn: this.turnCount });

        // Если сейчас ход ИИ — отдаём управление
        if (this.turn !== this.playerSide) {
            // ход ИИ запускается через BattleController
        }
    }

    _otherSide(side) { return side === 'attacker' ? 'defender' : 'attacker'; }

    // ─── Ход ИИ ───
    aiTurn() {
        if (this.turn === this.playerSide || this.finished) return;
        const side = this.turn;
        const data = this[side];

        this._drawToHand(side);
        this._refreshTactic(side);

        // Приоритет: support → defense → attack
        this._aiPlayType(side, 'support', 'support');
        this._aiPlayType(side, 'warrior', 'defense');
        this._aiPlayType(side, ['archer', 'special'], 'attack');

        // Завершаем ход
        this._endTurn(side);
    }

    _aiPlayType(side, types, lane) {
        const d = this[side];
        const typeArr = Array.isArray(types) ? types : [types];
        const card = d.hand.find((c) => typeArr.includes(c.type) && c.str <= d.tacticPoints);
        if (!card) return;
        for (let i = 0; i < 3; i++) {
            if (d.board.isEmpty(lane, i)) {
                d.tacticPoints -= card.str;
                d.board.place(lane, i, card);
                d.hand = d.hand.filter((c) => c.id !== card.id);
                this._log(`Враг: ${card.name} → ${laneLabel(lane)}`);
                this._emit(BattleEvents.CARD_PLAYED, { card, side, lane, index: i });
                this._checkLineBonus();
                this._checkColumnBonus();
                return;
            }
        }
    }

    // ─── События и триггеры ───
    _emit(event, payload) {
        const ctxBase = { battle: this, event, payload };
        // Обилки всех карт на поле
        for (const side of ['attacker', 'defender']) {
            const board = this[side].board;
            for (const card of board.allCards()) {
                for (const ability of card.abilities) {
                    const ctx = { ...ctxBase, self: card, side };
                    try { ability.fire(ctx); } catch (e) { /* ignore */ }
                }
            }
        }
        // Бонусы рядов
        if (event === BattleEvents.LANE_FULL) this._activateLineBonus(payload);
        // Бонусы колонок
        if (event === BattleEvents.CARD_DIED) this._activateColumnBonus(payload);
    }

    _activateLineBonus({ side, lane }) {
        const lb = this.lineBonus[side];
        if (!lb.active[lane]) return;
        if (lane === 'support') {
            const board = this[side].board;
            for (const card of board.allCards()) {
                this.healCard(card, 1, null);
            }
        }
    }

    _activateColumnBonus({ side, card }) {
        const cb = this.columnBonus[side];
        if (!cb.active[card.index]) return;
        // Обязательная замена в колонке — игрок или ИИ
        if (side === this.playerSide) {
            // Игрок: подсветить пустую ячейку — ждём его действия
            this._log(`Колонка ${card.index + 1} активирована — нужно заменить карту`);
        } else {
            // ИИ: автоматически ставит cheapest
            this._aiForceReplace(side, card.index);
        }
    }

    _aiForceReplace(side, columnIndex) {
        const d = this[side];
        const card = d.hand[0];
        if (!card) return;
        // Ищем свободную ячейку в колонке
        for (const lane of ['defense', 'attack', 'support']) {
            if (d.board.isEmpty(lane, columnIndex)) {
                if (card.str > d.tacticPoints && !this.columnBonus[side].canUseCredit()) return;
                if (card.str > d.tacticPoints) {
                    this.columnBonus[side].markCreditUsed();
                    this._log(`Враг в кредит ставит ${card.name}`);
                } else {
                    d.tacticPoints -= card.str;
                }
                d.board.place(lane, columnIndex, card);
                d.hand = d.hand.filter((c) => c.id !== card.id);
                this._emit(BattleEvents.CARD_PLAYED, { card, side, lane, index: columnIndex });
                return;
            }
        }
    }

    // ─── Проверки ───
    _checkLineBonus() {
        for (const side of ['attacker', 'defender']) {
            const prev = { ...this.lineBonus[side].active };
            const curr = this.lineBonus[side].check(this[side].board);
            for (const lane of ['attack', 'defense', 'support']) {
                if (!prev[lane] && curr[lane]) {
                    this._log(`${sideLabel(side)}: ${laneLabel(lane)} заполнена`);
                    this._emit(BattleEvents.LANE_FULL, { side, lane });
                }
            }
        }
    }

    _checkColumnBonus() {
        for (const side of ['attacker', 'defender']) {
            const prev = [...this.columnBonus[side].active];
            this.columnBonus[side].check(this[side].board);
            for (let i = 0; i < 3; i++) {
                if (!prev[i] && this.columnBonus[side].active[i]) {
                    this._log(`${sideLabel(side)}: колонка ${i + 1} заполнена`);
                    this._emit(BattleEvents.COLUMN_FULL, { side, index: i });
                }
            }
        }
    }

    _applyTurnStartEffects(side) {
        // Реген от полной поддержки
        const regen = this.lineBonus[side].getRegenPerTurn();
        if (regen > 0) {
            for (const card of this[side].board.allCards()) {
                this.healCard(card, regen, null);
            }
        }
    }

    // ─── Утилиты (доступны обилкам) ───
    randomEnemyCard(side, lane) {
        const opp = this[this._otherSide(side)];
        const cards = opp.board.lines[lane].filter((c) => c);
        if (cards.length === 0) return null;
        return cards[Math.floor(Math.random() * cards.length)];
    }

    damageCard(card, amount, source = null) {
        if (!card || !card.alive) return;
        card.takeDamage(amount);
        this._emit(BattleEvents.CARD_DAMAGED, { card, amount, source });
        if (!card.alive) {
            const side = this._cardSide(card);
            if (side) {
                const board = this[side].board;
                board.remove(card);
                this._log(`${card.name} пал`);
                this._emit(BattleEvents.CARD_DIED, { card, side });
                this._checkColumnBonus();
            }
        }
        this._checkVictory();
    }

    healCard(card, amount, source = null) {
        if (!card || !card.alive) return;
        card.heal(amount);
        this._emit(BattleEvents.CARD_HEALED, { card, amount, source });
    }

    addStatus(card, kind, turns) {
        if (!card) return;
        card.statuses = card.statuses || {};
        card.statuses[kind] = (card.statuses[kind] || 0) + turns;
        this._log(`${card.name}: ${statusLabel(kind)}`);
    }

    damageGeneral(side, amount) {
        const data = this[side];
        const rule = this.generalDamage[side];
        const lb = this.lineBonus[side];
        const board = data.board;

        // Правило: 1 урон / ход и только при пустой колонке (исключение — полная линия атаки)
        if (!rule.canDamage(board, lb)) return false;

        data.lives = Math.max(0, data.lives - amount);
        rule.markDamaged();
        this._log(`${sideLabel(side)}: -${amount} жизнь полководца`);
        this._emit(BattleEvents.GENERAL_DAMAGED, { side, amount });
        this._checkVictory();
        return true;
    }

    _cardSide(card) {
        if (this.attacker.board.allCards().includes(card)) return 'attacker';
        if (this.defender.board.allCards().includes(card)) return 'defender';
        return null;
    }

    _checkVictory() {
        if (this.attacker.lives <= 0) { this.finished = true; this.winner = 'defender'; }
        else if (this.defender.lives <= 0) { this.finished = true; this.winner = 'attacker'; }
        if (this.finished) {
            this._regenSurvivors();
        }
    }

    _regenSurvivors() {
        for (const side of ['attacker', 'defender']) {
            for (const card of this[side].board.allCards()) {
                card.str = card.baseStr;
            }
        }
    }

    _log(text) {
        this.log.push({ msg: text, type: 'info' });
        if (this.log.length > 40) this.log.shift();
    }

    /** Для UI: инфо о бонусах линий. */
    getLineBonusInfo() {
        return {
            attack: { active: this.lineBonus.attacker.active.attack, desc: 'Полный ряд атаки: 1 урон полководцу каждый ход' },
            defense: { active: this.lineBonus.attacker.active.defense, desc: 'Полный ряд обороны: блокирует обилки врага' },
            support: { active: this.lineBonus.attacker.active.support, desc: 'Полный ряд поддержки: реген +1 каждый ход' },
        };
    }

    /** Для UI: инфо о бонусах колонок. */
    getColumnBonusInfo() {
        return this.columnBonus.attacker.active.map((active, i) => ({
            index: i,
            active,
            desc: active
                ? `Колонка ${i + 1} полная: при уничтожении карты — обязательная замена (раз в ход можно в кредит)`
                : `Колонка ${i + 1}: заполните все 3 ряда, чтобы активировать`,
        }));
    }
}

function laneLabel(lane) {
    return { defense: 'Оборону', attack: 'Атаку', support: 'Поддержку' }[lane] || lane;
}
function sideLabel(side) {
    return side === 'attacker' ? 'Атакующий' : 'Защитник';
}
function statusLabel(kind) {
    return { poison: 'Яд', burn: 'Горение', freeze: 'Заморозка' }[kind] || kind;
}