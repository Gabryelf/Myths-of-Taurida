const STEPS = [
    {
        title: 'Добро пожаловать в Тавриду',
        text: 'Вы — правитель одной из пяти фракций Крыма IV в. до н.э. — I в. н.э. Ваша цель — захватить гексы и уничтожить полководцев врага.'
    },
    {
        title: 'Карта и туман войны',
        text: 'Карта состоит из гексов. Вы видите только в радиусе 3 гексов от своих полководцев — остальное скрыто туманом. Разведанные гексы запоминаются.'
    },
    {
        title: 'Полководец',
        text: 'Золотой диск на карте — ваш полководец. Кликните по нему, чтобы выбрать. Синие гексы — можно идти, красные — атаковать.'
    },
    {
        title: 'Движение и ZOC',
        text: 'Лес стоит 2 AP, горы — 3, равнина — 1. Дороги снижают до 1. Если рядом враг (ZOC) — выход из клетки стоит все оставшиеся AP.'
    },
    {
        title: 'Террейн и бой',
        text: 'В бою террейн даёт бонусы: в лесу лучники дешевле, в горах воины дороже. В городе нападающий платит +1 за карту. Смотрите подсказку в шапке боя.'
    },
    {
        title: 'Бой: карты и тактика',
        text: 'Разыгрывайте карты за ⚡ тактики. Полный ряд даёт бонус: ⚔ атака — урон полководцу, 🛡 оборона — блок обилок, ✨ поддержка — реген. Собирайте и колонки!'
    },
    {
        title: 'Города и найм',
        text: 'В городах можно нанимать новых полководцев (30 золота) и карты. Очки найма: 2 за город + 1 за деревню. Пул обновляется каждый ход.'
    },
    {
        title: 'Рынок',
        text: 'Кнопка «Рынок» — общий аукцион между фракциями. Выставляйте свои карты за золото или покупайте чужие. Лимит ставок: 2 за город + 1 за деревню.'
    },
    {
        title: 'Прокачка и перки',
        text: 'За победу в бою +10 XP. При достижении порога — новый уровень и перк (+1 движение, +1 жизнь или +5 вместимости).'
    },
    {
        title: 'Победа',
        text: 'Захватывайте гексы и уничтожайте полководцев врага. Удачи!'
    },
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
            if (e.target.getAttribute?.('data-prev')) this._prev();
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
    _prev() {
        if (this.step > 0) { this.step--; this._render(); }
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
        const isLast = this.step === STEPS.length - 1;
        this.overlay.innerHTML = `
        <div class="tutorial-modal">
          <h2>${s.title}</h2>
          <div class="tut-step">Шаг ${this.step + 1} из ${STEPS.length}</div>
          <p>${s.text}</p>
          <div class="tut-controls">
            ${this.step > 0 ? '<button class="btn-prev" data-prev="1">Назад</button>' : ''}
            <button class="btn-next" data-next="1">${isLast ? 'Готово' : 'Далее'}</button>
          </div>
          <button class="btn-skip" data-close="1">Пропустить</button>
        </div>
      `;
    }
}