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
    this._hand = null;

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
        }, 900);
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
      this._hand = null;
    });
  }

  _onClick(e) {
    const action = e.target.getAttribute?.('data-action');
    if (action === 'end-turn')  { this.controller.endTurn();  return; }
    if (action === 'skip-turn') { this.controller.skipTurn(); return; }
    if (action === 'retreat')   { this.controller.retreat();  return; }
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
    if (side !== b.playerSide) return;
    if (!b.selectedCard) {
      this.bus.emit('toast:show', { text: 'Сначала выберите карту в руке' });
      return;
    }
    if (b.selectedCard.str > b.playerData.tacticPoints) {
      this.bus.emit('toast:show', { text: 'Недостаточно тактики' });
      return;
    }
    this.controller.playCard(b.selectedCard, lane, index);
  }

  _render() {
    const b = this._battle;
    if (!b) return;

    const playerSide = b.playerSide;
    const enemySide = playerSide === 'attacker' ? 'defender' : 'attacker';
    const playerData = b[playerSide];
    const enemyData  = b[enemySide];
    const laneInfo = b.getLineBonusInfo();
    const colInfo  = b.getColumnBonusInfo();

    // Сохраняем handRoot до перезаписи innerHTML
    this.el.innerHTML = `
      <div class="battle-top">
        <div class="battle-hero enemy-hero">
          <div class="hero-portrait enemy">${enemyData.gen.name.slice(0, 2)}</div>
          <div class="hero-name">${enemyData.gen.name}</div>
          <div class="bh-lives">${this._livesHtml(enemyData.lives, enemyData.maxLives)}</div>
        </div>
        <div class="battle-title">⚔ Бой · ход ${b.turnCount}</div>
        <div class="battle-hero player-hero">
          <div class="hero-portrait player">${playerData.gen.name.slice(0, 2)}</div>
          <div class="hero-name">${playerData.gen.name}</div>
          <div class="bh-lives">${this._livesHtml(playerData.lives, playerData.maxLives)}</div>
        </div>
      </div>
      <div class="battle-main">
        <div class="pseudo-hand enemy">
          ${this._pseudoHandHtml(enemyData, 'enemy')}
        </div>
        <div class="battle-arena">
          <div class="battle-field battle-field-enemy">
            ${this._boardHtml(enemySide, enemyData, laneInfo, colInfo)}
          </div>
          <div class="battle-field battle-field-player">
            ${this._boardHtml(playerSide, playerData, laneInfo, colInfo)}
          </div>
        </div>
        <div class="battle-side-right">
          <div class="tactic-points">⚡ <span class="pt-val">${playerData.tacticPoints}</span></div>
          <div class="deck-counter">Колода: ${playerData.deck.length}</div>
          <div class="battle-hand-root" id="battle-hand-root"></div>
          <div class="battle-controls">
            <button class="btn-end-turn" data-action="end-turn" ${b.isPlayerTurn ? '' : 'disabled'}>Конец хода</button>
            <button class="btn-skip"     data-action="skip-turn" ${b.isPlayerTurn ? '' : 'disabled'}>Пропустить</button>
            <button class="btn-retreat"  data-action="retreat">Отступить</button>
          </div>
        </div>
      </div>
      <div class="battle-log-bar">
        ${this._logHtml(b.log)}
      </div>
    `;

    // Пересоздаём руку — но всегда в новый контейнер
    const handRoot = this.el.querySelector('#battle-hand-root');
    this._hand = new BattleHand(handRoot);
    this._hand.setData(
      playerData.hand,
      playerData.tacticPoints,
      b.selectedCard,
      (card) => {
        this.controller.selectCard(card);
      },
    );
  }

  _pseudoHandHtml(enemyData, side) {
    const count = Math.max(0, enemyData.hand.length);
    let html = '<div class="pseudo-hand-label">Рука врага</div><div class="pseudo-hand-cards">';
    for (let i = 0; i < count; i++) html += `<div class="pseudo-card"></div>`;
    html += '</div>';
    return html;
  }

  _boardHtml(side, data, laneInfo, colInfo) {
    const b = this._battle;
    const isPlayer = side === b.playerSide;

    const rows = LANES.map((lane) => {
      const lineInfo = laneInfo[lane.key];
      const lineActive = lineInfo.active;
      const lineIcon = `
        <div class="lane-icon ${lineActive ? 'active' : ''}" data-lane-icon="1">
          <span>${lane.icon}</span>
          <div class="lane-icon-tip">
            <b>${lane.label}${lineActive ? ' ✔' : ''}</b><br>
            ${lineInfo.desc}
          </div>
        </div>
      `;
      const cells = [0, 1, 2].map((i) => {
        const card = data.board.get(lane.key, i);
        let cls = 'cell';
        let inner = '';
        if (card) inner = this._cardEl.create(card, { side }).outerHTML;
        if (b.isPlayerTurn && b.selectedCard && isPlayer && !card) {
          cls += ' valid-place';
        }
        const colActive = colInfo[i].active;
        const colHint = colActive ? 'col-active' : '';
        return `<div class="${cls} ${colHint}" data-side="${side}" data-lane="${lane.key}" data-idx="${i}">${inner}</div>`;
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
    const last = log.slice(-3).reverse();
    return last.map((l) => `<div class="log-entry ${l.type}">${l.msg}</div>`).join('');
  }
}