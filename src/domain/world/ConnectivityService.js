/**
 * Проверка связности территории фракции.
 *
 * Территория связна, если каждый гекс соединён со столицей
 * через цепочку соседних гексов той же фракции.
 *
 * При разрыве:
 *  - отколовшиеся гексы (не города) → нейтральные (factionId = null)
 *  - отколовшиеся деревни → независимые нейтральные деревни
 *  - отколовшиеся города → получают нейтрального генерала-защитника
 */
import { pickRebelDefenderPreset } from './NeutralDefenders.js';

export class ConnectivityService {
    constructor({ world }) {
        this.world = world;
    }

    enforceForAll() {
        const events = [];
        for (const faction of this.world.factions) {
            if (faction.neutral || faction.eliminated) continue;
            const ev = this.enforceForFaction(faction.id);
            events.push(...ev);
        }
        return events;
    }

    enforceForFaction(factionId) {
        const events = [];
        const faction = this.world.factions.find((f) => f.id === factionId);
        if (!faction) return events;

        const capitalTile = this._findCapital(factionId);
        if (!capitalTile) {
            return this._dissolveFaction(factionId);
        }

        const connected = this._bfsConnected(capitalTile, factionId);

        const factionTiles = this.world.map.all().filter(
            (t) => t.isLand && t.factionId === factionId
        );
        const disconnected = factionTiles.filter((t) => !connected.has(t.key));
        if (disconnected.length === 0) return events;

        // 1. Отколовшиеся города
        for (const tile of disconnected) {
            if (!tile.cityId) continue;
            const city = this.world.getCity(tile.cityId);
            if (!city || city.factionId !== factionId) continue;
            if (!city.isCity) continue; // деревни обрабатываются ниже

            const rebelFaction = this._pickRebelFaction(tile);
            city.factionId = null;
            city.settlement = false;
            city.neutralFaction = rebelFaction;
            tile.setFaction(null);

            // Защитник-отколовшийся
            const preset = pickRebelDefenderPreset(city, rebelFaction);
            if (preset) {
                if (!this.world._rebelDefenders) this.world._rebelDefenders = new Map();
                this.world._rebelDefenders.set(city.id, {
                    id: `rebel_${city.id}`,
                    name: preset.name,
                    factionId: rebelFaction,
                    lives: preset.lives,
                    maxLives: preset.maxLives,
                    presetIndex: preset.presetIndex ?? 0,
                    portraitUrl: preset.portrait || null,
                    deck: { cards: this.world._defenderDeckFromPreset(preset.cardPool) },
                    isSettlementDefender: true,
                    isRebelDefender: true,
                    hex: tile.hex,
                });
            }

            events.push({
                type: 'city',
                city,
                tile,
                rebelFaction,
                text: `Город «${city.name}» откололся от империи`,
            });
        }

        // 2. Отколовшиеся деревни
        for (const tile of disconnected) {
            if (!tile.cityId) continue;
            const city = this.world.getCity(tile.cityId);
            if (!city || city.isCity) continue;
            if (city.factionId !== factionId) continue;

            const rebelFaction = this._pickRebelFaction(tile);
            city.factionId = null;
            city.neutralFaction = rebelFaction;
            tile.setFaction(null);
            events.push({
                type: 'village',
                city,
                tile,
                rebelFaction,
                text: `Деревня «${city.name}» стала независимой`,
            });
        }

        // 3. Обычные гексы
        for (const tile of disconnected) {
            if (tile.cityId) continue;
            tile.setFaction(null);
            events.push({ type: 'tile', tile, text: 'Территория откололась' });
        }

        if (!this.world.cities.some((c) => c.factionId === factionId)) {
            faction.eliminated = true;
            this.world.onFactionEliminated?.(factionId);
        }

        return events;
    }

    _bfsConnected(startTile, factionId) {
        const visited = new Set();
        if (startTile.factionId !== factionId) return visited;
        const queue = [startTile];
        visited.add(startTile.key);
        while (queue.length > 0) {
            const cur = queue.shift();
            for (const n of cur.hex.neighbors()) {
                const nt = this.world.map.get(n.q, n.r);
                if (!nt || !nt.isLand) continue;
                if (nt.factionId !== factionId) continue;
                if (visited.has(nt.key)) continue;
                visited.add(nt.key);
                queue.push(nt);
            }
        }
        return visited;
    }

    _findCapital(factionId) {
        const faction = this.world.factions.find((f) => f.id === factionId);
        if (!faction) return null;
        const factionCities = this.world.cities.filter((c) => c.factionId === factionId);
        if (factionCities.length === 0) return null;
        if (faction.startHex) {
            let best = null;
            let bestDist = Infinity;
            for (const c of factionCities) {
                if (!c.tileKey) continue;
                const t = this.world.map.getByKey(c.tileKey);
                if (!t) continue;
                const dist = t.hex.distance(faction.startHex);
                if (dist < bestDist) { bestDist = dist; best = t; }
            }
            if (best) return best;
        }
        const first = factionCities[0];
        return first.tileKey ? this.world.map.getByKey(first.tileKey) : null;
    }

    _dissolveFaction(factionId) {
        const events = [];
        const faction = this.world.factions.find((f) => f.id === factionId);
        if (!faction) return events;
        for (const tile of this.world.map.all()) {
            if (tile.factionId !== factionId) continue;
            const city = tile.cityId ? this.world.getCity(tile.cityId) : null;
            if (city) {
                const rebelFaction = this._pickRebelFaction(tile);
                city.factionId = null;
                city.neutralFaction = rebelFaction;
                city.settlement = !city.isCity;
            }
            tile.setFaction(null);
        }
        faction.eliminated = true;
        this.world.onFactionEliminated?.(factionId);
        return events;
    }

    _pickRebelFaction(tile) {
        const parity = (tile.hex.q + tile.hex.r) & 1;
        return parity ? 'tauri' : 'cimmerians';
    }
}