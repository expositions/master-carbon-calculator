/**
 * store.js
 *
 * Zentrales State-Management-Modul für ein Vanilla-JS-Projekt.
 * Implementiert ein reaktives, globales Datenmodell mit Mini-Store-Mechanismus.
 *
 * Features:
 * - Zentrales State-Objekt für UI, Szenarien, Editoren etc.
 * - `subscribe(fn)` für globale Reaktionen
 * - `subscribeTo(selectorFn, callback)` für gezielte, selektive Reaktivität
 * - LocalStorage-Integration zum Speichern/Laden des Zustands
 * - Setzbarer Key für Namespacing/Persistenz pro Projekt/User
 */

///////////////////////////////////////////////////////////////////////////////
// Konfiguration
///////////////////////////////////////////////////////////////////////////////

let localStorageKey = 'climateAppState'; // Default-Key, kann geändert werden

///////////////////////////////////////////////////////////////////////////////
// Initialer Zustand
///////////////////////////////////////////////////////////////////////////////

const initialState = {
  /////////////////////////////////////////////////////////////////////////////
  // GLOBALE UI- & APP-STATE-FELDER
  /////////////////////////////////////////////////////////////////////////////
  displayMode: 'absolute',     // "absolute" | "delta"
  selectedYear: 2025,          // Jahr, z. B. ausgewählt via <year-slider>
  selectedScenarioId: null,    // ID des aktuell aktiven Szenarios
  comparisonScenarioId: null, // ID des Vergleichsszenarios
  dirtyScenarioIds: [],
  scenarioOrder: [],

  /////////////////////////////////////////////////////////////////////////////
  // SZENARIEN & INHALT
  /////////////////////////////////////////////////////////////////////////////
  scenariosById: {
    // Beispielstruktur:
    /*
    'abc-uuid': {
      id: 'abc-uuid',
      name: 'Szenario A',
      description: 'Reduktionsszenario mit X',
      scaleType: 'PRESET',
      scaleLabel: 'EU',
      selectedCountries: [],

      co2DeltaKg: 500,
      co2ApplicationTimeframe: 5,
      tempScenario: 'SSP2_4_5',
      tcreScenario: 'mid',
      slrScenario: 'median',
      co2EffectYearSpread: 7,

      behaviors: [
        { id: 'b1', label: 'Weniger Fleisch', co2DeltaKg: 300, isActive: true }
      ],

      computed: {
        data: [ /* Einträge mit year, temp, seaLevel ... *\/ ],
        meta: { /* Kopie der Simulationsparameter *\/ }
      }
    }
    */
  },

  /////////////////////////////////////////////////////////////////////////////
  // EDITOR-ZUSTÄNDE
  /////////////////////////////////////////////////////////////////////////////

  scenarioEditor: {
    isOpen: false,
    targetScenarioId: null,
    draft: {
      name: '',
      description: ''
    }
  },

  activityEditor: {
    isOpen: false,
    targetScenarioId: null,
    targetBehaviorId: null,
    draft: {}
  },

  /////////////////////////////////////////////////////////////////////////////
  // SONSTIGES (Kataloge, LLM-Helfer etc.)
  /////////////////////////////////////////////////////////////////////////////

  activityCatalog: {
    isOpen: false,
    targetScenarioId: null
  },

  languageModelHelper: {
    isOpen: false,
    currentPrompt: '',
    suggestions: []
  }
};

///////////////////////////////////////////////////////////////////////////////
// Store-Objekt mit zentraler Logik
///////////////////////////////////////////////////////////////////////////////

