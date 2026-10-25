export class EndTurnButton {
    constructor(root, onClick) {
        this.el = document.createElement('button');
        this.el.className = 'end-turn-button';
        this.el.textContent = 'Завершить ход';
        this.el.addEventListener('click', onClick);
        root.appendChild(this.el);
    }
}