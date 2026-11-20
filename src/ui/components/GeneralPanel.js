import { Theme } from '../../infrastructure/config/ThemeConfig.js';
import { generalPortraitUrl } from '../../config.js';
import { iconImg } from '../../config/icons.js';
import { PERKS_BY_FACTION } from '../../domain/general/General.js';

export class GeneralPanel {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'general-panel';
    root.appendChild(this.el);
    this._general = null;
    this._flashTimer = null;
    document.addEventListener('general:no-move-points-ui', (e) =>
      this._flashNoMovePoints(e.detail));
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

  _bar(pct, cls, text, title) {
    return `
      <div class="gp-bar" title="${title}">
        <div class="gp-fill ${cls}" style="width:${pct}%"></div>
        <span class="gp-bar-text">${text}</span>
      </div>`;
  }

  _render() {
    const g = this._general;
    if (!g) return;
    const presetIndex = g.presetIndex ?? 0;
    const url = generalPortraitUrl(g.factionId, presetIndex);
    const emblemStyle = url
      ? `background-image:url('${url}');background-size:cover;background-position:center top;`
      : '';

    const livesPct = Math.round((g.lives / g.maxLives) * 100);
    const movePct = Math.round((g.movePoints / g.maxMovePoints) * 100);
    const xpPct = Math.min(100, Math.round((g.xp / g.xpToNext) * 100));

    const allPerks = PERKS_BY_FACTION[g.factionId] || [];
    const perksHtml = (g.perks || []).map((perkId) => {
      const perk = allPerks.find((p) => p.id === perkId);
      const name = perk?.name || perkId;
      const iconKey = perkId.includes('move') ? 'action_move'
                    : perkId.includes('lives') ? 'general_life'
                    : perkId.includes('capacity') ? 'general_capacity'
                    : 'general_perk';
      return `<span class="gp-perk-badge" title="${name}">${iconImg(iconKey, { size: 12 })}</span>`;
    }).join('');

    this.el.innerHTML = `
      <div class="gp-ava" style="${emblemStyle}"></div>
      <div class="gp-mid">
        <div class="gp-name-row">
          <span class="gp-name">${g.name}</span>
          <span class="gp-level">ур.${g.level}</span>
          ${perksHtml ? `<span class="gp-perks">${perksHtml}</span>` : ''}
        </div>
        <div class="gp-bars-row">
          ${this._bar(livesPct, 'gp-fill-lives', `${g.lives}/${g.maxLives}`, 'Жизни')}
          ${this._bar(movePct, 'gp-fill-move', `${g.movePoints}/${g.maxMovePoints}`, 'Очки движения')}
        </div>
      </div>
    `;
  }
}
