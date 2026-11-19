/**
 * Снаряд/удар/вспышка от источника к цели.
 * Принимает КООРДИНАТЫ (x, y) внутри контейнера — не DOM-элементы.
 * Это надёжнее, потому что DOM может перерисоваться.
 */
 export class Projectile {
    /**
     * @param {HTMLElement} container
     * @param {number} fx, fy  — координаты источника
     * @param {number} tx, ty  — координаты цели
     * @param {'archer'|'warrior'|'special'|'support'} kind
     * @param {Function} [onHit]
     */
    static fire(container, fx, fy, tx, ty, kind = 'archer', onHit) {
      if (!container) { onHit?.(); return; }
      const dx = tx - fx;
      const dy = ty - fy;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  
      if (kind === 'archer') {
        // ─── Стрела: линия, летит 260 мс ───
        const el = document.createElement('div');
        el.className = 'projectile proj-archer';
        el.style.left = `${fx}px`;
        el.style.top = `${fy}px`;
        el.style.width = `${len}px`;
        el.style.transform = `rotate(${angle}deg)`;
        container.appendChild(el);
        requestAnimationFrame(() => {
          el.style.transform = `rotate(${angle}deg) scaleX(1)`;
        });
        setTimeout(() => {
          el.remove();
          this._impact(container, tx, ty, kind);
          onHit?.();
        }, 260);
        return;
      }
  
      // ─── Шар/вспышка — движется 320 мс ───
      const el = document.createElement('div');
      el.className = `projectile proj-${kind}`;
      el.style.left = `${fx}px`;
      el.style.top = `${fy}px`;
      container.appendChild(el);
  
      const startTime = performance.now();
      const duration = 320;
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - t, 2);
        el.style.left = `${fx + dx * ease}px`;
        el.style.top = `${fy + dy * ease}px`;
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          el.remove();
          this._impact(container, tx, ty, kind);
          onHit?.();
        }
      };
      requestAnimationFrame(step);
    }
  
    /** Только вспышка (без снаряда). */
    static impactOnly(container, x, y, kind = 'warrior') {
      this._impact(container, x, y, kind);
    }
  
    static _impact(container, x, y, kind) {
      const el = document.createElement('div');
      el.className = `impact impact-${kind}`;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 450);
    }
  }