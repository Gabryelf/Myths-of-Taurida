import { LobbyCard } from './LobbyCard.js';
import { CardFactory } from '../../../domain/card/CardFactory.js';
import { CardImageLoader } from '../../../infrastructure/three/visuals/CardImageLoader.js';
import { Theme } from '../../../infrastructure/config/ThemeConfig.js';
import { GENERAL_PRESETS } from '../../../domain/general/GeneralFactory.js';
import { iconImg } from '../../../config/icons.js';

const TYPE_FILTERS = [
  { id: 'warrior', label: 'Воин',   icon: 'type_warrior' },
  { id: 'archer',  label: 'Стрелок', icon: 'type_archer' },
  { id: 'support', label: 'Поддержка', icon: 'type_support' },
  { id: 'special', label: 'Особый', icon: 'type_special' },
];
const RARITY_FILTERS = [
  { id: 'common',    label: 'Обычная' },
  { id: 'rare',      label: 'Редкая' },
  { id: 'epic',      label: 'Эпическая' },
  { id: 'legendary', label: 'Легендарная' },
];
const COUNT_FILTERS = [
  { id: '1',  label: '1' },
  { id: '2',  label: '2' },
  { id: '3+', label: '3+' },
];

export class LobbyScreen {
  constructor(root, { profile, decks, onPlay, onSummon, onSave }) {
    this.root = root;
    this.profile = profile;
    this.decks = decks;
    this.onPlay = onPlay;
    this.onSummon = onSummon;
    this.onSave = onSave;
    this._imgLoader = new CardImageLoader();
    this._tab = 'collection';
    this._activeFaction = profile.lastPlayedFaction || 'scythians';

    // ─── Фильтры (persist в сессии) ───
    this._filters = {
      types: new Set(),     // пусто = все
      rarities: new Set(),  // пусто = все
      counts: new Set(),    // пусто = все
    };

    this.el = document.createElement('div');
    this.el.className = 'lobby-overlay';
    root.appendChild(this.el);
    this.el.addEventListener('click', (e) => this._onClick(e));
  }

  show() {
    this.el.classList.add('visible');
    this._render();
  }
  hide() { this.el.classList.remove('visible'); }

  _onClick(e) {
    const tab = e.target.closest?.('[data-tab]')?.getAttribute('data-tab');
    if (tab) { this._tab = tab; this._render(); return; }

    const fac = e.target.closest?.('[data-faction]')?.getAttribute('data-faction');
    if (fac) {
      this._activeFaction = fac;
      this.profile.lastPlayedFaction = fac;
      this._render();
      return;
    }

    if (e.target.closest?.('[data-play]')) {
      const v = this.decks.validate(this._activeFaction);
      if (!v.ok) {
        this.onSave?.({ error: v.errors.join('; ') });
        return;
      }
      this.onPlay?.(this._activeFaction);
      return;
    }

    if (e.target.closest?.('[data-summon]')) {
      this.onSummon?.();
      return;
    }

    if (e.target.closest?.('[data-autofill]')) {
      this.decks.autoFill(this._activeFaction);
      this.onSave?.({});
      this._render();
      return;
    }

    const rmv = e.target.closest?.('[data-remove]')?.getAttribute('data-remove');
    if (rmv) {
      const deck = this.decks.getDeck(this._activeFaction);
      deck.remove(rmv, 1);
      this.onSave?.({});
      this._render();
      return;
    }

    const add = e.target.closest?.('[data-add]')?.getAttribute('data-add');
    if (add) {
      const deck = this.decks.getDeck(this._activeFaction);
      if (!deck.add(add, 1)) return;
      this.onSave?.({});
      this._render();
      return;
    }

    const presetBtn = e.target.closest?.('[data-preset]');
    if (presetBtn) {
      const idx = parseInt(presetBtn.getAttribute('data-preset'), 10);
      this.profile.starterGeneralByFaction = this.profile.starterGeneralByFaction || {};
      this.profile.starterGeneralByFaction[this._activeFaction] = idx;
      this.onSave?.({});
      this._render();
      return;
    }

    // ─── Фильтры ───
    const ft = e.target.closest?.('[data-filter-type]')?.getAttribute('data-filter-type');
    if (ft !== undefined && ft !== null) {
      this._toggle(this._filters.types, ft);
      this._render();
      return;
    }
    const fr = e.target.closest?.('[data-filter-rarity]')?.getAttribute('data-filter-rarity');
    if (fr !== undefined && fr !== null) {
      this._toggle(this._filters.rarities, fr);
      this._render();
      return;
    }
    const fc = e.target.closest?.('[data-filter-count]')?.getAttribute('data-filter-count');
    if (fc !== undefined && fc !== null) {
      this._toggle(this._filters.counts, fc);
      this._render();
      return;
    }
    if (e.target.closest?.('[data-filter-reset]')) {
      this._filters.types.clear();
      this._filters.rarities.clear();
      this._filters.counts.clear();
      this._render();
      return;
    }
  }

