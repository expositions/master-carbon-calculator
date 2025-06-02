import store from '../../store.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .mode-toggle {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      text-align: center;
      font-family: 'Aboreto', serif;
      box-shadow: 0 2px 5px rgba(0,0,0,0.04);
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      position: relative;
      box-sizing: border-box;
      width: 100%;
    }
    button {
      border: 1px solid #ddd;
      background: none;
      padding: 6px 12px;
      cursor: pointer;
      transition: background 0.2s ease;
      font-family: inherit;
      font-size: 1.3rem;
      font-weight: bold;
      color: #000;
      line-height: 1.1;
      border-radius: 8px;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    button.active {
      background: #28b200;
      color: white;
    }
  </style>
  <div class="mode-toggle">
    <button data-mode="delta">Vergleichen mit …</button>
  </div>
`;

export class ModeToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const button = this.shadowRoot.querySelector('button');

    /**
     * USER-INTERAKTION:
     * Klick auf Button → aktives Styling setzen + Store aktualisieren
     */
    button.addEventListener('click', () => {
      const currentMode = store.getState().displayMode;
      const newMode = currentMode === 'delta' ? 'absolute' : 'delta';

      store.setState({ displayMode: newMode });

      // Beim Umschalten auf "absolute" Vergleichsszenario entfernen
      if (newMode === 'absolute') {
        store.setState({ comparisonScenarioId: null });
      }
    });

    /**
     * Store abonnieren: Wenn sich displayMode im Store ändert,
     * aktualisieren wir die aktive UI.
     */
    this._unsubscribeStore = store.subscribeTo(
      (state) => state.displayMode,
      (mode) => {
        this._setActiveButton(mode);
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
   * Setzt visuell den aktiven Button anhand des Modus.
   * @param {string} mode - "absolute" oder "delta"
   */
  _setActiveButton(mode) {
    const button = this.shadowRoot.querySelector('button');
    const isActive = mode === 'delta';
    button.classList.toggle('active', isActive);
  }

  /**
   * Liefert den aktuell gesetzten Anzeigemodus ("absolute" oder "delta").
   * @returns {string}
   */
  getMode() {
    return store.getState().displayMode || 'absolute';
  }
}

customElements.define('mode-toggle', ModeToggle);
