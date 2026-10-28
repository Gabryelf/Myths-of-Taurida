import { BattleBoard } from './BattleBoard.js';
import { BattleRuleEngine, LANES } from './BattleRuleEngine.js';
import { CardInstance } from './CardInstance.js';

export class Battle {
    constructor({
        attackerGen, defenderGen,
        attackerFaction, defenderFaction,
        targetTile, attackerDeck, defenderDeck,
        maxTurns = 20,
        playerSide = 'attacker',           // ← кто игрок
    }) {
        this.attackerGen = attackerGen;
        this.defenderGen = defenderGen;
        this.attackerFaction = attackerFaction;
        this.defenderFaction = defenderFaction;
        this.targetTile = targetTile;
        this.maxTurns = maxTurns;
        this.playerSide = playerSide;

        this.attacker = {
            gen: attackerGen,
            lives: attackerGen.lives,
            maxLives: attackerGen.maxLives,
            board: new BattleBoard(),
            hand: [],
            deck: attackerDeck.map((c) => new CardInstance(c)),
            tacticPoints: 2,
        };
        this.defender = {
            gen: defenderGen,
            lives: defenderGen.lives,
            maxLives: defenderGen.maxLives,
            board: new BattleBoard(),
            hand: [],
            deck: defenderDeck.map((c) => new CardInstance(c)),
            tacticPoints: 2,
        };

        this.rules = new BattleRuleEngine();
        this.turn = 'attacker';
        this.turnCount = 0;
        this.log = [];
        this.finished = false;
        this.winner = null;
        this.selectedCard = null;

        // Раздаём по 3 карты, приоритет — дешёвые (str ≤ 1, потом str ≤ 2, потом всё)
        this._drawOpeningHand('attacker', 3);
        this._drawOpeningHand('defender', 3);
    }

    get isPlayerTurn() {
        return this.turn === this.playerSide && !this.finished;
    }

    get playerData() { return this[this.playerSide]; }
    get enemyData() { return this[this.playerSide === 'attacker' ? 'defender' : 'attacker']; }
    get enemySide() { return this.playerSide === 'attacker' ? 'defender' : 'attacker'; }

    _drawOpeningHand(side, count) {
        const data = this[side];
        const cheap = data.deck.filter((c) => c.str <= 1);
        const mid = data.deck.filter((c) => c.str === 2);
        const rest = data.deck.filter((c) => c.str > 2);
        const order = [...cheap, ...mid, ...rest];
        const hand = [];
        for (let i = 0; i < count && order.length > 0; i++) {
            hand.push(order.shift());
        }
        data.deck = order;
        data.hand = hand;
    }

    _drawToHand(side) {
        const data = this[side];
        if (data.deck.length === 0) return null;
        const card = data.deck.pop();
        data.hand.push(card);
        return card;
    }

    selectCard(card) {
        if (!this.isPlayerTurn) return false;
        if (card.str > this.playerData.tacticPoints) return false;
        this.selectedCard = this.selectedCard === card ? null : card;
        return true;
    }

    playCard(card, lane, index) {
        if (!this.isPlayerTurn) return false;
        if (card.str > this.playerData.tacticPoints) return false;
        const placed = this.playerData.board.place(lane, index, card);
        if (!placed) return false;
        this.playerData.tacticPoints -= card.str;
        this.playerData.hand = this.playerData.hand.filter((c) => c.id !== card.id);
        this.selectedCard = null;
        this._onPlay(card, this.playerSide, lane, index);
        this._applyLineBonus(this.playerSide, lane);
        this.log.push({ msg: `${card.name} → ${laneLabel(lane)}`, type: 'info' });
        return true;
    }

    attack(card, lane, index) {
        if (!this.isPlayerTurn) return false;
        if (!this.rules.canTarget(card, lane)) return false;
        const target = this.enemyData.board.get(lane, index);
        if (!target) return false;
        const res = this.rules.applyAttack(card, target, lane, this.enemyData.board);
        this.log.push({ msg: `${card.name} → ${target.name}: ${res.dmg}`, type: 'dmg' });
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
        this.turn = this.enemySide;
        return true;
    }

