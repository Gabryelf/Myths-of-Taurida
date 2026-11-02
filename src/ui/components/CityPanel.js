import { CardFactory } from '../../domain/card/CardFactory.js';
import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

/**
 * Модалка города/деревни. Показывает найм карт и кнопку найма полководца.
 */
export class CityPanel {
  constructor(root, { bus }) {
    this.bus = bus;
    this.el = document.createElement('div');
    this.el.className = 'city-panel-overlay';
    this.el.innerHTML = `<div class="city-panel"></div>`;
    root.appendChild(this.el);
    this._imgLoader = new CardImageLoader();
    this._city = null;
    this._tile = null;
    this._world = null;
    this._general = null;

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
      const action = e.target.getAttribute?.('data-action');
      if (action === 'recruit-card') {
        const key = e.target.getAttribute('data-key');
        this._tryRecruit(key);
      }
      if (action === 'recruit-general') this._tryRecruitGeneral();
      if (action === 'close') this.hide();
    });
  }

  open({ tile, city, world, general }) {
    this._tile = tile;
    this._city = city;
    this._world = world;
    this._general = general || world.getGeneralAt(tile.hex);
    this.el.classList.add('visible');
    this._render();
  }

  hide() { this.el.classList.remove('visible'); }

  _tryRecruit(cardKey) {
    if (!this._general) {
      this.bus.emit('toast:show', { text: 'Нужен полководец в городе' });
      return;
    }
    const result = this._world.recruit.recruit({
      factionId: this._world.playerFactionId,
      cardKey,
      generalId: this._general.id,
    });
    if (!result.ok) {
      this.bus.emit('toast:show', { text: result.reason });
      return;
    }
    this.bus.emit('resources:changed', { factionId: this._world.playerFactionId });
    this.bus.emit('deck:changed', { general: this._general });
    this.bus.emit('toast:show', { text: `${result.card.name} нанят` });
    this._render();
  }

  _tryRecruitGeneral() {
    const result = this._world.recruit.recruitGeneral({
      factionId: this._world.playerFactionId,
      tileKey: this._tile.key,
    });
    if (!result.ok) {
      this.bus.emit('toast:show', { text: result.reason });
      return;
    }
    this.bus.emit('resources:changed', { factionId: this._world.playerFactionId });
    this.bus.emit('toast:show', { text: `Нанят полководец: ${result.general.name}` });
    this.bus.emit('world:generalsChanged', {});
    this._render();
  }

  _render() {
    const { _city: city, _world: world, _general: gen } = this;
    if (!city) return;
    const factionId = world.playerFactionId;
    const cityFactionId = city.factionId;
    const isMine = cityFactionId === factionId;
    const used = world.recruitPointsUsed(factionId);
    const total = world.economy.recruitPointsForFaction(world, factionId);
    const keys = CardFactory.keysForFaction(factionId);

    const cardRows = keys.map((key) => {
      const def = CardFactory.defForKey(key);
      const cost = world.economy.recruitCost(CardFactory.create(key));
      const pts = world.economy.recruitPointsFor(CardFactory.create(key));
      const url = this._imgLoader.getUrl(key);
      const affordable = world.resourcePools.get(factionId).canAfford(cost);
      const canPoints = used + pts <= total;
      const disabled = !isMine || !affordable || !canPoints || !gen;
      const bg = url ? `background-image:url("${url}");` : '';
      return `
        <div class="cp-card type-${def.type}">
          <div class="cp-card-art" style="${bg}">
            <div class="cp-rarity cp-rarity-${def.rarity}">${def.rarity}</div>
            <div class="cp-str">${def.str}</div>
          </div>
          <div class="cp-card-name">${def.name}</div>
          <div class="cp-card-cost">⚔${cost.weapons} 💰${cost.gold} · ${pts} очк.</div>
          <button class="btn" data-action="recruit-card" data-key="${key}" ${disabled ? 'disabled' : ''}>Нанять</button>
        </div>
      `;
    }).join('');

    const generalBtn = isMine && city.isCity ? `
      <div class="cp-general">
        <button class="btn primary" data-action="recruit-general">Нанять полководца · 30💰</button>
      </div>
    ` : '';

    this.el.querySelector('.city-panel').innerHTML = `
      <h2>${city.name}</h2>
      <div class="cp-subtitle">
        ${city.isCity ? 'Город' : 'Деревня'} · ${isMine ? 'Ваш' : 'Не ваш'}
        · Очки найма: ${used}/${total}
        · ${gen ? `Полководец: ${gen.name}` : 'Нет полководца'}
      </div>
      <div class="cp-grid">${cardRows}</div>
      ${generalBtn}
      <button class="btn cp-close" data-action="close">Закрыть</button>
    `;
  }
}