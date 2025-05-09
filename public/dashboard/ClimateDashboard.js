import './components/ui/ScenarioSelector.js';
import './components/ui/ScenarioSummaryBar.js';
import './components/ui/YearSlider.js';
import './components/visualisation/sea-level-visualization.js';
import './components/editors/scenario-editor/ScenarioEditor.js';
import './components/editors/activity-editor/ActivityCatalog.js';
import './components/editors/activity-editor/ActivityEditor.js';
import './components/editors/country-editor/CountryEditor.js';

import { startSimulationLoop } from './simulationService.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      max-width: 100vw;
      height: auto;
      font-family: 'Aboreto', serif;
    }

    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      box-sizing: border-box;
      padding: 10px;
      gap: 10px;
    }

    scenario-summary-bar,
    year-slider {
      flex: 0 0 60px; /* oder deine echte Höhe */
    }

    .main-panel {
      flex: 1 1 auto;
      display: flex;
      min-height: 0; /* nötig, damit es nicht überläuft */
      gap: 10px;
      overflow: hidden;
    }

    scenario-selector {
      flex: 1 1 300px;
      min-width: 300px;
      height: 100%;
      overflow: auto;
    }

    .visualization-wrapper {
      flex: 1 1 auto;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-width: 0;
      min-height: 0;
      max-height: 100%;
      overflow: scroll;
      position: relative;
    }

    /* Container mit fixem Seitenverhältnis */
    .visualization-aspect-ratio {
      aspect-ratio: 3 / 2; /* dein gewünschtes Verhältnis */
      width: 100%;
      max-height: 100%;
      height: auto;
    }

    sea-level-visualization-dashboard {
      width: 100%;
      height: 100%;
    }

    year-slider {
      flex: 0 0 60px;
    }

    .resize-handle {
      width: 3px;
      cursor: col-resize;
      background-color: rgb(135, 216, 115);
      flex-shrink: 0;
      position: relative;
      border-radius: 10px; /* Rundung an den Ecken */
    }

    .resize-handle::before,
    .resize-handle::after {
      content: '';
      position: absolute;
      width: 2px;
      height: 45px;
      background-color:rgb(135, 216, 115);
      cursor: col-resize;
      top: 50%;
      transform: translateY(-50%);
      border-radius: 5px; /* Rundung an den Ecken */

    }

    .resize-handle::before {
      left: -4px;
    }

    .resize-handle::after {
      right: -4px;
    }
  </style>

  <div class="dashboard-container">
    <scenario-summary-bar id="summaryBar"></scenario-summary-bar>
    <div class="main-panel">
      <scenario-selector></scenario-selector>
      <div class="resize-handle"></div>
      <div class="visualization-wrapper">
        <div class="visualization-aspect-ratio">
          <sea-level-visualization-dashboard hide-text></sea-level-visualization-dashboard>
        </div>
      </div>
    </div>
    <year-slider></year-slider>
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

      /**
       * Wir speichern die letzten Simulationsinputs, um doppelte Rechenläufe zu vermeiden.
       * `_lastSimInput` betrifft das Hauptszenario (selectedScenarioId)
       * `_lastComparisonSimInput` betrifft das Vergleichsszenario (comparisonScenarioId)
       */
      this._lastSimInput = null;
      this._lastComparisonSimInput = null;
    }

    connectedCallback() {

      // Startet Beobachter, der „veraltete“ (also dirty) Szenarien im Store
      // findet, ggf. neu berechnet und in den Store speichert
      startSimulationLoop();

      ///////////////////////////////////////////////////////////////////////////
      // UI: RESIZE-HANDLING ZWISCHEN SZENARIENLISTE UND VISUALISIERUNG
      ///////////////////////////////////////////////////////////////////////////

      const shadowRoot = this.shadowRoot;
      const selector = shadowRoot.querySelector('scenario-selector');
      const handle = shadowRoot.querySelector('.resize-handle');

      let isResizing = false;

      handle.addEventListener('mousedown', () => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const offsetLeft = e.clientX;
        const minWidth = 200;
        const maxWidth = 1800;
        const newWidth = Math.min(maxWidth, Math.max(minWidth, offsetLeft));
        selector.style.flex = `0 0 ${newWidth}px`;
      });

      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }
  }

  customElements.define('climate-dashboard', ClimateDashboard);