import { BattleCardEl } from './BattleCardEl.js';
import { BattleHand } from './BattleHand.js';
import { Theme } from '../../infrastructure/config/ThemeConfig.js';

const LANES = [
    { key: 'defense', label: 'Оборона', sub: 'ближний бой' },
    { key: 'attack', label: 'Атака', sub: 'дальний бой' },
    { key: 'support', label: 'Поддержка', sub: 'тактика' },
];

export class BattleModal {
    constructor(root, { controller, bus }) {
        this.controller = controller;
        this.bus = bus;
        this._cardEl = new BattleCardEl({ side: 'attacker' });
        this._battle = null;

        this.overlay = document.createElement('div');
        this.overlay.className = 'battle-modal-overlay';
        root.appendChild(this.overlay);

        this.el = document.createElement('div');
        this.el.className = 'battle-modal';
        this.overlay.appendChild(this.el);

        this.hand = new BattleHand(this.el);

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) { /* не закрываем — бой нельзя прервать кликом */ }
        });
        this.el.addEventListener('click', (e) => this._onClick(e));

        this.bus.on('battle:updated', ({ battle }) => {
            this._battle = battle;
            this._render();
            if (battle.finished) {
                setTimeout(() => this.controller.finish(), 800);
            }
        });
        this.bus.on('battle:started', ({ battle }) => {
            this._battle = battle;
            this.overlay.classList.add('visible');
            this._render();
        });
        this.bus.on('battle:finished', () => {
            this.overlay.classList.remove('visible');
            this._battle = null;
        });
    }

    _onClick(e) {
        const action = e.target.getAttribute?.('data-action');
        if (action === 'end-turn') { this.controller.endTurn(); return; }
        if (action === 'retreat') { this.controller.retreat(); return; }
        const lane = e.target.getAttribute?.('data-lane');
        const idx = e.target.getAttribute?.('data-idx');
        const side = e.target.getAttribute?.('data-side');
        if (lane && idx !== null && side) {
            this._onCellClick(side, lane, parseInt(idx, 10));
        }
    }

    _onCellClick(side, lane, index) {
        const b = this._battle;
        if (!b || b.finished) return;
        if (side === 'attacker' && b.selectedCard) {
            this.controller.playCard(b.selectedCard, lane, index);
        } else if (side === 'defender' && b.selectedCard) {
            this.controller.attack(lane, index);
        }
    }

    _render() {
        const b = this._battle;
        if (!b) return;

        this.el.innerHTML = `
      <div class="battle-header">
        <div class="bh-side blue">
          <span>${b.attackerGen.name}</span>
          <div class="bh-lives">${this._livesHtml(b.attacker.lives, b.attacker.maxLives)}</div>
        </div>
        <div class="bh-log" id="bh-log">${this._logHtml(b.log)}</div>
        <div class="bh-side red">
          <div class="bh-lives">${this._livesHtml(b.defender.lives, b.defender.maxLives)}</div>
          <span>${b.defenderGen.name}</span>
        </div>
      </div>

      <div class="battle-arena">
        ${this._boardHtml('defender', b.defender)}
        <div class="battle-divider">⚔</div>
        ${this._boardHtml('attacker', b.attacker)}
      </div>

      <div class="battle-controls">
        <div class="tactic-points">⚡ Тактика <span class="pt-val">${b.attacker.tacticPoints}</span></div>
        <button class="btn-end-turn" data-action="end-turn" ${b.isPlayerTurn ? '' : 'disabled'}>Завершить ход</button>
        <button class="btn-retreat" data-action="retreat">Отступить</button>
      </div>
    `;

        // Рука — отдельный класс
        const handRoot = document.createElement('div');
        handRoot.className = 'battle-hand-root';
        this.el.appendChild(handRoot);
        this.hand.root = handRoot;
        this.hand.el = this.hand.el || document.createElement('div');

        // Пересоздаём BattleHand в новом root
        this.hand.el.remove?.();
        this.hand = new BattleHand(handRoot);
        this.hand.setData(
            b.attacker.hand,
            b.attacker.tacticPoints,
            b.selectedCard,
            (card) => this.controller.selectCard(card),
        );
    }

    _livesHtml(lives, max) {
        return Array.from({ length: max }, (_, i) =>
            `<span class="life-dot ${i >= lives ? 'lost' : ''}"></span>`
        ).join('');
    }

    _logHtml(log) {
        const last = log.slice(-4).reverse();
        return last.map((l) => `<div class="log-entry ${l.type}">${l.msg}</div>`).join('');
    }

    _boardHtml(side, data) {
        const b = this._battle;
        const isAttacker = side === 'attacker';
        const rows = LANES.map((lane) => {
            const label = `<div class="lane-label">${lane.label}<small>${lane.sub}</small></div>`;
            const cells = [0, 1, 2].map((i) => {
                const card = data.board.get(lane.key, i);
                let cls = 'cell';
                let inner = '';

                if (card) {
                    inner = this._cardEl.create(card).outerHTML;
                }

                // Подсветка
                if (b.isPlayerTurn && b.selectedCard) {
                    if (isAttacker && !card) cls += ' valid-place';
                    if (!isAttacker && card && canTarget(b.selectedCard, lane.key)) {
                        cls += ' valid-target';
                    }
                }

                return `<div class="${cls}" data-side="${side}" data-lane="${lane.key}" data-idx="${i}">${inner}</div>`;
            }).join('');
            return `<div class="battle-row">${label}${cells}</div>`;
        }).join('');

        return `<div class="battle-side ${isAttacker ? 'side-attacker' : 'side-defender'}">${rows}</div>`;
    }
}

function canTarget(card, lane) {
    if (card.type === 'archer' || card.type === 'special') return true;
    return lane === 'defense';
}