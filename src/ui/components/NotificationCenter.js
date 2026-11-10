/**
 * Лента игровых событий. Вертикальный столбик иконок справа.
 * Ховеришь иконку — видишь полный текст (как обилки на картах).
 * Максимум N иконок, старые уходят с анимацией.
 */
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
    constructor(root, { max = 8 } = {}) {
        this.max = max;
        this._items = [];   // [{ id, text, kind, time }]
        this._nextId = 1;
        this.el = document.createElement('div');
        this.el.className = 'notification-center';
        root.appendChild(this.el);
        this._render();
    }

    push({ text, kind = 'info' }) {
        if (!text) return;
        this._items.unshift({ id: this._nextId++, text, kind, time: Date.now(), unread: true });
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
            const time = new Date(it.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return `
         <div class="nc-icon kind-${it.kind} ${it.unread ? 'unread' : ''}" data-nc-id="${it.id}">
           <div class="nc-icon-glyph">${iconImg(icon, { size: 18 })}</div>
           ${it.unread ? '<div class="nc-dot"></div>' : ''}
           <div class="nc-tip">
             <div class="nc-tip-time">${time}</div>
             <div class="nc-tip-text">${it.text}</div>
           </div>
         </div>
       `;
        }).join('');

        // отмечаем прочитанным при первом наведении
        this.el.querySelectorAll('.nc-icon').forEach((node) => {
            node.addEventListener('mouseenter', () => {
                const id = parseInt(node.getAttribute('data-nc-id'), 10);
                const item = this._items.find((x) => x.id === id);
                if (item) { item.unread = false; node.classList.remove('unread'); node.querySelector('.nc-dot')?.remove(); }
            });
        });
    }
}