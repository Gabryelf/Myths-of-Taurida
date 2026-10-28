import { BattleCardEl } from './BattleCardEl.js';
import { BattleHand } from './BattleHand.js';

const LANES = [
  { key: 'defense', icon: '🛡', label: 'Оборона' },
  { key: 'attack',  icon: '⚔', label: 'Атака' },
  { key: 'support', icon: '✨', label: 'Поддержка' },
];

export class BattleModal {
  constructor(root, { controller, bus }) {
    this.controller = controller;
    this.bus = bus;
    this._cardEl = new BattleCardEl();
    this._battle = null;
    this._finishScheduled = false;

    this.overlay = document.createElement('div');
    this.overlay.className = 'battle-modal-overlay';
    root.appendChild(this.overlay);

    this.el = document.createElement('div');
    this.el.className = 'battle-modal';
    this.overlay.appendChild(this.el);

    this.el.addEventListener('click', (e) => this._onClick(e));

    this.bus.on('battle:updated', ({ battle }) => {
      this._battle = battle;
      this._render();
      if (battle.finished && !this._finishScheduled) {
        this._finishScheduled = true;
        setTimeout(() => {
          this._finishScheduled = false;
          this.controller.finish();
        }, 800);
      }
    });

    this.bus.on('battle:started', ({ battle }) => {
      this._battle = battle;
      this._finishScheduled = false;
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
    if (action === 'retreat')  { this.controller.retreat();  return; }

    const lane = e.target.getAttribute?.('data-lane');
    const idx  = e.target.getAttribute?.('data-idx');
    const side = e.target.getAttribute?.('data-side');
    if (lane && idx !== null && side) {
      this._onCellClick(side, lane, parseInt(idx, 10));
    }
  }

  _onCellClick(side, lane, index) {
    const b = this._battle;
    if (!b || b.finished) return;
    const playerSide = b.playerSide;
    const enemySide = playerSide === 'attacker' ? 'defender' : 'attacker';

    if (side === playerSide && b.selectedCard) {
      this.controller.playCard(b.selectedCard, lane, index);
    } else if (side === enemySide && b.selectedCard) {
      this.controller.attack(lane, index);
    }
  }

  _render() {
    const b = this._battle;
    if (!b) return;

    const playerSide = b.playerSide;
    const enemySide = playerSide === 'attacker' ? 'defender' : 'attacker';
    const playerData = b[playerSide];
    const enemyData  = b[enemySide];

    const bonusInfo = b.getLineBonusInfo();

    this.el.innerHTML = `
      <div class="battle-header">
        <div class="bh-side blue">
          <span class="bh-name">${playerData.gen.name}</span>
          <div class="bh-lives">${this._livesHtml(playerData.lives, playerData.maxLives)}</div>
        </div>
        <div class="battle-title">⚔ Бой</div>
        <div class="bh-side red">
          <div class="bh-lives">${this._livesHtml(enemyData.lives, enemyData.maxLives)}</div>
          <span class="bh-name">${enemyData.gen.name}</span>
        </div>
      </div>

      <div class="battle-arena">
        <div class="battle-field battle-field-enemy">
          ${this._boardHtml(enemySide, enemyData, bonusInfo)}
        </div>
        <div class="battle-field battle-field-player">
          ${this._boardHtml(playerSide, playerData, bonusInfo)}
        </div>
      </div>

      <div class="battle-bottom">
        <div class="battle-log-side" id="bh-log">${this._logHtml(b.log)}</div>
        <div class="battle-side-controls">
          <div class="tactic-points">⚡ <span class="pt-val">${playerData.tacticPoints}</span></div>
          <button class="btn-end-turn" data-action="end-turn" ${b.isPlayerTurn ? '' : 'disabled'}>Конец хода</button>
          <button class="btn-retreat" data-action="retreat">Отступить</button>
        </div>
        <div class="battle-hand-root" id="battle-hand-root"></div>
      </div>
    `;

    const handRoot = this.el.querySelector('#battle-hand-root');
    const hand = new BattleHand(handRoot);
    hand.setData(
      playerData.hand,
      playerData.tacticPoints,
      b.selectedCard,
      (card) => this.controller.selectCard(card),
    );
  }

  _boardHtml(side, data, bonusInfo) {
    const b = this._battle;
    const isPlayer = side === b.playerSide;

    // Иконки линий слева, сетка 3×3 справа
    const rows = LANES.map((lane) => {
      const lineIcon = `
        <div class="lane-icon" title="${bonusInfo[lane.key]}" data-lane-icon="1">
          <span>${lane.icon}</span>
          <div class="lane-icon-tip">${bonusInfo[lane.key]}</div>
        </div>
      `;
      const cells = [0, 1, 2].map((i) => {
        const card = data.board.get(lane.key, i);
        let cls = 'cell';
        let inner = '';
        if (card) inner = this._cardEl.create(card, { side }).outerHTML;
        if (b.isPlayerTurn && b.selectedCard) {
          if (isPlayer && !card) cls += ' valid-place';
          if (!isPlayer && card && canTarget(b.selectedCard, lane.key)) cls += ' valid-target';
        }
        return `<div class="${cls}" data-side="${side}" data-lane="${lane.key}" data-idx="${i}">${inner}</div>`;
      }).join('');
      return `<div class="battle-row">${lineIcon}${cells}</div>`;
    }).join('');

    return `<div class="battle-side ${isPlayer ? 'side-player' : 'side-enemy'}">${rows}</div>`;
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
}

function canTarget(card, lane) {
  if (card.type === 'archer' || card.type === 'special') return true;
  return lane === 'defense';
}