export const Theme = {
  colors: {
    background: 0x0a0d12,
    fog: 0x0a0d12,
    sun: 0xffe0b0,
    ambient: 0x6a5a4a,
    rim: 0x5a7ab0,
  },

  // ─── ОСВЕЩЕНИЕ ───
  light: {
    ambient: {
      color: 0x6a5a4a,
      intensity: 0.35,          // ← мягкая база (было 0.01 — фактически выкл)
    },
    sun: {
      color: 0xffe0b0,
      intensity: 0.8,           // ← основной directional (было 0.01)
      position: { x: 20, y: 30, z: 10 },
      castShadow: true,
      shadowMapSize: 2048,
      shadowCamera: { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 100 },
      shadowBias: -0.0005,
      normalBias: 0.02,
    },
    rim: {
      color: 0x5a7ab0,
      intensity: 0.25,          // ← лёгкий контровой (было 0.01)
      position: { x: -18, y: 14, z: -16 },
    },
    hemi: {
      skyColor: 0x8ec5e8,
      groundColor: 0x3a2a18,
      intensity: 0.15,          // ← было 0.5 (захардкожено) → сильно заливало
    },
    environment: {
      enabled: true,
      intensity: 0.35,          // ← ключевое: приглушает env-карту с 1.0 до 0.35
      exposure: 0.9,            // ← чуть притемняем ACES
    },
  },

  hexSize: 18.0,
  terrain: {
    // ─── Природные — тёмные, «каменные», «пыльные» оттенки ───
    plain:    { color: 0x5a6b3a, roughness: 0.98, metalness: 0, moveCost: 1, yield: { gold: 0, prov: 0, weapons: 0 } },   // было 0xa8bf6a → тёмно-оливковый
    forest:   { color: 0x2e4a20, roughness: 1.0,  metalness: 0, moveCost: 2, yield: { gold: 0, prov: 1, weapons: 0 } },   // было 0x4a6b30 → темнее
    mountain: { color: 0x5a5248, roughness: 0.95, metalness: 0, moveCost: 3, yield: { gold: 0, prov: 0, weapons: 1 } },   // было 0x8a7d6b → тёмно-серый
    steppe:   { color: 0x5a6028, roughness: 0.98, metalness: 0, moveCost: 1, yield: { gold: 0, prov: 1, weapons: 0 } },   // было 0x9cb56a → тёмно-жёлто-зелёный
    sea:      { color: 0x0e2238, roughness: 0.3,  metalness: 0, moveCost: 99, yield: { gold: 0, prov: 0, weapons: 0 } },  // было 0x1a3a5a → тёмнее
    coast:    { color: 0x3a5a6a, roughness: 0.5,  metalness: 0, moveCost: 1, yield: { gold: 1, prov: 0, weapons: 0 } },   // было 0x6ba8c9 → тёмно-бирюзовый
    city:     { color: 0x6a5a30, roughness: 0.85, metalness: 0, moveCost: 1, yield: { gold: 2, prov: 0, weapons: 0 } },   // было 0xc9a860 → тёмно-золотой
    ruins:    { color: 0x4a3e30, roughness: 0.95, metalness: 0, moveCost: 1, yield: { gold: 0, prov: 0, weapons: 0 } },   // было 0x7a6a58 → тёмно-коричневый
    river:    { color: 0x2a4a6a, roughness: 0.35, metalness: 0, moveCost: 1, yield: { gold: 0, prov: 2, weapons: 0 } },   // было 0x4a8fc9 → тёмно-синий
  },
  terrainName: {
    plain: 'Равнина', forest: 'Лес', mountain: 'Горы', steppe: 'Степь',
    sea: 'Море', coast: 'Побережье', city: 'Город', ruins: 'Руины', river: 'Река',
  },
  faction: {
    scythians: 0xc0392b, bosporus: 0x2980b9, chersonesos: 0xd4a94c,
    rome: 0x8b1a1a, goths: 0x7f8c8d,
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
  fog: {
    color: 0x050508,
    opacity: 0.2,
  },
  city: {
    radius: 1.1,
    height: 0.9,
    villageRadius: 0.5,
    villageHeight: 0.4,
    roadWidth: 0.12,
    roadColor: 0x8a7040,
  },
  sea: {
    colorDeep: 0x0a2a4a,       // было 0x081a2e → светлее
    colorShallow: 0x1a6a9a,    // было 0x1a4a6a → заметно светлее
    colorFoam: 0xc0e8f0,       // было 0x9ac8dc → почти белая пена
    sunDirection: { x: 20, y: 30, z: 10 },
    waveScale: 0.18, waveSpeed: 0.7, waveHeight: 0.35, specularity: 32,
    size: 600, y: -0.35,
  },
  sky: {
    color: 0x0a0d12, fogColor: 0x0a0d12, fogDensity: 0,
    starsCount: 300, starsColor: 0xffe8b0, starsSize: 0.35,
    starsRadiusMin: 120, starsRadiusMax: 240, starsOpacity: 0.85,
  },
  general: {
    pedestalColor: 0x5a4020, pedestalEmissive: 0x2a1a08,
    discRadius: 0.55, discHeight: 0.18,
    flagHeight: 0.9, bannerWidth: 0.28, bannerHeight: 0.16,
    selectedGlow: 0xf5d57a,
  },
  movement: {
    color: 0x58a6ff, opacity: 0.35,
    ringWidth: { inner: 0.55, outer: 0.72 },
  },
  card: {
    width: 1.4, height: 2.0,
    typeColor: { warrior: 0xe74c3c, archer: 0x7aa0c8, support: 0x5ec37a, special: 0xc07ad8 },
    rarityColor: { common: 0x8a7a58, rare: 0x58a6ff, epic: 0xa371f7, legendary: 0xf5d57a },
  },
};