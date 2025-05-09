// simulateFutureScenario.js

/**
 * Orchestrator Function, die für zukünftige Jahre ausrechnet, welche CO2-,
 * Temperatur- und Meeresspiegel es geben wird, basierend auf dem CO2-Delta,
 * das der User definiert. Es werden sowohl die Gesamtwerte ausgegeben als
 * auch das jeweilige Delta zum Szenario.
 *
 * Es geht z.B. um den Fall, wenn der User testen will,
 * wie viel Einfluss es auf das Klima hat, wenn 500kg weniger CO2 in die
 * Atmosphäre gelangen würden.
 *
 * ✅ Es werden immer Werte ausgerechnet für:
 * - Alle Jahre 2025 bis 2100
 * – Jahre 2125 bis 4025 in 25-er-Schritten
 * - Jahre 4125 bis 14025 in 200-er-Schritten
 *
 * Berechnungsmethoden:
 * ✅ cumulativeCo2inThisYearDeltaKg = calculateCumulativeCo2Delta(co2DeltaKg, co2ApplicationTimeframe)
 * ✅ cumulativeEffectiveCo2inThisYearDeltaKg = cumulativeEffectiveCo2inThisYearDeltaKg(year, co2DeltaKg, co2ApplicationTimeframe, co2EffectYearSpread)
 * ✅ temperatureDeltaC = simulateTempDeltaPredictionFromCO2Delta(cumulativeEffectiveCo2inThisYearDeltaKg, tcreScenario)
 * ✅ temperatureC = ipccTempPrediction(year, tempScenario = "SSP2_4_5") +  temperatureDeltaC // total temp in the year
 * temp2099 = ipccTempPrediction(2099, tempScenario) + simulateTempDeltaPredictionFromCO2Delta(cumulativeEffectiveCo2inThisYearDeltaKg(2099, co2DeltaKg, co2ApplicationTimeframe, co2EffectYearSpread), tcreScenario); // the 2099 predicted temp is used to determine which temperature-dependent SLR rise is to be selected
 * ✅ seaLevelMm = simulateSLR(year, temp2099, slrScenario = "median").seaLevelMm;
 * ✅ seaLevelMmDelta = simulateSLR(year, temp2099, slrScenario = "median").seaLevelMmDelta;
 *
 *
 * @param {Object} params - Eingabedaten für die Simulation.
 * @param {number} params.co2DeltaKg - Gesamtes CO₂-Delta in kg (positiv oder negativ) für ein Jahr.
 * @param {number} [params.co2ApplicationTimeframe=1] - Wie viele Jahre die Emissions-Änderung durchgeführt wird
 * @param {string} params.tempScenario - IPCC-Szenario, z.B. "SSP2_4_5" (immer "Mean" internal).
 * @param {string} params.tcreScenario - "low", "mid", oder "high"
 * @param {string} params.slrScenario - "low", "median", oder "high"
 * @param {number} [params.co2EffectYearSpread=7] - Wie viele Jahre die Emissions-Änderung verzögert wirken soll.
 * @returns {Object} - Ein Objekt mit "data" (Array der Jahreswerte) + "meta" (zusätzliche Info).
 *
 * data: [
 *   {
 *     year: 2025,
 *     cumulativeCo2inThisYearDeltaKg: ...,
 *     cumulativeEffectiveCo2inThisYearDeltaKg: ...,
 *     temperatureC: ...,
 *     temperatureDeltaC: ...,
 *     seaLevelMm: ...,
 *     seaLevelDeltaMm: ...
 *   },
 *   ...
 * ]
 */
export function simulateFutureScenario(params) {
  // console.log(`simulateFutureScenario triggered with params: ${JSON.stringify(params)}`)
  const {
    co2DeltaKg,
    co2ApplicationTimeframe = 1,
    tempScenario = "SSP2_4_5",
    tcreScenario = "mid",
    slrScenario = "mid",
    co2EffectYearSpread = 7
  } = params;

  // Collect all years
  const allYears = collectAllYears();
  // console.log("Years collected:", allYears);


  // Initialize results array
  const results = [];

  // Calculate cumulative CO2 delta for each year
  const cumulativeCo2Delta = cumulativeCo2inThisYearDeltaKg(co2DeltaKg, co2ApplicationTimeframe);

  // Calculate cumulative effective CO2 delta for each year
  const cumulativeEffectiveCo2Delta = allYears.map(year => 
    cumulativeEffectiveCo2inThisYearDeltaKg(year, co2DeltaKg, co2ApplicationTimeframe, co2EffectYearSpread)
  );

  // Calculate temperature delta for each year
  const temperatureDeltas = cumulativeEffectiveCo2Delta.map(delta => 
    simulateTempDeltaPredictionFromCO2Delta(delta, tcreScenario)
  );

  // Calculate temp2099
  const temp2099 = calculateTotalTemperature(2099, tempScenario, temperatureDeltas[allYears.indexOf(2099)]);

  // Calculate sea level rise and deltas for each year
  allYears.forEach((year, index) => {
    const temperatureDeltaC = temperatureDeltas[index];
    const temperatureC = calculateTotalTemperature(year, tempScenario, temperatureDeltaC);
    const seaLevelM = simulateSLR(year, temp2099, slrScenario);
    const seaLevelMm = seaLevelM * 1000;


    results.push({
      year,
      cumulativeCo2inThisYearDeltaKg: cumulativeCo2Delta,
      cumulativeEffectiveCo2inThisYearDeltaKg: cumulativeEffectiveCo2Delta[index],
      temperatureC,
      temperatureDeltaC,
      seaLevelMm
    });
  });

  return {
    meta: {
      co2DeltaKg,
      co2ApplicationTimeframe,
      tempScenario,
      tcreScenario,
      slrScenario,
      co2EffectYearSpread
    },
    data: results
  };
}

