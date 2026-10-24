import { HighlightOverlay } from './visuals/HighlightOverlay.js';
import { Theme } from '../config/ThemeConfig.js';

/**
 * Сервис подсветки. Отделяет "что подсвечено" (UI-состояние) от "как нарисовать".
 * Не знает о домене — работает с визуалами по ключу клетки.
 *
 * Позволяет менять hover/selected/neighbors независимо.
 * Легко расширить: добавить 'path' для будущего маршрута.
 */
export class HighlightService {
    constructor(size) {
        this.size = size;
        this._visualMap = new Map(); // key -> HexVisual
        this._hoverKey = null;
        this._selectedKey = null;
        this._neighborKeys = new Set();
    }

    bindVisuals(map) {
        this._visualMap = map;
        // Создать оверлеи для каждого визуала
        for (const visual of map.values()) {
            visual.attachOverlay('hover', new HighlightOverlay(this.size, 'hover'));
            visual.attachOverlay('selected', new HighlightOverlay(this.size, 'selected'));
            visual.attachOverlay('neighbor', new HighlightOverlay(this.size, 'neighbor'));
        }
    }

    setHovered(key) {
        if (this._hoverKey === key) return;
        this._clearOverlay(this._hoverKey, 'hover');
        this._hoverKey = key;
        if (key) this._setOverlay(key, 'hover');
    }

    setSelected(key, neighborKeys = []) {
        // снять старый
        if (this._selectedKey) this._clearOverlay(this._selectedKey, 'selected');
        for (const k of this._neighborKeys) this._clearOverlay(k, 'neighbor');
        this._neighborKeys.clear();

        this._selectedKey = key;
        if (key) {
            this._setOverlay(key, 'selected');
            for (const k of neighborKeys) {
                this._setOverlay(k, 'neighbor');
                this._neighborKeys.add(k);
            }
        }
    }

    _setOverlay(key, kind) {
        const v = this._visualMap.get(key);
        v?.setOverlayVisible(kind, true);
    }

    _clearOverlay(key, kind) {
        if (!key) return;
        const v = this._visualMap.get(key);
        v?.setOverlayVisible(kind, false);
    }

    clear() {
        this.setHovered(null);
        this.setSelected(null);
    }
}