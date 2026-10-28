import { Toast } from './components/Toast.js';
import { Tooltip } from './components/Tooltip.js';
import { GeneralPanel } from './components/GeneralPanel.js';
import { EndTurnButton } from './components/EndTurnButton.js';
import { ResourceBar } from './components/ResourceBar.js';
import { DeckPanel } from './components/DeckPanel.js';
import { RecruitModal } from './components/RecruitModal.js';
import { BattleModal } from './components/BattleModal.js';

export class UIManager {
  constructor({ root, toastRoot, bus, world, onEndTurn, onRecruit, battleController }) {
    this.root = root;
    this.bus = bus;
    this.world = world;

    this.toast = new Toast(toastRoot);
    this.tooltip = new Tooltip(root);
    this.generalPanel = new GeneralPanel(root);
    this.deckPanel = new DeckPanel(root);
    this.resourceBar = new ResourceBar(root);

    this._buildHud();

    this.endTurnButton = new EndTurnButton(this._hudEl, onEndTurn);
    this.recruitModal = new RecruitModal(root, {
      onRecruit: (key) => onRecruit?.(key),
      onClose: () => {},
    });

    this.battleModal = new BattleModal(root, {
      controller: battleController,
      bus,
    });

    this._subscribe();
  }

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'hud-top';
    hud.innerHTML = `
      <div class="title">ТАВРИДА · v0.0.6</div>
      <button class="hud-btn hud-btn-recruit" id="btn-recruit">Найм</button>
    `;
    this.root.appendChild(hud);
    this._hudEl = hud;
    hud.querySelector('#btn-recruit').addEventListener('click', () => this.openRecruit());
  }

  openRecruit() {
    const factionId = this.world.playerFactionId;
    const pool = this.world.resourcePools.get(factionId);
    if (!pool) return;
    this.recruitModal.open({ factionId, pool, economy: this.world.economy });
  }

  bindResources(pool) { this.resourceBar.bind(pool); }

  _subscribe() {
    this.bus.on('tile:hovered', ({ tile, screenPos }) => {
      if (tile) this.tooltip.show(tile, screenPos);
      else this.tooltip.hide();
    });
    this.bus.on('general:selected', ({ general }) => {
      if (general) { this.generalPanel.show(general); this.deckPanel.show(general); }
      else { this.generalPanel.hide(); this.deckPanel.hide(); }
    });
    this.bus.on('general:moved', ({ general, cost }) => {
      this.generalPanel.refresh();
      this.bus.emit('toast:show', {
        text: `${general.name} → (${general.hex.q}, ${general.hex.r}) · -${cost}`,
      });
    });
    this.bus.on('resources:changed', () => {
      const factionId = this.world.playerFactionId;
      const pool = this.world.resourcePools.get(factionId);
      if (pool) this.bindResources(pool);
    });
    this.bus.on('deck:changed', ({ general }) => {
      if (general) this.deckPanel.refresh();
    });
    this.bus.on('turn:ended', () => {
      this.generalPanel.refresh();
      this.deckPanel.refresh();
    });
  }
}