// Function to collect all relevant years
export function collectAllYears() {
  const result = [];
  // 1. 2025..2100 in 1-year steps
  for (let y = 2025; y <= 2100; y++) {
    result.push(y);
  }
  // 2. 2125..4025 in 25-year steps
  for (let y = 2125; y <= 4025; y += 25) {
    result.push(y);
  }
  // 3. 4225..12025 in 200-year steps
  for (let y = 4225; y <= 12025; y += 200) {
    result.push(y);
  }
  return result;
}

function cumulativeCo2inThisYearDeltaKg(co2DeltaKg, co2ApplicationTimeframe) {
  return co2DeltaKg * co2ApplicationTimeframe;
}

function cumulativeEffectiveCo2inThisYearDeltaKg(year, co2DeltaKg, co2ApplicationTimeframe, co2EffectYearSpread) {
  let totalEffect = 0;
  const baseYear = 2025;

  for (let i = baseYear; i < baseYear + co2ApplicationTimeframe; i++) {
    if (year < i) continue; // Future emissions don't contribute

    let effect;
    if (year < i + co2EffectYearSpread) {
      effect = (co2DeltaKg / co2EffectYearSpread) * (year - i);
    } else {
      effect = co2DeltaKg;
    }

    totalEffect += effect;
  }

  return totalEffect;
}


import { TCRE, KGCO2_TO_TTCO2 } from './climateConversions.js';
function simulateTempDeltaPredictionFromCO2Delta(cumulativeEffectiveCo2inThisYearDeltaKg, tcreScenario) {
  // Convert cumulative effective CO2 in this year from kg to TtCO2
  const cumulativeEffectiveCo2inThisYearDeltaTtCO2 = cumulativeEffectiveCo2inThisYearDeltaKg * KGCO2_TO_TTCO2;

  // Get the TCRE value based on the scenario
  const tcreValue = TCRE[tcreScenario];

  // Calculate the temperature delta
  const temperatureDeltaC = cumulativeEffectiveCo2inThisYearDeltaTtCO2 * tcreValue;

  return temperatureDeltaC;
}

import { climateScenarioTemperature } from './climateConversions.js';
function calculateTotalTemperature(year, tempScenario, temperatureDeltaC) {

  function ipccTempPrediction(year, tempScenario = "SSP2_4_5") {
    if (year > 2099) {
      year = 2099;
    }
    if (!climateScenarioTemperature[year] || !climateScenarioTemperature[year][tempScenario]) {
      throw new Error(`Temperature data for year ${year} and scenario ${tempScenario} not found.`);
    }
    return climateScenarioTemperature[year][tempScenario]["Mean"];
  }

  const baseTemperature = ipccTempPrediction(year, tempScenario);
  return baseTemperature + temperatureDeltaC;
}

import { SLR_2100, SLR_2000Y, SLR_10000Y } from "./climateConversions.js";
/**
 * Simulate sea level rise for a given year, temperature, and scenario.
 * @param {number} year - The target year (e.g., 2500, 5000, etc.).
 * @param {number} temp2099 - Global warming level in 2099 (e.g., 2.7°C).
 * @param {string} scenario - One of "low", "median", or "high".
 * @returns {number} - Estimated sea level rise in meters.
 */
export function simulateSLR(year, temp2099, scenario = "median") {
    // console.log(`Year: ${year}, Temp2099: ${temp2099}, Scenario: ${scenario}`);
    // Get sea level rise estimates for each time frame
    const slr2020 = 0.213664467; // Fixed data point for 2020
    const slr2100 = getSLRByTemp(temp2099, SLR_2100, scenario);
    const slr4025 = getSLRByTemp(temp2099, SLR_2000Y, scenario);
    const slr12025 = getSLRByTemp(temp2099, SLR_10000Y, scenario);

    const knownYears = [2020, 2100, 4025, 12025];
    const slrValues = [slr2020, slr2100, slr4025, slr12025];

    if (year >= 2020 && year <= 12025) {
        return logarithmicInterpolation(year, knownYears, slrValues);
    }
    return powerLawExtrapolation(year, knownYears, slrValues); // TODO: this is probably superfluous as we don't simulate beyond 10000Y, and we do have actual hist data for earlier than 2020?
}

