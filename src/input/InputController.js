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

    // ─── Клавиатура ───
    this._keys = new Set();

    // ─── Edge-scroll ───
    this._mousePos = { x: 0, y: 0 };
    this._edgeSize = 40;        // пикселей от края
    this._edgeSpeed = 1.6;      // скорость edge-scroll
    this._edgeRafId = null;

    this._bind();
    this._startEdgeLoop();
  }

  setPickables(objs) { this._pickables = objs; }
  attachCameraController(controller) { this._cameraController = controller; }

  _bind() {
    const c = this.canvas;

    // ─── Мышь ───
    c.addEventListener('mousedown', (e) => {
      // ЛКМ или ПКМ — обе начинают drag
      if (e.button !== 0 && e.button !== 2) return;
      this._isDragging = true;
      this._dragMoved = false;
      this._prev = { x: e.clientX, y: e.clientY };
      this._dragButton = e.button;
      if (e.button === 2) c.style.cursor = 'grabbing';
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mouseup', () => {
      this._isDragging = false;
      this._dragButton = -1;
      c.style.cursor = 'default';
    });

    window.addEventListener('mousemove', (e) => {
      this._mousePos = { x: e.clientX, y: e.clientY };
      if (this._isDragging && this._cameraController) {
        const dx = e.clientX - this._prev.x;
        const dy = e.clientY - this._prev.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._dragMoved = true;
        this._prev = { x: e.clientX, y: e.clientY };
        this._cameraController.pan(dx, dy);
        return;
      }
      this._handleHover(e);
    });

    c.addEventListener('click', (e) => {
      // Только ЛКМ и только если не двигали
      if (e.button !== 0) return;
      if (this._dragMoved) { this._dragMoved = false; return; }
      this._handleClick(e);
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._cameraController?.zoom(e.deltaY);
    }, { passive: false });

    // ─── Тач ───
    let touchStart = null;
    let touchId = null;
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchId = t.identifier;
        touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
        this._isDragging = true;
        this._dragMoved = false;
        this._prev = { x: t.clientX, y: t.clientY };
      }
    }, { passive: true });

    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this._isDragging && this._cameraController) {
        const t = e.touches[0];
        const dx = t.clientX - this._prev.x;
        const dy = t.clientY - this._prev.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._dragMoved = true;
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
      touchId = null;
    }, { passive: true });

    // ─── Клавиатура ───
    window.addEventListener('keydown', (e) => {
      // Не перехватываем, если фокус в input/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
           '+', '-', '=', '_'].includes(key)) {
        this._keys.add(key);
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.key.toLowerCase());
    });

    // ─── Основной игровой цикл для клавиш и edge-scroll ───
    this._startUpdateLoop();
  }

  _startUpdateLoop() {
    const tick = () => {
      if (!this._cameraController) { requestAnimationFrame(tick); return; }
      const k = this._keys;
      let dx = 0, dy = 0;
      const speed = 4;
      if (k.has('w') || k.has('arrowup'))    dy -= speed;
      if (k.has('s') || k.has('arrowdown'))  dy += speed;
      if (k.has('a') || k.has('arrowleft'))  dx -= speed;
      if (k.has('d') || k.has('arrowright')) dx += speed;
      if (dx !== 0 || dy !== 0) this._cameraController.pan(dx * 2, dy * 2);

      // Зум с клавиатуры
      if (k.has('+') || k.has('=')) this._cameraController.zoom(-60);
      if (k.has('-') || k.has('_')) this._cameraController.zoom(60);

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  _startEdgeLoop() {
    const tick = () => {
      if (this._cameraController && this._mousePos) {
        const { x, y } = this._mousePos;
        const W = window.innerWidth;
        const H = window.innerHeight;
        let dx = 0, dy = 0;
        if (x < this._edgeSize)            dx = -this._edgeSpeed;
        else if (x > W - this._edgeSize)   dx = this._edgeSpeed;
        if (y < this._edgeSize)            dy = -this._edgeSpeed;
        else if (y > H - this._edgeSize)   dy = this._edgeSpeed;
        if (dx !== 0 || dy !== 0) this._cameraController.pan(dx, dy);
      }
      this._edgeRafId = requestAnimationFrame(tick);
    };
    this._edgeRafId = requestAnimationFrame(tick);
  }

  _pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this._pickables.length === 0) {
      return { tile: null, general: null, city: null, hoverType: null };
    }
    const hits = this.raycaster.intersectObjects(this._pickables, true);
    let tile = null;
    let general = null;
    let city = null;
    let hoverType = null;
    for (const h of hits) {
      let cur = h.object;
      while (cur) {
        const ud = cur.userData;
        if (ud?.hoverable === 'general' && !general) {
          general = ud.general;
          hoverType = 'general';
        }
        if (ud?.hoverable === 'city' && !city) {
          city = ud.city;
          if (!general) hoverType = 'city';
        }
        if (ud?.tile && !tile) tile = ud.tile;
        cur = cur.parent;
      }
      if (general && tile && city) break;
    }
    return { tile, general, city, hoverType };
  }

  _handleClick(e) {
    const { tile, general, city } = this._pick(e.clientX, e.clientY);
    this.onTileClick?.(tile, general, city);
  }

  _handleHover(e) {
    const { tile, hoverType, general } = this._pick(e.clientX, e.clientY);
    const key = `${hoverType || 'none'}:${general?.id || ''}:${tile?.key || ''}`;
    if (key === this._lastHoverKey) return;
    this._lastHoverKey = key;
    let cursor = 'default';
    if (hoverType === 'general' || hoverType === 'city') cursor = 'pointer';
    else if (this._isDragging) cursor = 'grabbing';
    this.canvas.style.cursor = cursor;
    this.onTileHover?.(tile, { x: e.clientX, y: e.clientY }, { hoverType, general });
  }
}