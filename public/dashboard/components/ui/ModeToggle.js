import store from '../../store.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .mode-toggle {
      background: #fff;
      border: 0px solid #ddd;
      border-radius: 8px;
      text-align: center;
      font-family: 'Aboreto', serif;
      box-shadow: 0 2px 5px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: row;
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
      height: 100%;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    button:first-child {
      border-radius: 8px 0 0 8px;
    }
    button:last-child {
      border-radius: 0 8px 8px 0;
    }
    button.active {
      background: #28b200;
      color: white;
    }
  </style>
  <div class="mode-toggle">
    <button data-mode="absolute">Abs</button>
    <button data-mode="delta">Δ</button>
  </div>
`;

export class ModeToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const buttons = this.shadowRoot.querySelectorAll('button');

    /**
     * USER-INTERAKTION:
     * Klick auf Button → aktives Styling setzen + Store aktualisieren
     */
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;

        if (store.getState().displayMode !== mode) {
          store.setState({ displayMode: mode });

          // Beim Umschalten auf "absolute" Vergleichsszenario entfernen
          if (mode === 'absolute') {
            store.setState({ comparisonScenarioId: null });
          }
        }
      });
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
    const buttons = this.shadowRoot.querySelectorAll('button');
    buttons.forEach(btn => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('active', isActive);
    });
  }

  /**
   * Liefert den aktuell gesetzten Anzeigemodus ("absolute" oder "delta").
   * @returns {string}
   */
  getMode() {
    const activeBtn = this.shadowRoot.querySelector('button.active');
    return activeBtn?.dataset.mode || 'absolute';
  }
}

customElements.define('mode-toggle', ModeToggle);
