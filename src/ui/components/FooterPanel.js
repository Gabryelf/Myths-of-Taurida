import { iconImg } from '../../config/icons.js';

/**
 * Нижний футер.
 * Слева — инфо (ход, фракция), центр — круглая кнопка «Пропустить ход»,
 * справа — зарезервировано (пусто).
 */
export class FooterPanel {
  constructor(root, { onSkipTurn }) {
    this.root = root;
    this.onSkipTurn = onSkipTurn;
    this.el = document.createElement('div');
    this.el.className = 'game-footer';
    this.el.innerHTML = `
      <div class="footer-side footer-left">
        <span class="footer-info-item" id="footer-turn">Ход 1</span>
        <span class="footer-info-divider"></span>
        <span class="footer-info-item" id="footer-faction">—</span>
      </div>
      <div class="footer-center">
        <button class="skip-turn-btn" id="skip-turn-btn">
          ${iconImg('ui_hourglass', { size: 22 })}
          <span class="stt-tooltip">Пропустить ход</span>
        </button>
      </div>
      <div class="footer-side footer-right"></div>
    `;
    root.appendChild(this.el);

    this._btn = this.el.querySelector('#skip-turn-btn');
    this._btn.addEventListener('click', () => {
      if (this._btn.disabled) return;
      this.onSkipTurn?.();
    });
    this._turnEl = this.el.querySelector('#footer-turn');
    this._factionEl = this.el.querySelector('#footer-faction');
  }

  setEnabled(enabled) {
    if (this._btn) this._btn.disabled = !enabled;
  }

  setTurn(turn) {
    if (this._turnEl) this._turnEl.textContent = `Ход ${turn}`;
  }

  setFaction(name) {
    if (this._factionEl) this._factionEl.textContent = name || '—';
  }
}