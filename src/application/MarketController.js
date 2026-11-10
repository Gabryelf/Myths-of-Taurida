export class MarketController {
    constructor({ world, bus }) {
      this.world = world;
      this.bus = bus;
    }
  
    tryBuy({ offerId }) {
      const factionId = this.world.playerFactionId;
      const result = this.world.market.buyOffer({
        offerId,
        buyerFactionId: factionId,
      });
      if (!result.ok) {
        this.bus.emit('toast:show', { text: result.reason });
        return false;
      }
      this.bus.emit('resources:changed', { factionId });
      this.bus.emit('market:changed', {});
      const goodsLabel = result.goods === 'weapons' ? 'оружия' : 'провизии';
      this.bus.emit('toast:show', {
        text: `Куплено ${result.amount} ${goodsLabel} (-${result.price}💰)`,
      });
      return true;
    }
  }