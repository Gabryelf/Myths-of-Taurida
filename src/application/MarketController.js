export class MarketController {
    constructor({ world, bus }) {
        this.world = world;
        this.bus = bus;
    }

    tryAddOffer({ generalId, cardId, price }) {
        const factionId = this.world.playerFactionId;
        const result = this.world.market.addOffer({
            sellerFactionId: factionId, generalId, cardId, price,
        });
        if (!result.ok) {
            this.bus.emit('toast:show', { text: result.reason });
            return false;
        }
        this.bus.emit('deck:changed', { general: this.world.generals.find(g => g.id === generalId) });
        this.bus.emit('market:changed', {});
        this.bus.emit('toast:show', { text: `Ставка выставлена · ${price}💰` });
        return true;
    }

    tryCancelOffer({ offerId, generalId }) {
        const factionId = this.world.playerFactionId;
        const result = this.world.market.cancelOffer({ offerId, factionId, generalId });
        if (!result.ok) {
            this.bus.emit('toast:show', { text: result.reason });
            return false;
        }
        this.bus.emit('deck:changed', { general: this.world.generals.find(g => g.id === generalId) });
        this.bus.emit('market:changed', {});
        this.bus.emit('toast:show', { text: 'Ставка снята' });
        return true;
    }

    tryBuy({ offerId, buyerGeneralId }) {
        const factionId = this.world.playerFactionId;
        const result = this.world.market.buyOffer({
            offerId, buyerFactionId: factionId, buyerGeneralId,
        });
        if (!result.ok) {
            this.bus.emit('toast:show', { text: result.reason });
            return false;
        }
        this.bus.emit('resources:changed', { factionId });
        this.bus.emit('deck:changed', { general: this.world.generals.find(g => g.id === buyerGeneralId) });
        this.bus.emit('market:changed', {});
        this.bus.emit('toast:show', { text: `Куплено: ${result.card.name} (-${result.price}💰)` });
        return true;
    }
}