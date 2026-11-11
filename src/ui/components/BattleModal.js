import { BattleCardEl } from './BattleCardEl.js';
import { BattleHand } from './BattleHand.js';
import { BattleVisualLayer } from '../../infrastructure/battle-visuals/BattleVisualLayer.js';
import { BattleBackground } from '../../infrastructure/battle-visuals/BattleBackground.js';
import { BattleResultScreen } from './BattleResultScreen.js';
import { BattlePreviewPanel } from './BattlePreviewPanel.js';
import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { generalPortraitUrl, imgUrl } from '../../config.js';

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
    this._hand = null;
    this._visualLayer = null;
    this._background = null;
    this._autoPlayActive = false;
    this._resultScreen = null;
    this._previewPanel = null;
    this._imgLoader = new CardImageLoader();

    this.overlay = document.createElement('div');
    this.overlay.className = 'battle-modal-overlay';
    root.appendChild(this.overlay);
    this.el = document.createElement('div');
    this.el.className = 'battle-modal';
    this.overlay.appendChild(this.el);
    this.el.addEventListener('click', (e) => this._onClick(e));
    this.el.addEventListener('mouseover', (e) => this._onHover(e));
    this.el.addEventListener('mouseout', (e) => this._onHoverOut(e));

    this.bus.on('battle:updated', ({ battle }) => {
      this._battle = battle;
      this._render();
      if (battle.finished && !this._resultScreen) this._showResult(battle);
    });

    this.bus.on('battle:started', ({ battle }) => {
      this._battle = battle;
      this._autoPlayActive = false;
      this._closeResult();
      this.overlay.querySelectorAll('.battle-result-overlay').forEach((e) => e.remove());
      this._background?.destroy();
      this._background = new BattleBackground(this.overlay, battle.targetTile?.terrain || 'plain');
      this.overlay.classList.add('visible');
      this._render();
      const arena = this.el.querySelector('.battle-arena');
      if (arena) {
        this._visualLayer?.dispose();
        this._visualLayer = new BattleVisualLayer(battle, arena, {
          sideToPlayer: this.controller.activeSide || battle.currentHumanSide || 'attacker',
        });
      }
    });

    this.bus.on('battle:finished', () => {
      this._closeResult();
      this.overlay.classList.remove('visible');
      this._visualLayer?.dispose();
      this._visualLayer = null;
      this._background?.destroy();
      this._background = null;
      this._battle = null;
      this._hand = null;
      this._autoPlayActive = false;
      this._resultScreen = null;
      this._previewPanel = null;
    });
  }

  /** Текущая «человеческая» сторона. */
  _currentSide() {
    const c = this.controller;
    if (c.activeSide) return c.activeSide;
    if (this._battle?.currentHumanSide) return this._battle.currentHumanSide;
    return this._battle?.turn || 'attacker';
  }

  _isHumanSide(side) {
    const hs = this.controller.humanSides;
    return !!(hs && hs[side]);
  }

  _onHover(e) {
    if (!this._previewPanel || !this._battle) return;
    const side = this._currentSide();
    const handCard = e.target.closest?.('.battle-hand-card');
    if (handCard) {
      const cardId = handCard.getAttribute('data-card-id');
      const card = this._battle[side].hand.find((c) => c.id === cardId);
      if (card) {
        const cost = this._battle.costFor(card, side);
        this._previewPanel.showCard(card, { effectiveCost: cost });
      }
      return;
    }
    const boardCard = e.target.closest?.('.battle-card');
    if (boardCard) {
      const cell = boardCard.closest('.cell');
      if (!cell) return;
      const s = cell.getAttribute('data-side');
      const lane = cell.getAttribute('data-lane');
      const idx = parseInt(cell.getAttribute('data-idx'), 10);
      const card = this._battle[s].board.get(lane, idx);
      if (card) {
        const cost = this._battle.costFor(card, s);
        this._previewPanel.showCard(card, { effectiveCost: cost });
      }
    }
  }

  _onHoverOut(e) {
    if (!this._previewPanel || !this._battle) return;
    const leftHand = e.target.closest?.('.battle-hand-card');
    const leftBoard = e.target.closest?.('.battle-card');
    if (!leftHand && !leftBoard) return;
    const side = this._currentSide();
    if (this._battle.selectedCard && this._isHumanSide(side)) {
      const card = this._battle.selectedCard;
      const cost = this._battle.costFor(card, side);
      this._previewPanel.showCard(card, { effectiveCost: cost });
    } else {
      this._previewPanel.hideCard();
    }
  }

  _onClick(e) {
    if (e.target.closest?.('.battle-result-overlay')) return;
    const side = this._currentSide();
    const isHuman = this._isHumanSide(side);
    const action = e.target.closest?.('[data-action]')?.getAttribute('data-action');
    if (action === 'end-turn')  { if (isHuman) this.controller.endTurn(); return; }
    if (action === 'skip-turn') { if (isHuman) this.controller.skipTurn(); return; }
    if (action === 'retreat')   { if (isHuman) this.controller.retreat(); return; }
    if (action === 'auto-play') { this._startAutoPlay(); return; }
    const cell = e.target.closest?.('.cell');
    if (cell) {
      const s = cell.getAttribute('data-side');
      const lane = cell.getAttribute('data-lane');
      const idx = cell.getAttribute('data-idx');
      if (lane && idx !== null && s) this._onCellClick(s, lane, parseInt(idx, 10));
    }
  }

  _startAutoPlay() {
    const b = this._battle;
    if (!b || b.finished || this._autoPlayActive) return;
    this._autoPlayActive = true;
    this.bus.emit('toast:show', { text: 'Авто-бой запущен' });
    b.autoPlay(() => this.bus.emit('battle:updated', { battle: b }))
      .then(() => {
        this._autoPlayActive = false;
        if (b.finished && !this._resultScreen) this._showResult(b);
      });
  }

  _showResult(b) {
    const side = this._currentSide();
    const playerWon =
      (side === 'attacker' && b.winner === 'attacker') ||
      (side === 'defender' && b.winner === 'defender');
    const title = b.winner === 'draw' ? 'Ничья' : playerWon ? 'Победа!' : 'Поражение';
    const cls = b.winner === 'draw' ? 'draw' : playerWon ? 'win' : 'lose';
    this._resultScreen = new BattleResultScreen(this.overlay, {
      title, kind: cls, playerSide: side,
      attacker: b.attacker, defender: b.defender, winner: b.winner,
      onContinue: () => {
        this._resultScreen = null;
        this.controller.finish();
      },
    });
  }

  _closeResult() { this._resultScreen?.destroy(); this._resultScreen = null; }

  _onCellClick(side, lane, index) {
    const b = this._battle;
    if (!b || b.finished) return;
    if (side !== this._currentSide()) return;
    if (!this._isHumanSide(side)) return;
    if (!b.selectedCard) {
      this.bus.emit('toast:show', { text: 'Сначала выберите карту в руке' });
      return;
    }
    const cost = b.costFor(b.selectedCard, side);
    if (cost > b[side].tacticPoints) {
      this.bus.emit('toast:show', { text: 'Недостаточно тактики' });
      return;
    }
    this.controller.playCard(b.selectedCard, lane, index);
  }

  _render() {
    const b = this._battle;
    if (!b) return;
    const side = this._currentSide();
    const isHuman = this._isHumanSide(side);
    const enemySide = side === 'attacker' ? 'defender' : 'attacker';
    const data = b[side];
    const enemyData = b[enemySide];
    const lineInfo = b.getLineBonusInfoFor(side);
    const enemyLineInfo = b.getLineBonusInfoFor(enemySide);
    const colInfo = b.getColumnBonusInfoFor(side);
    const enemyColInfo = b.getColumnBonusInfoFor(enemySide);

    this.el.innerHTML = `
      <div class="battle-top">
        <div class="battle-hero enemy-hero">
          ${this._portraitHtml(enemyData.gen, 'enemy')}
          <div class="hero-name">${enemyData.gen.name}</div>
          <div class="bh-lives">${this._livesHtml(enemyData.lives, enemyData.maxLives)}</div>
        </div>
        <div class="battle-title">
          ⚔ Бой · ход ${b.turnCount}
          <div class="battle-terrain">${b.terrain.name} · ${b.terrain.getNote(side)}</div>
        </div>
        <div class="battle-hero player-hero">
          ${this._portraitHtml(data.gen, 'player')}
          <div class="hero-name">${data.gen.name}</div>
          <div class="bh-lives">${this._livesHtml(data.lives, data.maxLives)}</div>
        </div>
      </div>
      <div class="battle-main">
        <div class="battle-preview-panel-root" id="battle-preview-panel-root"></div>
        <div class="battle-arena">
          <div class="battle-field battle-field-enemy">
            ${this._boardHtml(enemySide, enemyData, enemyLineInfo, enemyColInfo)}
          </div>
          <div class="battle-field battle-field-player">
            ${this._boardHtml(side, data, lineInfo, colInfo)}
          </div>
        </div>
        <div class="battle-side-right">
          <div class="tactic-points">⚡ <span class="pt-val">${data.tacticPoints}</span></div>
          <div class="deck-counter">Колода: ${data.deck.length}</div>
          <div class="battle-hand-root" id="battle-hand-root"></div>
          <div class="battle-controls">
            <button class="btn-end-turn" data-action="end-turn" ${isHuman ? '' : 'disabled'}>Конец хода</button>
            <button class="btn-skip"     data-action="skip-turn" ${isHuman ? '' : 'disabled'}>Пропустить</button>
            <button class="btn-auto"     data-action="auto-play" ${this._autoPlayActive ? 'disabled' : ''}>⚡ Авто-бой</button>
            <button class="btn-retreat"  data-action="retreat" ${isHuman ? '' : 'disabled'}>Отступить</button>
          </div>
          <div class="battle-log-side">${this._logHtml(b.log)}</div>
        </div>
      </div>
    `;

    const previewRoot = this.el.querySelector('#battle-preview-panel-root');
    this._previewPanel = new BattlePreviewPanel(previewRoot);
    this._previewPanel.setImageLoader(this._imgLoader);
    this._previewPanel.setPseudoHand(enemyData.hand.length);
    if (b.selectedCard && isHuman) {
      const cost = b.costFor(b.selectedCard, side);
      this._previewPanel.showCard(b.selectedCard, { effectiveCost: cost });
    }

    const handRoot = this.el.querySelector('#battle-hand-root');
    this._hand = new BattleHand(handRoot);
    this._hand.setData(
      isHuman ? data.hand : [],
      data.tacticPoints,
      b.selectedCard,
      (card) => this.controller.selectCard(card),
      (card) => b.costFor(card, side),
    );
    if (!isHuman) {
      handRoot.innerHTML = `<div class="bh-empty">Ход противника…</div>`;
    }

    const arena = this.el.querySelector('.battle-arena');
    if (arena) {
      if (this._visualLayer) {
        this._visualLayer.setContainer(arena);
        this._visualLayer.sideToPlayer = side;
      } else if (b) {
        this._visualLayer = new BattleVisualLayer(b, arena, { sideToPlayer: side });
      }
      requestAnimationFrame(() => this._visualLayer?.flush());
    }
  }

  _portraitHtml(gen, cls) {
    const url = gen.portraitUrl
      ? (gen.portraitUrl.startsWith('/') ? gen.portraitUrl : imgUrl(gen.portraitUrl))
      : generalPortraitUrl(gen.factionId, gen.presetIndex ?? 0);
    const style = url ? `style="background-image:url('${url}')"` : '';
    return `<div class="hero-portrait ${cls}" data-faction="${gen.factionId}" ${style}></div>`;
  }

  _boardHtml(side, data, lineInfoForSide, colInfoForSide) {
    const b = this._battle;
    const isPlayerSide = side === this._currentSide();
    const humanSide = this._isHumanSide(side);
    const rows = LANES.map((lane) => {
      const lineInfo = lineInfoForSide[lane.key];
      const lineActive = lineInfo.active;
      const lineIcon = `
        <div class="lane-icon ${lineActive ? 'active' : ''}" data-lane-icon="1">
          <span>${lane.icon}</span>
          <div class="lane-icon-tip">
            <b>${lane.label}${lineActive ? ' ✔' : ''}</b><br>${lineInfo.desc}
          </div>
        </div>
      `;
      const cells = [0, 1, 2].map((i) => {
        const card = data.board.get(lane.key, i);
        let cls = 'cell';
        let inner = '';
        if (card) {
          const cost = b.costFor(card, side);
          inner = this._cardEl.create(card, { side, effectiveCost: cost }).outerHTML;
        }
        if (isPlayerSide && humanSide && b.selectedCard && !card) cls += ' valid-place';
        if (colInfoForSide[i].active) cls += ' col-active';
        return `<div class="${cls}" data-side="${side}" data-lane="${lane.key}" data-idx="${i}">${inner}</div>`;
      }).join('');
      return `<div class="battle-row">${lineIcon}${cells}</div>`;
    }).join('');
    return `<div class="battle-side ${isPlayerSide ? 'side-player' : 'side-enemy'}">${rows}</div>`;
  }

  _livesHtml(lives, max) {
    return Array.from({ length: max }, (_, i) =>
      `<span class="life-dot ${i >= lives ? 'lost' : ''}"></span>`
    ).join('');
  }

  _logHtml(log) {
    const last = log.slice(-5).reverse();
    return last.map((l) => `<div class="log-entry ${l.type}">${l.msg}</div>`).join('');
  }
}