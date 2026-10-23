import { Toast } from './components/Toast.js';

export class UIManager {
  constructor({ root, toastRoot, bus }) {
    this.root = root;
    this.bus = bus;
    this.toast = new Toast(toastRoot);
    this._buildHud();
  }

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'hud-top';
    hud.innerHTML = `
      <div class="title">ТАВРИДА · v0.0.1</div>
    `;
    this.root.appendChild(hud);
  }
}