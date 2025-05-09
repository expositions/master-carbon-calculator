import store from '../../../store.js';

class ActivityEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._draft = null;

    this._unsubscribeCatalog = store.subscribeTo(
      (state) => state.activityEditor,
      (editorState) => {
        if (!editorState.isOpen) {
          this.shadowRoot.innerHTML = '';
          this.classList.remove('visible');
          return;
        }

        const { targetScenarioId, targetBehaviorId, draft } = editorState;
        const scenario = store.getState().scenariosById?.[targetScenarioId];
        const existing = scenario?.behaviors?.find(b => b.id === targetBehaviorId);

        this._draft = {
          mode: existing?.mode ?? 'DO_MORE',
          ...existing,
          ...draft
        };

        this._render();
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

  _render() {
    const d = this._draft || {};
    const timeUnits = ["Tag", "Woche", "Monat", "Jahr", "10 Jahre"];

    this.shadowRoot.innerHTML = `
<style>

  :host {
    position: fixed;
    top: 0;
    left: 50%;
    height: 100vh;
    width: 50vw;
    background: white;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
    z-index: 120000;
    padding: 1em;
    box-sizing: border-box;
    transform: translateX(0%);
    transition: transform 0.3s ease;
    overflow-y: auto;
    max-height: 100vh;
  }

  :host(.visible) {
    transform: translateX(0%);
  }

  h2 {
    font-size: 1.4rem;
    margin-bottom: 1.2rem;
    color: #333;
  }

  label {
    display: block;
    margin-top: 1rem;
    margin-bottom: 0.2rem;
    font-weight: 600;
    color: #222;
  }

  input,
  select {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #ddd;
    border-radius: 10px;
    font-family: inherit;
    font-size: 1rem;
    background: #fff;
    box-sizing: border-box;
    transition: border-color 0.2s ease;
  }

  input:focus,
  select:focus {
    border-color: #28b200;
    outline: none;
  }

  select {
    appearance: none;
    background: #fff url('data:image/svg+xml;utf8,<svg fill="%23333" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>') no-repeat right 12px center;
    background-size: 12px;
  }

  .readonly {
    background: #f5f5f5;
    color: #777;
    border-color: #eee;
  }

  .row {
    display: flex;
    gap: 10px;
  }

  .row > div {
    flex: 1;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 1.2rem;
  }

  .checkbox-row input[type="checkbox"] {
    width: auto;
    accent-color: #28b200;
  }

  .action-buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 24px;
  }

  button {
    font-size: 1rem;
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    font-family: inherit;
    cursor: pointer;
    border: none;
    transition: background 0.2s ease;
  }

  .cancel {
    background: #eee;
    color: #444;
  }

  .cancel:hover {
    background: #ddd;
  }

  .save {
    background: #28b200;
    color: white;
    font-weight: bold;
  }

  .save:hover {
    background: #249a00;
  }
</style>


      <h2>Aktivität bearbeiten</h2>

      <label>Titel (frei wählbar)</label>
      <input id="label" value="${d.label || ''}">

      ${d.meta?.name ? `
        <label>Originaltitel</label>
        <input class="readonly" value="${d.meta.name}" readonly>
      ` : ''}

      <label>Emissionen (kg CO₂e)</label>
      <input type="number" id="co2" value="${d.co2Amount ?? d.co2DeltaKg ?? 0}" step="0.1" min="0">

      <label>je …</label>
      <input id="unit" value="${d.unit || ''}" placeholder="z. B. Portion, Flug, kg">

      <div class="row">
        <div>
          <label>Wie häufig?</label>
          <input type="number" id="frequency" value="${d.frequency ?? 1}" min="0.1" step="0.1">
        </div>
        <div>
          <label>pro</label>
          <select id="timeUnit">
            ${timeUnits.map(u => `
              <option value="${u}" ${d.timeUnit === u ? 'selected' : ''}>${u}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <label>Ich mache das …</label>
      <select id="mode">
        <option value="DO_MORE" ${d.mode === 'DO_MORE' ? 'selected' : ''}>mehr</option>
        <option value="DO_LESS" ${d.mode === 'DO_LESS' ? 'selected' : ''}>nicht mehr / weniger</option>
      </select>

      <div class="checkbox-row">
        <input type="checkbox" id="onceOnly" ${d.onceOnly ? 'checked' : ''}>
        <label for="onceOnly">Einmalige Tätigkeit?</label>
      </div>

      <div class="action-buttons">
        <button class="cancel">Verwerfen</button>
        <button class="save">Speichern</button>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    const updateDraft = () => {
      this._draft.label = $('label').value;
      this._draft.co2Amount = parseFloat($('co2').value);
      this._draft.unit = $('unit').value;
      this._draft.frequency = parseFloat($('frequency').value);
      this._draft.timeUnit = $('timeUnit').value;
      this._draft.onceOnly = $('onceOnly').checked;
    };

    this.shadowRoot.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', updateDraft);
      el.addEventListener('change', updateDraft);
    });

    $('onceOnly').addEventListener('change', updateDraft);

    this.shadowRoot.querySelector('.cancel').addEventListener('click', () => {
      store.setState({
        activityEditor: {
          isOpen: false,
          targetScenarioId: null,
          targetBehaviorId: null,
          draft: {}
        }
      });
      // Falls du willst, dass man zurück in den scenarioEditor geht:
      store.setState({
        scenarioEditor: {
          ...store.getState().scenarioEditor,
          isOpen: true
        }
      });
    });

    this.shadowRoot.querySelector('.save').addEventListener('click', () => {
      this._draft.mode = this.shadowRoot.getElementById('mode').value;
      updateDraft();

      const d = this._draft;
      const annualFactor = {
        "Tag": 365,
        "Woche": 52,
        "Monat": 12,
        "Jahr": 1,
        "10 Jahre": 1 / 10
      }[d.timeUnit] || 1;

      const co2DeltaKg = d.onceOnly
        ? d.co2Amount || 0
        : (d.co2Amount || 0) * (d.frequency || 1) * annualFactor;

      const newBehavior = {
        id: d.id || crypto.randomUUID(),
        label: d.label,
        isActive: true,
        co2DeltaKg,
        co2Amount: d.co2Amount,
        frequency: d.frequency,
        timeUnit: d.timeUnit,
        unit: d.unit,
        onceOnly: d.onceOnly,
        meta: d.meta || {},
        mode: d.mode,
      };

      const state = store.getState();
      const scenario = state.scenariosById[d.id ? state.activityEditor.targetScenarioId : store.getState().selectedScenarioId];
      const updated = [...(scenario.behaviors || [])];
      const idx = updated.findIndex(b => b.id === newBehavior.id);
      if (idx >= 0) updated[idx] = newBehavior;
      else updated.push(newBehavior);

      store.setState({
        scenariosById: {
          ...state.scenariosById,
          [scenario.id]: {
            ...scenario,
            behaviors: updated
          }
        },
        activityEditor: {
          isOpen: false,
          targetScenarioId: null,
          targetBehaviorId: null,
          draft: {}
        }
      });
      store.markScenarioAsDirty(scenario.id);
    });
  }
}

customElements.define('activity-editor', ActivityEditor);
