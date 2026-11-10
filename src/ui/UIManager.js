import { Toast } from './components/Toast.js';
import { Tooltip } from './components/Tooltip.js';
import { GeneralPanel } from './components/GeneralPanel.js';
import { EndTurnButton } from './components/EndTurnButton.js';
import { ResourceBar } from './components/ResourceBar.js';
import { DeckPanel } from './components/DeckPanel.js';
import { RecruitModal } from './components/RecruitModal.js';
import { CityPanel } from './components/CityPanel.js';
import { BattleModal } from './components/BattleModal.js';
import { TutorialModal } from './components/TutorialModal.js';
import { TurnIndicator } from './components/TurnIndicator.js';
import { MarketPanel } from './components/MarketPanel.js';
import { FactionsPanel } from './components/FactionsPanel.js';
import { GlossaryModal } from './components/GlossaryModal.js';
import { QuickJump } from './components/QuickJump.js';

export class UIManager {
  constructor({
    root, toastRoot, bus, world,
    onEndTurn, onRecruit,
    battleController, marketController, sound,
  }) {
    this.root = root;
    this.bus = bus;
    this.world = world;
    this.sound = sound;
    this.onHire = null;
    this.onMarket = null;
    this.onRecruit = onRecruit;
    this.onBuySettlement = null;
    this.onAttackCity = null;
    this.onLensToggle = null;   // (kind, enabled) => void

    this.battleController = battleController;
    this.marketController = marketController;

    this.toast = new Toast(toastRoot);
    this.tooltip = new Tooltip(root);
    this.generalPanel = new GeneralPanel(root);
    this.deckPanel = new DeckPanel(root);
    this.resourceBar = new ResourceBar(root);
    this.turnIndicator = new TurnIndicator(root);

    this._buildHud();

    this.endTurnButton = new EndTurnButton(this._hudEl, () => {
      this.sound?.play('click');
      onEndTurn?.();
    });

    this.quickJump = new QuickJump(this.root, {
      world: this.world,
      cameraController: null,
      theme: { hexSize: 18 },
    });

    this.recruitModal = new RecruitModal(root, { bus });
    this.cityPanel = new CityPanel(root, { bus });
    this.battleModal = new BattleModal(root, {
      controller: battleController,
      bus,
    });
    this.tutorial = new TutorialModal(root, () => {
      localStorage.setItem('tavrida_tutorial_v1', '1');
    });
    this.marketPanel = new MarketPanel(root, {
      bus, controller: marketController, world,
    });
    this.factionsPanel = new FactionsPanel(root, { world });
    this.glossary = new GlossaryModal(root);
    this.minimap = null;

    this._subscribe();
  }

  setWorld(world) {
    this.world = world;
    if (this.marketPanel) this.marketPanel.world = world;
    if (this.factionsPanel) this.factionsPanel.world = world;
    if (this.quickJump) this.quickJump.setWorld(world);
  }

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'hud-top';
    hud.innerHTML = `
      <div class="hud-title">ТАВРИДА · v0.1.6</div>
      <div class="hud-right">
        <div class="resource-bar" id="resource-bar"></div>
        <button class="hud-btn lens-btn" id="btn-lens-borders" title="Границы территорий">🗺 Границы</button>
        <button class="hud-btn lens-btn" id="btn-lens-halos" title="Ресурсные ореолы">🌾 Ореолы</button>
        <button class="hud-btn" id="btn-recruit" disabled>Найм</button>
        <button class="hud-btn" id="btn-market">Рынок</button>
        <button class="hud-btn" id="btn-factions">Фракции</button>
        <button class="hud-btn-mute" id="btn-glossary" title="Глоссарий">?</button>
        <button class="hud-btn-mute" id="btn-mute">🔊</button>
      </div>
    `;
    this.root.appendChild(hud);
    this._hudEl = hud;
    this.resourceBar.el = hud.querySelector('#resource-bar');
    this.resourceBar.refresh();

    hud.querySelector('#btn-lens-borders').addEventListener('click', (e) => {
      const on = e.currentTarget.classList.toggle('active');
      this.sound?.play('click');
      this.onLensToggle?.('borders', on);
    });
    hud.querySelector('#btn-lens-halos').addEventListener('click', (e) => {
      const on = e.currentTarget.classList.toggle('active');
      this.sound?.play('click');
      this.onLensToggle?.('halos', on);
    });
    hud.querySelector('#btn-recruit').addEventListener('click', () => {
      this.sound?.play('click');
      if (this.onHire) this.onHire();
    });
    hud.querySelector('#btn-market').addEventListener('click', () => {
      this.sound?.play('click');
      if (this.onMarket) this.onMarket();
    });
    hud.querySelector('#btn-factions').addEventListener('click', () => {
      this.sound?.play('click');
      this.factionsPanel.open();
    });
    hud.querySelector('#btn-glossary').addEventListener('click', () => {
      this.sound?.play('click');
      this.glossary.open();
    });
    const muteBtn = hud.querySelector('#btn-mute');
    if (this.sound?.isMuted()) {
      muteBtn.textContent = '🔇';
      muteBtn.classList.add('muted');
    }
    muteBtn.addEventListener('click', () => {
      const muted = this.sound?.toggleMute();
      muteBtn.textContent = muted ? '🔇' : '🔊';
      muteBtn.classList.toggle('muted', !!muted);
    });
  }

  setHireEnabled(enabled) {
    const btn = this._hudEl.querySelector('#btn-recruit');
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.4';
  }

  initMinimap({ cameraController, onCenter }) {
    if (!this.quickJump) return;
    this.quickJump.initMinimap({
      world: this.world,
      cameraController,
      onCenter,
    });
    this.bus.on('general:moved', () => this.quickJump?.refreshMinimap());
    this.bus.on('turn:ended', () => this.quickJump?.refreshMinimap());
    this.bus.on('battle:finished', () => this.quickJump?.refreshMinimap());
    this.minimap = null;
  }

  openRecruitModal({ factionId, general, world }) {
    this.recruitModal.open({ factionId, general, world });
  }

  openCityPanel({ tile, city, world }) {
    this.cityPanel.onBuySettlement = (cityId) => {
      this.onBuySettlement?.(cityId);
    };
    this.cityPanel.onAttackCity = (cityId, defenderFactionId) => {
      this.onAttackCity?.(cityId, defenderFactionId);
    };
    this.cityPanel.open({ tile, city, world });
  }

  bindResources(pool) {
    this.resourceBar.bind(pool);
  }

  showTutorial(onDone) {
    this.tutorial.onDone = () => {
      localStorage.setItem('tavrida_tutorial_v1', '1');
      onDone?.();
    };
    this.tutorial.open();
  }

  _subscribe() {
    this.bus.on('tile:hovered', () => this.tooltip.hide());
    this.bus.on('general:selected', ({ general }) => {
      if (general) {
        this.generalPanel.show(general);
        this.deckPanel.show(general);
      } else {
        this.generalPanel.hide();
        this.deckPanel.hide();
      }
    });
    this.bus.on('general:moved', () => this.generalPanel.refresh());
    this.bus.on('resources:changed', () => {
      const factionId = this.world?.playerFactionId;
      if (!factionId) return;
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
    this.bus.on('battle:finished', () => this.turnIndicator.hide());
    this.bus.on('ai:turnEnded', () => this.turnIndicator.hide());
  }
}