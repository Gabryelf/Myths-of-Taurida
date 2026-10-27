/**
 * Колода полководца. Содержит карты.
 * Считает суммарную силу, лимит, умеет перемешивать.
 */
 export class Deck {
    constructor(capacity = 20) {
      this.capacity = capacity;
      this.cards = [];
    }
  
    get size() { return this.cards.length; }
    get totalStrength() { return this.cards.reduce((s, c) => s + c.str, 0); }
    get isFull() { return this.totalStrength >= this.capacity; }
  
    canAdd(card) { return this.totalStrength + card.str <= this.capacity; }
  
    add(card) {
      if (!this.canAdd(card)) return false;
      this.cards.push(card);
      return true;
    }
  
    remove(cardId) {
      const i = this.cards.findIndex((c) => c.id === cardId);
      if (i === -1) return null;
      return this.cards.splice(i, 1)[0];
    }
  
    clear() { this.cards = []; }
  
    shuffle() {
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
      return this;
    }
  
    draw() { return this.cards.pop() || null; }
    clone() {
      const d = new Deck(this.capacity);
      d.cards = this.cards.map((c) => c.clone());
      return d;
    }
  }