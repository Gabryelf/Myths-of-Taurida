import { Theme } from '../../infrastructure/config/ThemeConfig.js';

/**
 * Tooltip при наведении на гекс.
 * Управление DOM. Никакой логики мира.
 */
export class Tooltip {
    constructor(root) {
        this.root = root;
        this.el = document.createElement('div');
        this.el.className = 'tooltip';
        root.appendChild(this.el);
        this._visible = false;
    }

    show(tile, screenPos) {
        if (!tile) { this.hide(); return; }
        this.el.innerHTML = this._render(tile);
        this.el.style.left = `${screenPos.x + 18}px`;
        this.el.style.top = `${screenPos.y + 18}px`;
        this.el.classList.add('visible');
        this._visible = true;
    }

    hide() {
        if (!this._visible) return;
        this.el.classList.remove('visible');
        this._visible = false;
    }

    _render(tile) {
        const terrainName = Theme.terrainName[tile.terrain] || tile.terrain;
        const factionName = tile.factionId
            ? Theme.factionName[tile.factionId] || tile.factionId
            : null;
        const factionColor = tile.factionId
            ? '#' + (Theme.faction[tile.factionId] || 0x888888).toString(16).padStart(6, '0')
            : null;

        const factionRow = factionName
            ? `<div class="tt-row"><span>Фракция</span><b><span class="tt-faction" style="background:${factionColor};color:${factionColor}"></span>${factionName}</b></div>`
            : '';

        return `
      <div class="tt-title">${terrainName}</div>
      <div class="tt-row"><span>Координаты</span><b>${tile.hex.q}, ${tile.hex.r}</b></div>
      ${factionRow}
    `;
    }
}