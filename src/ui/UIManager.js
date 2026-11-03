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

export class UIManager {
  constructor({ root, toastRoot, bus, world, onEndTurn, onRecruit, battleController, sound }) {
    this.root = root;
    this.bus = bus;
    this.world = world;
    this.sound = sound;
    this.onHire = null;
    this.onRecruit = onRecruit;

    this.toast = new Toast(toastRoot);
    this.tooltip = new Tooltip(root);
    this.generalPanel = new GeneralPanel(root);
    this.deckPanel = new DeckPanel(root);
    this.resourceBar = new ResourceBar(root);
    this.turnIndicator = new TurnIndicator(root);

    // Строим HUD
    this._buildHud();

    // Кнопки и модалки
    this.endTurnButton = new EndTurnButton(this._hudEl, () => {
      this.sound?.play('click');
      onEndTurn?.();
    });

    this.recruitModal = new RecruitModal(root, { bus });
    this.cityPanel = new CityPanel(root, { bus });
    this.battleModal = new BattleModal(root, { controller: battleController, bus });
    this.tutorial = new TutorialModal(root, () => {
      localStorage.setItem('tavrida_tutorial', '1');
    });

    this._subscribe();
  }

  _buildHud() {
    const hud = document.createElement('div');
    hud.className = 'hud-top';
    hud.innerHTML = `
      <div class="hud-title">ТАВРИДА · v0.9</div>
      <div class="hud-right">
        <div class="resource-bar" id="resource-bar"></div>
        <button class="hud-btn" id="btn-recruit" disabled>Найм</button>
        <button class="hud-btn-mute" id="btn-mute">🔊</button>
      </div>
    `;
    this.root.appendChild(hud);
    this._hudEl = hud;

    // Resource bar внутри HUD
    this.resourceBar.el = hud.querySelector('#resource-bar');
    this.resourceBar.refresh();

    // Кнопка «Найм» — вызывает onHire (устанавливается извне)
    const hireBtn = hud.querySelector('#btn-recruit');
    hireBtn.addEventListener('click', () => {
      this.sound?.play('click');
      if (this.onHire) this.onHire();
    });

    // Кнопка mute
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

  /** Включить/выключить кнопку «Найм» */
  setHireEnabled(enabled) {
    const btn = this._hudEl.querySelector('#btn-recruit');
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.4';
  }

  // ─── Открытие модалок ───
  openRecruitModal({ factionId, general, world }) {
    this.recruitModal.open({ factionId, general, world });
  }

  openCityPanel({ tile, city, world }) {
    this.cityPanel.open({ tile, city, world });
  }

  // ─── Ресурсы ───
  bindResources(pool) {
    this.resourceBar.bind(pool);
  }

  // ─── Туториал ───
  showTutorial(onDone) {
    this.tutorial.onDone = () => {
      localStorage.setItem('tavrida_tutorial', '1');
      onDone?.();
    };
    this.tutorial.open();
  }

  _subscribe() {
    this.bus.on('tile:hovered', ({ tile, screenPos }) => {
      if (tile) this.tooltip.show(tile, screenPos);
      else this.tooltip.hide();
    });
    this.bus.on('general:selected', ({ general }) => {
      if (general) {
        this.generalPanel.show(general);
        this.deckPanel.show(general);
      } else {
        this.generalPanel.hide();
        this.deckPanel.hide();
      }
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
    this.bus.on('battle:finished', () => this.turnIndicator.hide());
    this.bus.on('ai:turnEnded', () => this.turnIndicator.hide());
  }
}