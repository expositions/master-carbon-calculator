import store from '../../store.js';

globalThis.store = store;

import './ModeToggle.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: 'Aboreto', serif;
    }

    .container {
      max-width: 80vw;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
    }

    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .mode-toggle-wrapper {
      transform: translateX(5%);
      width: 90%;
      margin-top: 1em;
    }

    .card {
      position: relative;
      padding: 10px 40px 10px 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      background: #f9f9f9;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .card:hover {
      background: #e6ffe6;
    }

    .card.selected {
      background: #28b200;
      color: #fff;
      border-color: #28b200;
    }

    .card.comparison {
      border: 2px dashed #28b200;
      background: rgba(40, 178, 0, 0.1);
    }

    .card h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: bold;
    }

    .card p {
      margin: 4px 0 0;
      font-size: 0.8rem;
      color: inherit;
    }

    .actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
    }

    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
    }

    .icon-btn:hover {
      opacity: 1;
    }

    svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    .card.add-card {
      background: #eeeeee;
      text-align: center;
      font-style: italic;
      color: #555;
    }

    .card.add-card:hover {
      background: #d4ffd4;
    }
  </style>

  <div class="top-row">
    <div class="mode-toggle-wrapper">
      <mode-toggle id="modeToggle"></mode-toggle>
    </div>
  </div>

  <div class="container" id="scenarioContainer"></div>
