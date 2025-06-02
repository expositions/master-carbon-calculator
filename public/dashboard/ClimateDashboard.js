import './components/ui/ScenarioSelector.js';
import './components/ui/ScenarioSummaryBar.js';
import './components/ui/YearSlider.js';
import './components/visualisation/sea-level-visualization.js';
import './components/editors/scenario-editor/ScenarioEditor.js';
import './components/editors/activity-editor/ActivityCatalog.js';
import './components/editors/activity-editor/ActivityEditor.js';
import './components/editors/country-editor/CountryEditor.js';
import './orchestrator.js';

import { startSimulationLoop } from './simulationService.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      width: 100%;
      max-width: 100vw;
      height: auto;
      font-family: 'Aboreto', serif;
    }

    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 90vh;
      width: 100vw;
      padding: 1vw;
      overflow: visible;
      box-sizing: border-box;
      padding: 10px;
      gap: 10px;
      position: relative; /* Needed for handle centering! */
    }

    .visualisation-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0; /* allow it to shrink if needed */
    }

    sea-level-visualization-dashboard {
      flex: 1 1 0;
      min-height: 0;
      display: flex;
      align-items: stretch;
    }

    year-slider {
      display: flex;
      justify-content: center;
      align-self: stretch;
      width: 100%;
    }

    .main-panel {
      flex: 1 1 auto;
      display: flex;
      min-height: 0;
      gap: 10px;
    }

    .chatbot-placeholder {
      min-width: 300px;
      max-width: 400px;
      height: 100%;
      background: #f6f6f6;
      border: 1px dashed #bbb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1em;
      color: #888;
      flex-shrink: 0;
    }

    /* Drawer overlay styles */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.07);
      z-index: 1001;
      transition: opacity 0.2s;
      opacity: 1;
      pointer-events: all;
    }
    .drawer-backdrop.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .drawer {
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      width: 320px;
      background: #fff;
      box-shadow: 2px 0 8px rgba(0,0,0,0.15);
      z-index: 1002;
      transform: translateX(-100%);
      transition: transform 0.33s cubic-bezier(.77,0,.18,1);
      display: flex;
      flex-direction: column;
      will-change: transform;
      touch-action: none;
      overflow-y: auto; /* Ensures the insides remain scrollable */
    }
    .drawer.open {
      transform: translateX(0);
    }
    /* Handle INSIDE dashboard, vertically centered RELATIVE TO dashboard */
    .drawer-handle {
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      z-index: 1010; /* Must be above dashboard, below overlay drawer */
      width: 28px;
      height: 62px;
      background: rgb(135, 216, 115);
      border-radius: 0 11px 11px 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 2px 2px 8px rgba(0,0,0,0.13);
      transition: background 0.2s;
      opacity: 0.85;
      border: none;
      outline: none;
      font-size: 1.7em;
      color: #333;
      user-select: none;
    }
    .drawer-handle:active,
    .drawer-handle:focus {
      background: rgb(95, 186, 85);
      opacity: 1;
    }
    .drawer-handle:focus-visible {
      box-shadow: 0 0 0 2px #81c784;
    }
  </style>
  <!-- Overlay Drawer (not inside dashboard-container) -->
  <div class="drawer" id="scenarioDrawer" tabindex="-1">
    <scenario-selector></scenario-selector>
  </div>
  <div class="drawer-backdrop hidden" id="drawerBackdrop"></div>

  <div class="dashboard-container">
    <div class="drawer-handle" id="drawerHandle" title="Szenarien anzeigen" tabindex="0" aria-label="Szenarien anzeigen">
      &#9776;
    </div>
    <div class="main-panel">
      <llm-chat id="chat"></llm-chat>
      <div class="visualisation-wrapper">
        <scenario-summary-bar id="summaryBar"></scenario-summary-bar>
        <sea-level-visualization-dashboard hide-text></sea-level-visualization-dashboard>
        <year-slider></year-slider>
      </div>
    </div>
    <scenario-editor></scenario-editor>
    <activity-catalog></activity-catalog>
    <activity-editor></activity-editor>
    <country-editor></country-editor>
  </div>
`;

export class ClimateDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
    this._lastSimInput = null;
    this._lastComparisonSimInput = null;
    // No handler bindings here; see connectedCallback!
  }

  connectedCallback() {
    startSimulationLoop();

    const shadowRoot = this.shadowRoot;
    const drawer = shadowRoot.getElementById('scenarioDrawer');
    const handle = shadowRoot.getElementById('drawerHandle');
    const backdrop = shadowRoot.getElementById('drawerBackdrop');

    this._drawerOpen = false;

    // Arrow functions ensure correct this-binding
    this._onDrawerHandleClick = (e) => {
      e.stopPropagation();
      if (this._drawerOpen) {
        this._closeDrawer();
      } else {
        this._openDrawer();
      }
    };
    this._onBackdropClick = () => this._closeDrawer();
    this._onEsc = (e) => {
      if (e.key === 'Escape' && this._drawerOpen) {
        this._closeDrawer();
      }
    };

    handle.addEventListener('click', this._onDrawerHandleClick);
    handle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._onDrawerHandleClick(e);
      }
    });

    backdrop.addEventListener('click', this._onBackdropClick);

    globalThis.addEventListener('keydown', this._onEsc);

    this._toggleBodyScroll = (disable) => {
      if (disable) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };
  }

  disconnectedCallback() {
    globalThis.removeEventListener('keydown', this._onEsc);
  }

  _openDrawer() {
    const shadowRoot = this.shadowRoot;
    const drawer = shadowRoot.getElementById('scenarioDrawer');
    const backdrop = shadowRoot.getElementById('drawerBackdrop');

    drawer.classList.add('open');
    backdrop.classList.remove('hidden');
    this._drawerOpen = true;
    this._toggleBodyScroll(true);

    // Focus drawer for ESC support
    setTimeout(() => {
      drawer.focus();
    }, 40);
  }

  _closeDrawer() {
    const shadowRoot = this.shadowRoot;
    const drawer = shadowRoot.getElementById('scenarioDrawer');
    const backdrop = shadowRoot.getElementById('drawerBackdrop');

    drawer.classList.remove('open');
    backdrop.classList.add('hidden');
    this._drawerOpen = false;
    this._toggleBodyScroll(false);

    // Return focus to handle for accessibility
    const handle = shadowRoot.getElementById('drawerHandle');
    handle.focus();
  }
}

customElements.define('climate-dashboard', ClimateDashboard);
