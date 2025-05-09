// Pfad ggf. anpassen – analog zu ActivityCatalog
import store from '../../../../store.js';
import { OPENAI_API_KEY } from '../../../../../../apikey.js';

export class ActivityLLMSuggester extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    /** ------------------ Konfiguration ------------------ **/
    // *** ACHTUNG: Für Production NICHT im Client belassen! ***

    // Prompt-Platzhalter – hier deine lange Prompt einfügen
    const PROMPT_TEMPLATE = `

Rolle und Kontext:

Du bist ein kritischer, datenbasierter Assistent mit Fokus auf Umweltbilanzen, Emissionsvergleichen und ökologischen Lebenszyklusanalysen. Du arbeitest wissenschaftlich, reflektiert, methodenbewusst und kennzeichnest Unsicherheiten transparent.

Anliegen:

Ich möchte eine fundierte, vergleichende Einschätzung der CO2-Äquivalente für die folgenden Verhaltensweisen:
{{userInput}}

Ich möchte für jede dieser Aktivitäten:

    eine Einschätzung der CO2-Äquivalente (am besten mit Bandbreite),

    eine Klarstellung, ob sie ein „zusätzliches“ Verhalten ist oder ob ein Verhalten, dass jetzt eingestellt/vermindert wird,

    eine gut fundierte methodische Reflexion mit Studienangaben und Unsicherheiten,

    eine JSON-Ausgabe

Zweck:

Ich brauche eine transparente, wissenschaftlich nachvollziehbare Darstellung der Auswirkungen meines Verhaltens oder meiner Entscheidungen auf die CO2-Bilanz. Besonders wichtig ist mir die Möglichkeit, Verhaltensalternativen zu vergleichen – sowohl im Einzelwert als auch in der Differenz..

Format:

    Reflexionsteil in XML-Tags:

<Reflection>
  [Hier eine ausführliche, multiperspektivische, quellenbasierte Darstellung der CO2-Fußabdrücke, Unsicherheiten, methodischen Annahmen und Relevanzen der verschiedenen Verhaltensweisen. Alle CO2-Werte in Relation setzen. Studienquellen mit Jahr angeben.]
</Reflection>

JSON-Ausgabe nach folgendem Schema:

{
  "verhaltensweisen": [
    {
      "beschreibung": "Flug von Berlin nach Rom",
      "typ": "plus",
      "co2_aequivalente": 126.5,
      "unsicherheitsbereich_kg": "110–145",
      "einheit": "kg",
      "annahmen": "Kurzstreckenflug, Economy, 1100 km, durchschnittliche Auslastung, einfache Strecke.",
      "quellen_stichworte": ["EEA 2021", "UBA 2020"]
    },
    {
      "beschreibung": "Zugfahrt von Berlin nach Rom",
      "typ": "minus",
      "co2_aequivalente": 48,
      "unsicherheitsbereich_kg": "40–60",
      "einheit": "kg",
      "annahmen": "1200 km mit europäischem Strommix, einfache Strecke, durchschnittlicher Auslastungsfaktor.",
      "quellen_stichworte": ["Deutsche Bahn 2020", "UBA 2021"]
    },
    {
      "beschreibung": "Busfahrt auf Teilstrecke",
      "typ": "minus",
      "co2_aequivalente": 30,
      "unsicherheitsbereich_kg": "25–35",
      "einheit": "kg",
      "annahmen": "Reststrecke (~400 km) mit Fernreisebus, CO2-Wert pro Passagier-km laut ITF.",
      "quellen_stichworte": ["International Transport Forum 2021"]
    }
  ],
  "gesamtbilanz": {
    "co2_differenz": 48.5,
    "einheit": "kg",
    "kommentar": "Der Flug verursacht insgesamt ca. 48,5 kg mehr CO2 als die kombinierte Zug-Bus-Reise."
  }
}

    typ: "plus" = zusätzlich oder aktives Verhalten

    typ: "minus" = ersetzt oder hypothetisch eingespartes Verhalten

    co2_differenz = einfache arithmetische Differenz zwischen plus- und minus-Werten (sofern sinnvoll)

    Immer mit Quellenangabe (auch Jahr) arbeiten. Bevorzugt post-2018.

    Falls Emissionswerte sehr unsicher oder variabel sind: besser mit Bandbreiten (z.B. "unsicherheitsbereich_kg": "1.0–2.3").

    Klar benennen, welche Faktoren angenommen oder weggelassen wurden.
    

 Gib in der JSON-Ausgabe für jede Verhaltensweise exakt die folgenden Felder und Datentypen zurück. Schlüssel müssen exakt so heißen, sonst kann das System die Datei nicht einlesen:

    {
  "label": "string",                     // Darf Umlaute enthalten, keine HTML-Tags
  "co2Amount":  number,                  // kg CO2e pro Nutzungseinheit
  "unit": "string",                      // z. B. Stück, km, kg, Portion
  "frequency": number,                   // Häufigkeit (z. B. 1, 0.1, 365)
  "timeUnit": "Tag|Woche|Monat|Jahr|10 Jahre",
  "onceOnly": boolean,                   // true = Einzelereignis
  "mode": "DO_MORE|DO_LESS",             // plus → DO_MORE, minus → DO_LESS
  "unsicherheitsbereichKg": "string",    // z. B. "1.0–1.8"
  "annahmen": "string",
  "quellenStichworte": ["string", ...],
  "meta": {
    "name": "string",
    "amount_info": [
      { "text": "string", "amount": number, "unit": "string" }
    ],
    "co2_amount": number,
    "sectors": [
      { "sector": "string", "percentage": number }
    ]
  }
}
    
Beachte:

    frequency und timeUnit leitest du direkt aus der Formulierung des Nutzers ab (z. B. „jede Woche“ → frequency: 1, timeUnit: "Woche"; „alle 10 Jahre“ → frequency: 0.1, timeUnit: "Jahr").

    onceOnly ist true, wenn das Verhalten klar einmalig ist (z. B. „Haus bauen“).

    mode: Nutze DO_MORE für zusätzliche Emissionen, DO_LESS für Vermeidung/Einsparung.

    Alle CO₂-Zahlen nur als Zahl (kein String).

    sectors.percentage zusammen = 100.

Gib zuerst den <Reflection>-Block, danach exakt ein \`\`\`json-Code-Fence, dessen Top-Level-Objekt **immer** einen Schlüssel "verhaltensweisen" enthält, dessen Wert ein Array aus einem oder mehreren Verhaltensobjekten (wie oben definiert) ist. Nichts außerhalb dieses Objekts.`;

    /** ------------------ Markup + Styles ------------------ **/
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: #fff;
          border: 2px solid #eee;
          border-radius: 12px;
          padding: 1rem;
          box-sizing: border-box;
          max-width: 100%;
          font-family: system-ui, sans-serif;
        }
        textarea {
          width: 100%;
          min-height: 80px;
          resize: vertical;
          padding: 10px;
          border-radius: 10px;
          border: 2px solid #ddd;
          font-size: 1rem;
        }
        textarea:focus { border-color: #28b200; outline: none; }
        .buttons {
          margin-top: 0.8rem;
          display: flex;
          gap: 10px;
        }
        button {
          flex: 1;
          padding: 0.6rem 1rem;
          font-size: 1rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
        }
        .generate { background: #007bff; color: #fff; }
        .accept   { background: #28b200; color: #fff; }
        .accept[disabled] { opacity: 0.4; cursor: not-allowed; }
        .suggestions {
          margin-top: 1rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .card {
          border: 2px solid #eee;
          border-radius: 12px;
          padding: 10px;
          background: #f9f9f9;
          font-size: 0.9rem;
        }
        .card h4 { margin: 0 0 6px; font-size: 1rem; }
        details { margin: 1rem 0; }
        summary { cursor: pointer; font-weight: 600; }
      </style>

      <textarea id="userInput" placeholder="Beschreibe deine Aktivitäten …"></textarea>
      <div class="buttons">
        <button id="generateBtn" class="generate">Neu generieren</button>
        <button id="acceptBtn"  class="accept" disabled>Akzeptieren</button>
      </div>

      <div class="suggestions" id="suggestions"></div>
      <details id="reflectionBox" style="display:none;">
        <summary>Reflexion anzeigen</summary>
        <pre id="reflectionText" style="white-space:pre-wrap;"></pre>
      </details>
    `;

    /** ------------------ DOM-Elemente ------------------ **/
    const $ = (sel) => this.shadowRoot.querySelector(sel);
    const userInput     = $('#userInput');
    const generateBtn   = $('#generateBtn');
    const acceptBtn     = $('#acceptBtn');
    const suggestionsEl = $('#suggestions');
    const reflectionBox = $('#reflectionBox');
    const reflectionTxt = $('#reflectionText');

    /** ------------------ Helfer ------------------ **/
    const fetchLLM = async (text) => {
      const prompt = PROMPT_TEMPLATE.replace('{{userInput}}', text);

      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          input: prompt,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();          // ← jetzt das komplette JSON zurückgeben
    };

    const extractJSON = (txt) => {
      const jsonMatch = txt.match(/\{[\s\S]*\}$/m);
      if (!jsonMatch) return null;
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    };

    const renderSuggestions = (json) => {
      suggestionsEl.innerHTML = '';
      const list = Array.isArray(json.verhaltensweisen)
        ? json.verhaltensweisen
        : [json];                    // Fallback: einzelnes Objekt auf Root
    
      list.forEach((v) => {
        const card = document.createElement('div');
        card.className = 'card';
    
        const co2Str = `${v.co2Amount} kg CO₂e je ${v.unit || '?'}`;
        const freqStr = v.onceOnly ? 'einmalig' : `${v.frequency} / ${v.timeUnit}`;
        const unsi    = v.unsicherheitsbereichKg
                        ? `<div style="font-size:.8rem;color:#555;">Unsicherheit: ${v.unsicherheitsbereichKg}</div>` : '';
    
        card.innerHTML = `
          <h4>${v.label}</h4>
          <div><strong>${co2Str}</strong></div>
          <div style="font-size:.85rem;color:#333;">${freqStr}</div>
          ${unsi}
        `;
        suggestionsEl.appendChild(card);
      });
    
      reflectionTxt.textContent =
        (json.Reflection || '').replace(/<\/?Reflection>/gi, '').trim();
      reflectionBox.style.display = reflectionTxt.textContent ? 'block' : 'none';
    
      acceptBtn.disabled = false;
    };


    const addToScenario = (json) => {
      const scenarioId = store.getState().activityCatalog.targetScenarioId;
      if (!scenarioId) return;

      const scenario = store.getState().scenariosById[scenarioId] || {};
      const newBehaviors =
        json.verhaltensweisen?.map((v) => ({
          id: crypto.randomUUID(),
          label: v.beschreibung,
          co2DeltaKg:
            (parseFloat(v.co2_aequivalente) || 0) *
            (v.typ === 'minus' ? -1 : 1),
          isActive: true,
          source: 'llm',
          meta: v,
        })) || [];

      store.setState({
        scenariosById: {
          ...store.getState().scenariosById,
          [scenarioId]: {
            ...scenario,
            behaviors: [...(scenario.behaviors || []), ...newBehaviors],
          },
        },
      });
      store.markScenarioAsDirty(scenarioId);
    };

    /** ------------------ Event-Listener ------------------ **/
    generateBtn.addEventListener('click', async () => {
      generateBtn.disabled = true;
      acceptBtn.disabled = true;
      suggestionsEl.innerHTML = '⏳ Bitte warten …';
      reflectionBox.style.display = 'none';
    
      // Hilfsfunktion zur Extraktion des Texts aus OpenAI-Response
      const getOutputText = (resp) => {
        // Neuer /v1/responses-Standard
        if (Array.isArray(resp.output)) {
          const c = resp.output[0]?.content;
      
          // a) content ist direkt ein String
          if (typeof c === 'string') return c;
      
          // b) content ist Array von Chunks
          if (Array.isArray(c)) {
            const chunk = c.find(e => (e.type === 'output_text' || !e.type) && typeof e.text === 'string');
            if (chunk) return chunk.text;
          }
        }
      
        // Fallbacks für ältere Endpunkte
        if (typeof resp.output === 'string') return resp.output;
        if (resp.choices?.[0]?.message?.content) return resp.choices[0].message.content;
        if (resp.choices?.[0]?.text)             return resp.choices[0].text;
      
        return '';
      };
      
      
      
    
      // Robuste Extraktion der JSON-Struktur aus Mischtext
      const extractJSON = (txt) => {
        if (typeof txt !== 'string') return null;
    
        // 1. <Reflection>-Teil extrahieren
        const reflectionMatch = txt.match(/<Reflection>([\s\S]*?)<\/Reflection>/i);
        const reflection = reflectionMatch ? reflectionMatch[1].trim() : '';
    
        // 2. Entferne <Reflection> aus Text
        txt = txt.replace(/<Reflection>[\s\S]*?<\/Reflection>/gi, '');
    
        // 3. Entferne Markdown-Codeblock-Wrapper ```json
        txt = txt.replace(/```json([\s\S]*?)```/gi, (_, jsonCode) => jsonCode.trim());
    
        // 4. Suche nach erstem JSON-Objekt
        const jsonMatch = txt.match(/\{[\s\S]*\}/m);
        if (!jsonMatch) return null;
    
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (reflection) parsed.Reflection = reflection; // Reflection anhängen
          return parsed;
        } catch (err) {
          console.warn('JSON-Parsing fehlgeschlagen:', err);
          return null;
        }
      };
    
      try {
        const rawResponse = await fetchLLM(userInput.value.trim());
        const fullText = getOutputText(rawResponse);
        const json = extractJSON(fullText);
        console.log('✅ JSON extrahiert:', json);
    
        if (!json) {
          suggestionsEl.innerHTML = '❌ Konnte keine gültige JSON-Antwort extrahieren.';
        } else {
          renderSuggestions(json);
          this._lastJson = json; // merken für Accept
        }
      } catch (err) {
        suggestionsEl.innerHTML = `❌ Fehler: ${err.message}`;
      } finally {
        generateBtn.disabled = false;
      }
    });    

    acceptBtn.addEventListener('click', () => {
      if (!this._lastJson) return;
      const json = this._lastJson;
    
      const scenarioId = store.getState().activityCatalog.targetScenarioId;
      if (!scenarioId) return;
    
      const scenario = store.getState().scenariosById[scenarioId] || {};
      const newBehaviors = [];
    
      // Robust: verhaltensweisen[] oder einzelnes Objekt akzeptieren
      const entries = Array.isArray(json.verhaltensweisen)
        ? json.verhaltensweisen
        : [json];
    
      entries.forEach((v) => {
        const annualFactor = {
          "Tag": 365,
          "Woche": 52,
          "Monat": 12,
          "Jahr": 1,
          "10 Jahre": 1 / 10
        }[v.timeUnit] || 1;
    
        const co2DeltaKg = v.onceOnly
          ? v.co2Amount
          : v.co2Amount * v.frequency * annualFactor * (v.mode === 'DO_LESS' ? -1 : 1);
    
        newBehaviors.push({
          id: crypto.randomUUID(),
          label: v.label,
          co2Amount: v.co2Amount,
          unit: v.unit,
          frequency: v.frequency,
          timeUnit: v.timeUnit,
          onceOnly: v.onceOnly,
          mode: v.mode,
          co2DeltaKg,
          isActive: true,
          source: 'llm',
          meta: v.meta
        });
      });
    
      // Szenario aktualisieren
      store.setState({
        scenariosById: {
          ...store.getState().scenariosById,
          [scenarioId]: {
            ...scenario,
            behaviors: [...(scenario.behaviors || []), ...newBehaviors]
          }
        },
        activityCatalog: {
          isOpen: false,
          targetScenarioId: null
        }
      });
    
      store.markScenarioAsDirty(scenarioId);
    
      // Editor direkt öffnen
      store.setState({
        scenarioEditor: {
          ...store.getState().scenarioEditor,
          isOpen: true,
          targetScenarioId: scenarioId
        }
      });
    
      // UI zurücksetzen
      suggestionsEl.innerHTML = '';
      reflectionBox.style.display = 'none';
      acceptBtn.disabled = true;
      this._lastJson = null;
    });
    
  }
}

customElements.define('activity-llm-suggester', ActivityLLMSuggester);