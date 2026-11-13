import { General } from './General.js';

export const GENERAL_PRESETS = {
  scythians: [
    { name: 'Скилур',     move: 4, lives: 3, desc: 'Быстрый, средний' },
    { name: 'Палак',      move: 3, lives: 4, desc: 'Стойкий' },
    { name: 'Атей',       move: 5, lives: 2, desc: 'Очень быстрый, хрупкий' },
  ],
  bosporus: [
    { name: 'Митридат',   move: 3, lives: 3, desc: 'Сбалансированный' },
    { name: 'Фарнак',     move: 4, lives: 3, desc: 'Мобильный' },
    { name: 'Асандр',     move: 3, lives: 4, desc: 'Танк' },
  ],
  chersonesos: [
    { name: 'Диофант',    move: 3, lives: 3, desc: 'Сбалансированный' },
    { name: 'Агасикл',    move: 3, lives: 4, desc: 'Стойкий' },
    { name: 'Сириск',     move: 4, lives: 3, desc: 'Мобильный' },
  ],
  rome: [
    { name: 'Помпей',     move: 3, lives: 4, desc: 'Тяжёлый' },
    { name: 'Цезарь',     move: 4, lives: 3, desc: 'Быстрый' },
    { name: 'Красс',      move: 3, lives: 4, desc: 'Богатый' },
  ],
  goths: [
    { name: 'Германарих', move: 4, lives: 3, desc: 'Быстрый' },
    { name: 'Аларих',     move: 4, lives: 3, desc: 'Агрессивный' },
    { name: 'Теодорих',   move: 3, lives: 4, desc: 'Стойкий' },
  ],
  tauri: [
    { name: 'Тавр-вождь', move: 3, lives: 3, desc: 'Защитник поселения' },
  ],
  cimmerians: [
    { name: 'Киммериец-старейшина', move: 3, lives: 3, desc: 'Защитник поселения' },
  ],
};

let _nextId = 1;

export class GeneralFactory {
  /**
   * Создать генерала, выбрав СВОБОДНЫЙ presetIndex (не занятый живым генералом).
   * Павшие генералы освобождают свои слоты.
   *
   * @param {Object} opts
   * @param {string} opts.factionId
   * @param {Object} opts.hex
   * @param {number} [opts.presetIndex] — если передан, используется принудительно
   * @param {General[]} [opts.existingGenerals] — все генералы мира (для поиска свободного слота)
   */
  static createForFaction({ factionId, hex, presetIndex = null, existingGenerals = [] }) {
    const presets = GENERAL_PRESETS[factionId] || [
      { name: `Вождь ${factionId}`, move: 3, lives: 3 },
    ];

    let finalIndex;
    if (presetIndex !== null && presetIndex !== undefined) {
      finalIndex = presetIndex;
    } else {
      // Ищем свободный presetIndex
      const usedIndices = new Set(
        existingGenerals
          .filter((g) => g.factionId === factionId && g.alive)
          .map((g) => g.presetIndex ?? 0)
      );
      finalIndex = -1;
      for (let i = 0; i < presets.length; i++) {
        if (!usedIndices.has(i)) {
          finalIndex = i;
          break;
        }
      }
      // Если все слоты заняты — берём presetIndex умершего генерала
      if (finalIndex === -1) {
        const deadWithSlot = existingGenerals.find(
          (g) => g.factionId === factionId && !g.alive
        );
        finalIndex = deadWithSlot?.presetIndex ?? 0;
      }
    }

    const preset = presets[finalIndex] || presets[0];
    const gen = new General({
      id: `gen_${_nextId++}`,
      name: preset.name,
      factionId,
      hex,
      movePoints: preset.move,
      maxMovePoints: preset.move,
      lives: preset.lives,
      maxLives: preset.lives,
    });
    gen.presetIndex = finalIndex;
    return gen;
  }

  static presetFor(factionId, index = 0) {
    const presets = GENERAL_PRESETS[factionId] || [];
    return presets[index] || presets[0] || null;
  }

  static nameForFaction(factionId) {
    const presets = GENERAL_PRESETS[factionId] || [];
    return presets[0]?.name || null;
  }
}