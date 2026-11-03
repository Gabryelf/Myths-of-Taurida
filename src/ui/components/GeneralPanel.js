import { Theme } from '../../infrastructure/config/ThemeConfig.js';
import { GENERAL_PORTRAITS, imgUrl } from '../../config.js';

/**
 * Панель выбранного полководца.
 * Аватарка-герб — из GENERAL_PORTRAITS[фракция].
 * Координаты убраны (по запросу).
 */
export class GeneralPanel {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'general-panel';
    root.appendChild(this.el);
    this._general = null;
  }
  show(general) {
    if (!general) { this.hide(); return; }
    this._general = general;
    this.el.classList.add('visible');
    this._render();
  }
  hide() {
    this.el.classList.remove('visible');
    this._general = null;
  }
  refresh() {
    if (this._general) this._render();
  }
  _render() {
    const g = this._general;
    const factionName = Theme.factionName[g.factionId] || g.factionId;
    const livesHtml = Array.from({ length: g.maxLives }, (_, i) =>
      `<span class="gp-life ${i >= g.lives ? 'lost' : ''}"></span>`
    ).join('');

    const file = GENERAL_PORTRAITS[g.factionId];
    const url = imgUrl(file);
    const emblemStyle = url
      ? `background-image:url('${url}');background-size:cover;background-position:center top;`
      : `background:${this._factionColor(g.factionId)};color:${this._factionColor(g.factionId)};`;

    this.el.innerHTML = `
      <div class="gp-header">
        <div class="gp-emblem" style="${emblemStyle}"></div>
        <div>
          <div class="gp-name">${g.name}</div>
          <div class="gp-faction">${factionName}</div>
        </div>
      </div>
      <div class="gp-row">
        <span>Жизни</span>
        <b class="gp-lives">${livesHtml}</b>
      </div>
      <div class="gp-row">
        <span>Движение</span>
        <b>${g.movePoints} / ${g.maxMovePoints}</b>
      </div>
    `;
  }
  _factionColor(factionId) {
    const c = Theme.faction[factionId] || 0xd4a94c;
    return '#' + c.toString(16).padStart(6, '0');
  }
}