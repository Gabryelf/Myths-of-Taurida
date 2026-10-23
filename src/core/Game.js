import { EventBus } from './EventBus.js';
import { World } from '../domain/world/World.js';
import { Renderer } from '../infrastructure/three/Renderer.js';
import { CameraController } from '../infrastructure/three/CameraController.js';
import { SceneBuilder } from '../infrastructure/three/SceneBuilder.js';
import { InputController } from '../input/InputController.js';
import { UIManager } from '../ui/UIManager.js';
import { Logger } from './Logger.js';

/**
 * Оркестратор. Собирает все слои вместе.
 * Никакой бизнес-логики — только жизненный цикл.
 */
export class Game {
  constructor({ canvas, uiRoot, toastRoot }) {
    this.logger = new Logger('Game');
    this.bus = new EventBus();
    this.world = new World({ seed: Date.now() & 0xffff, radius: 4 });

    // Рендер
    this.renderer = new Renderer(canvas);
    this.cameraController = new CameraController(this.renderer.camera, this.renderer.renderer);
    this.sceneBuilder = new SceneBuilder(this.renderer.scene);

    // UI
    this.ui = new UIManager({ root: uiRoot, toastRoot, bus: this.bus });

    // Ввод
    this.input = new InputController({
      canvas,
      camera: this.renderer.camera,
      onTileClick: (tile) => this._onTileClick(tile),
    });

    this._running = false;
  }

  start(factionId = 'scythians') {
    this.world.selectPlayerFaction(factionId);
    this.sceneBuilder.rebuild(this.world);
    this.cameraController.centerOn(this.world.playerFaction.startHex, 2.0);
    this._setupSubscriptions();
    this._loop();
    this.bus.emit('game:started', { faction: factionId });
    this.logger.info('Game started:', factionId);
  }

  _setupSubscriptions() {
    this.bus.on('toast:show', ({ text }) => this.ui.toast.show(text));
  }

  _onTileClick(tile) {
    if (!tile) return;
    const terrain = tile.terrain || '?';
    const faction = tile.factionId ? ` · ${tile.factionId}` : '';
    this.bus.emit('toast:show', { text: `Клетка (${tile.hex.q}, ${tile.hex.r}) — ${terrain}${faction}` });
  }

  _loop() {
    if (this._running) return;
    this._running = true;
    const tick = () => {
      if (!this._running) return;
      this.renderer.tick();
      requestAnimationFrame(tick);
    };
    tick();
  }

  stop() { this._running = false; }
}