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
      height: 75px;
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
    mini-value-card#co2 {
      margin-left: 0;
    }

    mini-value-card#slr {
      margin-right: 0;
    }

  </style>

  <div class="scenario-summary-bar">
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
        ? 'Meeresspiegel-Unterschied'
        : 'Meeresspiegel ggü. ø1995–2014'
    );
  }

  _updateSummary(primary, comparison, year, mode) {
    this._setLabels(mode, !!comparison);

    const formatCO2 = (val) => {
      if (val === null || val === undefined || Number.isNaN(val)) return '–';

      const absVal = Math.abs(val); // Handle large negative values
      if (absVal < 1) {
        return `${(val * 1000).toFixed(1).replace('.', ',')} g`; // Convert kg to grams
      } else if (absVal < 1000) {
        return `${val.toFixed(2).replace('.', ',')} kg`; // Keep in kilograms
      } else {
        return `${(val / 1000).toFixed(2).replace('.', ',')} t`; // Convert to tons
      }
    };

    const formatSLR = (val) => {
      if (val === null || val === undefined || Number.isNaN(val)) return '–';

      if (val < 1) {
        const decimalPlaces = Math.min(12, val.toString().split('.')[1]?.length || 0);
        return `${val.toFixed(decimalPlaces).replace('.', ',')} mm`;
      } else if (val < 10) {
        return `${val.toFixed(3).replace('.', ',')} mm`;
      } else if (val < 100) {
        return `${(val / 10).toFixed(3).replace('.', ',')} cm`;
      } else if (val < 1000) {
        return `${(val / 10).toFixed(3).replace('.', ',')} cm`;
      } else if (val < 10000) {
        return `${(val / 1000).toFixed(3).replace('.', ',')} m`;
      } else {
        return `${(val / 1000).toFixed(2).replace('.', ',')} m`;
      }
    };

    const formatTemp = (val) => {
      if (val === null || val === undefined || Number.isNaN(val)) return '–';

      if (val < 0.1) {
        const decimalPlaces = Math.min(12, val.toString().split('.')[1]?.length || 0);
        return `${val.toFixed(decimalPlaces).replace('.', ',')} °C`;
      } else if (val < 1) {
        return `${val.toFixed(3).replace('.', ',')} °C`;
      } else if (val < 10) {
        return `${val.toFixed(2).replace('.', ',')} °C`;
      } else if (val < 100) {
        return `${val.toFixed(1).replace('.', ',')} °C`;
      } else {
        return `${val.toFixed(0).replace('.', ',')} °C`;
      }
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
      }

      co2Val = primaryData.cumulativeCo2DeltaKg - comparisonData.cumulativeCo2DeltaKg;
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

    this.co2Card.setValue(formatCO2(co2Val));
    this.tempCard.setValue(formatTemp(tempVal));
    this.slrCard.setValue(formatSLR(slrVal));
  }

  getMode() {
    const mode = this.shadowRoot.getElementById('modeToggle').getMode();
    return mode;
  }
}

customElements.define('scenario-summary-bar', ScenarioSummaryBar);
