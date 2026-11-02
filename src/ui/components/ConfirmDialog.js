export class ConfirmDialog {
    constructor(root, { title, text, confirmText, cancelText, onConfirm, onCancel }) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'confirm-overlay';
      this.overlay.innerHTML = `
        <div class="confirm-dialog">
          <h2>${title}</h2>
          <p>${text}</p>
          <div class="confirm-actions">
            <button class="btn confirm-cancel">${cancelText || 'Отмена'}</button>
            <button class="btn primary confirm-ok">${confirmText || 'Да'}</button>
          </div>
        </div>
      `;
      this.overlay.querySelector('.confirm-ok').addEventListener('click', () => {
        this.overlay.remove();
        onConfirm?.();
      });
      this.overlay.querySelector('.confirm-cancel').addEventListener('click', () => {
        this.overlay.remove();
        onCancel?.();
      });
      root.appendChild(this.overlay);
    }
    open() { /* уже добавлен в DOM */ }
  }