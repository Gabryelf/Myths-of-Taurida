import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { GENERAL_PORTRAITS, imgUrl } from '../../config.js';

/**
 * Модалка города. Открывается кликом по городу/деревне.
 * Показывает: статистику империи, список полководцев, кнопку найма нового
 * полководца (если это город).
 * Координаты убраны; полководцы — с гербами.
 */
export class CityPanel {
  constructor(root, { bus }) {
    this.bus = bus;
    this.el = document.createElement('div');
    this.el.className = 'city-panel-overlay';
    this.el.innerHTML = `<div class="city-panel"></div>`;
    root.appendChild(this.el);
    this._world = null;
    this._city = null;
    this._tile = null;
    this._imgLoader = new CardImageLoader();
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
      const close = e.target.getAttribute?.('data-close');
      if (close !== null) { this.hide(); return; }
      const hireGen = e.target.getAttribute?.('data-hire-general');
      if (hireGen !== null) { this._tryHireGeneral(); return; }
    });
  }
  open({ tile, city, world }) {
    this._tile = tile;
    this._city = city;
    this._world = world;
    this.el.classList.add('visible');
    this._render();
  }
  hide() { this.el.classList.remove('visible'); }
  _tryHireGeneral() {
    const result = this._world.recruit.recruitGeneral({
      factionId: this._world.playerFactionId,
      tileKey: this._tile.key,
    });
    if (!result.ok) {
      this.bus.emit('toast:show', { text: result.reason });
      return;
    }
    this.bus.emit('resources:changed', { factionId: this._world.playerFactionId });
    this.bus.emit('toast:show', { text: `Нанят: ${result.general.name}` });
    this.bus.emit('world:generalsChanged', {});
    this._render();
  }
  _portraitStyle(factionId) {
    const url = imgUrl(GENERAL_PORTRAITS[factionId]);
    if (!url) return '';
    return `background-image:url('${url}');background-size:cover;background-position:center top;`;
  }
  _render() {
    const world = this._world;
    const city = this._city;
    if (!world || !city) return;
    const factionId = world.playerFactionId;
    const income = world.economy.computeIncome(world, factionId);
    const generals = world.generals.filter((g) => g.factionId === factionId && g.alive);
    const citiesOfMine = world.cities.filter((c) => c.factionId === factionId);
    const myCities = citiesOfMine.filter((c) => c.isCity).length;
    const myVillages = citiesOfMine.length - myCities;
    const isMine = city.factionId === factionId;
    const maxGenerals = Math.max(1, myCities + 1);
    const canHireGeneral = isMine && city.isCity && generals.length < maxGenerals;
    const cityGeneral = world.getGeneralAt(this._tile.hex);
    const generalsHtml = generals.map((g) => {
      const inCity = g.hex.key === this._tile.key;
      return `
        <div class="cp-general-row">
          <div class="cp-general-portrait" style="${this._portraitStyle(g.factionId)}"></div>
          <div class="cp-general-info">
            <div class="cp-general-name">${g.name}</div>
            <div class="cp-general-stats">
              ❤ ${g.lives}/${g.maxLives} · ⌖ ${g.movePoints}/${g.maxMovePoints}
              · 🃏 ${g.deck.cards.length}
              ${inCity ? '· <b style="color:#3fb950">здесь</b>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('') || '<div class="cp-empty">Нет полководцев</div>';
    this.el.querySelector('.city-panel').innerHTML = `
      <h2>${city.name}</h2>
      <div class="cp-subtitle">
        ${city.isCity ? 'Город' : 'Деревня'} · ${isMine ? 'Ваш' : 'Не ваш'}
        ${cityGeneral ? ` · Полководец: ${cityGeneral.name}` : ''}
      </div>
      <div class="cp-section">
        <div class="cp-section-title">Империя</div>
        <div class="cp-stat-row"><span>Гексы</span><b>${world.map.landTiles().filter((t) => t.factionId === factionId).length}</b></div>
        <div class="cp-stat-row"><span>Города</span><b>${myCities}</b></div>
        <div class="cp-stat-row"><span>Деревни</span><b>${myVillages}</b></div>
        <div class="cp-stat-row"><span>Доход</span><b>💰${income.gold} 🌾${income.prov} ⚔${income.weapons}</b></div>
        <div class="cp-stat-row"><span>Очки найма</span><b>${world.recruitPointsUsed(factionId)}/${world.economy.recruitPointsForFaction(world, factionId)}</b></div>
      </div>
      <div class="cp-section">
        <div class="cp-section-title">Полководцы (${generals.length}/${maxGenerals})</div>
        ${generalsHtml}
        ${canHireGeneral ? `
          <button class="btn primary cp-hire-btn" data-hire-general="1">
            Нанять полководца · 30💰
          </button>
        ` : ''}
        ${isMine && city.isCity && generals.length >= maxGenerals
          ? `<div class="cp-hint">Максимум полководцев — постройте больше городов</div>`
          : ''}
      </div>
      <button class="btn cp-close" data-close="1">Закрыть</button>
    `;
  }
}