import { Theme } from '../../infrastructure/config/ThemeConfig.js';
import { generalPortraitUrl } from '../../config.js';
import { iconImg } from '../../config/icons.js';

export class GeneralPanel {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'general-panel';
    root.appendChild(this.el);
    this._general = null;
    this._collapsed = false;
    this._flashTimer = null;
    document.addEventListener('general:no-move-points-ui', (e) => this._flashNoMovePoints(e.detail));
  }

  _flashNoMovePoints({ needed, have }) {
    const toast = document.createElement('div');
    toast.className = 'gp-no-points';
    toast.textContent = `Нужно ${needed} очков, есть ${have}`;
    this.el.appendChild(toast);
    this.el.classList.add('gp-flash-error');
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this.el.classList.remove('gp-flash-error');
      toast.remove();
    }, 1600);
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

  _toggle() {
    this._collapsed = !this._collapsed;
    this.el.classList.toggle('collapsed', this._collapsed);
    this._render();
  }

  _bar(pct, cls, text) {
    return `
      <div class="gp-bar">
        <div class="gp-fill ${cls}" style="width:${pct}%"></div>
        <span class="gp-bar-text">${text}</span>
      </div>`;
  }

  _render() {
    const g = this._general;
    if (!g) return;
    const factionName = Theme.factionName[g.factionId] || g.factionId;
    const presetIndex = g.presetIndex ?? 0;
    const url = generalPortraitUrl(g.factionId, presetIndex);
    const emblemStyle = url
      ? `background-image:url('${url}');background-size:cover;background-position:center top;`
      : '';

    const livesPct = Math.round((g.lives / g.maxLives) * 100);
    const movePct = Math.round((g.movePoints / g.maxMovePoints) * 100);
    const xpPct = Math.min(100, Math.round((g.xp / g.xpToNext) * 100));
    const perksHtml = g.perks.length > 0 && !this._collapsed
      ? `<div class="gp-perks">${g.perks.map((p) => this._perkIcon(p)).join(' ')}</div>`
      : '';

    this.el.innerHTML = `
      <button class="gp-toggle" title="${this._collapsed ? 'Развернуть' : 'Свернуть'}">
        ${this._collapsed ? '▾' : '▴'}
      </button>
      <div class="gp-compact">
        <div class="gp-ava" style="${emblemStyle}"></div>
        <div class="gp-compact-bars">
          ${this._bar(livesPct, 'gp-fill-lives', `${g.lives}/${g.maxLives}`)}
          ${this._bar(movePct, 'gp-fill-move', `${g.movePoints}/${g.maxMovePoints}`)}
        </div>
      </div>
      <div class="gp-full">
        <div class="gp-header">
          <div class="gp-emblem" style="${emblemStyle}"></div>
          <div class="gp-head-text">
            <div class="gp-name">${g.name} <span class="gp-level">${g.level}</span></div>
            <div class="gp-faction">${factionName}</div>
          </div>
        </div>
        <div class="gp-bars">
          ${this._bar(livesPct, 'gp-fill-lives', `Жизни ${g.lives}/${g.maxLives}`)}
          ${this._bar(movePct, 'gp-fill-move', `Ход ${g.movePoints}/${g.maxMovePoints}`)}
        </div>
        <div class="gp-xp">
          <div class="gp-xp-bar"><div class="gp-xp-fill" style="width:${xpPct}%"></div></div>
        </div>
        ${perksHtml}
      </div>
    `;
    this.el.querySelector('.gp-toggle').addEventListener('click', () => this._toggle());
  }

  _perkIcon(perkId) {
    const iconKey = perkId.includes('move') ? 'action_move'
                  : perkId.includes('lives') ? 'general_life'
                  : 'general_capacity';
    return `<span class="gp-perk" title="${perkId}">${iconImg(iconKey, { size: 14 })}</span>`;
  }
}
