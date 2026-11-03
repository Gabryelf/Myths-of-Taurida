import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

/**
 * Экран победы/поражения. Монтируется в .battle-modal-overlay,
 * чтобы пережить перерисовку арены (innerHTML = ...) в BattleModal.
 */
export class BattleResultScreen {
  constructor(parentOverlay, { title, kind, playerSide, attacker, defender, winner, onContinue }) {
    this._parent = parentOverlay;
    this._onContinue = onContinue;

    this._el = document.createElement('div');
    this._el.className = `battle-result-overlay result-${kind}`;

    const playerData = playerSide === 'attacker' ? attacker : defender;
    const enemyData  = playerSide === 'attacker' ? defender : attacker;

    const survivors = (data) => {
      const cards = [];
      for (const lane of ['defense', 'attack', 'support']) {
        for (let i = 0; i < 3; i++) {
          const c = data.board.get(lane, i);
          if (c) cards.push({ card: c, lane, index: i, alive: c.str > 0 });
        }
      }
      return cards;
    };

    const playerSurvivors = survivors(playerData);
    const enemySurvivors  = survivors(enemyData);

    this._el.innerHTML = `
      <div class="battle-result-panel">
        <h2 class="br-title">${title}</h2>
        <div class="br-subtitle">
          ${playerData.gen.name} vs ${enemyData.gen.name}
        </div>
        <div class="br-section">
          <div class="br-section-title">Ваши выжившие (${playerSurvivors.filter(x => x.alive).length})</div>
          <div class="br-grid">${this._cardsHtml(playerSurvivors)}</div>
        </div>
        <div class="br-section">
          <div class="br-section-title">Выжившие врага (${enemySurvivors.filter(x => x.alive).length})</div>
          <div class="br-grid">${this._cardsHtml(enemySurvivors)}</div>
        </div>
        <button class="br-continue" data-result-continue="1">Продолжить</button>
      </div>
    `;

    this._el.addEventListener('click', (e) => {
      if (e.target.closest?.('[data-result-continue]')) {
        this._onContinue?.();
      }
    });

    parentOverlay.appendChild(this._el);
  }

  _cardsHtml(list) {
    if (list.length === 0) return '<div class="br-empty">Пусто</div>';
    const loader = new CardImageLoader();
    return list.map(({ card, alive }) => {
      const url = loader.getUrl(card.imageKey);
      const bg = url ? `background-image:url("${url}")` : '';
      return `
        <div class="br-card ${alive ? 'alive' : 'dead'}" title="${card.name}">
          <div class="br-card-art" style="${bg}"></div>
          <div class="br-card-count">${card.str}</div>
          <div class="br-card-name">${card.name}</div>
        </div>
      `;
    }).join('');
  }

  destroy() {
    this._el.remove();
    this._el = null;
  }
}