/**
 * Get the interpolated/extrapolated SLR for a given temperature.
 * @param {number} temp2099 - Temperature rise in 2099.
 * @param {object} slrDataset - The dataset (SLR_2100, SLR_2000Y, or SLR_10000Y).
 * @param {string} scenario - One of "low", "median", or "high".
 * @returns {number} - Sea level rise estimate.
 */
function getSLRByTemp(temp2099, slrDataset, scenario) {
    const knownTemps = ["1.5", "2.0", "3.0", "4.0", "5.0"];
    const slrValues = knownTemps.map(t => {
        if (!slrDataset[t]) {
            console.error(`slrDataset[${t}] is undefined`);
            return undefined;
        }
        if (!slrDataset[t]) {
            console.error(`slrDataset[${t}] is undefined. Available keys: ${Object.keys(slrDataset).join(', ')}`);
            return undefined;
        }
        if (!slrDataset[t][scenario]) {
            console.error(`slrDataset[${t}][${scenario}] is undefined. Available scenarios for temperature ${t}: ${Object.keys(slrDataset[t]).join(', ')}`);
            return undefined;
        }
        return slrDataset[t][scenario];
    });

    if (temp2099 >= 1.5 && temp2099 <= 5.0) {
        return linearInterpolation(temp2099, knownTemps, slrValues);
    }

    return quadraticExtrapolation(temp2099, knownTemps, slrValues);
}

/**
 * Linear interpolation between known points.
 * @param {number} x - Input value to interpolate.
 * @param {number[]} xVals - Known x values.
 * @param {number[]} yVals - Corresponding y values.
 * @returns {number} - Interpolated value.
 */
function linearInterpolation(x, xVals, yVals) {
    for (let i = 0; i < xVals.length - 1; i++) {
        if (xVals[i] <= x && x <= xVals[i + 1]) {
            const x0 = xVals[i], x1 = xVals[i + 1];
            const y0 = yVals[i], y1 = yVals[i + 1];
            return y0 + ((y1 - y0) / (x1 - x0)) * (x - x0);
        }
    }
    return yVals[0]; // Default case (shouldn't happen)
}

/**
 * Quadratic extrapolation for temperatures outside known range.
 * @param {number} x - Input value to extrapolate.
 * @param {number[]} xVals - Known x values.
 * @param {number[]} yVals - Corresponding y values.
 * @returns {number} - Extrapolated value.
 */
function quadraticExtrapolation(x, xVals, yVals) {
    xVals = xVals.map(Number);

    const n = xVals.length;
    const x0 = xVals[n - 3], x1 = xVals[n - 2], x2 = xVals[n - 1];
    const y0 = yVals[n - 3], y1 = yVals[n - 2], y2 = yVals[n - 1];

    // Fit a quadratic y = a*x^2 + b*x + c using three points
    const a = ((y2 - y0) / (x2 - x0) - (y1 - y0) / (x1 - x0)) / (x2 - x1);
    const b = (y1 - y0) / (x1 - x0) - a * (x0 + x1);
    const c = y0 - a * x0 ** 2 - b * x0;

    const result = a * x ** 2 + b * x + c;

    return result;
}

/**
 * Logarithmic interpolation for years within range.
 * @param {number} x - Year to interpolate.
 * @param {number[]} xVals - Known years.
 * @param {number[]} yVals - Corresponding sea level values.
 * @returns {number} - Interpolated value.
 */
function logarithmicInterpolation(x, xVals, yVals) {
    for (let i = 0; i < xVals.length - 1; i++) {
        if (xVals[i] <= x && x <= xVals[i + 1]) {
            const x0 = Math.log(xVals[i]), x1 = Math.log(xVals[i + 1]);
            const y0 = yVals[i], y1 = yVals[i + 1];
            const logX = Math.log(x);
            return y0 + ((y1 - y0) / (x1 - x0)) * (logX - x0);
        }
    }
    return yVals[0]; // Default case (shouldn't happen)
}

/**
 * Power-law extrapolation for years outside known range.
 * @param {number} x - Year to extrapolate.
 * @param {number[]} xVals - Known years.
 * @param {number[]} yVals - Corresponding sea level values.
 * @returns {number} - Extrapolated value.
 */
function powerLawExtrapolation(x, xVals, yVals) {
    const logXVals = xVals.map(v => Math.log(v));
    const logYVals = yVals.map(v => Math.log(v));

    // Fit a linear model in log-log space (log(y) = m * log(x) + b)
    const n = logXVals.length;
    const x0 = logXVals[n - 2], x1 = logXVals[n - 1];
    const y0 = logYVals[n - 2], y1 = logYVals[n - 1];

    const m = (y1 - y0) / (x1 - x0);
    const b = y1 - m * x1;

    // Convert back to normal space: y = exp(b) * x^m
    return Math.exp(b) * x ** m;
}