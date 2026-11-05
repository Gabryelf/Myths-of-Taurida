import { LobbyCard } from './LobbyCard.js';
import { CardFactory } from '../../../domain/card/CardFactory.js';
import { CardImageLoader } from '../../../infrastructure/three/visuals/CardImageLoader.js';
import { Theme } from '../../../infrastructure/config/ThemeConfig.js';
import { GENERAL_PORTRAITS, imgUrl } from '../../../config.js';

/**
 * Главный экран лобби. Коллекция, колоды, монеты, кнопка «Играть».
 */
export class LobbyScreen {
    constructor(root, { profile, decks, onPlay, onSummon, onSave }) {
        this.root = root;
        this.profile = profile;
        this.decks = decks;
        this.onPlay = onPlay;
        this.onSummon = onSummon;
        this.onSave = onSave;
        this._imgLoader = new CardImageLoader();
        this._tab = 'collection';   // 'collection' | 'decks'
        this._activeFaction = profile.lastPlayedFaction || 'scythians';

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
        // Табы
        const tab = e.target.closest?.('[data-tab]')?.getAttribute('data-tab');
        if (tab) { this._tab = tab; this._render(); return; }

        // Выбор фракции
        const fac = e.target.closest?.('[data-faction]')?.getAttribute('data-faction');
        if (fac) {
            this._activeFaction = fac;
            this.profile.lastPlayedFaction = fac;
            this._render();
            return;
        }

        // Играть
        if (e.target.closest?.('[data-play]')) {
            const v = this.decks.validate(this._activeFaction);
            if (!v.ok) {
                this.onSave?.({ error: v.errors.join('; ') });
                return;
            }
            this.onPlay?.(this._activeFaction);
            return;
        }

        // Призыв (случайная карта)
        if (e.target.closest?.('[data-summon]')) {
            this.onSummon?.();
            return;
        }

        // Автосборка колоды
        if (e.target.closest?.('[data-autofill]')) {
            this.decks.autoFill(this._activeFaction);
            this.onSave?.({});
            this._render();
            return;
        }

        // Удалить карту из колоды
        const rmv = e.target.closest?.('[data-remove]')?.getAttribute('data-remove');
        if (rmv) {
            const deck = this.decks.getDeck(this._activeFaction);
            deck.remove(rmv, 1);
            this.onSave?.({});
            this._render();
            return;
        }

        // Добавить карту в колоду
        const add = e.target.closest?.('[data-add]')?.getAttribute('data-add');
        if (add) {
            const deck = this.decks.getDeck(this._activeFaction);
            if (!deck.add(add, 1)) return;
            this.onSave?.({});
            this._render();
            return;
        }
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
        ${tabs}
        <div class="lobby-content">${content}</div>
        ${footer}
      </div>
    `;
    }

    _collectionHtml() {
        const factionId = this._activeFaction;
        const keys = this.profile.collection.keysForFaction(factionId);
        if (keys.length === 0) {
            return `<div class="lobby-empty">В коллекции нет карт ${Theme.factionName[factionId]}.<br>Нажмите «Призыв», чтобы получить карты.</div>`;
        }
        const cards = keys.map((k) => {
            const def = CardFactory.defForKey(k);
            const count = this.profile.collection.count(k);
            return `<div class="lobby-card-wrap">
        ${LobbyCard.render(k, def, count, this._imgLoader)}
      </div>`;
        }).join('');
        return `<div class="lobby-grid">${cards}</div>`;
    }

    _deckHtml() {
        const factionId = this._activeFaction;
        const deck = this.decks.getDeck(factionId);
        const deckCount = deck.totalCount;
        const deckCards = deck.allKeys().map((k) => {
            const def = CardFactory.defForKey(k);
            const count = deck.count(k);
            return `<div class="lobby-card-wrap">
        ${LobbyCard.render(k, def, count, this._imgLoader, 'remove')}
      </div>`;
        }).join('');
        const deckHtml = deckCount === 0
            ? `<div class="lobby-empty">Колода пуста. Нажмите «Автосборка».</div>`
            : `<div class="lobby-grid">${deckCards}</div>`;

        const collectionKeys = this.profile.collection.keysForFaction(factionId);
        const available = collectionKeys.map((k) => {
            const def = CardFactory.defForKey(k);
            const inDeck = deck.count(k);
            const inCollection = this.profile.collection.count(k);
            if (inDeck >= inCollection) return '';
            return `<div class="lobby-card-wrap">
        ${LobbyCard.render(k, def, inCollection - inDeck, this._imgLoader, 'add')}
      </div>`;
        }).join('');

        return `
      <div class="lobby-deck-header">
        <div class="lobby-deck-count ${deckCount >= 10 ? 'ok' : 'bad'}">
          Колода: ${deckCount} / минимум 10
        </div>
        <button class="lobby-autofill" data-autofill="1">⚡ Автосборка</button>
      </div>
      <div class="lobby-section-title">В колоде</div>
      ${deckHtml}
      <div class="lobby-section-title">Добавить из коллекции</div>
      <div class="lobby-grid">${available || '<div class="lobby-empty">Все карты уже в колоде</div>'}</div>
    `;
    }
}