import { BattleBoard } from './BattleBoard.js';
import { BattleRuleEngine, LANES } from './BattleRuleEngine.js';
import { CardInstance } from './CardInstance.js';

/**
 * Состояние одного боя.
 * Домен-объект: знает только правила, ничего о рендере.
 */
export class Battle {
    constructor({
        attackerGen,
        defenderGen,
        attackerFaction,
        defenderFaction,
        targetTile,
        attackerDeck,
        defenderDeck,
        maxTurns = 20,
    }) {
        this.attackerGen = attackerGen;
        this.defenderGen = defenderGen;
        this.attackerFaction = attackerFaction;
        this.defenderFaction = defenderFaction;
        this.targetTile = targetTile;
        this.maxTurns = maxTurns;

        this.attacker = {
            gen: attackerGen,
            lives: attackerGen.lives,
            maxLives: attackerGen.maxLives,
            board: new BattleBoard(),
            hand: [],
            deck: attackerDeck.map((c) => new CardInstance(c)),
            tacticPoints: 1,
        };
        this.defender = {
            gen: defenderGen,
            lives: defenderGen.lives,
            maxLives: defenderGen.maxLives,
            board: new BattleBoard(),
            hand: [],
            deck: defenderDeck.map((c) => new CardInstance(c)),
            tacticPoints: 1,
        };

        this.rules = new BattleRuleEngine();
        this.turn = 'attacker';
        this.turnCount = 0;
        this.log = [];
        this.finished = false;
        this.winner = null;
        this.selectedCard = null;

        // Стартовые карты в руке
        for (let i = 0; i < 3; i++) {
            this._drawToHand('attacker');
            this._drawToHand('defender');
        }
    }

    get isPlayerTurn() { return this.turn === 'attacker' && !this.finished; }

    _drawToHand(side) {
        const data = this[side];
        if (data.deck.length === 0) return null;
        const card = data.deck.pop();
        data.hand.push(card);
        return card;
    }

    // ─── Игровые действия ───
    selectCard(card) {
        if (!this.isPlayerTurn) return false;
        if (card.str > this.attacker.tacticPoints) return false;
        this.selectedCard = this.selectedCard === card ? null : card;
        return true;
    }

    playCard(card, lane, index) {
        if (!this.isPlayerTurn) return false;
        if (card.str > this.attacker.tacticPoints) return false;
        const placed = this.attacker.board.place(lane, index, card);
        if (!placed) return false;

        this.attacker.tacticPoints -= card.str;
        this.attacker.hand = this.attacker.hand.filter((c) => c.id !== card.id);
        this.selectedCard = null;
        this._onPlay(card, 'attacker', lane, index);
        this._applyLineBonus('attacker', lane);
        this.log.push({ msg: `${card.name} → ${laneLabel(lane)}`, type: 'info' });
        return true;
    }

    attack(card, lane, index) {
        if (!this.isPlayerTurn) return false;
        if (!this.rules.canTarget(card, lane)) return false;
        const target = this.defender.board.get(lane, index);
        if (!target) return false;

        const res = this.rules.applyAttack(card, target, lane, this.defender.board);
        this.log.push({
            msg: `${card.name} → ${target.name}: ${res.dmg}`,
            type: 'dmg',
        });
        if (res.targetDead) this.log.push({ msg: `${target.name} пал`, type: 'dmg' });
        if (res.counter) this.log.push({ msg: `контратака ${res.counter}`, type: 'dmg' });
        if (res.attackerDead) this.log.push({ msg: `${card.name} пал`, type: 'dmg' });

        this.selectedCard = null;
        this._checkVictory();
        return true;
    }

    endPlayerTurn() {
        if (!this.isPlayerTurn) return false;
        this.selectedCard = null;
        this.turn = 'defender';
        return true;
    }

