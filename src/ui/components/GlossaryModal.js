const TERMS = [
    { t: 'Гекс', d: 'Шестиугольная клетка карты. Основная единица территории.' },
    { t: 'Террейн', d: 'Тип местности: равнина, лес, горы, степь, город, руины. Влияет на стоимость движения и бонусы в бою.' },
    { t: 'AP (движение)', d: 'Очки движения полководца за ход. Лес — 2, горы — 3, равнина/степь — 1. Дороги снижают до 1.' },
    { t: 'ZOC (зона контроля)', d: 'Если рядом враг — выход из клетки стоит все оставшиеся AP.' },
    { t: 'Тактика (⚡)', d: 'Очки в бою. Старт: 1 + число карт в поддержке + 1. Тратятся на выкладывание карт.' },
    { t: 'Линия', d: 'Ряд на доске боя: оборона, атака, поддержка. Полный ряд даёт бонус (см. иконки 🛡⚔✨).' },
    { t: 'Колонка', d: 'Три карты в одной вертикали (по одной в каждом ряду). Даёт бонус замены при уничтожении.' },
    { t: 'Сила карты (str)', d: 'Здоровье карты в бою. Равна количеству войск.' },
    { t: 'Стоимость карты', d: 'Сколько ⚡ тактики нужно для выкладывания. Зависит от силы, редкости и террейна боя.' },
    { t: 'Редкость', d: 'common / rare / epic / legendary. Влияет на цену в золоте и количество очков найма.' },
    { t: 'Полководец', d: 'Главный юнит на стратегической карте. Может двигаться, воевать, нанимать карты. Погибает при 0 жизней.' },
    { t: 'Уровни', d: 'За победу +10 XP. 10 XP × уровень → новый уровень. На чётных уровнях — перк.' },
    { t: 'Очки найма', d: '2 за город + 1 за деревню. Тратятся на покупку карт в пуле найма.' },
    { t: 'Рынок', d: 'Общий аукцион между фракциями. Лимит ставок: 2 за город + 1 за деревню.' },
    { t: 'Туман войны', d: 'Видно только в радиусе 3 гексов от своих полководцев. Разведанные гексы запоминаются.' },
];

export class GlossaryModal {
    constructor(root) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'glossary-modal-overlay';
        this.overlay.innerHTML = `<div class="glossary-modal"></div>`;
        root.appendChild(this.overlay);
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
            if (e.target.closest?.('[data-close]')) this.hide();
        });
    }
    open() {
        this.overlay.classList.add('visible');
        this._render();
    }
    hide() { this.overlay.classList.remove('visible'); }
    _render() {
        const items = TERMS.map((x) => `
        <div class="gl-item">
          <div class="gl-term">${x.t}</div>
          <div class="gl-desc">${x.d}</div>
        </div>
      `).join('');
        this.overlay.querySelector('.glossary-modal').innerHTML = `
        <h2>Глоссарий</h2>
        <div class="gl-subtitle">Термины и механики игры</div>
        <div class="gl-list">${items}</div>
        <button class="gl-close" data-close="1">Закрыть</button>
      `;
    }
}