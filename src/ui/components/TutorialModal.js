const STEPS = [
    { title: 'Добро пожаловать', text: 'Это карта Тавриды. Кликните по золотому полководцу, чтобы выбрать его.' },
    { title: 'Движение', text: 'После выбора полководца подсвечиваются синие гексы — можно идти. Красные — враги.' },
    { title: 'Бой', text: 'Клик по врагу открывает карточное сражение: разыгрывайте карты за очки тактики.' },
    { title: 'Найм', text: 'Кнопка «Найм» открывает карты вашей фракции. Тратьте золото, провизию и оружие.' },
    { title: 'Победа', text: 'Захватывайте гексы и побеждайте полководцев врага. Удачи!' },
];

export class TutorialModal {
    constructor(root, onDone) {
        this.onDone = onDone;
        this.step = 0;
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-modal-overlay';
        root.appendChild(this.overlay);
        this.overlay.addEventListener('click', (e) => {
            if (e.target.getAttribute?.('data-close')) this._finish();
            if (e.target.getAttribute?.('data-next')) this._next();
        });
    }

    open() {
        this.step = 0;
        this.overlay.style.display = 'flex';
        this.overlay.style.pointerEvents = 'auto';
        this.overlay.classList.add('visible');
        this._render();
    }

    _next() {
        this.step++;
        if (this.step >= STEPS.length) this._finish();
        else this._render();
    }

    _finish() {
        this.overlay.classList.remove('visible');
        this.overlay.style.display = 'none';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.innerHTML = '';
        this.onDone?.();
    }

    _render() {
        const s = STEPS[this.step];
        this.overlay.innerHTML = `
        <div class="tutorial-modal">
          <h2>${s.title}</h2>
          <div class="tut-step">Шаг ${this.step + 1} из ${STEPS.length}</div>
          <p>${s.text}</p>
          <button class="btn-next" data-next="1">${this.step === STEPS.length - 1 ? 'Готово' : 'Далее'}</button>
        </div>
      `;
    }
}