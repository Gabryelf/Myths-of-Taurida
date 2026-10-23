export class Logger {
    constructor(namespace = 'App') { this.ns = namespace; }
    info(...args)  { console.log(`[${this.ns}]`, ...args); }
    warn(...args)  { console.warn(`[${this.ns}]`, ...args); }
    error(...args) { console.error(`[${this.ns}]`, ...args); }
  }