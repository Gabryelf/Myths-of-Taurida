import * as THREE from 'three';

export class InputController {
  constructor({ canvas, camera, onTileClick, onTileHover }) {
    this.canvas = canvas;
    this.camera = camera;
    this.onTileClick = onTileClick;
    this.onTileHover = onTileHover;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._pickables = [];
    this._isDragging = false;
    this._dragMoved = false;
    this._prev = { x: 0, y: 0 };
    this._cameraController = null;
    this._lastHoverKey = null;

    this._bind();
  }

  setPickables(objs) { this._pickables = objs; }
  attachCameraController(controller) { this._cameraController = controller; }

  _bind() {
    const c = this.canvas;

    c.addEventListener('mousedown', (e) => {
      this._isDragging = true;
      this._dragMoved = false;
      this._prev = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => { this._isDragging = false; });

    window.addEventListener('mousemove', (e) => {
      if (this._isDragging && this._cameraController) {
        const dx = e.clientX - this._prev.x;
        const dy = e.clientY - this._prev.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this._dragMoved = true;
        this._prev = { x: e.clientX, y: e.clientY };
        this._cameraController.pan(dx, dy);
        return;
      }
      this._handleHover(e);
    });

    // click срабатывает только если pointer не ушёл далеко; на всякий случай проверяем ещё раз
    c.addEventListener('click', (e) => {
      if (this._dragMoved) { this._dragMoved = false; return; }
      this._handleClick(e);
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._cameraController?.zoom(e.deltaY);
    }, { passive: false });

    // Тач
    let touchStart = null;
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        };
        this._isDragging = true;
        this._dragMoved = false;
        this._prev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this._isDragging && this._cameraController) {
        const t = e.touches[0];
        const dx = t.clientX - this._prev.x;
        const dy = t.clientY - this._prev.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this._dragMoved = true;
        this._prev = { x: t.clientX, y: t.clientY };
        this._cameraController.pan(dx, dy);
      }
    }, { passive: true });

    c.addEventListener('touchend', (e) => {
      this._isDragging = false;
      if (!touchStart) return;
      if (!this._dragMoved && Date.now() - touchStart.time < 400) {
        const last = e.changedTouches[0];
        this._handleClick({ clientX: last.clientX, clientY: last.clientY });
      }
      touchStart = null;
    }, { passive: true });
  }

  _pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this._pickables.length === 0) return { tile: null, general: null };

    const hits = this.raycaster.intersectObjects(this._pickables, true);

    let tile = null;
    let general = null;

    for (const h of hits) {
      let cur = h.object;
      while (cur) {
        const ud = cur.userData;
        if (!general && ud?.general) general = ud.general;
        if (!tile && ud?.tile) tile = ud.tile;
        if (general && tile) break;
        cur = cur.parent;
      }
      if (general && tile) break;
    }

    // ─── Если нашли general, но не tile — берём tile по позиции генерала ───
    // (часто бывает: клик попал в верхушку маркера, а плита ниже)
    if (general && !tile) {
      // tile можно найти по ключу hex, если у нас есть карта (не в InputController),
      // поэтому отдаём null — Game обработает fallback по general.hex.
    }

    return { tile, general };
  }

  _handleClick(e) {
    const { tile, general } = this._pick(e.clientX, e.clientY);
    this.onTileClick?.(tile, general);
  }

  _handleHover(e) {
    const { tile } = this._pick(e.clientX, e.clientY);
    const key = tile?.key ?? null;
    if (key === this._lastHoverKey) return;
    this._lastHoverKey = key;
    this.canvas.style.cursor = tile ? 'pointer' : 'default';
    this.onTileHover?.(tile, { x: e.clientX, y: e.clientY });
  }
}