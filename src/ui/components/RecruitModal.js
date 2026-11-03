import { CardFactory } from '../../domain/card/CardFactory.js';
import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

/**
 * Модалка найма карт. Открывается из HUD по кнопке «Найм», если выбранный
 * полководец стоит в своём городе/деревне.
 */
export class RecruitModal {
  constructor(root, { bus }) {
    this.bus = bus;
    this.overlay = document.createElement('div');
    this.overlay.className = 'recruit-modal-overlay';
    root.appendChild(this.overlay);
    this.el = document.createElement('div');
    this.el.className = 'recruit-modal';
    this.overlay.appendChild(this.el);
    this._imgLoader = new CardImageLoader();
    this._world = null;
    this._general = null;
    this._factionId = null;

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    this.el.addEventListener('click', (e) => {
      const close = e.target.getAttribute?.('data-close');
      if (close !== null) { this.hide(); return; }
      const key = e.target.closest?.('[data-recruit]')?.getAttribute('data-recruit');
      if (key) this._tryRecruit(key);
    });
  }

  open({ factionId, general, world }) {
    this._factionId = factionId;
    this._general = general;
    this._world = world;
    this.overlay.classList.add('visible');
    this._render();
  }

  hide() {
    this.overlay.classList.remove('visible');
    this._general = null;
  }

  _tryRecruit(cardKey) {
    if (!this._general || !this._world) return;
    const result = this._world.recruit.recruit({
      factionId: this._factionId,
      cardKey,
      generalId: this._general.id,
    });
    if (!result.ok) {
      this.bus.emit('toast:show', { text: result.reason });
      return;
    }
    this.bus.emit('resources:changed', { factionId: this._factionId });
    this.bus.emit('deck:changed', { general: this._general });
    this.bus.emit('toast:show', { text: `${result.card.name} нанят` });
    this._render();
  }

  _render() {
    const world = this._world;
    const gen = this._general;
    const factionId = this._factionId;
    if (!world || !gen) return;

    const used = world.recruitPointsUsed(factionId);
    const total = world.economy.recruitPointsForFaction(world, factionId);
    const pool = world.resourcePools.get(factionId);
    const keys = CardFactory.keysForFaction(factionId);

    const cards = keys.map((key) => {
      const def = CardFactory.defForKey(key);
      const card = CardFactory.create(key);
      const cost = world.economy.recruitCost(card);
      const pts = world.economy.recruitPointsFor(card);
      const url = this._imgLoader.getUrl(key);
      const bg = url ? `background-image:url("${url}");` : '';
      const canAfford = pool.canAfford(cost);
      const canPoints = used + pts <= total;
      const disabled = !canAfford || !canPoints;
      return `
        <div class="rm-card type-${card.type} ${disabled ? 'disabled' : ''}"
             ${disabled ? '' : `data-recruit="${key}"`}>
          <div class="rm-art" style="${bg}">
            <div class="rm-rarity rm-rarity-${card.rarity}">${card.rarity}</div>
            <div class="rm-type-stripe"></div>
            <div class="rm-count">${card.str}</div>
          </div>
          <div class="rm-name-top">${def.name}</div>
          <div class="rm-cost-bottom">⚔${cost.weapons} 💰${cost.gold} · ${pts} очк.</div>
        </div>
      `;
    }).join('');

    this.el.innerHTML = `
      <h2>Найм карт · ${gen.name}</h2>
      <div class="rm-subtitle">
        Очки найма: ${used}/${total} · 💰${pool.gold} · ⚔${pool.weapons}
      </div>
      <div class="rm-grid">${cards}</div>
      <button class="rm-close" data-close="1">Закрыть</button>
    `;
  }
}