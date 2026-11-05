import { PlayerProfile } from './PlayerProfile.js';

const KEY = 'tavrida_profile_v1';

export class SaveManager {
    static load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return null;
            return PlayerProfile.fromJSON(JSON.parse(raw));
        } catch (e) {
            console.warn('[SaveManager.load]', e);
            return null;
        }
    }

    static save(profile) {
        try {
            localStorage.setItem(KEY, JSON.stringify(profile.toJSON()));
        } catch (e) {
            console.warn('[SaveManager.save]', e);
        }
    }

    static reset() {
        localStorage.removeItem(KEY);
    }
}