import store from '../../../store.js';
// Pfad anpassen! Falls deine co2_data woanders liegt:
import { activitiesJson } from '../../../../scenario-data/co2_data.js';
import './llm-helper/ActivityLLMSuggester.js';

export class ActivityCatalog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.sectorMapping = {
      "sector-1": "Herstellung",
      "sector-2": "Transport",
      "sector-3": "Elektrizität",
      "sector-4": "Landwirtschaft"
    };
    this.sectorEmojiMapping = {
      "Herstellung": "🏭",
      "Transport": "🚚",
      "Elektrizität": "⚡️",
      "Landwirtschaft": "👩‍🌾"
    };
    // Default kein Sektor ausgewählt
    this.selectedSector = null;
    // Lokale Kopie aller Aktivitäten
    this.activities = activitiesJson || [];

    // Abo auf activityCatalog im Store
    this._unsubscribeCatalog = store.subscribeTo(
      (state) => state.activityCatalog,
      (catalogState) => {
        // Wenn Panel geschlossen → alles leeren + ausblenden
        if (!catalogState.isOpen) {
          this.shadowRoot.innerHTML = '';
          this.classList.remove('visible');
          return;
        }
        // scenarioId aus dem State merken
        this._scenarioId = catalogState.targetScenarioId || null;
        // Neu rendern
        this.shadowRoot.innerHTML = this._templateHTML();
        this._bind();
        this._renderCards(this.activities);
        this.classList.add('visible');
      }
    );
  }

  disconnectedCallback() {
    if (this._unsubscribeCatalog) {
      this._unsubscribeCatalog();
      this._unsubscribeCatalog = null;
    }
  }

  /**
   * Template-HTML (CSS + Sektor-Buttons + Grid-Container).
   * Wird jedes Mal in die Shadow-Root geschrieben, wenn isOpen=true.
   */
  _templateHTML() {
    return `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 50%;
          width: 50vw;
          height: 100vh;
          background: white;
          box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1);
          z-index: 110000;
          padding: 1em;
          box-sizing: border-box;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          overflow-y: auto;
        }
        :host(.visible) {
          transform: translateX(0);
        }

        .sector-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        .sector-buttons button {
          padding: 8px 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        .sector-buttons button.active {
          background-color: #0056b3;
        }
        .sector-buttons button:hover {
          filter: brightness(0.9);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }
        .card {
          background: #fafafa;
          border: 1px solid #ccc;
          border-radius: 10px;
          padding: 10px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .card:hover {
          transform: scale(1.02);
          border-color: #28b200;
        }
        .card h3 {
          margin: 0.3rem 0;
        }
        .card .amount {
          color: #555;
          font-size: 0.9rem;
        }
        .card .distribution {
          font-size: 0.85rem;
          margin-top: 6px;
          color: #444;
        }
      </style>

      <activity-llm-suggester></activity-llm-suggester>

      <div class="sector-buttons">
        <button id="sector-1">Herstellung 🏭</button>
        <button id="sector-2">Transport 🚚</button>
        <button id="sector-3">Elektrizität ⚡️</button>
        <button id="sector-4">Landwirtschaft 👩‍🌾</button>
      </div>

      <div class="grid" id="card-container"></div>
    `;
  }

  /**
   * Event-Listener für die Sektor-Buttons
   */
  _bind() {
    this.shadowRoot.querySelectorAll('.sector-buttons button').forEach(button => {
      button.addEventListener('click', () => {
        // Active-Klasse umschalten
        this.shadowRoot.querySelectorAll('.sector-buttons button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        // Sektor auswählen
        this.selectedSector = this.sectorMapping[button.id];
        // Karten neu rendern
        this._renderCards(this.activities);
      });
    });
  }

  /**
   * Baut die Kartenliste auf, optional gefiltert nach selectedSector
   */
  _renderCards(data) {
    const container = this.shadowRoot.querySelector('#card-container');
    if (!container) return;

    let filtered = [...data];
    if (this.selectedSector) {
      filtered = filtered.filter(item =>
        item.sectors.some(s => s.sector === this.selectedSector)
      );
      filtered.sort((a, b) => {
        const aP = a.sectors.find(s => s.sector === this.selectedSector)?.percentage || 0;
        const bP = b.sectors.find(s => s.sector === this.selectedSector)?.percentage || 0;
        return bP - aP; // absteigend sortieren
      });
    }

    container.innerHTML = '';
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.classList.add('card');

      // Letztes amount_info als Anzeige
      const amountInfo = item.amount_info[item.amount_info.length - 1];
      const distribution = item.sectors
        .map(s => `${this.sectorEmojiMapping[s.sector] || ''} ${s.percentage}%`)
        .join(' — ');

      card.innerHTML = `
        <h3>${item.name}</h3>
        <div class="amount">${item.co2_amount} kg CO₂e je ${amountInfo.amount} ${amountInfo.unit}</div>
        <div class="distribution">${distribution}</div>
      `;

      // Klick → Aktivität ins Szenario übernehmen
      card.addEventListener('click', () => this._selectActivity(item));
      container.appendChild(card);
    });
  }

  /**
   * Übernimmt die ausgewählte Aktivität in das gewählte Szenario,
   * und schließt den Katalog wieder.
   */
  _selectActivity(activity) {
    // Neu: hole scenarioId aus dem Store-Bereich "activityCatalog"
    const scenarioId = store.getState().activityCatalog.targetScenarioId;
    if (!scenarioId) return;

    const scenario = store.getState().scenariosById[scenarioId] || {};
    const newActivity = {
      id: crypto.randomUUID(),
      label: activity.name,
      co2DeltaKg: parseFloat(activity.co2_amount) || 0,
      isActive: true,
      source: 'catalog',
      meta: activity
    };

    // Alte Behaviors + Neu
    const updatedBehaviors = [...(scenario.behaviors || []), newActivity];

    // Szenario aktualisieren
    store.setState({
      scenariosById: {
        ...store.getState().scenariosById,
        [scenarioId]: {
          ...scenario,
          behaviors: updatedBehaviors
        }
      },
      // Katalog schließen
      activityCatalog: {
        isOpen: false,
        targetScenarioId: null
      }
    });

    store.markScenarioAsDirty(scenarioId);

    // Optional: scenarioEditor öffnen
    store.setState({
      scenarioEditor: {
        ...store.getState().scenarioEditor,
        isOpen: true,
        targetScenarioId: scenarioId
      }
    });
  }
}

customElements.define('activity-catalog', ActivityCatalog);
