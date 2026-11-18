/**
 * Единая точка синхронизации сцены после изменения мира.
 * Заменяет повторяющийся набор rebuild → updateFog → updateCityFaction
 * → refreshBorders → setPickables → resources:changed → refreshMinimap.
 */
 export class SceneSync {
    constructor({ sceneBuilder, input, ui, bus }) {
      this.sceneBuilder = sceneBuilder;
      this.input = input;
      this.ui = ui;
      this.bus = bus;
    }
  
    /**
     * @param {boolean} opts.rebuild   — полная пересборка сцены (по умолчанию true)
     * @param {boolean} opts.resources — эмитить resources:changed (по умолчанию true)
     * @param {string|null} opts.factionId — чьи ресурсы обновить (hot-seat)
     */
    run(world, { rebuild = true, resources = true, factionId = null } = {}) {
      if (!world) return;
      if (rebuild) this.sceneBuilder.rebuild(world);
      this.sceneBuilder.updateFog(world);
      this.sceneBuilder.updateCityFaction(world);
      this.sceneBuilder.refreshBorders();
      this.input.setPickables(this.sceneBuilder.getPickables());
      if (resources) {
        this.bus.emit('resources:changed', {
          factionId: factionId || world.playerFactionId,
        });
      }
      this.ui.quickJump?.refreshMinimap();
    }
  }
  