import { iconImg } from '../../config/icons.js';

const KIND_ICON = {
  info: 'ui_help',
  success: 'ui_check',
  danger: 'ui_skull',
  gold: 'res_gold',
  trade: 'res_weapons',
  battle: 'action_attack',
  turn: 'ui_hourglass',
};

export class NotificationCenter {
  constructor(root, { max = 20 } = {}) {
    this.max = max;
    this._items = [];
    this._nextId = 1;
    this.el = document.createElement('div');
    this.el.className = 'notification-center';
    root.appendChild(this.el);
    this._render();
  }

  push({ text, kind = 'info' }) {
    if (!text) return;
    this._items.unshift({
      id: this._nextId++,
      text, kind,
      time: Date.now(),
      unread: true,
    });
    if (this._items.length > this.max) this._items.length = this.max;
    this._render();
  }

  _render() {
    if (this._items.length === 0) {
      this.el.innerHTML = '';
      return;
    }
    this.el.innerHTML = this._items.map((it) => {
      const icon = KIND_ICON[it.kind] || 'ui_help';
      return `
        <div class="nc-icon kind-${it.kind} ${it.unread ? 'unread' : ''}" data-nc-id="${it.id}">
          <div class="nc-icon-glyph">${iconImg(icon, { size: 18 })}</div>
          <div class="nc-text">${it.text}</div>
          ${it.unread ? '<div class="nc-dot"></div>' : ''}
        </div>
      `;
    }).join('');

    this.el.querySelectorAll('.nc-icon').forEach((node) => {
      node.addEventListener('click', () => {
        const id = parseInt(node.getAttribute('data-nc-id'), 10);
        const item = this._items.find((x) => x.id === id);
        if (item) {
          item.unread = false;
          node.classList.remove('unread');
          node.querySelector('.nc-dot')?.remove();
        }
      });
    });
  }
}