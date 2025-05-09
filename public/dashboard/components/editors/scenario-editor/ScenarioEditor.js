import store from '../../../store.js';
import '../country-editor/PopulationListSelector.js';

class ScenarioEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._backup = null;
    this._wasOpen = false;
  }

  connectedCallback() {
    // Aktuellen Zustand merken
    this._lastScenarioId = null;

    this._unsubscribeStore = store.subscribeTo(
      (state) => {
        const editor = state.scenarioEditor;
        const scenario = editor.isOpen ? state.scenariosById?.[editor.targetScenarioId] : null;
        return { editor, scenario };
      },
      ({ editor, scenario }) => {
        if (!editor.isOpen || !scenario) {
          this.classList.remove('visible');
          this.shadowRoot.innerHTML = '';
          this._wasOpen = false;
        } else {
          // Only create backup *when opening the editor*
          if (!this._wasOpen) {
            this._backup = structuredClone(scenario);
            this._wasOpen = true;
            this._lastScenarioId = editor.targetScenarioId;
          }

          this._render(editor, scenario);
        }
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

  _render(editorState) {
    const scenario = store.getState().scenariosById[editorState.targetScenarioId];
    const behaviors = scenario?.behaviors || [];

    this.shadowRoot.innerHTML = `
      <style>
      :host {
        position: fixed;
        top: 0;
        left: -50%;
        height: 100vh;
        width: 50vw;
        background: white;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
        z-index: 100000;
        transition: transform 0.3s ease;
        padding: 1em;
        box-sizing: border-box;
        overflow-y: auto;
        max-height: 100vh;
      }

      :host(.visible) {
        transform: translateX(100%);
      }

        h1 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        h2 {
          font-size: 1.2rem;
          margin: 1.5rem 0 0.5rem;
        }

        .activity-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .activity-card {
          border: 2px solid #eee;
          border-radius: 12px;
          padding: 10px;
          min-height: 80px;
          background: #f9f9f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          text-align: center;
        }

        .add-btn {
          grid-column: span 2;
          background: none;
          border: 2px dashed #aaa;
          color: #555;
          font-weight: bold;
          padding: 10px;
          border-radius: 12px;
          cursor: pointer;
        }

        population-list-selector {
          margin-top: 10px;
          display: block;
        }

        .action-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }

        button {
          font-size: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }

        .cancel {
          background: #eee;
          color: #444;
        }

        .save {
          background: #28b200;
          color: white;
        }

        .activity-card {
          position: relative;
          border: 2px solid #eee;
          border-radius: 12px;
          padding: 10px;
          background: #f9f9f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .activity-card .label {
          flex: 1;
          font-size: 0.95rem;
        }

        .activity-card .actions {
          display: flex;
          gap: 6px;
        }

        .activity-card .actions button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }

        label {
          display: block;
          font-weight: 600;
          margin-top: 1.2rem;
          margin-bottom: 0.3rem;
          color: #222;
        }

        input,
        textarea,
        select {
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          font-family: inherit;
          font-size: 1rem;
          border: 2px solid #ddd;
          background: #fff;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: #28b200;
          outline: none;
        }

        textarea {
          resize: vertical;
          min-height: 60px;
        }

        details {
          margin-top: 1rem;
          background: #f9f9f9;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ddd;
        }


      </style>

      <h1>Szenario bearbeiten</h1>
      <label>Name des Szenarios</label>
      <input id="name" value="${scenario.name || ''}">

      <label>Beschreibung</label>
      <textarea id="description">${scenario.description || ''}</textarea>

      <h2>Ich mache jetzt das anders …</h2>
    <div class="activity-grid">
    ${behaviors.map(b => `
        <div class="activity-card">
        <div class="label">${b.label}</div>
        <div class="actions">
            <button class="edit-btn" data-id="${b.id}" title="Bearbeiten">✏️</button>
            <button class="delete-btn" data-id="${b.id}" title="Löschen">🗑️</button>
        </div>
        </div>
    `).join('')}
    <button class="add-btn">+ Aktivität hinzufügen</button>
    </div>

      <h2>Wenn alle das täten in …</h2>
      <population-list-selector></population-list-selector>

      <details style="margin-top: 1.5rem;">
        <summary>Erweiterte Einstellungen</summary>

        <label>Zeitfenster (Jahre)</label>
        <input type="number" id="co2ApplicationTimeframe" value="${scenario.co2ApplicationTimeframe}" min="1" step="1">

        <label>Emissionsszenario</label>
        <select id="tempScenario">
          ${['SSP1_1_9', 'SSP1_2_6', 'SSP2_4_5', 'SSP3_7_0', 'SSP5_8_5'].map(opt => `
            <option value="${opt}" ${scenario.tempScenario === opt ? 'selected' : ''}>${opt}</option>
          `).join('')}
        </select>

        <label>TCRE Szenario</label>
        <select id="tcreScenario">
          ${['low', 'mid', 'high'].map(opt => `
            <option value="${opt}" ${scenario.tcreScenario === opt ? 'selected' : ''}>${opt}</option>
          `).join('')}
        </select>

        <label>Meeresspiegel-Szenario</label>
        <select id="slrScenario">
          ${['low', 'median', 'high'].map(opt => `
            <option value="${opt}" ${scenario.slrScenario === opt ? 'selected' : ''}>${opt}</option>
          `).join('')}
        </select>

        <label>CO₂-Wirkungszeitraum (Jahre)</label>
        <input type="number" id="co2EffectYearSpread" value="${scenario.co2EffectYearSpread}" min="1" step="1">
      </details>


      <div class="action-buttons">
        <button class="cancel">Verwerfen</button>
        <button class="save">Speichern</button>
      </div>
    `;

    this._setupListeners(editorState.targetScenarioId);
    this.classList.add('visible');
  }



  _updateScenarioMeta(id) {
    console.log(`_updateScenarioMeta called at ${new Date().toISOString()} for scenario ID: ${id}`);
    const name = this.shadowRoot.getElementById('name')?.value;
    const description = this.shadowRoot.getElementById('description')?.value;

    const state = store.getState();
    const scenario = state.scenariosById[id];
    store.setState({
      scenariosById: {
        ...state.scenariosById,
        [id]: {
          ...scenario,
          name,
          description
        }
      }
    });
    store.markScenarioAsDirty(id);
  }

  _updateAdvanced(id) {
    console.log(`_updateAdvanced called at ${new Date().toISOString()} for scenario ID: ${id}`);
    const el = this.shadowRoot.getElementById(id);
    const value = el.type === 'number' ? parseFloat(el.value) : el.value;

    const scenarioId = store.getState().scenarioEditor.targetScenarioId;
    const state = store.getState();
    const scenario = state.scenariosById[scenarioId];

    store.setState({
      scenariosById: {
        ...state.scenariosById,
        [scenarioId]: {
          ...scenario,
          [id]: value
        }
      }
    });
    store.markScenarioAsDirty(scenarioId);
  }


  _setupListeners(scenarioId) {
    const root = this.shadowRoot;
    const $ = (id) => this.shadowRoot.getElementById(id);
    $('name')?.addEventListener('input', () => this._updateScenarioMeta(scenarioId));
    $('description')?.addEventListener('input', () => this._updateScenarioMeta(scenarioId));
    ['co2ApplicationTimeframe', 'tempScenario', 'tcreScenario', 'slrScenario', 'co2EffectYearSpread'].forEach(id => {
      const el = this.shadowRoot.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this._updateAdvanced(id));
        el.addEventListener('change', () => this._updateAdvanced(id));
      }
    });

    // Hinzufügen
    root.querySelector('.add-btn')?.addEventListener('click', () => {
      // ScenarioEditor wird nicht geschlossen, falls du willst:
      // store.setState({ scenarioEditor: { isOpen: false } });

      store.setState({
        activityCatalog: {
          isOpen: true,
          targetScenarioId: scenarioId
        },
        // Lässt activityEditor: isOpen=false
      });
    });

    // Abbrechen
    root.querySelector('.cancel')?.addEventListener('click', () => {
      const id = scenarioId;
      if (this._backup && id) {
        const state = store.getState();
        store.setState({
          scenariosById: {
            ...state.scenariosById,
            [id]: structuredClone(this._backup)
          },
          scenarioEditor: {
            isOpen: false,
            targetScenarioId: null
          }
        });
      }
    });

    // Speichern
    root.querySelector('.save')?.addEventListener('click', () => {
      store.setState({
        scenarioEditor: {
          isOpen: false,
          targetScenarioId: null,
        }
      });
      store.markScenarioAsDirty(scenarioId);
    });

    // Bearbeiten-Buttons
    root.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // scenarioEditor offenlassen oder schließen, wie du möchtest:
        // store.setState({ scenarioEditor: { isOpen: false } });
        const behaviorId = btn.getAttribute('data-id');
        store.setState({
          activityEditor: {
            isOpen: true,
            targetScenarioId: scenarioId,
            targetBehaviorId: behaviorId,
          },
          // Lässt activityCatalog: isOpen=false
        });
      });

    });

    // Löschen-Buttons
    root.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const behaviorId = btn.getAttribute('data-id');
        const scenario = store.getState().scenariosById[scenarioId];
        const updated = (scenario.behaviors || []).filter(b => b.id !== behaviorId);

        store.setState({
          scenariosById: {
            ...store.getState().scenariosById,
            [scenarioId]: {
              ...scenario,
              behaviors: updated
            }
          }
        });
        store.markScenarioAsDirty(scenarioId);
      });
    });
  }
}

customElements.define('scenario-editor', ScenarioEditor);
