import './MiniValueCard.js';
import './ModeToggle.js';
import store from '../../store.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .scenario-summary-bar {
      display: flex;
      border-radius: 12px;
      font-family: 'Aboreto', serif;
      height: 100px;
      box-sizing: border-box;
    }

    .value-card-wrapper {
      display: flex;
      box-sizing: border-box;
      flex: 1 1 80%;
    }

    mini-value-card {
      display: flex;
      margin: 5px;
      box-sizing: border-box;
      flex: 1 1 33%;
    }

    mode-toggle {
      display: flex;
      margin: 5px;
      box-sizing: border-box;
      flex: 1 1 20%;
    }
  </style>

  <div class="scenario-summary-bar">
    <mode-toggle id="modeToggle"></mode-toggle>
    <div class="value-card-wrapper">
      <mini-value-card id="co2" label="Zusätzliches CO₂ ggü. 2025" value="–"></mini-value-card>
      <mini-value-card id="temp" label="Temperatur ggü. ø1850-1900" value="–"></mini-value-card>
      <mini-value-card id="slr" label="Meeresspiegel ggü. ø1995–2014" value="–"></mini-value-card>
    </div>
  </div>
`;

export class ScenarioSummaryBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

    this.co2Card = null;
    this.tempCard = null;
    this.slrCard = null;
  }

  connectedCallback() {
    this.co2Card = this.shadowRoot.getElementById('co2');
    this.tempCard = this.shadowRoot.getElementById('temp');
    this.slrCard = this.shadowRoot.getElementById('slr');

    this._unsubscribeStore = store.subscribeTo(
      (state) => ({
        year: state.selectedYear,
        mode: state.displayMode,
        primary: state.scenariosById?.[state.selectedScenarioId],
        comparison: state.comparisonScenarioId
          ? state.scenariosById?.[state.comparisonScenarioId]
          : null
      }),
      ({ year, primary, comparison, mode }) => {
        this._updateSummary(primary, comparison, year, mode);
      }
    );
  }

  disconnectedCallback() {
    if (this._unsubscribeStore) {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }
  }

  _setLabels(mode, comparisonIsSet = false) {
    const isDelta = mode === 'delta' && comparisonIsSet;

    this.co2Card.setLabel(
      isDelta
        ? 'CO₂-Unterschied zw. Haupt- und Vergleichsszenario'
        : 'Zusätzliches CO₂ ggü. 2025'
    );

    this.tempCard.setLabel(
      isDelta
        ? 'Temperatur-Unterschied (in °C)'
        : 'Temperatur ggü. ø1850–1900'
    );

    this.slrCard.setLabel(
      isDelta
        ? 'Meeresspiegel-Unterschied (in mm)'
        : 'Meeresspiegel ggü. ø1995–2014'
    );
  }

  _updateSummary(primary, comparison, year, mode) {
    this._setLabels(mode, !!comparison);
    const format = (val, unit = '', digits = 10) => {
      if (val === null || val === undefined || Number.isNaN(val)) return '–';
      return `${val.toFixed(digits)}${unit}`;
    };

    if (!primary?.computed?.data) {
      console.warn('[ScenarioSummaryBar] No primary data available for the selected year');
      return;
    }
    const primaryData = primary.computed.data.find(d => d.year === year);
    if (!primaryData) {
      console.warn('[ScenarioSummaryBar] No primary data found for the year', year);
      return;
    }

    let co2Val = primaryData.cumulativeCo2DeltaKg;
    let tempVal = primaryData.temperatureC;
    let slrVal = primaryData.seaLevelMm;

    if (mode === 'delta' && comparison?.computed?.data) {

      const comparisonData = comparison.computed.data.find(d => d.year === year);
      if (!comparisonData) {
        console.warn('[ScenarioSummaryBar] No comparison data found for the year', year);
        return;
      };

      co2Val = Math.abs(primaryData.cumulativeCo2DeltaKg - comparisonData.cumulativeCo2DeltaKg);
      tempVal = Math.abs(primaryData.temperatureC - comparisonData.temperatureC);
      slrVal = Math.abs(primaryData.seaLevelMm - comparisonData.seaLevelMm);


      const pName = primary.name || 'Hauptszenario';
      const cName = comparison.name || 'Vergleichsszenario';
      const tooltip = `Zwischen "${pName}" und "${cName}"`;

      this.co2Card.setAttribute('label', 'CO₂-Unterschied');
      this.tempCard.setAttribute('label', 'Temperatur-Unterschied');
      this.slrCard.setAttribute('label', 'Meeresspiegel-Unterschied');

      this.co2Card.setAttribute('title', tooltip);
      this.tempCard.setAttribute('title', tooltip);
      this.slrCard.setAttribute('title', tooltip);
    } else {
      this.co2Card.setAttribute('label', 'Zusätzliches CO₂ ggü. 2025');
      this.tempCard.setAttribute('label', 'Temperatur ggü. ø1850-1900');
      this.slrCard.setAttribute('label', 'Meeresspiegel ggü. ø1995–2014');

      this.co2Card.removeAttribute('title');
      this.tempCard.removeAttribute('title');
      this.slrCard.removeAttribute('title');
    }

    this.co2Card.setValue(format(co2Val, ' kg'));
    this.tempCard.setValue(format(tempVal, '°C'));
    this.slrCard.setValue(format(slrVal, ' mm'));

  }

  getMode() {
    const mode = this.shadowRoot.getElementById('modeToggle').getMode();
    // console.log('[ScenarioSummaryBar] getMode called, returning', mode);
    return mode;
  }
}

customElements.define('scenario-summary-bar', ScenarioSummaryBar);
