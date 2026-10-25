import { General } from './General.js';

/**
 * Реестр имён полководцев по фракциям.
 * Фабрика создаёт General по factionId и стартовой позиции.
 */
const GENERAL_NAMES = {
    scythians: 'Скилур',
    bosporus: 'Митридат',
    chersonesos: 'Диофант',
    rome: 'Помпей',
    goths: 'Германарих',
};

let _nextId = 1;

export class GeneralFactory {
    static createForFaction({ factionId, hex }) {
        const name = GENERAL_NAMES[factionId] || `Вождь ${factionId}`;
        return new General({
            id: `gen_${_nextId++}`,
            name,
            factionId,
            hex,
        });
    }

    static nameForFaction(factionId) {
        return GENERAL_NAMES[factionId] || null;
    }
}