    // ─── ИИ ───
    aiTurn() {
        if (this.turn !== 'defender' || this.finished) return;
        this._drawToHand('defender');
        this.defender.tacticPoints = 1 + this.defender.board.count('support');

        // Разыгрываем до 2 карт
        let acts = 0;
        for (let i = this.defender.hand.length - 1; i >= 0 && acts < 2; i--) {
            const card = this.defender.hand[i];
            if (card.str > this.defender.tacticPoints) continue;
            const lane = this._bestLane(card);
            if (!lane) continue;
            for (let j = 0; j < 3; j++) {
                if (this.defender.board.isEmpty(lane, j)) {
                    this.defender.tacticPoints -= card.str;
                    this.defender.board.place(lane, j, card);
                    this.defender.hand.splice(i, 1);
                    this._onPlay(card, 'defender', lane, j);
                    this._applyLineBonus('defender', lane);
                    this.log.push({ msg: `Враг: ${card.name}`, type: 'info' });
                    acts++;
                    break;
                }
            }
        }

        // Атака
        for (const card of this.defender.board.allCards()) {
            if (card.type !== 'attack' && card.lane !== 'attack') continue;
            const targets = this._enemyTargets();
            if (targets.length === 0) break;
            const t = targets[Math.floor(Math.random() * targets.length)];
            const res = this.rules.applyAttack(card, t.card, t.lane, this.attacker.board);
            this.log.push({
                msg: `Враг: ${card.name} → ${t.card.name} (${res.dmg})`,
                type: 'dmg',
            });
        }

        // Атака по полководцу, если есть чем
        if (this.defender.board.allCards().some((c) => c.lane === 'attack')) {
            for (let i = 0; i < 3; i++) {
                const empty = !this.attacker.board.has('defense', i)
                    && !this.attacker.board.has('attack', i)
                    && !this.attacker.board.has('support', i);
                if (empty) {
                    this.attacker.lives--;
                    this.log.push({ msg: 'Враг бьёт полководца! -1 жизнь', type: 'dmg' });
                    break;
                }
            }
        }

        this._checkVictory();
        if (this.finished) return;

        this.turn = 'attacker';
        this.turnCount++;
        this._drawToHand('attacker');
        this.attacker.tacticPoints = 1 + this.attacker.board.count('support');

        if (this.turnCount > this.maxTurns) {
            this.finished = true;
            this.winner = 'draw';
            this.log.push({ msg: 'Бой затянулся — ничья', type: 'info' });
        }
    }

    _bestLane(card) {
        if (card.type === 'archer' || card.type === 'special') return 'attack';
        if (card.type === 'support') return 'support';
        return 'defense';
    }

    _enemyTargets() {
        const targets = [];
        for (let i = 0; i < 3; i++) {
            const c = this.attacker.board.get('defense', i);
            if (c) targets.push({ lane: 'defense', idx: i, card: c });
        }
        if (targets.length === 0) {
            for (const lane of ['attack', 'support']) {
                for (let i = 0; i < 3; i++) {
                    const c = this.attacker.board.get(lane, i);
                    if (c) targets.push({ lane, idx: i, card: c });
                }
            }
        }
        return targets;
    }

    // ─── События карт ───
    _onPlay(card, side, lane, index) {
        const data = this[side];
        const opp = side === 'attacker' ? this.defender : this.attacker;

        if (card.ability.includes('+1 очко тактики')) {
            data.tacticPoints += 1;
            this.log.push({ msg: `${card.name}: +1 тактика`, type: 'heal' });
        }
        if (card.ability.includes('1 урон случайной')) {
            const hit = this.rules.damageRandom(opp.board, 1);
            if (hit) this.log.push({ msg: `${card.name}: 1 урон ${hit.name}`, type: 'dmg' });
        }
        if (card.ability.includes('+1 сила союзным воинам на линии')) {
            for (const c of data.board.lines[lane]) {
                if (c && c.type === 'warrior' && c !== card) c.addBonus(1);
            }
            this.log.push({ msg: `${card.name}: +1 сила воинам`, type: 'heal' });
        }
        if (card.ability.includes('+1 сила, если линия обороны занята')) {
            if (data.board.count('defense') >= 2) {
                card.addBonus(1);
                this.log.push({ msg: `${card.name}: +1 сила`, type: 'heal' });
            }
        }
    }

    _applyLineBonus(side, lane) {
        const data = this[side];
        const bonus = this.rules.checkLineBonus(data.board, lane);
        if (!bonus) return;
        if (bonus.kind === 'life') {
            data.lives = Math.min(data.maxLives, data.lives + 1);
            this.log.push({ msg: 'Оборона: +1 жизнь', type: 'heal' });
        } else if (bonus.kind === 'tactic') {
            data.tacticPoints += 1;
            this.log.push({ msg: 'Атака: +1 тактика', type: 'heal' });
        } else {
            data.tacticPoints += 2;
            this.log.push({ msg: 'Поддержка: +2 тактики', type: 'heal' });
        }
    }

    _checkVictory() {
        if (this.attacker.lives <= 0) {
            this.finished = true;
            this.winner = 'defender';
        } else if (this.defender.lives <= 0) {
            this.finished = true;
            this.winner = 'attacker';
        }
    }
}

function laneLabel(lane) {
    return { defense: 'оборону', attack: 'атаку', support: 'поддержку' }[lane] || lane;
}