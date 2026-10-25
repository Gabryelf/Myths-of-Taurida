import { Toast } from './components/Toast.js';
import { Tooltip } from './components/Tooltip.js';
import { GeneralPanel } from './components/GeneralPanel.js';
import { EndTurnButton } from './components/EndTurnButton.js';

export class UIManager {
  constructor({ root, toastRoot, bus, onEndTurn }) {
    this.root = root;
    this.bus = bus;
    this.toast = new Toast(toastRoot);
    this.tooltip = new Tooltip(root);
    this.generalPanel = new GeneralPanel(root);
    this._buildHud();
    this.endTurnButton = new EndTurnButton(this._hudEl, onEndTurn);
    this._subscribe();
  }

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'hud-top';
    hud.innerHTML = `
      <div class="title">ТАВРИДА · v0.0.4</div>
    `;
    this.root.appendChild(hud);
    this._hudEl = hud;
  }

  _subscribe() {
    this.bus.on('tile:hovered', ({ tile, screenPos }) => {
      if (tile) this.tooltip.show(tile, screenPos);
      else this.tooltip.hide();
    });

    this.bus.on('general:selected', ({ general }) => {
      if (general) this.generalPanel.show(general);
      else this.generalPanel.hide();
    });

    this.bus.on('general:moved', ({ general, cost }) => {
      this.generalPanel.refresh();
      this.bus.emit('toast:show', {
        text: `${general.name} → (${general.hex.q}, ${general.hex.r}) · -${cost}`,
      });
    });

    this.bus.on('turn:ended', () => {
      this.generalPanel.refresh();
    });
  }
}