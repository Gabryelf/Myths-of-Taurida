import { iconImg } from '../../config/icons.js';
import { Minimap } from './Minimap.js';

export class QuickJump {
  constructor(root, { world, cameraController, theme }) {
    this.root = root;
    this.world = world;
    this.cameraController = cameraController;
    this.theme = theme;
    this._generalIdx = 0;
    this._cityIdx = 0;
    this._minimap = null;

    this.el = document.createElement('div');
    this.el.className = 'quick-jump';
    this.el.innerHTML = `
      <div class="qj-buttons">
        <button class="qj-btn" data-jump="general" title="К полководцу">
          ${iconImg('general_life', { size: 18 })}
        </button>
        <button class="qj-btn qj-btn-cycle" data-jump="next-general" title="Следующий полководец">
          ${iconImg('ui_arrow_right', { size: 14 })}
        </button>
        <button class="qj-btn" data-jump="city" title="К городу">
          ${iconImg('terrain_city', { size: 18 })}
        </button>
        <button class="qj-btn qj-btn-cycle" data-jump="next-city" title="Следующий город">
          ${iconImg('ui_arrow_right', { size: 14 })}
        </button>
      </div>
      <div class="qj-minimap" id="qj-minimap"></div>
    `;
    root.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      const jump = e.target.closest?.('[data-jump]')?.getAttribute('data-jump');
      if (!jump) return;
      this._handle(jump);
    });
  }

  initMinimap({ world, cameraController, onCenter }) {
    if (this._minimap) return;
    const slot = this.el.querySelector('#qj-minimap');
    this._minimap = new Minimap(slot, { world, cameraController, onCenter });
    // у MiniMap родитель — div, стилизуем
    this._minimap.el.classList.add('qj-minimap-inner');
  }

  refreshMinimap() { this._minimap?.refresh(); }

  setWorld(world) {
    this.world = world;
    this._generalIdx = 0;
    this._cityIdx = 0;
    if (this._minimap) { this._minimap.world = world; this._minimap.refresh(); }
  }

  _myGenerals() {
    if (!this.world?.playerFactionId) return [];
    return this.world.generals.filter((g) => g.factionId === this.world.playerFactionId && g.alive);
  }
  _myCities() {
    if (!this.world?.playerFactionId) return [];
    return this.world.cities.filter((c) => c.factionId === this.world.playerFactionId && c.tileKey);
  }
  _centerOnHex(hex) {
    if (!hex) return;
    this.cameraController?.centerOn(hex, this.theme.hexSize);
  }
  _handle(action) {
    switch (action) {
      case 'general': {
        const gens = this._myGenerals();
        if (!gens.length) return;
        this._generalIdx = 0;
        this._centerOnHex(gens[0].hex);
        return;
      }
      case 'next-general': {
        const gens = this._myGenerals();
        if (!gens.length) return;
        this._generalIdx = (this._generalIdx + 1) % gens.length;
        this._centerOnHex(gens[this._generalIdx].hex);
        return;
      }
      case 'city': {
        const cities = this._myCities();
        if (!cities.length) return;
        this._cityIdx = 0;
        const tile = this.world.map.getByKey(cities[0].tileKey);
        if (tile) this._centerOnHex(tile.hex);
        return;
      }
      case 'next-city': {
        const cities = this._myCities();
        if (!cities.length) return;
        this._cityIdx = (this._cityIdx + 1) % cities.length;
        const tile = this.world.map.getByKey(cities[this._cityIdx].tileKey);
        if (tile) this._centerOnHex(tile.hex);
        return;
      }
    }
  }
}