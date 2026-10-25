import { Toast } from './components/Toast.js';
import { Tooltip } from './components/Tooltip.js';

export class UIManager {
  constructor({ root, toastRoot, bus }) {
    this.root = root;
    this.bus = bus;
    this.toast = new Toast(toastRoot);
    this.tooltip = new Tooltip(root);
    this._buildHud();
    this._subscribe();
  }

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'hud-top';
    hud.innerHTML = `
      <div class="title">ТАВРИДА · v0.0.3</div>
  
    `;
    this.root.appendChild(hud);
  }

  _subscribe() {
    this.bus.on('tile:hovered', ({ tile, screenPos }) => {
      if (tile) this.tooltip.show(tile, screenPos);
      else this.tooltip.hide();
    });
    this.bus.on('tile:selected', ({ tile }) => {
      if (tile) {
        this.bus.emit('toast:show', {
          text: `Выбрано: (${tile.hex.q}, ${tile.hex.r}) · ${tile.terrain}`,
        });
      }
    });
  }
}