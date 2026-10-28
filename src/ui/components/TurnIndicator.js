export class TurnIndicator {
    constructor(root) {
        this.el = document.createElement('div');
        this.el.className = 'turn-indicator';
        this.el.textContent = 'Ход противника…';
        root.appendChild(this.el);
    }
    show(text = 'Ход противника…') {
        this.el.textContent = text;
        this.el.classList.add('visible');
    }
    hide() { this.el.classList.remove('visible'); }
}