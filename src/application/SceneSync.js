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

  run(world, { rebuild = true, resources = true, factionId = null } = {}) {
    if (!world) return;
    if (rebuild) this.sceneBuilder.rebuild(world);
    this.sceneBuilder.updateGeneralBars?.(world);
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

  