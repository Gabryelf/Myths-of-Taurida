/**
 * Карта на поле боя. Компактная:
 *   - сверху — название на плашке
 *   - центр — арт
 *   - снизу — количество (str) крупно
 */
 import { CardImageLoader } from '../../infrastructure/three/visuals/CardImageLoader.js';

 export class BattleCardEl {
   constructor({ side }) {
     this.side = side;
     this._imgLoader = new CardImageLoader();
   }
   create(card, { selected = false } = {}) {
     const el = document.createElement('div');
     el.className = `battle-card ${this.side === 'attacker' ? 'ally' : 'enemy'} type-${card.type}`;
     if (selected) el.classList.add('selected');
     el.innerHTML = `
       <div class="bc-name-top">${card.name}</div>
       <div class="bc-art"></div>
       <div class="bc-count">${card.str}</div>
       <div class="bc-type-stripe"></div>
     `;
     const art = el.querySelector('.bc-art');
     const url = this._imgLoader.getUrl(card.imageKey);
     if (url && art) art.style.backgroundImage = `url("${url}")`;
     return el;
   }
 }