  _toggle(set, value) {
    if (set.has(value)) set.delete(value);
    else set.add(value);
  }

  _passesFilter(card, count) {
    const types = this._filters.types;
    const rarities = this._filters.rarities;
    const counts = this._filters.counts;
    if (types.size > 0 && !types.has(card.type)) return false;
    if (rarities.size > 0 && !rarities.has(card.rarity)) return false;
    if (counts.size > 0) {
      const ok = (
        (counts.has('1') && count === 1) ||
        (counts.has('2') && count === 2) ||
        (counts.has('3+') && count >= 3)
      );
      if (!ok) return false;
    }
    return true;
  }

  _filtersHtml(total, shown) {
    const typeBtns = TYPE_FILTERS.map((t) => `
      <button class="lf-btn ${this._filters.types.has(t.id) ? 'active' : ''}"
              data-filter-type="${t.id}">
        ${iconImg(t.icon, { size: 12 })} ${t.label}
      </button>
    `).join('');
    const rarBtns = RARITY_FILTERS.map((r) => `
      <button class="lf-btn ${this._filters.rarities.has(r.id) ? 'active' : ''}"
              data-filter-rarity="${r.id}">
        ${r.label}
      </button>
    `).join('');
    const cntBtns = COUNT_FILTERS.map((c) => `
      <button class="lf-btn ${this._filters.counts.has(c.id) ? 'active' : ''}"
              data-filter-count="${c.id}">
        ×${c.label}
      </button>
    `).join('');
    return `
      <div class="lobby-filters">
        <div class="lf-group">
          <span class="lf-label">Тип:</span>
          ${typeBtns}
        </div>
        <div class="lf-group">
          <span class="lf-label">Редкость:</span>
          ${rarBtns}
        </div>
        <div class="lf-group">
          <span class="lf-label">Кол-во:</span>
          ${cntBtns}
        </div>
        <span class="lf-count">${shown} / ${total}</span>
        <button class="lf-reset" data-filter-reset="1">Сбросить</button>
      </div>
    `;
  }

  _render() {
    const factions = ['scythians', 'bosporus', 'chersonesos', 'rome', 'goths'];
    const facTabs = factions.map((fid) => {
      const color = '#' + (Theme.faction[fid] || 0x888888).toString(16).padStart(6, '0');
      return `<button class="lobby-fac-tab ${fid === this._activeFaction ? 'active' : ''}"
        data-faction="${fid}" style="border-color:${color}">
        <span class="lfc-dot" style="background:${color}"></span>
        ${Theme.factionName[fid] || fid}
      </button>`;
    }).join('');

    const header = `
      <div class="lobby-header">
        <div class="lobby-title">ТАВРИДА</div>
        <div class="lobby-coins">💰 ${this.profile.coins}</div>
      </div>
      <div class="lobby-factions">${facTabs}</div>
    `;

    const presets = GENERAL_PRESETS[this._activeFaction] || [];
    const currentPreset = this.profile.starterGeneralByFaction?.[this._activeFaction] ?? 0;
    const generalPicker = presets.length > 0 ? `
      <div class="lobby-generals">
        <div class="lobby-gen-title">Полководец:</div>
        ${presets.map((p, i) => `
          <button class="lobby-gen-opt ${i === currentPreset ? 'active' : ''}"
                  data-preset="${i}">
            <b>${p.name}</b>
            <span>${p.desc}</span>
            <em>${p.move}⛊ · ${p.lives}❤</em>
          </button>
        `).join('')}
      </div>
    ` : '';

    const tabs = `
      <div class="lobby-tabs">
        <button class="lobby-tab ${this._tab === 'collection' ? 'active' : ''}"
          data-tab="collection">Коллекция</button>
        <button class="lobby-tab ${this._tab === 'decks' ? 'active' : ''}"
          data-tab="decks">Колода</button>
        <button class="lobby-summon" data-summon="1">🎴 Призыв (100💰)</button>
      </div>
    `;

    const content = this._tab === 'collection'
      ? this._collectionHtml()
      : this._deckHtml();

    const footer = `
      <div class="lobby-footer">
        <button class="lobby-play" data-play="1">▶ Начать партию</button>
      </div>
    `;

    this.el.innerHTML = `
      <div class="lobby-panel">
        ${header}
        ${generalPicker}
        ${tabs}
        <div class="lobby-content">${content}</div>
        ${footer}
      </div>
    `;

    LobbyCard.applyImages(this.el, this._imgLoader);
  }

