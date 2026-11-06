import { General } from './General.js';

/**
 * Пресеты полководцев: имя, движение, жизни.
 * У каждой фракции — 3 варианта (можно расширять).
 */
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
  // ─── Нейтральные: защитники поселений ───
  tauri: [
    { name: 'Тавр-вождь',   move: 3, lives: 3, desc: 'Защитник поселения' },
  ],
  cimmerians: [
    { name: 'Киммериец-старейшина',    move: 3, lives: 3, desc: 'Защитник поселения' },
  ],
};

let _nextId = 1;

export class GeneralFactory {
  static createForFaction({ factionId, hex, presetIndex = 0 }) {
    const presets = GENERAL_PRESETS[factionId] || [{ name: `Вождь ${factionId}`, move: 3, lives: 3 }];
    const preset = presets[presetIndex] || presets[0];
    return new General({
      id: `gen_${_nextId++}`,
      name: preset.name,
      factionId,
      hex,
      movePoints: preset.move,
      maxMovePoints: preset.move,
      lives: preset.lives,
      maxLives: preset.lives,
    });
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