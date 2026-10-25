import { Hex } from '../hex/Hex.js';

/**
 * Полководец. Чистые данные + минимальное поведение.
 * Хранит свою позицию как Hex, а не как Tile — чтобы не зависеть от карты.
 */
export class General {
    constructor({
        id,
        name,
        factionId,
        hex,
        lives = 3,
        maxLives = 3,
        movePoints = 3,
        maxMovePoints = 3,
    }) {
        this.id = id;
        this.name = name;
        this.factionId = factionId;
        this.hex = hex instanceof Hex ? hex : new Hex(hex.q, hex.r);
        this.lives = lives;
        this.maxLives = maxLives;
        this.movePoints = movePoints;
        this.maxMovePoints = maxMovePoints;
        this.deck = [];
    }

    get alive() { return this.lives > 0; }
    get key() { return this.hex.key; }

    canAfford(cost) { return this.movePoints >= cost; }

    spendMove(cost) {
        this.movePoints = Math.max(0, this.movePoints - cost);
        return this.movePoints;
    }

    resetTurn() { this.movePoints = this.maxMovePoints; }

    moveTo(hex) {
        this.hex = hex;
    }
}