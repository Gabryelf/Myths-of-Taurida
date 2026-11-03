/**
 * Снаряд/удар/вспышка от карты-источника к цели.
 * Тип визуала зависит от карты:
 *   archer  → стрела (линия)
 *   warrior → вспышка удара (круг)
 *   special → магический шар (круг с glow)
 *   support → зелёная волна (круг)
 */
export class Projectile {
    /**
     * @param {HTMLElement} container — родитель (.battle-arena)
     * @param {HTMLElement} fromEl    — якорь-источник
     * @param {HTMLElement} toEl      — якорь-цель
     * @param {'archer'|'warrior'|'special'|'support'} kind
     * @param {Function} [onHit]      — колбэк при попадании
     */
    static fire(container, fromEl, toEl, kind = 'archer', onHit) {
        if (!container || !fromEl || !toEl) { onHit?.(); return; }
        const cRect = container.getBoundingClientRect();
        const fRect = fromEl.getBoundingClientRect();
        const tRect = toEl.getBoundingClientRect();

        const fx = fRect.left - cRect.left + fRect.width / 2;
        const fy = fRect.top - cRect.top + fRect.height / 2;
        const tx = tRect.left - cRect.left + tRect.width / 2;
        const ty = tRect.top - cRect.top + tRect.height / 2;

        const dx = tx - fx;
        const dy = ty - fy;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        const el = document.createElement('div');
        el.className = `projectile proj-${kind}`;
        el.style.left = `${fx}px`;
        el.style.top = `${fy}px`;

        if (kind === 'archer') {
            // Стрела: линия
            el.style.width = `${len}px`;
            el.style.transform = `rotate(${angle}deg)`;
            container.appendChild(el);
            // Анимация: scaleX от 0 до 1
            requestAnimationFrame(() => {
                el.style.transform = `rotate(${angle}deg) scaleX(1)`;
            });
            setTimeout(() => {
                el.remove();
                this._impact(container, tx, ty, kind);
                onHit?.();
            }, 260);
        } else {
            // Шар/вспышка: движется поступательно
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