  _collectionHtml() {
    const factionId = this._activeFaction;
    const keys = this.profile.collection.keysForFaction(factionId);
    if (keys.length === 0) {
      return `<div class="lobby-empty">В коллекции нет карт ${Theme.factionName[factionId]}.<br>Нажмите «Призыв», чтобы получить карты.</div>`;
    }
    const filtered = keys.filter((k) => {
      const def = CardFactory.defForKey(k);
      const count = this.profile.collection.count(k);
      return this._passesFilter(def, count);
    });
    const filtersHtml = this._filtersHtml(keys.length, filtered.length);
    if (filtered.length === 0) {
      return filtersHtml + `<div class="lobby-empty">Нет карт по выбранным фильтрам.</div>`;
    }
    const cards = filtered.map((k) => {
      const def = CardFactory.defForKey(k);
      const count = this.profile.collection.count(k);
      return `<div class="lobby-card-wrap">
        ${LobbyCard.render(k, def, count, this._imgLoader)}
      </div>`;
    }).join('');
    return filtersHtml + `<div class="lobby-grid">${cards}</div>`;
  }

  _deckHtml() {
    const factionId = this._activeFaction;
    const deck = this.decks.getDeck(factionId);
    const deckCount = deck.totalCount;
    const deckCards = deck.allKeys()
      .filter((k) => {
        const def = CardFactory.defForKey(k);
        return this._passesFilter(def, deck.count(k));
      })
      .map((k) => {
        const def = CardFactory.defForKey(k);
        const count = deck.count(k);
        return `<div class="lobby-card-wrap">
          ${LobbyCard.render(k, def, count, this._imgLoader, 'remove')}
        </div>`;
      }).join('');

    const deckHtml = deckCount === 0
      ? `<div class="lobby-empty">Колода пуста. Нажмите «Автосборка».</div>`
      : (deckCards
        ? `<div class="lobby-grid">${deckCards}</div>`
        : `<div class="lobby-empty">Нет карт по фильтрам.</div>`);

    const collectionKeys = this.profile.collection.keysForFaction(factionId);
    const available = collectionKeys.map((k) => {
      const def = CardFactory.defForKey(k);
      const inDeck = deck.count(k);
      const inCollection = this.profile.collection.count(k);
      if (inDeck >= inCollection) return '';
      if (!this._passesFilter(def, inCollection - inDeck)) return '';
      return `<div class="lobby-card-wrap">
        ${LobbyCard.render(k, def, inCollection - inDeck, this._imgLoader, 'add')}
      </div>`;
    }).join('');

    const filtersHtml = this._filtersHtml(deckCount, deckCount);
    return `
      ${filtersHtml}
      <div class="lobby-deck-header">
        <div class="lobby-deck-count ${deckCount >= 10 ? 'ok' : 'bad'}">
          Колода: ${deckCount} / минимум 10
        </div>
        <button class="lobby-autofill" data-autofill="1">⚡ Автосборка</button>
      </div>
      <div class="lobby-section-title">В колоде</div>
      ${deckHtml}
      <div class="lobby-section-title">Добавить из коллекции</div>
      <div class="lobby-grid">${available || '<div class="lobby-empty">Все карты уже в колоде или отфильтрованы</div>'}</div>
    `;
  }
}