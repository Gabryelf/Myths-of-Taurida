export const Theme = {
  colors: {
    background: 0x0a0d12,
    fog: 0x0a0d12,
    sun: 0xffe0b0,
    ambient: 0x6a5a4a,
    rim: 0x5a7ab0,
  },
  hexSize: 2.0,
  terrain: {
    plain: { color: 0xa8bf6a, roughness: 0.95 },
    forest: { color: 0x4a6b30, roughness: 1.0 },
    mountain: { color: 0x8a7d6b, roughness: 0.9 },
    steppe: { color: 0x9cb56a, roughness: 0.95 },
    sea: { color: 0x1a3a5a, roughness: 0.2 },
  },
  terrainName: {
    plain: 'Равнина', forest: 'Лес', mountain: 'Горы', steppe: 'Степь', sea: 'Море',
  },
  faction: {
    scythians: 0xc0392b,
    bosporus: 0x2980b9,
    chersonesos: 0xd4a94c,
    rome: 0x8b1a1a,
    goths: 0x7f8c8d,
  },
  factionName: {
    scythians: 'Скифы', bosporus: 'Боспор', chersonesos: 'Херсонес',
    rome: 'Рим', goths: 'Готы',
  },
  highlight: {
    hover: { color: 0x58a6ff, opacity: 0.35 },
    selected: { color: 0xf5d57a, opacity: 0.65 },
    neighbor: { color: 0x6ab0ff, opacity: 0.22 },
  },
  sea: {
    colorDeep: 0x081a2e,
    colorShallow: 0x1a4a6a,
    colorFoam: 0x9ac8dc,
    sunDirection: { x: 20, y: 30, z: 10 },
    waveScale: 0.18,        // частота волн
    waveSpeed: 0.7,         // скорость
    waveHeight: 0.35,       // амплитуда
    specularity: 32,        // резкость блика
    size: 600,              // сторона плоскости моря
    y: -0.35,               // высота над сценой
  },

  sky: {
    color: 0x0a0d12,
    fogColor: 0x0a0d12,
    fogDensity: 0.012,
    starsCount: 800,
    starsColor: 0xffe8b0,
    starsSize: 0.35,
    starsRadiusMin: 120,
    starsRadiusMax: 240,
    starsOpacity: 0.85,
  },

  general: {
    pedestalColor: 0x5a4020,
    pedestalEmissive: 0x2a1a08,
    discRadius: 0.55,         // от size
    discHeight: 0.18,         // от size
    flagHeight: 0.9,          // от size
    bannerWidth: 0.28,        // от size
    bannerHeight: 0.16,       // от size
    selectedGlow: 0xf5d57a,
  },

  movement: {
    color: 0x58a6ff,
    opacity: 0.35,
    ringWidth: { inner: 0.55, outer: 0.72 },  // от size
  },

  card: {
    width: 1.4,
    height: 2.0,
    typeColor: {
      warrior: 0xe74c3c,
      archer:  0x7aa0c8,
      support: 0x5ec37a,
      special: 0xc07ad8,
    },
  },
};