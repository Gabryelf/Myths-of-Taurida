import { Theme } from '../../infrastructure/config/ThemeConfig.js';
import { iconImg } from '../../config/icons.js';

export class FactionsPanel {
  constructor(root, { world }) {
    this.world = world;
    this.overlay = document.createElement('div');
    this.overlay.className = 'factions-panel-overlay';
    this.overlay.innerHTML = `<div class="factions-panel"></div>`;
    root.appendChild(this.overlay);
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
      if (e.target.closest?.('[data-close]')) this.hide();
    });
  }

  open() {
    this.overlay.classList.add('visible');
    this._render();
  }
  hide() { this.overlay.classList.remove('visible'); }

  _render() {
    const rows = this.world.factions.map((f) => {
      const tiles = this.world.map.landTiles().filter((t) => t.factionId === f.id).length;
      const cities = this.world.cities.filter((c) => c.factionId === f.id && c.isCity).length;
      const villages = this.world.cities.filter((c) => c.factionId === f.id && !c.isCity).length;
      const generals = this.world.generals.filter((g) => g.factionId === f.id && g.alive);
      const totalLives = generals.reduce((s, g) => s + g.lives, 0);
      const totalCards = generals.reduce((s, g) => s + g.deck.cards.length, 0);
      const pool = this.world.resourcePools.get(f.id);
      const color = '#' + (Theme.faction[f.id] || 0x888888).toString(16).padStart(6, '0');
      return `
        <tr class="${f.isPlayer ? 'mine' : ''}">
          <td><span class="fp-dot" style="background:${color}"></span>${f.name}</td>
          <td>${tiles}</td>
          <td>${cities} / ${villages}</td>
          <td>${generals.length} (❤ ${totalLives})</td>
          <td>${totalCards}</td>
          <td>
            ${iconImg('res_gold',    { size: 11 })} ${pool.gold} ·
            ${iconImg('res_prov',    { size: 11 })} ${pool.prov} ·
            ${iconImg('res_weapons', { size: 11 })} ${pool.weapons}
          </td>
        </tr>
      `;
    }).join('');

    this.overlay.querySelector('.factions-panel').innerHTML = `
      <h2>Фракции Тавриды</h2>
      <div class="fp-subtitle">Ход ${this.world.turn}</div>
      <table class="fp-table">
        <thead>
          <tr>
            <th>Фракция</th>
            <th>Гексы</th>
            <th>Города/Деревни</th>
            <th>Полководцы</th>
            <th>Карты</th>
            <th>Ресурсы</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <button class="fp-close" data-close="1">Закрыть</button>
    `;
  }
}