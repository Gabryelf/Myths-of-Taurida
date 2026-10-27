/**
 * Оркестрация найма. Связывает UI и домен через EventBus.
 */
export class RecruitController {
    constructor({ world, bus }) {
        this.world = world;
        this.bus = bus;
    }

    tryRecruit(cardKey) {
        const factionId = this.world.playerFactionId;
        if (!factionId) return;

        const result = this.world.recruit.recruit(factionId, cardKey);
        if (!result.ok) {
            this.bus.emit('toast:show', { text: result.reason });
            return;
        }

        this.bus.emit('resources:changed', { factionId });
        this.bus.emit('deck:changed', { general: this.world.playerGeneral });
        this.bus.emit('card:recruited', { card: result.card });
        this.bus.emit('toast:show', {
            text: `${result.card.name} нанят (-${result.cost.gold}💰)`,
        });
    }
}