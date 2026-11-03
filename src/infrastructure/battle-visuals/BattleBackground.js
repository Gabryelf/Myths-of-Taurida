/**
 * Фон боя по террейну. Монтируется в .battle-modal как подслой.
 * 5 вариантов: forest, plain, city, mountain, steppe.
 * Fallback — plain.
 */
 const TERRAIN_CLASSES = {
    forest:   'bg-forest',
    plain:    'bg-plain',
    city:     'bg-city',
    mountain: 'bg-mountain',
    steppe:   'bg-steppe',
    ruins:    'bg-mountain',   // руины — как горы
    river:    'bg-plain',
    coast:    'bg-plain',
    sea:      'bg-plain',
  };
  
  export class BattleBackground {
    constructor(modalEl, terrain) {
      this.modalEl = modalEl;
      this.terrain = terrain || 'plain';
      this.el = document.createElement('div');
      this.el.className = `battle-bg ${TERRAIN_CLASSES[this.terrain] || 'bg-plain'}`;
      // Вставляем первым ребёнком — будет под всем остальным
      modalEl.insertBefore(this.el, modalEl.firstChild);
    }
  
    /** Сменить фон (например, при повторном открытии боя). */
    setTerrain(terrain) {
      this.terrain = terrain || 'plain';
      this.el.className = `battle-bg ${TERRAIN_CLASSES[this.terrain] || 'bg-plain'}`;
    }
  
    destroy() {
      this.el.remove();
    }
  }