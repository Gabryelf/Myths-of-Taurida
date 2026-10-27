export class ResourceBar {
    constructor(root) {
        this.el = document.createElement('div');
        this.el.className = 'resource-bar';
        root.appendChild(this.el);
        this._pool = null;
    }

    bind(pool) {
        this._pool = pool;
        this._render();
    }

    refresh() { this._render(); }

    _render() {
        if (!this._pool) { this.el.innerHTML = ''; return; }
        this.el.innerHTML = `
        <div class="res" title="Золото">
          <span class="res-icon gold"></span>
          <span>${this._pool.gold}</span>
        </div>
        <div class="res" title="Провизия">
          <span class="res-icon prov"></span>
          <span>${this._pool.prov}</span>
        </div>
        <div class="res" title="Оружие">
          <span class="res-icon weapons"></span>
          <span>${this._pool.weapons}</span>
        </div>
      `;
    }
}