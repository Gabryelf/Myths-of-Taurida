/**
 * Простая шина событий. Обеспечивает слабую связность между модулями.
 * Любой класс может публиковать и слушать события, не зная о других.
 */
 export class EventBus {
    constructor() {
      this._handlers = new Map();
    }
  
    on(type, handler) {
      if (!this._handlers.has(type)) this._handlers.set(type, new Set());
      this._handlers.get(type).add(handler);
      return () => this.off(type, handler);
    }
  
    off(type, handler) {
      this._handlers.get(type)?.delete(handler);
    }
  
    emit(type, payload) {
      const handlers = this._handlers.get(type);
      if (!handlers) return;
      for (const h of handlers) {
        try { h(payload); } catch (e) {
          console.error(`[EventBus] "${type}"`, e);
        }
      }
    }
  
    clear() { this._handlers.clear(); }
  }