`;

export class ScenarioSelector extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

    /**
     * Ursprüngliche lokale Felder werden jetzt seltener gebraucht, da wir auf den Store setzen.
     * Wir nutzen sie nur noch, um das aktuell ausgewählte Szenario in der UI darzustellen.
     */
    this.container = this.shadowRoot.getElementById('scenarioContainer');
    this.selectedId = store.getState().selectedScenarioId || null;
    this.comparisonId = store.getState().comparisonScenarioId || null;
  }

  connectedCallback() {
    /**
     * 1) Store-Subscription:
     *    Wenn sich scenariosById, selectedScenarioId oder scenarioOrder ändern,
     *    rendern wir das UI neu. So ist die Anzeige immer aktuell.
     */
    this._unsubscribeStore = store.subscribeTo(
      (state) => ({
        scenariosById: state.scenariosById,
        scenarioOrder: state.scenarioOrder,
        selectedScenarioId: state.selectedScenarioId,
        comparisonScenarioId: state.comparisonScenarioId
      }),
      ({ scenariosById, scenarioOrder, selectedScenarioId, comparisonScenarioId }) => {
        this._renderFromStore(scenariosById, scenarioOrder, selectedScenarioId, comparisonScenarioId);
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

  /**
   * Private Hilfsfunktion, um das DOM basierend auf dem globalen Storezustand aufzubauen.
   * Ruft im Kern `_renderCards(...)` auf, nachdem die Szenarien anhand der definierten Reihenfolge
   * im globalen Zustand (`scenarioOrder`) sortiert wurden.
   *
   * @param {Object} scenariosById - Objekt { [id]: {id, name, description, ...} }
   * @param {string|null} selectedScenarioId - Die ID des aktuell ausgewählten Szenarios (oder null)
   */
  _renderFromStore(scenariosById, scenarioOrder, selectedScenarioId, comparisonScenarioId) {
    // console.log({ scenariosById, scenarioOrder, selectedScenarioId, comparisonScenarioId });

    // Falls keine explizite Sortierreihenfolge der Szenarien
    // im Store gespeichert ist, wird die Standardreihenfolge (nach Object.keys) verwendet.
    if (scenarioOrder.length === 0) {
      scenarioOrder = Object.keys(scenariosById);
    }

    // Die finale Szenarienliste: aus der Reihenfolge-Liste (`scenarioOrder`)
    // wird ein Array der Szenarienobjekte gebaut. Nicht existierende IDs (veraltete Referenzen)
    // werden herausgefiltert.

    const scenariosArray = scenarioOrder
      .map(id => scenariosById[id])
      .filter(Boolean); // Entfernt undefined/null, falls IDs in `scenarioOrder` nicht mehr existieren

    // Merken, welches Szenario aktuell ausgewählt ist
    this.selectedId = selectedScenarioId || null;
    this.comparisonId = comparisonScenarioId || null;

    // Übergabe der sortierten (und ggf. gefilterten) Szenarienliste an das Renderer-Subsystem
    this._renderCards(scenariosArray);
  }

  /**
   * Rendert die Szenariokarten + zusätzliche "Neues Szenario anlegen"-Karte.
   * @param {Array} scenarios - Array von Szenario-Objekten aus dem Store
   */
  _renderCards(scenarios) {
    this.container.innerHTML = '';

    // 1) Zusätzliche Karte zum Erstellen
    const addCard = document.createElement('div');
    addCard.classList.add('card', 'add-card');
    addCard.innerHTML = `<h4>Neues Szenario anlegen</h4>`;
    addCard.addEventListener('click', () => this._createNewScenario());
    this.container.appendChild(addCard);

    // 2) Hauptkarten
    scenarios.forEach(scenario => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.dataset.id = scenario.id;

      card.innerHTML = `
        <div class="actions">
          <button class="icon-btn edit-btn" title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"> <path d="M4 21h4l11-11-4-4L4 17v4z"/> </svg>
          </button>
          <button class="icon-btn delete-btn" title="Löschen">
            <svg viewBox="0 0 24 24"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z"/></svg>
          </button>
          <button class="icon-btn duplicate-btn" title="Duplizieren">
            <svg viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v16h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 18H8V7h11v16z"/>
            </svg>
          </button>
        </div>
        <h4>${scenario.name || 'Unbenanntes Szenario'}</h4>
        ${scenario.description ? `<p>${scenario.description}</p>` : ''}
      `;

      if (scenario.id === this.selectedId) {
        card.classList.add('selected');
      }

      if (scenario.id === this.comparisonId) {
        card.classList.add('comparison');
      }

      // Klick auf Kartengrund → Szenario auswählen
      card.addEventListener('click', (e) => {
        // nicht "edit" oder "delete"
        if (!e.target.closest('button')) {
          this._selectScenario(scenario.id);
        }
      });

      // Edit
      card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._editScenario(scenario.id);
      });

      // Delete
      card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._deleteScenario(scenario.id);
      });

      // Duplicate
      card.querySelector('.duplicate-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._duplicateScenario(scenario.id);
      });

      this.container.appendChild(card);
    });
  }

  /**
   * Wird aufgerufen, wenn der User die Karte eines Szenarios anklickt.
   * Setzt `selectedScenarioId` oder `comparisonScenarioId` im Store,
   * abhängig vom aktuellen `displayMode`.
   * Im "absolute"-Modus wird `selectedScenarioId` gesetzt.
   * Im "delta"-Modus wird `comparisonScenarioId` gesetzt, sofern es sich
   * nicht um das gleiche Szenario wie das Hauptszenario handelt.
   * @param {string} scenarioId - Die ID des angeklickten Szenarios
   */
  _selectScenario(scenarioId) {
    const mode = store.getState().displayMode;

    if (mode === 'delta') {
      const currentPrimary = store.getState().selectedScenarioId;

      // Verhindern, dass das Vergleichsszenario gleich dem Hauptszenario ist
      if (scenarioId !== currentPrimary) {
        store.setState({ comparisonScenarioId: scenarioId });
      } else {
        // Optional: Wenn gleich, deselect (Vergleichsszenario entfernen)
        store.setState({ comparisonScenarioId: null });
      }
    } else {
      store.setState({ selectedScenarioId: scenarioId });
    }
  }

  /**
   * Ruft den Editor auf (bzw. setzt Editor-Flags im Store), damit das Szenario bearbeitet werden kann.
   * @param {string} scenarioId - ID des zu editierenden Szenarios
   */
  _editScenario(scenarioId) {
    // Du könntest hier direkt den scenarioEditor öffnen:
    store.setState({
      scenarioEditor: {
        isOpen: true,
        targetScenarioId: scenarioId,
        draft: {
          // Evtl. kopierst du hier Name, description etc. ins Draft, falls gewünscht
          ...store.getState().scenariosById[scenarioId]
        }
      }
    });
  }

  /**
   * Löscht das angegebene Szenario aus dem Store.
   * Entfernt es sowohl aus der Szenarienliste (`scenariosById`) als
   * auch aus der Reihenfolge (`scenarioOrder`).
   * Falls es das aktuell ausgewählte Szenario war, wird die Auswahl zurückgesetzt.
   *
   * @param {string} scenarioId - Die ID des zu löschenden Szenarios
   */
  _deleteScenario(scenarioId) {
    const state = store.getState();

    // Szenario aus dem Szenarien-Objekt entfernen (Destrukturierung + Rest)
    // Das Szenario selbst (`_`) wird ignoriert und nicht weiter verwendet
    const { [scenarioId]: _, ...remaining } = state.scenariosById;

    // Szenario aus der Reihenfolge-Liste entfernen
    const newOrder = (state.scenarioOrder || Object.keys(state.scenariosById))
      .filter(id => id !== scenarioId);

    // Neuer Zustand des Stores
    const newState = {
      scenariosById: remaining,
      scenarioOrder: newOrder
    };

    // Falls das gelöschte Szenario aktuell ausgewählt war: Auswahl zurücksetzen
    if (state.selectedScenarioId === scenarioId) {
      newState.selectedScenarioId = null;
    }

    // Store mit aktualisiertem Zustand versehen
    store.setState(newState);
  }

  /**
   * Dupliziert das angegebene Szenario anhand seiner ID.
   * Erstellt einen tiefen Klon mit neuer ID und angepasstem Namen,
   * fügt ihn an der richtigen Position in der Szenarien-Reihenfolge ein
   * und aktualisiert den globalen Store-Zustand.
   *
   * @param {string} scenarioId - Die ID des Szenarios, das dupliziert werden soll
   */
  _duplicateScenario(scenarioId) {
    const state = store.getState();

    // Sicherstellen, dass das Original existiert – ansonsten Abbruch
    const original = state.scenariosById[scenarioId];
    if (!original) return;

    // Neue eindeutige ID generieren (z.B. per UUIDv4)
    const newId = this._generateUUIDv4();

    // Tiefenklon des Originals erzeugen, um Referenzprobleme zu vermeiden.
    // Die neue Instanz bekommt die neue ID und einen Namen mit Suffix.
    const duplicated = {
      ...structuredClone(original),
      id: newId,
      name: original.name + ' (Kopie)'
    };

    // Neues Szenarien-Objekt aufbauen: Originale + Duplikat
    const newScenarios = {
      ...state.scenariosById,
      [newId]: duplicated
    };

    // Reihenfolge übernehmen oder neu erzeugen, falls nicht vorhanden
    const prevOrder = state.scenarioOrder.length > 0 ? state.scenarioOrder : Object.keys(state.scenariosById);

    // Index des Originals ermitteln
    const index = prevOrder.indexOf(scenarioId);

    // Neue Reihenfolge: Duplikat direkt *nach* dem Original einfügen
    const newOrder = [...prevOrder];
    newOrder.splice(index + 1, 0, newId);

    // Store aktualisieren:
    // - Duplikat wird im Szenarien-Objekt gespeichert
    // - Die neue Reihenfolge wird gesetzt
    // - Das neue Szenario wird automatisch als ausgewählt markiert
    store.setState({
      scenariosById: newScenarios,
      scenarioOrder: newOrder,
      selectedScenarioId: newId
    });
  }

  /**
   * Erstellt ein neues leeres Szenario mit Defaultwerten.
   * Fügt es dem Store hinzu und hängt es ans Ende der Szenarienreihenfolge an.
   * Das neue Szenario wird direkt als "ausgewählt" gesetzt.
   */
  _createNewScenario() {
    // Neue eindeutige ID erzeugen
    const newId = this._generateUUIDv4();

    // Basisszenario mit sinnvollen Defaults
    const newScenario = {
      id: newId,
      name: 'Neues Szenario',
      description: '',
      co2DeltaKg: 0,
      co2ApplicationTimeframe: 1,
      tempScenario: 'SSP2_4_5',
      tcreScenario: 'mid',
      slrScenario: 'median',
      co2EffectYearSpread: 7,
      behaviors: [],
      scaleLabel: "Nur ich",
      scaleType: "PRESET",
      selectedCountries: [],
      computed: {
        data: [],
        meta: {}
      }
    };

    // Aktueller Zustand des Stores abrufen
    const state = store.getState();

    // Vorhandene Szenarien übernehmen
    const prevScenarios = state.scenariosById;

    // Reihenfolge übernehmen oder neu erzeugen, falls nicht vorhanden
    const prevOrder = state.scenarioOrder.length > 0 ? state.scenarioOrder : Object.keys(prevScenarios);

    // Store aktualisieren:
    // - Neues Szenario wird zu scenariosById hinzugefügt
    // - Die neue ID wird ans Ende der scenarioOrder angehängt
    // - Das neue Szenario wird direkt als ausgewählt gesetzt
    store.setState({
      scenariosById: {
        [newId]: newScenario,
        ...prevScenarios
      },
      scenarioOrder: [newId, ...prevOrder],
      selectedScenarioId: newId
    });
  }

  /**
   * (Beibehalten aus Original, falls woanders genutzt.)
   * Liefert das aktuell ausgewählte Szenario.
   * @returns {Object|null}
   */
  getSelectedScenario() {
    const st = store.getState();
    return st.scenariosById[st.selectedScenarioId] || null;
  }

  /**
   * Generiert eine RFC-konforme UUIDv4.
   * @returns {string}
   */
  _generateUUIDv4() {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

customElements.define('scenario-selector', ScenarioSelector);
