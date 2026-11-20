import { Toast } from './components/Toast.js';
import { Tooltip } from './components/Tooltip.js';
import { GeneralPanel } from './components/GeneralPanel.js';
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
import { FooterPanel } from './components/FooterPanel.js';
import { iconImg } from '../config/icons.js';

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
    this.onLensModeChange = null;
    this.battleController = battleController;
    this.marketController = marketController;
    this._lensMode = 'none';

    this.toast = new Toast(toastRoot);
    this.tooltip = new Tooltip(root);
    this.resourceBar = new ResourceBar(root);
    this.turnIndicator = new TurnIndicator(root);

    // ─── Левый контейнер (панель генерала + карты) ───
    this._generalContainer = document.createElement('div');
    this._generalContainer.className = 'general-container';
    root.appendChild(this._generalContainer);

    this.generalPanel = new GeneralPanel(this._generalContainer);
    this.deckPanel = new DeckPanel(this._generalContainer);

    this._buildHud();

    // ─── Футер ───
    this.footer = new FooterPanel(root, {
      onSkipTurn: () => onEndTurn?.(),
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
    this.tooltip.setWorld(world);
    if (this.marketPanel) this.marketPanel.world = world;
    if (this.factionsPanel) this.factionsPanel.world = world;
    if (this.quickJump) this.quickJump.setWorld(world);
  }

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'hud-top';
    hud.innerHTML = `
      <div class="hud-center">
        <div class="resource-bar" id="resource-bar"></div>
        <div class="lens-panel" id="lens-panel" role="radiogroup" aria-label="Линзы карты">
          <button class="lens-btn" data-lens="none" role="radio" aria-checked="true" title="Без линз">
            ${iconImg('ui_close', { size: 14 })}
          </button>
          <button class="lens-btn" data-lens="borders" role="radio" aria-checked="false" title="Границы фракций">
            ${iconImg('ui_flag', { size: 14 })}
          </button>
          <button class="lens-btn" data-lens="halos" role="radio" aria-checked="false" title="Ресурсные ореолы">
            ${iconImg('halo_wheat', { size: 14 })}
          </button>
        </div>
      </div>
      <div class="hud-right">
        <button class="hud-icon-btn" id="btn-recruit" disabled>
          ${iconImg('ui_sword', { size: 16 })}
          <span class="hud-tooltip">Найм</span>
        </button>
        <button class="hud-icon-btn" id="btn-market">
          ${iconImg('res_gold', { size: 16 })}
          <span class="hud-tooltip">Рынок</span>
        </button>
        <button class="hud-icon-btn" id="btn-factions">
          ${iconImg('ui_flag', { size: 16 })}
          <span class="hud-tooltip">Фракции</span>
        </button>
        <button class="hud-icon-btn" id="btn-glossary">
          ${iconImg('ui_help', { size: 16 })}
          <span class="hud-tooltip">Глоссарий</span>
        </button>
        <button class="hud-icon-btn" id="btn-mute">
          ${iconImg('ui_unmute', { size: 16 })}
          <span class="hud-tooltip">Звук</span>
        </button>
      </div>
    `;
    this.root.appendChild(hud);
    this._hudEl = hud;
    this.resourceBar.el = hud.querySelector('#resource-bar');
    this.resourceBar.refresh();
  
    const lensPanel = hud.querySelector('#lens-panel');
    lensPanel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lens]');
      if (!btn) return;
      this.setLensMode(btn.getAttribute('data-lens'));
      this.sound?.play('click');
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
      muteBtn.querySelector('.icon')?.remove();
      muteBtn.insertAdjacentHTML('afterbegin', iconImg('ui_mute', { size: 16 }));
      muteBtn.classList.add('muted');
    }
    muteBtn.addEventListener('click', () => {
      const muted = this.sound?.toggleMute();
      muteBtn.querySelector('.icon')?.remove();
      muteBtn.insertAdjacentHTML('afterbegin', iconImg(muted ? 'ui_mute' : 'ui_unmute', { size: 16 }));
      muteBtn.classList.toggle('muted', !!muted);
    });
  
    this._lensPanel = lensPanel;
    this._updateLensUI();
  }

  _bindFocusNav(hud) {
    hud.querySelector('#btn-focus-general')?.addEventListener('click', () => {
      this.sound?.play('click');
      if (this.quickJump) {
        this.quickJump._generalIdx = 0;
        this.quickJump._handle('general');
      }
    });
    hud.querySelector('#btn-prev-general')?.addEventListener('click', () => {
      this.sound?.play('click');
      this.quickJump?._handle('prev-general');
    });
    hud.querySelector('#btn-next-general')?.addEventListener('click', () => {
      this.sound?.play('click');
      this.quickJump?._handle('next-general');
    });
    hud.querySelector('#btn-focus-city')?.addEventListener('click', () => {
      this.sound?.play('click');
      if (this.quickJump) {
        this.quickJump._cityIdx = 0;
        this.quickJump._handle('city');
      }
    });
    hud.querySelector('#btn-prev-city')?.addEventListener('click', () => {
      this.sound?.play('click');
      this.quickJump?._handle('prev-city');
    });
    hud.querySelector('#btn-next-city')?.addEventListener('click', () => {
      this.sound?.play('click');
      this.quickJump?._handle('next-city');
    });
  }

  setLensMode(mode) {
    if (!['none', 'borders', 'halos'].includes(mode)) mode = 'none';
    this._lensMode = mode;
    this._updateLensUI();
    this.onLensModeChange?.(mode);
  }

  _updateLensUI() {
    if (!this._lensPanel) return;
    this._lensPanel.querySelectorAll('[data-lens]').forEach((btn) => {
      const isActive = btn.getAttribute('data-lens') === this._lensMode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', String(isActive));
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
    this.bus.on('general:no-move-points', ({ general, needed, have }) => {
      if (!general || !needed) return;
      const ev = new CustomEvent('general:no-move-points-ui', {
        detail: { needed, have },
      });
      document.dispatchEvent(ev);
    });
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
    this.bus.on('halo:hovered', ({ halo, screenPos }) => {
      if (!halo) { this.tooltip.hide(); return; }
      this.tooltip.showHalo(halo, screenPos);
    });
  }
}