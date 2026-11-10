/**
 * Конфиг типов ореолов. Каждый тип — связная группа гексов
 * с фиксированным размером и доходом.
 *
 * size — фиксированное число гексов в ореоле этого типа.
 * yield — сколько ресурсов получает монополист за ход.
 */
 export const HALO_TYPES = {
    wheat: {
      name: 'Пшеничные поля', icon: '🌾', color: 0xd4a94c,
      size: 5,
      yield: { gold: 1, prov: 3, weapons: 0 },
    },
    pasture: {
      name: 'Пастбища', icon: '🐎', color: 0x8a6b2e,
      size: 5,
      yield: { gold: 1, prov: 2, weapons: 0 },
    },
    mine: {
      name: 'Рудник', icon: '⛏', color: 0x7a8a9a,
      size: 4,
      yield: { gold: 0, prov: 0, weapons: 3 },
    },
    hunt: {
      name: 'Охотничьи угодья', icon: '🏹', color: 0x5a6b30,
      size: 4,
      yield: { gold: 1, prov: 1, weapons: 1 },
    },
    fishery: {
      name: 'Рыболовные угодья', icon: '🐟', color: 0x3a7a9a,
      size: 4,
      yield: { gold: 1, prov: 2, weapons: 0 },
    },
    sawmill: {
      name: 'Лесопилка', icon: '🌲', color: 0x4a6b30,
      size: 5,
      yield: { gold: 3, prov: 0, weapons: 0 },
    },
    vineyard: {
      name: 'Виноградники', icon: '🍇', color: 0x7a2a4a,
      size: 4,
      yield: { gold: 2, prov: 1, weapons: 0 },
    },
    apiary: {
      name: 'Пасека', icon: '🐝', color: 0xc9a860,
      size: 3,
      yield: { gold: 2, prov: 0, weapons: 0 },
    },
    salt: {
      name: 'Соляные копи', icon: '🧂', color: 0xd0d0e0,
      size: 3,
      yield: { gold: 1, prov: 0, weapons: 2 },
    },
    pottery: {
      name: 'Гончарные мастерские', icon: '⚱', color: 0x9a6a3a,
      size: 3,
      yield: { gold: 2, prov: 0, weapons: 0 },
    },
  };
  
  /** Базовый доход города (сверх ореола). */
  export const CITY_BASE_YIELD = { gold: 3, prov: 2, weapons: 1 };
  
  /** Базовый доход деревни / поселения. */
  export const VILLAGE_BASE_YIELD = { gold: 1, prov: 1, weapons: 0 };
  
  /** Пул типов ореолов для городов и для деревень. */
  export const CITY_HALO_POOL = ['wheat', 'sawmill', 'vineyard', 'salt', 'mine'];
  export const VILLAGE_HALO_POOL = ['pasture', 'fishery', 'pottery', 'apiary', 'hunt'];

  /**
 * Палитра цветов для ореолов. Достаточно различимых на тёмной карте.
 * Присваивается по кругу — гарантирует, что соседние ореолы будут разными
 * (в комбинации с детерминированным seed).
 */
export const HALO_PALETTE = [
    0xe74c3c, // красный
    0x3498db, // синий
    0x2ecc71, // зелёный
    0xf39c12, // оранжевый
    0x9b59b6, // фиолетовый
    0x1abc9c, // бирюзовый
    0xe67e22, // тёмно-оранжевый
    0x16a085, // тёмно-бирюзовый
    0xc0392b, // тёмно-красный
    0x8e44ad, // тёмно-фиолетовый
    0x27ae60, // тёмно-зелёный
    0xd35400, // ржавый
    0x2980b9, // тёмно-синий
    0xf1c40f, // жёлтый
    0x7f8c8d, // серый
    0xecf0f1, // белый
  ];
  
  /** Взять цвет по индексу (по кругу). */
  export function haloColorAt(index) {
    return HALO_PALETTE[index % HALO_PALETTE.length];
  }