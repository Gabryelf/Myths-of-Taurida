import { Theme } from '../../infrastructure/config/ThemeConfig.js';
import { HALO_TYPES } from '../../domain/world/haloConfig.js';
import { iconImg } from '../../config/icons.js';

export class Tooltip {
  constructor(root) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.className = 'tooltip';
    root.appendChild(this.el);
    this._visible = false;
    this._world = null;
  }

  setWorld(world) { this._world = world; }

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

    let haloHtml = '';
    if (this._world) {
      const halo = this._world.haloAt(tile);
      if (halo) {
        const type = HALO_TYPES[halo.type];
        if (type) {
          const tiles = this._world.haloTiles(halo);
          const owners = new Set(tiles.map((t) => t.factionId).filter(Boolean));
          const city = halo.anchorCityId ? this._world.getCity(halo.anchorCityId) : null;
          const haloColor = '#' + (halo.color ?? type.color).toString(16).padStart(6, '0');

          let statusHtml;
          if (owners.size === 0) {
            statusHtml = '<div class="tt-halo-status tt-halo-neutral">Ничей</div>';
          } else if (owners.size === 1) {
            const only = [...owners][0];
            const ownerName = Theme.factionName[only] || only;
            statusHtml = `<div class="tt-halo-status tt-halo-monopoly">
              ${iconImg('ui_check', { size: 11 })} Монополия: ${ownerName}
            </div>`;
          } else {
            const list = [...owners].map((f) => Theme.factionName[f] || f).join(', ');
            statusHtml = `<div class="tt-halo-status tt-halo-contested">
              ${iconImg('ui_skull', { size: 11 })} Разделён: ${list}
            </div>`;
          }

          haloHtml = `
            <div class="tt-halo">
              <div class="tt-halo-title" style="color:${haloColor}">
                <span class="tt-halo-dot" style="background:${haloColor}"></span>
                ${type.icon} ${type.name}
              </div>
              <div class="tt-row"><span>Доход</span><b>
                ${iconImg('res_gold', { size: 11 })}${type.yield.gold}
                ${iconImg('res_prov', { size: 11 })}${type.yield.prov}
                ${iconImg('res_weapons', { size: 11 })}${type.yield.weapons}
              </b></div>
              <div class="tt-row"><span>Гексов</span><b>${tiles.length}</b></div>
              ${city ? `<div class="tt-row"><span>Якорь</span><b>${city.name}</b></div>` : ''}
              ${statusHtml}
            </div>
          `;
        }
      }
    }

    return `
      <div class="tt-title">${terrainName}</div>
      <div class="tt-row"><span>Координаты</span><b>${tile.hex.q}, ${tile.hex.r}</b></div>
      ${factionRow}
      ${haloHtml}
    `;
  }
}