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