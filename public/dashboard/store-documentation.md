# 🧾 Full Documentation: Scenario Object & Store Interactions

---

## 🧱 1. `scenario` Object – Full Schema

Each scenario is stored in:

```ts
store.state.scenariosById: {
  [id: string]: ScenarioObject
}
```

### 🔹 Schema: `ScenarioObject`

```ts
ScenarioObject = {
  id: string,
  name: string,
  description: string,

  // Emission effect parameters
  co2DeltaKg: number,
  co2ApplicationTimeframe: number,     // >= 1
  co2EffectYearSpread: number,         // >= 1

  // External scenario settings
  tempScenario: TempScenario,
  tcreScenario: TCREScenario,
  slrScenario: SLRScenario,

  // Population targeting
  scaleLabel: ScaleLabel,
  scaleType: 'PRESET' | 'CUSTOM',
  selectedCountries: string[],         // ISO 3166-1 alpha-3 codes

  // Behavioral modifications
  behaviors: Behavior[],

  // Simulation result (ignored in logic)
  computed: {
    data: any[],
    meta: Record<string, any>
  }
}
```

---

### 🔹 Enums & Constrained Value Sets

#### `TempScenario`

```ts
'SSP1_1_9' | 'SSP1_2_6' | 'SSP2_4_5' | 'SSP3_7_0' | 'SSP5_8_5'
```

#### `TCREScenario`

```ts
'low' | 'mid' | 'high'
```

#### `SLRScenario`

```ts
'low' | 'median' | 'high'
```

#### `ScaleLabel`

```ts
'Nur ich'
| 'Deutschland'
| 'Europäische Union'
| 'Welt'
| 'G7'
| 'G20'
| 'Weit entwickelt'
| 'Wenig entwickelt'
| 'Meistes CO₂ pro Kopf'
| 'Eigene Auswahl'
```

---

### 🔹 `Behavior` Schema (Final)

```ts
Behavior = {
  id: string,
  label: string,

  co2Amount: number,
  unit: string,
  frequency: number,
  timeUnit: 'Tag' | 'Woche' | 'Monat' | 'Jahr' | '10 Jahre',
  onceOnly: boolean,
  mode: 'DO_MORE' | 'DO_LESS',
  co2DeltaKg: number,
  isActive: boolean,
  source: 'llm' | 'user' | string,

  unsicherheitsbereichKg?: string,
  annahmen?: string,
  quellenStichworte?: string[],

  meta?: {
    name: string,
    amount_info: Array<{
      text: string,
      amount: number,
      unit: string
    }>,
    co2_amount: number,
    sectors: Array<{
      sector: string,
      percentage: number
    }>
  }
}
```

---

## 🧩 2. Store State: Relevant Global Fields

```ts
store.state = {
  selectedScenarioId: string | null,
  comparisonScenarioId: string | null,
  scenarioOrder: string[],
  dirtyScenarioIds: string[],

  scenariosById: { [id: string]: ScenarioObject },

  scenarioEditor: {
    isOpen: boolean,
    targetScenarioId: string | null,
    draft: Partial<ScenarioObject>
  },

  activityEditor: {
    isOpen: boolean,
    targetScenarioId: string | null,
    targetBehaviorId: string | null,
    draft: object
  },

  activityCatalog: {
    isOpen: boolean,
    targetScenarioId: string | null
  },

  countryEditor: {
    isOpen: boolean,
    targetScenarioId: string | null
  },

  selectedYear: number,
  displayMode: 'absolute' | 'delta',
}
```

---

## 🔄 3. Store Methods & Scenario Interactions

### ✅ State Access

- `store.getState()`

### ✅ Subscriptions

- `store.subscribe(fn)`
- `store.subscribeTo(selectorFn, callback)` — watches:
  - `selectedScenarioId`, `scenarioOrder`, `scenariosById`
  - `computed.data[].year`
  - `displayMode`
  - `scaleLabel`, `selectedCountries`

### ✅ State Modification

- `store.setState(patch)`
- `store.patchScenario(id, patch)`
- `store.markScenarioAsDirty(id)`
- `store.clearDirtyScenarioId(id)`

---

## 🛠️ 4. Scenario Lifecycle: GUI Component Responsibilities

| Component                     | Role |
|------------------------------|------|
| `ScenarioSelector`           | Select, create, edit, delete, duplicate scenarios |
| `ScenarioEditor`             | Edit name, description, parameters, behaviors |
| `ActivityLLMSuggester`       | Adds LLM-generated behaviors |
| `PopulationListSelector`     | Sets population group (label + country list) |
| `CountryEditor`              | Edits `selectedCountries` for "Eigene Auswahl" |
| `YearSlider`                 | Sets `selectedYear` based on scenario data |
| `ModeToggle`                 | Switches `displayMode` |

---

## 🌍 5. Country Lists & Metadata

### ✅ `scenario-data/territories.js`

- Provides localized country names
- Used for UI translation of ISO codes

### ✅ `scenario-data/populations.js`

```ts
Array<{
  code: string,
  name: string,
  population: number,
  consumption_ghg_per_capita: number
}>
```

- Used in `CountryEditor` for listing, searching, sorting countries

### ✅ `scenario-data/countryGroups.js`

```ts
ALL_AGGREGATES: Record<string, string[]>
```

- Maps group labels (e.g., `"G7"`) to country code arrays

```ts
LABEL_TO_GROUP: Record<ScaleLabel, string[] | string>
```

- Maps UI-visible labels (like `"Welt"`) to group keys or direct ISO lists

---

## ✅ Final Notes

- All scenario updates go through the global store
- LLM-based behaviors must follow a strict schema
- `scaleLabel`, `scaleType`, and `selectedCountries` are tightly coupled
- Manual editing is enabled via `countryEditor`
