import { CardFactory } from '../../domain/card/CardFactory.js';
import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { iconImg } from '../../config/icons.js';

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
    const pool = world.getRecruitPool(factionId);
    const used = world.recruitPointsUsed(factionId);
    const total = world.economy.recruitPointsForFaction(world, factionId);
    const poolRes = world.resourcePools.get(factionId);
    const poolData = world.recruitPools?.get(factionId);
    const pointsLeft = poolData?.points ?? 0;
    const cards = pool.map(({ key }) => {
      const def = CardFactory.defForKey(key);
      const card = CardFactory.create(key);
      const cost = world.economy.recruitCost(card);
      const pts = world.economy.recruitPointsFor(card);
      const bg = this._imgLoader.getCssBackground(key, card.type);
      const canAfford = poolRes.canAfford(cost);
      const canPoints = used + pts <= total;
      const disabled = !canAfford || !canPoints;
      return `
        <div class="rm-card type-${card.type} ${disabled ? 'disabled' : ''}"
             ${disabled ? '' : `data-recruit="${key}"`}>
          <div class="rm-art" style="${bg}">
            <div class="rm-rarity rm-rarity-${card.rarity}" title="${rarityName(card.rarity)}"></div>
            <div class="rm-type-stripe"></div>
            <div class="rm-count">${iconImg('stat_str', { size: 12, cls: 'icon-inline' })}${card.str}</div>
            <div class="rm-cost-inline">
              ${iconImg('res_weapons', { size: 11 })}
              ${iconImg('res_gold',    { size: 11 })}
              ${iconImg('res_prov',    { size: 11 })}
            </div>
          </div>
          <div class="rm-name-top">${def.name}</div>
          <div class="rm-cost-bottom">
            ${iconImg('res_weapons', { size: 11 })}${cost.weapons}
            ${iconImg('res_gold',    { size: 11 })}${cost.gold}
            · ${pts} очк.
          </div>
        </div>
      `;
    }).join('');
    const empty = pool.length === 0
      ? '<div class="rm-empty">Пул пуст. Завершите ход — придут новые карты.</div>'
      : '';
    this.el.innerHTML = `
      <h2>Найм карт · ${gen.name}</h2>
      <div class="rm-subtitle">
        Очки пула: <b>${pointsLeft}</b> · Очки найма: ${used}/${total}
        · ${iconImg('res_gold')}${poolRes.gold}
        · ${iconImg('res_weapons')}${poolRes.weapons}
        · В пуле: ${pool.length}
      </div>
      ${empty}
      <div class="rm-grid">${cards}</div>
      <button class="rm-close" data-close="1">Закрыть</button>
    `;
  }
}
function rarityName(r) {
  return { common: 'Обычная', rare: 'Редкая', epic: 'Эпическая', legendary: 'Легендарная' }[r] || r;
}