    aiTurn() {
        if (this.turn !== this.enemySide || this.finished) return;
        const aiSide = this.enemySide;
        const aiData = this[aiSide];
        const playerData = this.playerData;

        this._drawToHand(aiSide);
        aiData.tacticPoints = 2 + aiData.board.count('support');

        // 1) Support
        this._aiPlayType(aiSide, 'support', 'support');
        // 2) Defense
        this._aiPlayType(aiSide, 'warrior', 'defense');
        // 3) Attack
        this._aiPlayType(aiSide, ['archer', 'special'], 'attack');

        // 4) Атака по целям
        for (const card of aiData.board.allCards()) {
            if (card.lane !== 'attack') continue;
            const targets = this._enemyTargets(aiSide);
            if (targets.length === 0) continue;
            targets.sort((a, b) => a.card.str - b.card.str);
            const t = targets[0];
            const res = this.rules.applyAttack(card, t.card, t.lane, playerData.board);
            this.log.push({ msg: `Враг: ${card.name} → ${t.card.name} (${res.dmg})`, type: 'dmg' });
        }

        // 5) Атака по полководцу
        if (aiData.board.allCards().some((c) => c.lane === 'attack')) {
            for (let i = 0; i < 3; i++) {
                const empty = !playerData.board.has('defense', i)
                    && !playerData.board.has('attack', i)
                    && !playerData.board.has('support', i);
                if (empty) {
                    playerData.lives--;
                    this.log.push({ msg: 'Враг бьёт полководца! -1 жизнь', type: 'dmg' });
                    break;
                }
            }
        }

        this._checkVictory();
        if (this.finished) return;

        this.turn = this.playerSide;
        this.turnCount++;
        this._drawToHand(this.playerSide);
        this.playerData.tacticPoints = 2 + this.playerData.board.count('support');

        if (this.turnCount > this.maxTurns) {
            this.finished = true;
            this.winner = 'draw';
            this.log.push({ msg: 'Бой затянулся — ничья', type: 'info' });
        }
    }

    _aiPlayType(aiSide, types, lane) {
        const d = this[aiSide];
        const typeArr = Array.isArray(types) ? types : [types];
        const card = d.hand.find((c) => typeArr.includes(c.type) && c.str <= d.tacticPoints);
        if (!card) return;
        for (let i = 0; i < 3; i++) {
            if (d.board.isEmpty(lane, i)) {
                d.tacticPoints -= card.str;
                d.board.place(lane, i, card);
                d.hand = d.hand.filter((c) => c.id !== card.id);
                this._onPlay(card, aiSide, lane, i);
                this._applyLineBonus(aiSide, lane);
                this.log.push({ msg: `Враг: ${card.name}`, type: 'info' });
                return;
            }
        }
    }

    _enemyTargets(aiSide) {
        const playerData = this[aiSide === 'attacker' ? 'defender' : 'attacker'];
        const targets = [];
        for (let i = 0; i < 3; i++) {
            const c = playerData.board.get('defense', i);
            if (c) targets.push({ lane: 'defense', idx: i, card: c });
        }
        if (targets.length === 0) {
            for (const lane of ['attack', 'support']) {
                for (let i = 0; i < 3; i++) {
                    const c = playerData.board.get(lane, i);
                    if (c) targets.push({ lane, idx: i, card: c });
                }
            }
        }
        return targets;
    }

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

    /**
   * Информация о бонусах линий — для тултипов UI.
   */
    getLineBonusInfo() {
        return {
            defense: '3 карты в линии обороны → +1 жизнь полководца',
            attack: '3 карты в линии атаки → +1 очко тактики',
            support: '3 карты в линии поддержки → +2 очка тактики',
        };
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
