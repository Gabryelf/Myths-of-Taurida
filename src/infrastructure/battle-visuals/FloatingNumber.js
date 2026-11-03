/**
 * Всплывающая цифра урона/лечения над ячейкой.
 * Не знает о домене — просто DOM-элемент с CSS-анимацией.
 */
 export class FloatingNumber {
    /**
     * @param {HTMLElement} container — родитель (например, .battle-arena)
     * @param {HTMLElement} anchorEl  — элемент-якорь (ячейка или карта)
     * @param {string} text           — текст ("-1", "+2")
     * @param {'damage'|'heal'|'general'|'info'} kind
     */
    static spawn(container, anchorEl, text, kind = 'damage') {
      if (!container || !anchorEl) return;
      const cRect = container.getBoundingClientRect();
      const aRect = anchorEl.getBoundingClientRect();
      const x = aRect.left - cRect.left + aRect.width / 2;
      const y = aRect.top - cRect.top + aRect.height / 2;
  
      const el = document.createElement('div');
      el.className = `floating-number fn-${kind}`;
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      container.appendChild(el);
  
      // Удаляем после анимации
      setTimeout(() => {
        el.remove();
      }, 1100);
    }
  }