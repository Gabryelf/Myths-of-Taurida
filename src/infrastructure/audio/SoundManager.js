/**
 * Менеджер звука. HTMLAudio + кэш + mute (localStorage).
 * Пути — в /sounds/ (public/sounds/). Если файла нет — play() не сломает игру.
 */
const SOUNDS = {
    click: '/sounds/click.mp3',
    play: '/sounds/play.mp3',
    hit: '/sounds/hit.mp3',
    victory: '/sounds/victory.mp3',
    defeat: '/sounds/defeat.mp3',
    turn: '/sounds/turn.mp3',
};

export class SoundManager {
    constructor() {
        this._cache = new Map();
        this._volume = 0.6;
        this._muted = localStorage.getItem('tavrida_sound') === 'muted';
    }

    play(key) {
        if (this._muted) return;
        const url = SOUNDS[key];
        if (!url) return;
        let audio = this._cache.get(key);
        if (!audio) {
            audio = new Audio(url);
            audio.volume = this._volume;
            audio.preload = 'auto';
            this._cache.set(key, audio);
        }
        try {
            audio.currentTime = 0;
            audio.play().catch(() => { });
        } catch (_) { }
    }

    setMuted(v) {
        this._muted = v;
        localStorage.setItem('tavrida_sound', v ? 'muted' : 'on');
    }
    isMuted() { return this._muted; }
    toggleMute() { this.setMuted(!this._muted); return this._muted; }
}