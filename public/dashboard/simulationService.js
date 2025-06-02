/**
 * simulationService.js
 *
 * Führt automatisch Re-Simulationen für alle dirty-Szenarien durch.
 * Erkennt Änderungen, berechnet `computed`, schreibt Store, räumt auf.
 */

import store from './store.js';
import { simulateFutureScenario } from '../scenario-data/simulateFutureScenario.js';
import { populations } from '../scenario-data/populations.js';

/**
 * Führt eine Simulation für ein Szenario durch, schreibt Ergebnis + simulatedAt.
 * Wird intern vom Observer auf dirtyScenarioIds verwendet.
 * @param {string} scenarioId
 */
function runScenarioSimulation(scenarioId) {
  // console.log("runScenarioSimulation in simulationService triggered for ID: ", scenarioId);

  const state = store.getState();
  const scenario = state.scenariosById[scenarioId];
  if (!scenario) return;

  const input = {
    id: scenarioId,
    co2DeltaKg: scenario.co2DeltaKg,
    co2ApplicationTimeframe: scenario.co2ApplicationTimeframe,
    tempScenario: scenario.tempScenario,
    tcreScenario: scenario.tcreScenario,
    slrScenario: scenario.slrScenario,
    co2EffectYearSpread: scenario.co2EffectYearSpread
  };

  ///////////////////////////////////////////////////////////////////////////
  // CO₂-BERECHNUNG AUF BASIS DER AKTIVEN VERHALTENSWEISEN UND LÄNDERDATEN
  ///////////////////////////////////////////////////////////////////////////

  // Summe der CO₂-Wirkung aller aktiven Verhaltensweisen
  const behaviorSum = (scenario.behaviors || []).reduce((acc, b) => {
    const value = b.co2DeltaKg || 0;
    const mode = b.mode || 'DO_LESS';
    return acc + (mode === 'DO_LESS' ? -value : value);
  }, 0);

  // Gesamtbevölkerung der ausgewählten Länder
  const selectedCountries = scenario.selectedCountries || [];
  const totalPopulation = selectedCountries.length === 0
    ? 1 // fallback bei leerer Länderliste
    : selectedCountries.reduce((sum, code) => {
        const country = populations.find(c => c.code === code);
        return country ? sum + country.population : sum;
      }, 0);

  // Gesamt-CO₂-Ausstoß berechnen (individuelles Verhalten × Bevölkerungsgröße)
  const scaledCo2DeltaKg = behaviorSum * totalPopulation;


  ///////////////////////////////////////////////////////////////////////////
  // SIMULATION AUF BASIS DER GESAMTDATEN DURCHFÜHREN
  ///////////////////////////////////////////////////////////////////////////
  const result = simulateFutureScenario({
    co2DeltaKg: scaledCo2DeltaKg,
    co2ApplicationTimeframe: input.co2ApplicationTimeframe,
    tempScenario: input.tempScenario,
    tcreScenario: input.tcreScenario,
    slrScenario: input.slrScenario,
    co2EffectYearSpread: input.co2EffectYearSpread
  });

  ///////////////////////////////////////////////////////////////////////////
  // SIMULATION IN DEN STORE ZURÜCKSCHREIBEN
  ///////////////////////////////////////////////////////////////////////////
  const updatedScenario = {
    ...scenario,
    computed: {
      meta: {
        ...input, // damit die Simulation rekonstruierbar ist
        simulatedAt: Date.now() // Zeitpunkt der Simulation tracken
      },
      data: result.data // eigentliche Zeitleiste mit temp/seaLevel etc.
    }
  };
  store.clearDirtyScenarioId(scenarioId);

  store.setState({
    scenariosById: {
      ...state.scenariosById,
      [scenarioId]: updatedScenario
    }
  });

}

/**
 * Initialisiert den automatischen Recompute-Loop.
 * Lauscht auf Änderungen in dirtyScenarioIds und verarbeitet sie.
 */
export function startSimulationLoop() {
  // console.log("startSimulationLoop triggered");
  // Initial-Check: alles markieren, was kein computed hat
  for (const [id, scenario] of Object.entries(store.getState().scenariosById)) {
    if (!scenario?.computed?.data?.length) {
      store.markScenarioAsDirty(id);
    }
  }

  setTimeout(() => {
    const dirtyIds = store.getState().dirtyScenarioIds;
    // console.log("Initial delayed dirtyScenarioIds:", dirtyIds);
    for (const id of dirtyIds) {
      // console.log("Running simulation for scenario ID:", id);
      runScenarioSimulation(id);
    }
  }, 0);


  store.subscribeTo(
    state => state.dirtyScenarioIds,
    (dirtyList) => {
      for (const id of dirtyList) {
        // console.log("simulationService was notified about dirty scenario, now running on id ", id);
        runScenarioSimulation(id);
      }
    }
  );
  // Periodic check for dirty scenarios as FALLBACK
  setInterval(() => {
    const dirtyIds = store.getState().dirtyScenarioIds;
    if (dirtyIds.length > 0) {
      console.log("Periodic check found dirty scenarios, running simulations for:", dirtyIds);
      for (const id of dirtyIds) {
        runScenarioSimulation(id);
      }
    }
  }, 1500);
}
