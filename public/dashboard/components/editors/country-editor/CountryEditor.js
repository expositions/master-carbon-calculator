import store from '../../../store.js';
import { populations } from '../../../../scenario-data/populations.js';
import { ALL_AGGREGATES } from '../../../../scenario-data/countryGroups.js';
import { territoryData } from '../../../../scenario-data/territories.js';
import './interactive-globe.js';

const countryNamesDE = territoryData.main.de.localeDisplayNames.territories;

class CountryEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.allCountries = populations;
    this.filteredCountries = [...this.allCountries];
    // Drei separate Selektionen:
    this.manualSelection = new Set();     // durch direktes Klicken auf Länderkarten
    this.selectedGroups = new Set();      // durch Gruppenschaltflächen
    this.draftSelection = new Set();       // finale Selektion (Union aus manualSelection und Gruppen)

    this.searchTerm = '';
    this.sortKey = null;
    this.showAllGroups = false;
    this.globeOverlayOpen = false;
  }

  connectedCallback() {
    this._unsubscribeStore = store.subscribeTo(
      state => state.countryEditor,
      editorState => {
        if (!editorState?.isOpen || !editorState.targetScenarioId) {
          this.style.display = 'none';
          return;
        }
        this.style.display = 'block';

        const selected = store.getState().scenariosById[editorState.targetScenarioId]?.selectedCountries || [];
        // Initial: manuelle Selektion wird aus dem Szenario übernommen.
        this.manualSelection = new Set(selected);
        // Reset Gruppenauswahl
        this.selectedGroups = new Set();
        this._updateDraftSelectionFromGroups();
        this.render();
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

  render() {
    const shownGroups = this.showAllGroups
      ? Object.entries(ALL_AGGREGATES)
      : Object.entries(ALL_AGGREGATES).slice(0, 12);

    // Gruppenschaltflächen: Markiere Button als ausgewählt, wenn sein Schlüssel in selectedGroups ist
    const groupButtons = shownGroups
      .map(([label]) => `<button class="group-btn ${this.selectedGroups.has(label) ? 'selected' : ''}" data-group="${label}">${label}</button>`)
      .join('');

    const toggleGroupBtn = `
      <button class="group-toggle">${this.showAllGroups ? 'Weniger anzeigen' : 'Mehr anzeigen'}</button>
    `;

    this.shadowRoot.innerHTML = `
  <style>
    :host {
      display: block;
      position: fixed;
      top: 5%;
      left: 5%;
      width: 90%;
      height: 90%;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      overflow: hidden;
      font-family: sans-serif;
      z-index: 120000;
    }
    .header {
      padding: 1rem;
      font-weight: bold;
      border-bottom: 1px solid #eee;
    }
    /* Neue Top-Row: Gruppenschaltflächen und Globe nebeneinander */
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #eee;
    }
    .group-buttons {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .group-btn.selected {
      background: #28b200;
      color: white;
      border: 1px solid #28b200;
    }
    .globe-container {
      width: 30%;
      height: 100%;
      flex-shrink: 0;
      /* optional: Rahmen oder Abstand */
      margin-left: 1rem;
    }

    interactive-globe {
      display: block;
      width: 100%;
      height: 100%;
    }
    .search-sort {
      display: flex;
      gap: 1rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #eee;
    }
    input[type="search"] { flex: 1; padding: 0.4rem; }
    select { padding: 0.4rem; }
    .list {
      overflow-y: auto;
      max-height: 35vh;
      padding: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .country {
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 0.5rem;
      width: 180px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .country.selected {
      background: #28b200;
      color: white;
      font-weight: bold;
    }
    .footer {
      padding: 1rem;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      border-top: 1px solid #eee;
    }
    button {
      padding: 0.5rem 1rem;
      font-weight: bold;
      cursor: pointer;
    }
    button.apply { background: #28b200; color: white; border: none; }
    button.cancel { background: #ccc; border: none; }
    .globe-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      background: white;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .globe-overlay-controls {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: flex;
      gap: 1rem;
    }
    .globe-overlay-controls button {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      font-weight: bold;
      border: none;
    }
    .globe-overlay .interactive-globe {
      width: 90%;
      height: 90%;
    }
  </style>

  <div class="header">Länderauswahl</div>
  
  <!-- Top Row: Gruppenschaltflächen + Globe -->
  <div class="top-row">
    <div class="group-buttons">
      ${groupButtons}
      ${toggleGroupBtn}
    </div>
    <div class="globe-container">
      <interactive-globe
        backgroundcolor="#ffffff"
        countrycolor="0xcccccc"
        selectedcolor="0x28b200"
        mode="readonly"
        id="globeMini"
      ></interactive-globe>
    </div>
  </div>

  <div class="search-sort">
    <input type="search" placeholder="Suche nach Land oder Code..." value="${this.searchTerm}">
    <select id="sort">
      <option value="">Sortierung</option>
      <option value="population">Einwohnerzahl</option>
      <option value="consumption">CO₂e / Kopf</option>
    </select>
  </div>
  
  <div class="list">
    ${this._getSortedAndFilteredCountries().map(c => `
      <div class="country ${this.draftSelection.has(c.code) ? 'selected' : ''}" data-code="${c.code}">
        <div><strong>${this._translateName(c.code, c.name)}</strong> (${c.code})</div>
        <div>Einwohner: ${c.population.toLocaleString()}</div>
        <div>CO₂e/Kopf: ${c.consumption_ghg_per_capita.toFixed(2)}t</div>
      </div>
    `).join('')}
  </div>

  <div class="footer">
    <button class="cancel">Abbrechen</button>
    <button class="apply">Übernehmen</button>
  </div>

  ${this.globeOverlayOpen ? `
    <div class="globe-overlay">
      <interactive-globe
        backgroundcolor="#ffffff"
        countrycolor="0xcccccc"
        selectedcolor="0x28b200"
        mode="interactive"
        id="globeFull"
      ></interactive-globe>
      <div class="globe-overlay-controls">
        <button class="cancel-globe">Abbrechen</button>
        <button class="apply-globe">Übernehmen</button>
      </div>
    </div>
  ` : ''}
`;


    this._bindEvents();
    // Nach einem Render-Vorgang synchronisieren wir den Globe; Delay gibt dem Globe Zeit, vollständig zu rendern.
    setTimeout(() => this._syncGlobeSelection(), 200);
  }

  _translateName(code, fallback) {
    return countryNamesDE[code] || fallback || code;
  }

  _bindEvents() {
    // Gruppenschaltflächen: Toggle multiple groups.
    this.shadowRoot.querySelectorAll('.group-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const groupKey = btn.dataset.group;
        if (this.selectedGroups.has(groupKey)) {
          this.selectedGroups.delete(groupKey);
        } else {
          this.selectedGroups.add(groupKey);
        }
        this._updateDraftSelectionFromGroups();
        this.render();
        setTimeout(() => this._syncGlobeSelection(), 200);
      });
    });

    this.shadowRoot.querySelector('.group-toggle').addEventListener('click', () => {
      this.showAllGroups = !this.showAllGroups;
      this.render();
    });

    // Suchfeld: Nur die Liste rendern (ohne komplette Neuzeichnung der Seite)
    this.shadowRoot.querySelector('input[type="search"]').addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this._renderCountryListOnly();
    });

    // Sortierung
    this.shadowRoot.querySelector('#sort').addEventListener('change', (e) => {
      this.sortKey = e.target.value;
      this._renderCountryListOnly();
    });

    // Länder aus der Liste: Update manuelle Selektion
    this.shadowRoot.querySelectorAll('.country').forEach(card => {
      card.addEventListener('click', () => {
        const code = card.dataset.code;
        if (this.manualSelection.has(code)) {
          this.manualSelection.delete(code);
        } else {
          this.manualSelection.add(code);
        }
        this._updateDraftSelectionFromGroups();
        this._renderCountryListOnly();
        setTimeout(() => this._syncGlobeSelection(), 0);
      });
    });

    // Abbrechen (Editor schließen)
    this.shadowRoot.querySelector('.cancel')?.addEventListener('click', () => {
      store.setState({ countryEditor: { isOpen: false, targetScenarioId: null } });
    });

    // Übernehmen: Schreibt Auswahl in Szenario
    this.shadowRoot.querySelector('.apply')?.addEventListener('click', () => {
      this._applySelection();
    });

    // Mini-Globus: Klick → öffnet Fullscreen-Modus (über mousedown mit kurzem Klick)
    this.shadowRoot.getElementById('globeMini')?.addEventListener('mousedown', (e) => {
      const startTime = Date.now();
      const mouseUpHandler = () => {
        const duration = Date.now() - startTime;
        if (duration < 200) {
          this.globeOverlayOpen = true;
          this.render();
          setTimeout(() => this._syncGlobeSelection(true), 0);
        }
        document.removeEventListener('mouseup', mouseUpHandler);
      };
      document.addEventListener('mouseup', mouseUpHandler);
    });

    // Fullscreen-Globus: Übernehmen & Abbrechen
    this.shadowRoot.querySelector('.apply-globe')?.addEventListener('click', () => {
      const globe = this.shadowRoot.getElementById('globeFull');
      const ids = globe.selectedCountries.map(c => c.id);
      this.manualSelection = new Set(ids); // Update manuelle Selektion
      this._updateDraftSelectionFromGroups();
      this.globeOverlayOpen = false;
      this.render();
    });

    this.shadowRoot.querySelector('.cancel-globe')?.addEventListener('click', () => {
      this.globeOverlayOpen = false;
      this.render();
    });
  }

  _updateDraftSelectionFromGroups() {
    const groupUnion = new Set();
    for (const groupKey of this.selectedGroups) {
      const groupArr = ALL_AGGREGATES[groupKey] || [];
      groupArr.forEach(code => groupUnion.add(code));
    }
    // Final: Union aus manueller Selektion und Gruppenauswahl
    this.draftSelection = new Set([...this.manualSelection, ...groupUnion]);
  }

  _syncGlobeSelection(full = false) {
    const globeMini = this.shadowRoot.getElementById('globeMini');
    const globeFull = this.shadowRoot.getElementById('globeFull');

    const selected = Array.from(this.draftSelection);
    if (globeMini) globeMini.selectedCountries = selected;
    if (globeFull) globeFull.selectedCountries = selected;
  }

  _applySelection() {
    const state = store.getState();
    const id = state.countryEditor?.targetScenarioId;
    if (!id) return;

    const scenario = state.scenariosById[id];

    store.setState({
      scenariosById: {
        ...state.scenariosById,
        [id]: {
          ...scenario,
          selectedCountries: Array.from(this.draftSelection)
        }
      },
      countryEditor: { isOpen: false, targetScenarioId: null }
    });
  }

  _getSortedAndFilteredCountries() {
    let list = [...this.allCountries];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(c => {
        const code = c.code.toLowerCase();
        const nameEn = (c.name || '').toLowerCase();
        const nameDe = (countryNamesDE[c.code] || '').toLowerCase();
        return (
          nameDe.includes(term) ||
          code.includes(term) ||
          nameEn.includes(term)
        );
      });
    }

    if (this.sortKey === 'population') {
      list.sort((a, b) => b.population - a.population);
    } else if (this.sortKey === 'consumption') {
      list.sort((a, b) => b.consumption_ghg_per_capita - a.consumption_ghg_per_capita);
    }

    return list;
  }

  _renderCountryListOnly() {
    const listEl = this.shadowRoot.querySelector('.list');
    listEl.innerHTML = this._getSortedAndFilteredCountries().map(c => `
      <div class="country ${this.draftSelection.has(c.code) ? 'selected' : ''}" data-code="${c.code}">
        <div><strong>${this._translateName(c.code, c.name)}</strong> (${c.code})</div>
        <div>Einwohner: ${c.population.toLocaleString()}</div>
        <div>CO₂e/Kopf: ${c.consumption_ghg_per_capita.toFixed(2)}t</div>
      </div>
    `).join('');

    listEl.querySelectorAll('.country').forEach(card => {
      card.addEventListener('click', () => {
        const code = card.dataset.code;
        if (this.manualSelection.has(code)) {
          this.manualSelection.delete(code);
        } else {
          this.manualSelection.add(code);
        }
        this._updateDraftSelectionFromGroups();
        this._renderCountryListOnly();
        setTimeout(() => this._syncGlobeSelection(), 0);
      });
    });
  }
}

customElements.define('country-editor', CountryEditor);
