/**
 * Cloudflare Worker – API route /api/llm  (POST)
 * ------------------------------------------------
 * 1.  Add your long PROMPT_TEMPLATE below.
 * 2.  Put the OpenAI key into Workers → Settings → Variables → Secrets:
 *         wrangler secret put OPENAI_API_KEY
 * 3.  Done.  The front-end now calls POST /api/llm with { userInput }.
 */

interface Env {
  OPENAI_API_KEY: string;
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    /** ---- 1. read client payload -------------------------------------------------- **/
    const { userInput } = await request.json() as unknown as { userInput: string };
    if (typeof userInput !== 'string' || !userInput.trim())
      return new Response('Missing or empty "userInput" field', { status: 400 });

    /** ---- 2. build prompt (👇 paste your gigantic template here) ------------------ **/
    const PROMPT_TEMPLATE = `
# Rolle und Kontext:
Du bist ein kritischer, datenbasierter Assistent mit Fokus auf Umweltbilanzen, Emissionsvergleichen und ökologischen Lebenszyklusanalysen. Du arbeitest wissenschaftlich, reflektiert, methodenbewusst und kennzeichnest Unsicherheiten transparent.

# Anliegen:
Ich möchte eine fundierte, vergleichende Einschätzung der CO2-Äquivalente für die folgenden Verhaltensweisen:
"""{{userInput}}"""

Ich möchte für jede dieser Aktivitäten:
- eine Einschätzung der CO2-Äquivalente (am besten mit Bandbreite),
- eine Klarstellung, ob sie ein „zusätzliches“ Verhalten ist oder ob ein Verhalten, dass jetzt eingestellt/vermindert wird,
- eine gut fundierte methodische Reflexion mit Studienangaben und Unsicherheiten,
- eine JSON-Ausgabe

# Zweck:
Ich brauche eine transparente, wissenschaftlich nachvollziehbare Darstellung der Auswirkungen meines Verhaltens oder meiner Entscheidungen auf die CO2-Bilanz. Besonders wichtig ist mir die Möglichkeit, Verhaltensalternativen zu vergleichen – sowohl im Einzelwert als auch in der Differenz..

# Format:
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

## Anmerkungen zum Format
- typ: "plus" = zusätzlich oder aktives Verhalten
- typ: "minus" = ersetzt oder hypothetisch eingespartes Verhalten
- co2_differenz = einfache arithmetische Differenz zwischen plus- und minus-Werten (sofern sinnvoll)
- Immer mit Quellenangabe (auch Jahr) arbeiten. Bevorzugt post-2018.
- Falls Emissionswerte sehr unsicher oder variabel sind: besser mit Bandbreiten (z.B. "unsicherheitsbereich_kg": "1.0–2.3").
- Klar benennen, welche Faktoren angenommen oder weggelassen wurden.
- Gib in der JSON-Ausgabe für jede Verhaltensweise exakt die folgenden Felder und Datentypen zurück. Schlüssel müssen exakt so heißen, sonst kann das System die Datei nicht einlesen:

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
- frequency und timeUnit leitest du direkt aus der Formulierung des Nutzers ab (z. B. „jede Woche“ → frequency: 1, timeUnit: "Woche"; „alle 10 Jahre“ → frequency: 0.1, timeUnit: "Jahr").
- onceOnly ist true, wenn das Verhalten klar einmalig ist (z. B. „Haus bauen“).
- mode: Nutze DO_MORE für zusätzliche Emissionen, DO_LESS für Vermeidung/Einsparung.
- Alle CO₂-Zahlen nur als Zahl (kein String).
- sectors.percentage zusammen = 100.
- Gib zuerst den <Reflection>-Block, danach exakt ein \`\`\`json-Code-Fence, dessen Top-Level-Objekt **immer** einen Schlüssel "verhaltensweisen" enthält, dessen Wert ein Array aus einem oder mehreren Verhaltensobjekten (wie oben definiert) ist. Nichts außerhalb dieses Objekts.
    `;

    const prompt = PROMPT_TEMPLATE.replace('{{userInput}}', userInput.trim());

    /** ---- 3. call OpenAI ---------------------------------------------------------- **/
    const openAiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: prompt
      })
    });

    /** ---- 4. proxy raw response back to caller ------------------------------------ **/
    const raw = await openAiRes.text();          // keep it exactly as OpenAI returns it
    return new Response(raw, {
      status: openAiRes.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(`Server error: ${err?.message || err}`, { status: 500 });
  }
}
