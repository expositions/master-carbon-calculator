import store from '../../../store.js';
import { ALL_AGGREGATES } from '../../../../scenario-data/countryGroups.js';
import { territoryData } from '../../../../scenario-data/territories.js';
import './interactive-globe.js';

const countryNamesDE = territoryData.main.de.localeDisplayNames.territories;

// Label → entweder direktes Code-Array oder Gruppenschlüssel
const LABEL_TO_GROUP = {
  "Nur ich": [],
  "Deutschland": ["DEU"],
  "Europäische Union": "EU-27",
  "Welt": "Welt",
  "G7": "G7",
  "G20": "G20",
  "Weit entwickelt": "30 hoch entwickelte Länder (HDI)",
  "Wenig entwickelt": "30 am wenigsten entwickelte Länder (HDI)",
  "Meistes CO₂ pro Kopf": "Höchste CO₂-Emissionen pro Kopf"
};

class PopulationListSelector extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.config = {
      labels: [
        "Nur ich",
        "Deutschland",
        "Europäische Union",
        "Welt",
        "G7",
        "G20",
        "Weit entwickelt",
        "Wenig entwickelt",
        "Meistes CO₂ pro Kopf",
        "Eigene Auswahl"
      ],
      leftCount: 5,
      accentColor: "#007bff",
      fontSize: "16px",
      fontFamily: "sans-serif",
      globeBackground: "#f9f9f9"
    };

    this.selectedLabel = null;
    this.render();
  }

  connectedCallback() {
    this._unsubscribeStore = store.subscribeTo(
      (state) => {
        const s = state.scenariosById?.[state.selectedScenarioId];
        return s ? s.scaleLabel : null;
      },
      (label) => {
        this.selectedLabel = label;
        this.render();
      },
      (state) => state.scenariosById?.[state.selectedScenarioId]?.selectedCountries,
      () => {
        this._syncGlobe();
      }
    );
  }

  disconnectedCallback() {
    // Wenn die Komponente entfernt wird, Listener abmelden
    if (this._unsubscribeStore) {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }
  }
  

  setConfig(overrides = {}) {
    Object.assign(this.config, overrides);
    this.render();
  }

  _updateScenarioWithLabel(label) {
    const state = store.getState();
    const id = state.selectedScenarioId;
    if (!id) return;

    const oldScenario = state.scenariosById[id];
    const scaleType = label === "Eigene Auswahl" ? "CUSTOM" : "PRESET";

    let selectedCountries;

    const group = LABEL_TO_GROUP[label];
    if (group) {
      if (Array.isArray(group)) {
        selectedCountries = group;
      } else if (ALL_AGGREGATES[group]) {
        selectedCountries = ALL_AGGREGATES[group];
      }
    }

    store.setState({
      scenariosById: {
        ...state.scenariosById,
        [id]: {
          ...oldScenario,
          scaleLabel: label,
          scaleType,
          ...(selectedCountries ? { selectedCountries } : {})
        }
      }
    });

    store.markScenarioAsDirty(id);

    if (label === "Eigene Auswahl") {
      store.setState({
        countryEditor: {
          isOpen: true,
          targetScenarioId: id
        }
      });
    }

    // Jetzt neu rendern
    this.selectedLabel = label;
    this.render();
  }

  render() {
    const {
      labels,
      leftCount,
      accentColor,
      fontSize,
      fontFamily,
      globeBackground
    } = this.config;

    const selected = this.selectedLabel;
    const leftLabels = labels.slice(0, leftCount);
    const rightLabels = labels.slice(leftCount);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Aboreto', serif;
          color: #333;
        }

        .container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .column {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        button {
          font-size: 1rem;
          padding: 0.5rem 1rem;
          background: white;
          border: 2px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        button:hover {
          border-color: #28b200;
          background: #f0f8ff;
        }

        button.selected {
          border-color: #28b200;
          background: #28b200;
          color: white;
          font-weight: bold;
        }

        .globe {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: #f0f8ff;
          box-shadow: inset 0 0 8px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        interactive-globe {
          width: 100%;
          height: 100%;
          display: block;
          cursor: pointer;
        }

        @media (max-width: 700px) {
          .container {
            flex-direction: column;
            gap: 10px;
          }

          .globe {
            width: 140px;
            height: 140px;
          }
        }
      </style>

      <div class="container">
        <div class="column left">
          ${leftLabels.map(label => `
            <button class="${label === selected ? 'selected' : ''}" data-label="${label}">
              ${label}
            </button>
          `).join('')}
        </div>
        <div class="globe">
          <interactive-globe
            backgroundcolor="#ffffff"
            countrycolor="0xcccccc"
            selectedcolor="0x28b200"
            mode="readonly"
            id="globeMini"
          ></interactive-globe>
        </div>
        <div class="column right">
          ${rightLabels.map(label => `
            <button class="${label === selected ? 'selected' : ''}" data-label="${label}">
              ${label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.shadowRoot.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const newLabel = btn.getAttribute('data-label');
        this._updateScenarioWithLabel(newLabel);
      });
    });

    const globe = this.shadowRoot.getElementById('globeMini');
    if (globe) {
      globe.addEventListener('click', () => {
        this._updateScenarioWithLabel("Eigene Auswahl");
      });
    }
    // console.log("Now syncing globe");
    requestAnimationFrame(() => this._syncGlobe());
  }

  _syncGlobe() {
    const globe = this.shadowRoot.getElementById('globeMini');
    if (!globe) return;

    const state = store.getState();
    const scenario = state.scenariosById?.[state.selectedScenarioId];
    if (scenario?.selectedCountries) {
      globe.selectedCountries = scenario.selectedCountries;
      // console.log(scenario.selectedCountries);
      // console.log(globe.selectedCountries);
    }
    // console.log("Globe before:", globe.selectedCountries);
    globe.selectedCountries = [...scenario.selectedCountries];
    setTimeout(() => {
      // console.log("Globe after:", globe.selectedCountries);
    }, 100);
  }
}

customElements.define('population-list-selector', PopulationListSelector);
