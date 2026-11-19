/**
 * Всплывающая цифра урона/лечения над ячейкой.
 * Не знает о домене — просто DOM-элемент с CSS-анимацией.
 */
 export class FloatingNumber {
  /** Старый API — по элементу. */
  static spawn(container, anchorEl, text, kind = 'damage') {
    if (!container || !anchorEl) return;
    const cRect = container.getBoundingClientRect();
    const aRect = anchorEl.getBoundingClientRect();
    const x = aRect.left - cRect.left + aRect.width / 2;
    const y = aRect.top - cRect.top + aRect.height / 2;
    this.spawnAt(container, x, y, text, kind);
  }

  /** Новый API — по координатам. */
  static spawnAt(container, x, y, text, kind = 'damage') {
    if (!container) return;
    const el = document.createElement('div');
    el.className = `floating-number fn-${kind}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
}