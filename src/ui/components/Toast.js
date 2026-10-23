export class Toast {
    constructor(root) {
      this.root = root;
      this.el = document.createElement('div');
      this.el.className = 'toast';
      root.appendChild(this.el);
      this._timer = null;
    }
  
    show(text, duration = 2400) {
      this.el.textContent = text;
      this.el.classList.add('visible');
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.el.classList.remove('visible'), duration);
    }
  }