const store = {
  state: JSON.parse(JSON.stringify(initialState)),
  subscribers: [],

  /**
   * Gibt den aktuellen vollständigen State zurück.
   * @returns {Object} Der zentrale Zustand des Systems.
   */
  getState() {
    return this.state;
  },

  /**
   * Ändert den State partiell und informiert alle Subscriber.
   * Gleichzeitig wird der neue Zustand in localStorage persistiert.
   *
   * @param {Object} patch - Objekt mit Feldern, die aktualisiert werden sollen.
   */
  setState(patch) {
    Object.assign(this.state, patch);
    this.notifySubscribers();
    this.saveToLocalStorage();
  },

  /**
   * Fügt eine Funktion zur globalen Benachrichtigung bei jeder Änderung hinzu.
   *
   * @param {function(state: Object): void} fn - Callback-Funktion
   * @param {boolean} [callImmediately=true] - Falls true, wird `fn` sofort mit aktuellem State aufgerufen.
   */
  subscribe(fn, callImmediately = true) {
    this.subscribers.push(fn);
    if (callImmediately) {
      fn(this.state);
    }
  },

  /**
   * Entfernt eine abonnierte Callback-Funktion.
   *
   * @param {function(state: Object): void} fn - Funktion, die entfernt werden soll
   */
  unsubscribe(fn) {
    this.subscribers = this.subscribers.filter(sub => sub !== fn);
  },

  /**
   * Ruft alle registrierten Subscriber mit dem aktuellen State auf.
   */
  notifySubscribers() {
    console.log('[Store] Notifying', this.subscribers.length, 'subscribers.');
    for (const fn of this.subscribers) {
      fn(this.state);
    }
  },

  /////////////////////////////////////////////////////////////////////////////
  // Selektive Reaktivität (subscribeTo)
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Fügt einen selektiven Subscriber hinzu, der nur bei Änderungen eines bestimmten Teils
   * des State ausgelöst wird.
   *
   * Diese Methode ermöglicht es, gezielt auf Änderungen eines bestimmten Teils des globalen State zu reagieren.
   * Der selektive Subscriber wird nur dann ausgelöst, wenn sich der Rückgabewert der `selectorFn` Funktion ändert.
   * Dies ist besonders nützlich, um unnötige Re-Renders oder Berechnungen zu vermeiden und die Performance zu optimieren.
   *
   * Funktionsweise:
   * 1. Die `selectorFn` Funktion wird auf den aktuellen State angewendet, um den relevanten Teil des State zu extrahieren.
   * 2. Eine interne Subscriber-Funktion wird erstellt, die bei jeder State-Änderung die `selectorFn` erneut auf den neuen State anwendet.
   * 3. Wenn sich der extrahierte Wert geändert hat, wird die `callback` Funktion mit dem neuen Wert aufgerufen.
   * 4. Die interne Subscriber-Funktion wird registriert und sofort mit dem aktuellen State aufgerufen.
   * 5. Die Methode gibt eine Funktion zurück, mit der der selektive Subscriber wieder entfernt werden kann.
   *
   * @param {function(state: Object): any} selectorFn - Funktion, die ein Teilobjekt oder -wert aus dem State extrahiert.
   * @param {function(newValue: any): void} callback - Wird nur aufgerufen, wenn sich der Rückgabewert von `selectorFn` ändert.
   * @returns {function(): void} Funktion zum Entfernen des selektiven Subscribers.
   */
  subscribeTo(selectorFn, callback) {
    let prev = selectorFn(this.state);
    // 1) Subscriber-Funktion separieren
    const subscriberFn = (newState) => {
      const next = selectorFn(newState);
      if (!deepEqual(prev, next)) {
        callback(next);
        prev = next;
      }
    };
    // 2) registrieren
    this.subscribe(subscriberFn);
    // 3) Rückgabe: Funktion zum Unsubscribe
    return () => this.unsubscribe(subscriberFn);
  },

  /////////////////////////////////////////////////////////////////////////////
  // LocalStorage-Integration
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Lädt den State aus localStorage.
   * Falls nichts gefunden, bleibt der aktuelle Zustand unverändert.
   */
  loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(localStorageKey);
      if (!data) return;
      const parsed = JSON.parse(data);
      Object.assign(this.state, parsed);
      this.notifySubscribers();
      // Nach dem Laden: prüfen, ob alle Szenarien computed sind
      for (const [id, scenario] of Object.entries(this.state.scenariosById)) {
        if (!scenario?.computed?.data?.length) {
          this.markScenarioAsDirty(id);
        }
      }
    } catch (err) {
      console.warn('Fehler beim Laden aus localStorage:', err);
    }
  },

  /**
   * Speichert den aktuellen Zustand in localStorage.
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(this.state));
    } catch (err) {
      console.warn('Fehler beim Speichern in localStorage:', err);
    }
  },

  /**
   * Markiert ein Szenario als „dirty“ – es muss neu berechnet werden.
   * Fügt die ID hinzu, falls sie noch nicht enthalten ist.
   * @param {string} scenarioId
   */
  markScenarioAsDirty(id) {
    if (this.state.dirtyScenarioIds.includes(id)) return;   // doppelt? Dann nichts machen
    this.setState({
      dirtyScenarioIds: [...this.state.dirtyScenarioIds, id]
    });
  },

  /**
   * Entfernt ein Szenario aus der Dirty-Liste, z.B. nach erfolgreicher Re-Simulation.
   * Ruft notifySubscribers(), damit sich abhängige Komponenten aktualisieren.
   * @param {string} scenarioId
   */
  clearDirtyScenarioId(id) {
    this.setState({
      dirtyScenarioIds: this.state.dirtyScenarioIds.filter(x => x !== id)
    });
  }
};

///////////////////////////////////////////////////////////////////////////////
// Utility-Funktionen
///////////////////////////////////////////////////////////////////////////////

/**
 * Setzt den LocalStorage-Key für Persistenz.
 * Sollte VOR `loadFromLocalStorage()` aufgerufen werden.
 *
 * @param {string} key - Der neue Storage-Key.
 */
export function setLocalStorageKey(key) {
  localStorageKey = key;
}

/**
 * Setzt den State auf den Ausgangszustand zurück und speichert neu.
 */
export function resetStateToInitial() {
  store.state = JSON.parse(JSON.stringify(initialState));
  store.notifySubscribers();
  store.saveToLocalStorage();
}

/**
 * Einfache Deep Equality – für primitive Datenstrukturen (kein Zyklentest).
 * Ersetzt z. B. `prev !== next` in `subscribeTo`.
 *
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

///////////////////////////////////////////////////////////////////////////////
// Export des zentralen Stores
///////////////////////////////////////////////////////////////////////////////

export default store;
