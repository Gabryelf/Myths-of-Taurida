import { Theme } from '../../infrastructure/config/ThemeConfig.js';
import { GENERAL_PORTRAITS, imgUrl } from '../../config.js';

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
  refresh() { if (this._general) this._render(); }

  _render() {
    const g = this._general;
    const factionName = Theme.factionName[g.factionId] || g.factionId;
    const livesHtml = Array.from({ length: g.maxLives }, (_, i) =>
      `<span class="gp-life ${i >= g.lives ? 'lost' : ''}"></span>`
    ).join('');
    const url = imgUrl(GENERAL_PORTRAITS[g.factionId]);
    const emblemStyle = url
      ? `background-image:url('${url}');background-size:cover;background-position:center top;`
      : '';
    const xpPct = Math.min(100, Math.round((g.xp / g.xpToNext) * 100));
    const perksHtml = g.perks.length > 0
      ? `<div class="gp-row"><span>Перки</span><b>${g.perks.map((p) => this._perkIcon(p)).join(' ')}</b></div>`
      : '';

    this.el.innerHTML = `
      <div class="gp-header">
        <div class="gp-emblem" style="${emblemStyle}"></div>
        <div>
          <div class="gp-name">${g.name} <span class="gp-level">ур. ${g.level}</span></div>
          <div class="gp-faction">${factionName}</div>
        </div>
      </div>
      <div class="gp-xp">
        <div class="gp-xp-bar"><div class="gp-xp-fill" style="width:${xpPct}%"></div></div>
        <div class="gp-xp-text">${g.xp} / ${g.xpToNext} XP</div>
      </div>
      <div class="gp-row">
        <span>Жизни</span>
        <b class="gp-lives">${livesHtml}</b>
      </div>
      <div class="gp-row">
        <span>Движение</span>
        <b>${g.movePoints} / ${g.maxMovePoints}</b>
      </div>
      ${perksHtml}
    `;
  }

  _perkIcon(perkId) {
    const map = {
      move: '👟', lives: '❤', capacity: '🃏',
    };
    const key = perkId.includes('move') ? 'move' : perkId.includes('lives') ? 'lives' : 'capacity';
    return `<span class="gp-perk" title="${perkId}">${map[key]}</span>`;
  }
}