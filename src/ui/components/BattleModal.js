import { BattleCardEl } from './BattleCardEl.js';
import { BattleHand } from './BattleHand.js';
import { BattleVisualLayer } from '../../infrastructure/battle-visuals/BattleVisualLayer.js';
import { BattleBackground } from '../../infrastructure/battle-visuals/BattleBackground.js';
import { BattleResultScreen } from './BattleResultScreen.js';
import { BattlePreviewPanel } from './BattlePreviewPanel.js';
import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { GENERAL_PORTRAITS, imgUrl } from '../../config.js';

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

    // ─── Hover на карты и ячейки ───
    this.el.addEventListener('mouseover', (e) => this._onHover(e));
    this.el.addEventListener('mouseout', (e) => this._onHoverOut(e));

    this.bus.on('battle:updated', ({ battle }) => {
      this._battle = battle;
      this._render();
      if (battle.finished && !this._resultScreen) {
        this._showResult(battle);
      }
    });

    this.bus.on('battle:started', ({ battle }) => {
      this._battle = battle;
      this._autoPlayActive = false;
    
      // ─── Принудительно сносим прошлый экран результата, если он застрял ───
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
          sideToPlayer: battle.playerSide,
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

  // ─── Hover ───
  _onHover(e) {
    if (!this._previewPanel) return;
    // Наведение на карту в руке
    const handCard = e.target.closest?.('.battle-hand-card');
    if (handCard) {
      const cardId = handCard.getAttribute('data-card-id');
      const card = this._findCardInHand(cardId);
      if (card) {
        const cost = this._battle.costFor(card, this._battle.playerSide);
        this._previewPanel.showCard(card, { effectiveCost: cost });
      }
      return;
    }
    // Наведение на карту на поле
    const boardCard = e.target.closest?.('.battle-card');
    if (boardCard) {
      const cell = boardCard.closest('.cell');
      if (!cell) return;
      const side = cell.getAttribute('data-side');
      const lane = cell.getAttribute('data-lane');
      const idx = parseInt(cell.getAttribute('data-idx'), 10);
      const card = this._battle[side].board.get(lane, idx);
      if (card) {
        const cost = this._battle.costFor(card, side);
        this._previewPanel.showCard(card, { effectiveCost: cost });
      }
    }
  }

  _onHoverOut(e) {
    if (!this._previewPanel) return;
    const leftHand = e.target.closest?.('.battle-hand-card');
    const leftBoard = e.target.closest?.('.battle-card');
    if (!leftHand && !leftBoard) return;
    // Если карта выбрана — оставляем её превью
    if (this._battle?.selectedCard) {
      const card = this._battle.selectedCard;
      const cost = this._battle.costFor(card, this._battle.playerSide);
      this._previewPanel.showCard(card, { effectiveCost: cost });
    } else {
      this._previewPanel.hideCard();
    }
  }

  _findCardInHand(cardId) {
    if (!cardId || !this._battle) return null;
    return this._battle.playerData.hand.find((c) => c.id === cardId);
  }

  _onClick(e) {
    if (e.target.closest?.('.battle-result-overlay')) return;
    const action = e.target.closest?.('[data-action]')?.getAttribute('data-action');
    if (action === 'end-turn')  { this.controller.endTurn();  return; }
    if (action === 'skip-turn') { this.controller.skipTurn(); return; }
    if (action === 'retreat')   { this.controller.retreat();  return; }
    if (action === 'auto-play') { this._startAutoPlay();       return; }

    const cell = e.target.closest?.('.cell');
    if (cell) {
      const side = cell.getAttribute('data-side');
      const lane = cell.getAttribute('data-lane');
      const idx  = cell.getAttribute('data-idx');
      if (lane && idx !== null && side) {
        this._onCellClick(side, lane, parseInt(idx, 10));
      }
    }
  }

  _startAutoPlay() {
    const b = this._battle;
    if (!b || b.finished || this._autoPlayActive) return;
    this._autoPlayActive = true;
    this.bus.emit('toast:show', { text: 'Авто-бой запущен' });
    b.autoPlay(() => {
      this.bus.emit('battle:updated', { battle: b });
    }).then(() => {
      this._autoPlayActive = false;
      if (b.finished && !this._resultScreen) this._showResult(b);
    });
  }

  _showResult(b) {
    const playerWon =
      (b.playerSide === 'attacker' && b.winner === 'attacker') ||
      (b.playerSide === 'defender' && b.winner === 'defender');
    const title = b.winner === 'draw'
      ? 'Ничья'
      : playerWon ? 'Победа!' : 'Поражение';
    const cls = b.winner === 'draw' ? 'draw' : playerWon ? 'win' : 'lose';
    this._resultScreen = new BattleResultScreen(this.overlay, {
      title,
      kind: cls,
      playerSide: b.playerSide,
      attacker: b.attacker,
      defender: b.defender,
      winner: b.winner,
      onContinue: () => {
        this._resultScreen = null;
        this.controller.finish();
      },
    });
  }

  _closeResult() {
    this._resultScreen?.destroy();
    this._resultScreen = null;
  }

  _onCellClick(side, lane, index) {
    const b = this._battle;
    if (!b || b.finished) return;
    if (side !== b.playerSide) return;
    if (!b.selectedCard) {
      this.bus.emit('toast:show', { text: 'Сначала выберите карту в руке' });
      return;
    }
    const cost = b.costFor(b.selectedCard, b.playerSide);
    if (cost > b.playerData.tacticPoints) {
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
    const playerLineInfo = b.getLineBonusInfoFor(playerSide);
    const enemyLineInfo  = b.getLineBonusInfoFor(enemySide);
    const playerColInfo  = b.getColumnBonusInfoFor(playerSide);
    const enemyColInfo   = b.getColumnBonusInfoFor(enemySide);

    this.el.innerHTML = `
      <div class="battle-top">
        <div class="battle-hero enemy-hero">
          ${this._portraitHtml(enemyData.gen, 'enemy')}
          <div class="hero-name">${enemyData.gen.name}</div>
          <div class="bh-lives">${this._livesHtml(enemyData.lives, enemyData.maxLives)}</div>
        </div>
        <div class="battle-title">
          ⚔ Бой · ход ${b.turnCount}
          <div class="battle-terrain">${b.terrain.name} · ${b.terrain.getNote(playerSide)}</div>
        </div>
        <div class="battle-hero player-hero">
          ${this._portraitHtml(playerData.gen, 'player')}
          <div class="hero-name">${playerData.gen.name}</div>
          <div class="bh-lives">${this._livesHtml(playerData.lives, playerData.maxLives)}</div>
        </div>
      </div>
      <div class="battle-main">
        <div class="battle-preview-panel-root" id="battle-preview-panel-root"></div>
        <div class="battle-arena">
          <div class="battle-field battle-field-enemy">
            ${this._boardHtml(enemySide, enemyData, enemyLineInfo, enemyColInfo)}
          </div>
          <div class="battle-field battle-field-player">
            ${this._boardHtml(playerSide, playerData, playerLineInfo, playerColInfo)}
          </div>
        </div>
        <div class="battle-side-right">
          <div class="tactic-points">⚡ <span class="pt-val">${playerData.tacticPoints}</span></div>
          <div class="deck-counter">Колода: ${playerData.deck.length}</div>
          <div class="battle-hand-root" id="battle-hand-root"></div>
          <div class="battle-controls">
            <button class="btn-end-turn" data-action="end-turn" ${b.isPlayerTurn ? '' : 'disabled'}>Конец хода</button>
            <button class="btn-skip"     data-action="skip-turn" ${b.isPlayerTurn ? '' : 'disabled'}>Пропустить</button>
            <button class="btn-auto"     data-action="auto-play" ${this._autoPlayActive ? 'disabled' : ''}>⚡ Авто-бой</button>
            <button class="btn-retreat"  data-action="retreat">Отступить</button>
          </div>
          <div class="battle-log-side">
            ${this._logHtml(b.log)}
          </div>
        </div>
      </div>
    `;

    // ─── Панель-превью ───
    const previewRoot = this.el.querySelector('#battle-preview-panel-root');
    this._previewPanel = new BattlePreviewPanel(previewRoot);
    this._previewPanel.setImageLoader(this._imgLoader);
    this._previewPanel.setPseudoHand(enemyData.hand.length);

    // Если карта уже выбрана — показать её превью
    if (b.selectedCard) {
      const cost = b.costFor(b.selectedCard, b.playerSide);
      this._previewPanel.showCard(b.selectedCard, { effectiveCost: cost });
    }

    // ─── Рука ───
    const handRoot = this.el.querySelector('#battle-hand-root');
    this._hand = new BattleHand(handRoot);
    this._hand.setData(
      playerData.hand,
      playerData.tacticPoints,
      b.selectedCard,
      (card) => { this.controller.selectCard(card); },
      (card) => b.costFor(card, b.playerSide),
    );

    // ─── Визуальный слой ───
    const arena = this.el.querySelector('.battle-arena');
    if (arena) {
      if (this._visualLayer) {
        this._visualLayer.setContainer(arena);
      } else if (b) {
        this._visualLayer = new BattleVisualLayer(b, arena, {
          sideToPlayer: b.playerSide,
        });
      }
      requestAnimationFrame(() => this._visualLayer?.flush());
    }
  }

  _portraitHtml(gen, cls) {
    const idx = gen.presetIndex ?? 0;
    const url = generalPortraitUrl(gen.factionId, idx);
    const style = url ? `style="background-image:url('${url}')"` : '';
    return `<div class="hero-portrait ${cls}" data-faction="${gen.factionId}" ${style}></div>`;
  }

  _boardHtml(side, data, lineInfoForSide, colInfoForSide) {
    const b = this._battle;
    const isPlayer = side === b.playerSide;
    const rows = LANES.map((lane) => {
      const lineInfo = lineInfoForSide[lane.key];
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
        if (card) {
          const cost = b.costFor(card, side);
          inner = this._cardEl.create(card, { side, effectiveCost: cost }).outerHTML;
        }
        if (b.isPlayerTurn && b.selectedCard && isPlayer && !card) {
          cls += ' valid-place';
        }
        const colActive = colInfoForSide[i].active;
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
    const last = log.slice(-5).reverse();
    return last.map((l) => `<div class="log-entry ${l.type}">${l.msg}</div>`).join('');
  }
}