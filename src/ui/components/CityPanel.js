import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';
import { GENERAL_PORTRAITS, imgUrl } from '../../config.js';
import { iconImg } from '../../config/icons.js';

/**
 * Модалка города / деревни / поселения.
 * - Город: список полководцев, найм нового полководца (30💰).
 * - Деревня: статистика.
 * - Поселение (нейтралов): «Купить за 40💰» (если не наше).
 */
export class CityPanel {
  constructor(root, { bus }) {
    this.bus = bus;
    this.onBuySettlement = null;   // (cityId) => void

    this.el = document.createElement('div');
    this.el.className = 'city-panel-overlay';
    this.el.innerHTML = `<div class="city-panel"></div>`;
    root.appendChild(this.el);

    this._world = null;
    this._city = null;
    this._tile = null;
    this._imgLoader = new CardImageLoader();

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) { this.hide(); return; }

      const close = e.target.getAttribute?.('data-close');
      if (close !== null) { this.hide(); return; }

      const hireGen = e.target.getAttribute?.('data-hire-general');
      if (hireGen !== null) { this._tryHireGeneral(); return; }

      const buySett = e.target.getAttribute?.('data-buy-settlement');
      if (buySett !== null) {
        // Сохраняем id ДО возможного изменения _city внутри колбэка
        const cityId = this._city?.id;
        if (cityId) this.onBuySettlement?.(cityId);
        this.hide();
        return;
      }
    });
  }

  open({ tile, city, world }) {
    if (!city || !world || !tile) return;   // защита от null
    this._tile = tile;
    this._city = city;
    this._world = world;
    this.el.classList.add('visible');
    this._render();
  }

  hide() { this.el.classList.remove('visible'); }

  _tryHireGeneral() {
    if (!this._world || !this._tile) return;
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
    // ─── Защита от null — без этого падало ───
    if (!world || !city) return;

    const factionId = world.playerFactionId;
    if (!factionId) return;

    const income = world.economy.computeIncome(world, factionId);
    const generals = world.generals.filter((g) => g.factionId === factionId && g.alive);
    const citiesOfMine = world.cities.filter((c) => c.factionId === factionId);
    const myCities = citiesOfMine.filter((c) => c.isCity).length;
    const myVillages = citiesOfMine.filter((c) => !c.isCity).length;

    const isMine = city.factionId === factionId;
    const maxGenerals = Math.max(1, myCities + 1);
    const canHireGeneral = isMine && city.isCity && generals.length < maxGenerals;
    // cityGeneral — только для своего города
    const cityGeneral = world.getGeneralAt(this._tile.hex);

    // ─── Тип ───
    const typeLabel = city.isCity
      ? 'Город'
      : city.settlement
        ? 'Поселение'
        : 'Деревня';

    const ownerLabel = isMine
      ? 'Ваш'
      : city.settlement
        ? `Нейтральное (${factionLabel(city.neutralFaction)})`
        : city.factionId
          ? factionLabel(city.factionId)
          : 'Ничейное';

    // ─── Полководцы ───
    const generalsHtml = generals.map((g) => {
      const inCity = g.hex.key === this._tile.key;
      return `
        <div class="cp-general-row">
          <div class="cp-general-portrait" style="${this._portraitStyle(g.factionId)}"></div>
          <div class="cp-general-info">
            <div class="cp-general-name">${g.name}</div>
            <div class="cp-general-stats">
              ${iconImg('general_life', { size: 11 })} ${g.lives}/${g.maxLives}
              · ${iconImg('action_move', { size: 11 })} ${g.movePoints}/${g.maxMovePoints}
              · ${iconImg('general_capacity', { size: 11 })} ${g.deck.cards.length}
              ${inCity ? '· <b style="color:#3fb950">здесь</b>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('') || '<div class="cp-empty">Нет полководцев</div>';

    // ─── Ограничения найма ───
    const restrHtml = city.settlement
      ? `<div class="cp-restr">${iconImg('ui_help', { size: 11 })} В поселении: только <b>common</b> / <b>rare</b>, цена ×1.5</div>`
      : '';

    // ─── Покупка поселения ───
    const buySettlementHtml = (!isMine && city.settlement)
      ? `<button class="btn primary cp-buy-settlement" data-buy-settlement="1">
           🏛 Купить поселение · 40${iconImg('res_gold', { size: 12 })}
         </button>`
      : '';

    // ─── Оборона поселения ───
    const defenseHtml = (!isMine && city.settlement)
      ? `<div class="cp-defense-info">
           ${iconImg('ui_shield', { size: 12 })} Охраняется: <b>${factionLabel(city.neutralFaction)}</b>
         </div>`
      : '';

    this.el.querySelector('.city-panel').innerHTML = `
      <h2>${city.name}</h2>
      <div class="cp-subtitle">
        ${typeLabel} · ${ownerLabel}
        ${cityGeneral ? ` · Полководец: ${cityGeneral.name}` : ''}
      </div>

      ${isMine ? `
      <div class="cp-section">
        <div class="cp-section-title">Империя</div>
        <div class="cp-stat-row"><span>Гексы</span><b>${world.map.landTiles().filter((t) => t.factionId === factionId).length}</b></div>
        <div class="cp-stat-row"><span>Города</span><b>${myCities}</b></div>
        <div class="cp-stat-row"><span>Деревни/поселения</span><b>${myVillages}</b></div>
        <div class="cp-stat-row"><span>Доход</span><b>
          ${iconImg('res_gold', { size: 11 })}${income.gold}
          ${iconImg('res_prov', { size: 11 })}${income.prov}
          ${iconImg('res_weapons', { size: 11 })}${income.weapons}
        </b></div>
        <div class="cp-stat-row"><span>Очки найма</span><b>${world.recruitPointsUsed(factionId)}/${world.economy.recruitPointsForFaction(world, factionId)}</b></div>
      </div>
      ` : ''}

      ${restrHtml}

      ${isMine ? `
      <div class="cp-section">
        <div class="cp-section-title">Полководцы (${generals.length}/${maxGenerals})</div>
        ${generalsHtml}
        ${canHireGeneral ? `
          <button class="btn primary cp-hire-btn" data-hire-general="1">
            Нанять полководца · 30${iconImg('res_gold', { size: 12 })}
          </button>
        ` : ''}
        ${isMine && city.isCity && generals.length >= maxGenerals
          ? `<div class="cp-hint">Максимум полководцев — постройте больше городов</div>`
          : ''}
      </div>
      ` : ''}

      ${defenseHtml}
      ${buySettlementHtml}

      <button class="btn cp-close" data-close="1">Закрыть</button>
    `;
  }
}

function factionLabel(factionId) {
  return {
    scythians: 'Скифы',
    bosporus: 'Боспор',
    chersonesos: 'Херсонес',
    rome: 'Рим',
    goths: 'Готы',
    tauri: 'Тавры',
    cimmerians: 'Киммерийцы',
  }[factionId] || factionId || '';
}