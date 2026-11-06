/**
 * Фиксированная карта Крыма для Myths of Taurida.
 *
 * Форма — вытянутый полуостров (юго-запад → северо-восток), с Керченским
 * проливом на востоке, Перекопом на севере, Севастополем на юго-западе.
 *
 * Всё детерминировано: seed = 1337, никакого Math.random().
 * При каждой загрузке карта идентична.
 *
 * Экспортирует:
 *   TILES  — [{ q, r, terrain }]  (все гексы)
 *   CITIES — [{ name, q, r, isCity }]
 */
import { mulberry32 } from './mulberry32.js';

// ─── Константы формы ───
const RADIUS = 14;              // большой радиус, гексов будет ~1500
const SEED = 1337;

// Направление вытягивания: ось «юго-запад → северо-восток»
// В axial-координатах: q — запад-восток, r — север-юг (условно).
// Формула: точка внутри эллипса с полуосями A (по q) и B (по r).
const A = 12;   // полуось «запад-восток»
const B = 9;   // полуось «север-юг»

// Центр эллипса — чуть смещён, чтобы форма напоминала Крым
const CX = 2;
const CY = 2;

// ─── Террейны (веса) ───
// Степь — на севере, горы — на юге, лес — на западе/центре, равнины — везде.
// Используем детерминированный шум (hash + mulberry32).

export function generateTauridaTiles() {
    const tiles = [];
    const rng = mulberry32(SEED);

    for (let q = -RADIUS; q <= RADIUS; q++) {
        const rMin = Math.max(-RADIUS, -q - RADIUS);
        const rMax = Math.min(RADIUS, -q + RADIUS);
        for (let r = rMin; r <= rMax; r++) {
            // ─── Маска эллипса «Крым» ───
            // Нормализованные координаты
            const nx = (q - CX) / A;
            const ny = (r - CY) / B;
            const d = nx * nx + ny * ny;

            // Граница «суши»: чем ближе к 1 — тем ближе к побережью.
            // Небольшой детерминированный шум по краю, чтобы форма не была идеальным эллипсом.
            const edgeNoise = (hash(q, r) % 100) / 100 - 0.5;  // -0.5..0.5
            const edgeThreshold = 1.0 + edgeNoise * 0.15;      // 0.85..1.15

            if (d > edgeThreshold) continue;   // море — не добавляем

            // ─── Определяем террейн ───
            // Крым: юг — горы, север — степь, запад — лес/равнина.
            // southness: 0 — север, 1 — юг.
            const southness = 1 - (r - (-B)) / (2 * B);   // 0..1
            const westness = 1 - (q - (-A)) / (2 * A);   // 0..1
            const nTerrain = hash(q * 31, r * 17) % 100;   // 0..99

            let terrain = 'plain';
            if (southness > 0.65) {
                // Юг — горы
                terrain = nTerrain < 55 ? 'mountain' : nTerrain < 80 ? 'forest' : 'plain';
            } else if (southness < 0.35) {
                // Север — степь
                terrain = nTerrain < 60 ? 'steppe' : nTerrain < 85 ? 'plain' : 'forest';
            } else {
                // Центр — смесь
                if (nTerrain < 30) terrain = 'plain';
                else if (nTerrain < 55) terrain = 'forest';
                else if (nTerrain < 75) terrain = 'steppe';
                else if (nTerrain < 90) terrain = 'mountain';
                else terrain = 'ruins';
            }

            // Запад — больше леса
            if (westness > 0.7 && nTerrain < 50) terrain = 'forest';

            tiles.push({ q, r, terrain });
        }
    }

    return tiles;
}

/**
 * Города и деревни Крыма. Привязка — к ближайшему сухому гексу.
 * Координаты подобраны по конфигу карты (см. A, B, CX, CY).
 */
export const TAURIDA_CITIES = [
    // Города
    { name: 'Неаполь Скифский', q: 0, r: 3, isCity: true },
    { name: 'Пантикапей', q: 14, r: 0, isCity: true },
    { name: 'Херсонес', q: -10, r: 8, isCity: true },
    { name: 'Феодосия', q: 10, r: 6, isCity: true },
    { name: 'Керкинитида', q: -6, r: 7, isCity: true },
    { name: 'Сурож', q: 8, r: 9, isCity: true },
    // Деревни
    { name: 'Симболон', q: -4, r: 9, isCity: false },
    { name: 'Танаис', q: 12, r: -5, isCity: false },
    { name: 'Ольвия', q: -12, r: 3, isCity: false },
    { name: 'Боспор Киммерийский', q: 16, r: 2, isCity: false },
    { name: 'Калос-Лимен', q: -8, r: 6, isCity: false },
    { name: 'Парфенион', q: 6, r: 5, isCity: false },
];

/** Детерминированный хеш (не зависит от порядка вызовов). */
function hash(a, b) {
    let h = 2166136261;
    h = (h ^ (a & 0xff)) * 16777619;
    h = (h ^ (b & 0xff)) * 16777619;
    h = (h ^ (a >> 8 & 0xff)) * 16777619;
    h = (h ^ (b >> 8 & 0xff)) * 16777619;
    return h >>> 0;
}