import store from '../../store.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      width: 100%;
      font-family: 'Aboreto', serif;
    }

    .slider-container {
      flex: 1 1 80%;
      max-width: 80%;
      padding: 10px;
      text-align: center;
    }

    .year-label {
      font-size: 1.2rem;
      font-weight: bold;
      margin-bottom: 4px;
      color: #28b200;
    }

    input[type=range] {
      width: 100%;
      margin: 6px 0;
      accent-color: #28b200;
    }
  </style>

  <div class="slider-container">
    <div class="year-label" id="activeYear">—</div>
    <input type="range" id="slider" min="0" max="0" step="1">
  </div>
`;

export class YearSlider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));

    this.years = [];
    this.currentIndex = 0;
  }

  connectedCallback() {
    this.slider = this.shadowRoot.getElementById('slider');
    this.label = this.shadowRoot.getElementById('activeYear');

    /**
     * USER-INTERAKTION: Slider verändert den aktuellen Index,
     * der gewählte Jahrwert wird in den zentralen Store geschrieben.
     */
    this.slider.addEventListener('input', () => {
      this.currentIndex = parseInt(this.slider.value, 10);
      const year = this.years[this.currentIndex];
      this.label.textContent = `Jahr ${year}`;

      // Neuer Wert in den globalen Zustand schreiben
      store.setState({ selectedYear: year });
    });

    /**
     * Store-Änderungen beobachten:
     * Wenn selectedYear sich im globalen Zustand ändert,
     * aktualisiere die UI (Slider-Position und Label).
     */
    this._unsubscribeStore = store.subscribeTo(
      (state) => {
        const s = state.scenariosById?.[state.selectedScenarioId];
        return s?.computed?.data?.map(d => d.year) ?? [];
      },
      (years) => {
        if (Array.isArray(years) && years.length > 0) {
          this.setYears(years);
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
  

  /**
   * Setzt die verfügbaren Jahre für den Slider.
   * Wird z. B. aufgerufen, wenn sich das Szenario ändert und neue Simulationsdaten geliefert werden.
   *
   * @param {number[]} yearArray - Liste von verfügbaren Jahren
   */
  setYears(yearArray) {
    // 1) Altes Jahr merken
    const oldYear = this.getYear();

    // 2) Update the internal list of years
    this.years = yearArray;

    // 3) Neue Maximalgrenze für den Slider
    this.slider.max = this.years.length - 1;

    // 4) Gucken, ob altes Jahr im neuen Array existiert
    const newIndex = this.years.indexOf(oldYear);
    if (newIndex >= 0) {
      // Falls ja: An alter Position weitermachen
      this.slider.value = newIndex;
      this.currentIndex = newIndex;
      this.label.textContent = `Jahr ${this.years[newIndex]}`;
    } else {
      // Falls nein: auf Index 0 springen
      this.slider.value = 0;
      this.currentIndex = 0;
      this.label.textContent = `Jahr ${this.years[0] ?? "—"}`;
      // Update auch in den globalen Zustand schreiben
      if (this.years.length > 0) {
        store.setState({ selectedYear: this.years[0] });
      }
    }
  }

  /**
   * Setzt explizit ein Jahr im Slider (z. B. durch externen Trigger).
   * Wird intern auch von subscribeTo verwendet.
   *
   * @param {number} targetYear - Jahr, das gesetzt werden soll
   */
  setYear(targetYear) {
    const index = this.years.indexOf(targetYear);
    if (index >= 0) {
      this.slider.value = index;
      this.label.textContent = `Jahr ${targetYear}`;
      this.currentIndex = index;
    }
  }

  /**
   * Gibt das aktuell gewählte Jahr zurück.
   * @returns {number|null}
   */
  getYear() {
    return this.years[this.currentIndex] ?? null;
  }
}

customElements.define('year-slider', YearSlider);
