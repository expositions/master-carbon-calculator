// default-scenarios.js

// Beispiel-Szenarien
export const scenarios = [
  {
      id: 'no-more-daily-beef',
      name: 'Ein Leben ohne Rind',
      description: 'Was passiert, wenn ein Mensch 30 Jahre lang kein Rind mehr isst',
      co2DeltaKg: 1500,
      co2ApplicationTimeframe: 30,
      tempScenario: 'SSP2_4_5',
      tcreScenario: 'mid',
      slrScenario: 'median',
      co2EffectYearSpread: 10,
      scaleType: 'PRESET',
      scaleLabel: 'Nur ich',
      selectedCountries: [],
      behaviors: [
      {
          id: 'b1',
          label: 'Kein täglich Rind',
          co2DeltaKg: 5657.5,
          isActive: true,
          co2Amount: 15.5,
          frequency: 1,
          timeUnit: 'Tag',
          unit: 'Portion',
          meta: { name: 'Fleischkonsum reduzieren' },
          mode: "DO_LESS",
      }],
      computed: { data: [], meta: {} }
  },
  {
      id: 'no-action',
      name: 'Worst-Case: No Action',
      description: 'Hohe Emissionen, kein Umsteuern. Ansteigende CO₂-Werte.',
      co2DeltaKg: null,
      co2ApplicationTimeframe: 100,
      tempScenario: 'SSP3_7_0',
      tcreScenario: 'high',
      slrScenario: 'high',
      co2EffectYearSpread: 10,
      scaleType: 'PRESET',
      scaleLabel: 'Welt',
      selectedCountries: [],
      behaviors: [{
          id: 'b2',
          label: 'Extra-GHGs',
          co2DeltaKg: 3000,
          isActive: true,
          co2Amount: null,
          frequency: 1,
          timeUnit: 'Jahr',
          unit: 'Portion',
          meta: { name: 'Extra-GHGs' },
          mode: "DO_More",
      }
      ],
      computed: { data: [], meta: {} }
  },
  {
      id: 'paris-accord',
      name: 'Moderate Action (Paris Accord)',
      description: 'Teilweise Reduktion der Emissionen, Abflachung der Kurve.',
      co2DeltaKg: -5000,
      co2ApplicationTimeframe: 30,
      tempScenario: 'SSP2_4_5',
      tcreScenario: 'mid',
      slrScenario: 'median',
      co2EffectYearSpread: 7,
      scaleType: 'PRESET',
      scaleLabel: 'EU-27',
      selectedCountries: ['FRA', 'DEU'],
      behaviors: [],
      computed: { data: [], meta: {} }
  },
  {
      id: 'net-zero-2040',
      name: 'Net Zero bis 2040',
      description: 'Ambitionierter Pfad mit deutlicher CO₂-Reduktion.',
      co2DeltaKg: -20000,
      co2ApplicationTimeframe: 20,
      tempScenario: 'SSP1_2_6',
      tcreScenario: 'low',
      slrScenario: 'low',
      co2EffectYearSpread: 5,
      scaleType: 'PRESET',
      scaleLabel: 'G7',
      selectedCountries: ['DEU', 'USA', 'JPN'],
      behaviors: [],
      computed: { data: [], meta: {} }
  }
];