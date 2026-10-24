/**
 * Оркестратор. Собирает все слои вместе.
 * Никакой бизнес-логики — только жизненный цикл.
 */
import { EventBus } from './EventBus.js';
import { World } from '../domain/world/World.js';
import { Renderer } from '../infrastructure/three/Renderer.js';
import { CameraController } from '../infrastructure/three/CameraController.js';
import { SceneBuilder } from '../infrastructure/three/SceneBuilder.js';
import { InputController } from '../input/InputController.js';
import { UIManager } from '../ui/UIManager.js';
import { Logger } from './Logger.js';
import { Theme } from '../infrastructure/config/ThemeConfig.js';

export class Game {
  constructor({ canvas, uiRoot, toastRoot }) {
    this.logger = new Logger('Game');
    this.bus = new EventBus();
    this.world = new World({ seed: Date.now() & 0xffff, radius: 4 });

    this.renderer = new Renderer(canvas);
    this.cameraController = new CameraController(this.renderer.camera, this.renderer.renderer);
    this.sceneBuilder = new SceneBuilder(this.renderer.scene);

    this.ui = new UIManager({ root: uiRoot, toastRoot, bus: this.bus });

    this.input = new InputController({
      canvas,
      camera: this.renderer.camera,
      onTileClick: (tile) => this._onTileClick(tile),
      onTileHover: (tile, screenPos) => this._onTileHover(tile, screenPos),
    });
    this.input.attachCameraController(this.cameraController);

    this.selectedKey = null;
    this._running = false;
  }

  start(factionId = 'scythians') {
    this.world.selectPlayerFaction(factionId);
    this.sceneBuilder.rebuild(this.world);

    // Подготовить pickables: все меши визуалов
    const pickables = [];
    for (const visual of this.sceneBuilder._visuals.values()) {
      visual.group.traverse((c) => { if (c.isMesh) pickables.push(c); });
    }
    this.input.setPickables(pickables);

    this.cameraController.centerOn(this.world.playerFaction.startHex, Theme.hexSize);
    this._loop();
    this.bus.emit('game:started', { faction: factionId });
    this.logger.info('Game started:', factionId);
  }

  _onTileClick(tile) {
    if (!tile) {
      this.selectedKey = null;
      this.sceneBuilder.highlight.setSelected(null);
      this.bus.emit('tile:selected', { tile: null });
      return;
    }

    this.selectedKey = tile.key;
    const neighbors = tile.hex.neighbors()
      .map((n) => this.world.map.get(n.q, n.r))
      .filter((t) => t && t.isLand)
      .map((t) => t.key);
    this.sceneBuilder.highlight.setSelected(tile.key, neighbors);
    this.bus.emit('tile:selected', { tile });
  }

  _onTileHover(tile, screenPos) {
    this.sceneBuilder.highlight.setHovered(tile ? tile.key : null);
    this.bus.emit('tile:hovered', { tile, screenPos });
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