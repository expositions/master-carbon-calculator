/**
 * orchestrator.js — strictly schema-driven, all agentic logic in one file for now
 */

import store from './store.js';
import './llm-chat.js';


async function fetchFileContents(fileName) {
  try {
    const response = await fetch(`./${fileName}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${fileName}: ${response.statusText}`);
    }
    const fileContents = await response.text();
    return fileContents;
  } catch (error) {
    console.error('Error fetching file contents:', error);
    return null;
  }
}

////////////////////////////////////////////////////////////////////////////////
// Helper: store schema as string for LLM context
////////////////////////////////////////////////////////////////////////////////

let STORE_DOC = null;

async function main() {
  const fileContents = await fetchFileContents('../dashboard/store-documentation.md');
  STORE_DOC = `
  # Klima-Simulationssystem: Datenmodell
  Beachte exakt die Struktur und die Bezeichnungen der Felder in diesem Dokument:
  """
  ${fileContents}
  """
  `.trim();

  // ... all other orchestration code, e.g., initOrchestrator() ...
  requestAnimationFrame(initOrchestrator);
}

main();

////////////////////////////////////////////////////////////////////////////////
// Helper: Find chat component
////////////////////////////////////////////////////////////////////////////////
function getChat() {
  const dash = document.querySelector('climate-dashboard');
  return dash && dash.shadowRoot && dash.shadowRoot.querySelector('llm-chat#chat');
}

////////////////////////////////////////////////////////////////////////////////
// Conversation persistence (inside store.languageModelHelper)
////////////////////////////////////////////////////////////////////////////////

function getHelper() {
  return store.getState().languageModelHelper || {};
}
function saveHelper(newHelper) {
  store.setState({ languageModelHelper: newHelper });
}
function loadConversations() {
  const helper = getHelper();
  if (helper.chats && Object.keys(helper.chats).length) return helper;
  // Create blank if none exist
  const blankId = crypto.randomUUID();
  const blank = { id: blankId, name: 'Neuer Sim-Chat', messages: [], profile: {} };
  const initial = { chats: { [blankId]: blank }, activeChatId: blankId };
  saveHelper(initial);
  return initial;
}
function persistChats(convos, activeId) {
  saveHelper({ chats: convos, activeChatId: activeId });
}

////////////////////////////////////////////////////////////////////////////////
// Main
////////////////////////////////////////////////////////////////////////////////

function initOrchestrator() {
  const chat = getChat();
  if (!chat) { requestAnimationFrame(initOrchestrator); return; }

  // 1. Boot conversations from store
  const { chats: conversations, activeChatId } = loadConversations();
  chat.loadConversation(conversations[activeChatId]);

  // 2. Send the first assistant message
  chat.sendBot("Hallo! Hier kannst du alles Mögliche simulieren. Zum Beispiel, was klimafreundlicher ist: 500 Kilometer Autofahren oder ein Kilo Rindfleisch essen? Wie stark steigt der Meeresspiegel, wenn die Menschheit einfach weitermacht wie bisher? Du kannst testen, was mehr bringt: Wenn Millionen Menschen ihren Konsum einschränken – oder wenn die Stromversorgung voll regenerativ funktionierte?",
    [
      "Hähnchen- statt Kalbsdöner",
      "Deutsche Moore wiedervernässen",
      "Täglich Tee statt Kaffee",
      "Strom dekarbonisieren",
      "500 km Autofahren vs. 1 kg Rindfleisch",
      "Radfahren statt Auto",
      "Einfamilienhaus sanieren statt neu bauen",
      "1 Paar gebrauchte Sneaker pro Jahr statt neue",
      "50% weniger motorisierter Individualverkehr"
    ]
  );

  // 3. Toolbar actions: "+" (new), "☰" (drawer)
  chat.addEventListener('new-conversation-request', () => {
    const id = crypto.randomUUID();
    conversations[id] = { id, name: 'Neuer Chat', messages: [], profile: {} };
    persistChats(conversations, id);
    chat.loadConversation(conversations[id]);
  });
  chat.addEventListener('open-conversation-list', () => {
    const drawer = chat.shadowRoot.querySelector('#drawer');
    const bg     = chat.shadowRoot.querySelector('#drawerBg');
    drawer.innerHTML = Object.values(conversations)
      .map(c => `
        <div class="conv" data-id="${c.id}">
          <input value="${c.name}" />
          <button class="del">🗑️</button>
        </div>
      `).join('');
    drawer.classList.add('open');
    bg.style.display = 'block';
    drawer.querySelectorAll('.conv').forEach(row => {
      const id = row.dataset.id;
      row.addEventListener('click', e => {
        if (e.target.classList.contains('del')) return;
        chat.loadConversation(conversations[id]);
        persistChats(conversations, id);
        closeDrawer();
      });
      row.querySelector('input').addEventListener('change', e => {
        conversations[id].name = e.target.value.trim() || 'Untitled';
        persistChats(conversations, id);
        if (chat._id === id) chat.loadConversation(conversations[id]);
      });
      row.querySelector('.del').addEventListener('click', e => {
        e.stopPropagation();
        delete conversations[id];
        const keys = Object.keys(conversations);
        const nextId = keys.length ? keys[0] : null;
        if (!nextId) {
          // No convos left → create new
          const newId = crypto.randomUUID();
          const blank = { id: newId, name: 'Neuer Chat', messages: [], profile: {} };
          conversations[newId] = blank;
          persistChats(conversations, newId);
          chat.loadConversation(blank);
        } else {
          persistChats(conversations, nextId);
          chat.loadConversation(conversations[nextId]);
        }
        row.remove();
      });
    });
    bg.onclick = closeDrawer;
    function closeDrawer() {
      drawer.classList.remove('open');
      bg.style.display = 'none';
    }
  });
  chat.addEventListener('rename-conversation', e => {
    const { id, newName } = e.detail;
    if (conversations[id]) {
      conversations[id].name = newName;
      persistChats(conversations, id);
    }
  });

  // 4. Chat message flow
  chat.addEventListener('user-message', async e => {
    const userText = e.detail.text;
    const convo = conversations[chat._id];
    convo.messages.push({ role: 'user', text: userText });
    persistChats(conversations, chat._id);

    // Show thinking...
    await chat.sendBot('⏳ Nachdenken...');

    // Decide LLM behavior: agentic or export?
    if (userText.trim() === '<<<complete>>>') {
      // Final export: call "Expert" LLM with strict schema
      try {
        const expertResp = await callExpertLLM(convo);
        await applyExpertLLMResponse(expertResp);
      } catch (err) {
        await replacePlaceholder('❌ Fehler bei der Szenariokonfiguration: ', err, ["nochmal probieren"]);
      }
    } else {
      // Normal agentic flow
      try {
        const resp = await callAgenticLLM(convo);
        await applyAgenticLLMResponse(resp);
      } catch (err) {
        await replacePlaceholder('❌ Fehler beim Abrufen der Antwort: ', err, ["nochmal probieren"]);
      }
    }
  });
}

////////////////////////////////////////////////////////////////////////////////
// LLM Calls: agentic system and expert export
////////////////////////////////////////////////////////////////////////////////

function makeLLMInput(convo, mode = 'agentic') {
  const ui = store.getState();
  const uiState = {
    displayMode: ui.displayMode,
    selectedYear: ui.selectedYear,
    selectedScenarioId: ui.selectedScenarioId,
    comparisonScenarioId: ui.comparisonScenarioId
  };
  // System prompt scaffolds for both agent and expert mode
  if (mode === 'expert') {
    return [
      "SYSTEM: Du bist ein Klimasimulations-Experte. Erstelle anhand der Konversation und des Profils ein vollständiges JSON-Objekt nach folgender Dokumentation. Gib das JSON exakt nach Schema zurück (fehlende optionale Felder dürfen fehlen). Du verwendest zum Schreiben des JSONs die Informationen aus der eingefügten Konversation.",
      "Das JSON-Objekt muss die Struktur 'ExpertOutput' haben. Im Szenario bzw. in den Szenarien definierst du genau die Verhaltensänderungen, die welche Länder in diesem Fall wie lange bei welchen IPCC-Annahmen wie häufig anwenden. Im Profil definierst du, welches Szenario du anzeigen willst und ob du es im Vergleich zu einem anderen Szenario anzeigen willst. Vergleiche machst du besonders dann, wenn der User nach einem Vergleich fragt oder simulieren will, was es ausmacht, wenn man Y statt X macht.",
      "Beispiel: 30km Radfahren statt Auto, täglich. Dann kannst du entweder ein Szenario mit ZWEI Aktivitäten konfigurieren, nämlich einmal zusätzlich Rad fahren (DO_MORE), einmal DO_LESS Auto fahren. Oder du konfigurierst zwei Szenarien, eins mit DO_MORE Radfahren und eins mit DO_LESS Auto fahren, setzt dein Profil auf 'delta' und setzt comparisonScenarioId und selectedScenarioId auf die beiden Szenarien.",
      "",
      "# Defaults: ",
      "Für alle Aspekte, die nicht direkt als sinnvoll aus der Anfrage hervorgehen oder nötig zu wissen sind, nimmst du erstmal defaults an. Diese Defaults lauten: ",
      "- co2ApplicationTimeframe: 20 (Mittelwert für Anwendungszeitraum in Jahren)",
      "- co2EffectYearSpread: 5 (Mittelwert für Verteilung der Wirkung in Jahren)",
      "- tempScenario: 'SSP2_4_5' (Standard-Basisszenario für Temperaturentwicklung)",
      "- tcreScenario: 'mid' (Mittelwert für TCRE-Szenario)",
      "- slrScenario: 'median' (Mittelwert für Meeresspiegelanstieg)",
      "- scaleLabel: 'Welt' (Standard für Zielpopulation)",
      "- scaleType: 'PRESET' (Standard für Skalierungstyp)",
      "- selectedCountries: [WORLD] (Standardmäßig keine spezifischen Länder ausgewählt, da bereits mit WORLD alle Länder ausgewählt sind). Verwendet Ländercodes.",
      "- behaviors: [] (Standardmäßig keine Verhaltensänderungen definiert, da diese genuin durch den Nutzer eingegeben werden sollen)",
      "- selectedYear: 2100 (Dieses Jahr ist intuitiv gut nachvollziehbar, da es noch in unserem Zeithorizont ist)",
      "- displayMode: 'absolute' (Standardanzeigemodus für Simulationsergebnisse, da er nur ein Szenario zeigt statt zwei)",
      "- scenarioOrder: [] (Keine spezifische Szenarienreihenfolge definiert, da dies nur für die GUI wichtig ist)",
      "- dirtyScenarioIds: [] (Hier sollten alle deine Szenarien-IDs eingetragen werden)",
      "- comparisonScenarioId: null (Kein Vergleichsszenario standardmäßig ausgewählt, aber nötig wenn displayMode 'delta' ist)",
      "",
      "# Antwortformat: ",
      "Deine Antwort MUSS ein einziges JSON-Objekt nach folgendem Typ 'ExpertOutput' sein. Gib KEINEN Freitext, KEINE Erklärungen, KEINE Kommentare, KEINE Codeblöcke zurück, KEINE triple backticks.",
      "Gib ausschließlich ein valides JSON aus.",
      "Alle Felder, die mit ? gekennzeichnet sind, sind optional.",
      "Alle anderen Felder müssen ausgefüllt werden.",
      `type ScenarioObject = {
        id: string;
        name: string;
        description: string;

        co2DeltaKg: number; // in kg CO₂ pro Kopf pro Jahr, üblicherweise das Produkt aus co2Amount pro Einheit und frequency
        co2ApplicationTimeframe: number;
        co2EffectYearSpread: number;

        tempScenario: 'SSP1_1_9' | 'SSP1_2_6' | 'SSP2_4_5' | 'SSP3_7_0' | 'SSP5_8_5';
        tcreScenario: 'low' | 'mid' | 'high';
        slrScenario: 'low' | 'median' | 'high';

        scaleLabel: 'Nur ich' | 'Deutschland' | 'Europäische Union' | 'Welt' | 'G7' | 'G20' | 'Weit entwickelt' | 'Wenig entwickelt' | 'Meistes CO₂ pro Kopf' | 'Eigene Auswahl';
        scaleType: 'PRESET' | 'CUSTOM';
        selectedCountries: string[]; // Ländercodes

        behaviors: Behavior[];
      };

      type Behavior = {
        id: string;
        label: string;
        co2Amount: number; //in KG CO₂ pro Einheit, schätze anhand wissenschaftlicher Angaben!
        unit: string;
        frequency: number;
        timeUnit: 'Tag' | 'Woche' | 'Monat' | 'Jahr' | '10 Jahre';
        onceOnly: boolean;
        mode: 'DO_MORE' | 'DO_LESS';
        co2DeltaKg: number; // in kg CO₂ pro Kopf pro Jahr, üblicherweise das Produkt aus co2Amount pro Einheit und frequency. Also z.B. bei 100g GHG pro Tag und 365 Tagen im Jahr: 0.1kg * 365 = 36.5kg CO₂ pro Kopf pro Jahr. Oder bei 1 Tonne pro Woche: 1000kg * 52 Wochen = 52000kg CO₂ pro Kopf pro Jahr. Schreibe das Ergebnis hier rein!
        isActive: boolean;
        source: 'llm' | 'user' | string;
        unsicherheitsbereichKg?: string;
        annahmen?: string;
        meta?: {
          name: string;
          amount_info: Array<{ text: string; amount: number; unit: string }>;
          co2_amount: number;
          sectors: Array<{ sector: string; percentage: number }>;
        }
      };

      type ExpertOutput = {
        scenarios: ScenarioObject[]; // Mindestens ein, maximal zwei Szenarien
        profile: {
          displayMode: "absolute" | "delta";
          selectedScenarioId: string;
          comparisonScenarioId: string;
          selectedYear: number;
        };
      };

      **Optional-felder (mit ? gekennzeichnet) dürfen fehlen, wenn nicht bekannt. Alle anderen Felder müssen ausgefüllt werden.**

      **Gib als Antwort ausschließlich ein JSON nach folgendem Beispiel zurück:**

      {
        "scenarios": [
          {
            "id": "ssp1-1.9-path",
            "name": "Der 1,5 Grad Weg",
            "description": "Ambitionierter Klimaschutz...",
            "co2DeltaKg": 0, //hier die CO₂-Änderung in kg pro Kopf
            "co2ApplicationTimeframe": 20,
            "co2EffectYearSpread": 5,
            "tempScenario": "SSP1_1_9",
            "tcreScenario": "mid",
            "slrScenario": "median",
            "scaleLabel": "Welt",
            "scaleType": "PRESET",
            "selectedCountries": [], // Ländercodes
            "behaviors": []
          }
        ],
        "profile": {
          "displayMode": "absolute", // Standardmäßig "absolute", da er nur ein Szenario zeigt statt zwei. Wenn Vergleich gefragt ist, auf "delta" setzen und comparisonScenarioId setzen.
          "selectedScenarioId": "...",
          "comparisonScenarioId": "...",
          "selectedYear": 2100 // Standardmäßig 2100, da es noch in unserem Zeithorizont ist, gerne anpassen, falls entsprechende Anzeichen in Convo
        }
      }`,




      "Du musst darauf achten, dich an die Datentypen und Affordanzen des Datenmodells zu halten. Dies ist die Dokumentation dazu: ",
      STORE_DOC,
      "",
      "--- Konversation ---",
      convo.messages.map(m => (m.role === 'user' ? "User: " : "Assistant: ") + m.text).join('\n'),
      "",
      "--- Gesamtes Profil ---",
      JSON.stringify(convo.profile, null, 2),
      "",
      "--- Aktueller UI-State, patchbar im Profil ---",
      JSON.stringify(uiState, null, 2),
      "",
      "--- ERWARTETE ANTWORT ---",
      `{
  "scenarios": [ /* ein oder zwei vollständige ScenarioObject(s) */ ]
}`
    ].join('\n');
  } else {
    return [
      "# Rolle: Du bist ein freundlicher, hilfsbereiter Chatbot.",
      "# Aufgabe: Deine Aufgabe ist es, Informationen von einem Nutzer abzufragen.",
      "Folgende Informationen solltest du abfragen: ",
      "- Welche Verhaltensänderung oder Wandel/Wechsel soll simuliert werden",
      "- Für wie lange wird angenommen, dass Menschen ihr Verhalten ändern?",
      "- Von wie vielen Menschen oder welchen Ländern",
      "- Welches Basisszenario",
      "- (und so weiter) ",
      "Du achtest darauf, nichts doppelt abzufragen, was schon gesagt wurde. Du schließt hingegen aus dem bisherigen Verlauf, was der Nutzer sinnvollerweise sonst als Standard gern wählen könnte.",
      "Für alle Aspekte, die nicht direkt als sinnvoll aus der Anfrage hervorgehen oder nötig zu wissen sind, nimmst du erstmal defaults an. Diese Defaults lauten: ",
      "- co2ApplicationTimeframe: 20 (Mittelwert für Anwendungszeitraum in Jahren)",
      "- co2EffectYearSpread: 5 (Mittelwert für Verteilung der Wirkung in Jahren)",
      "- tempScenario: 'SSP2_4_5' (Standard-Basisszenario für Temperaturentwicklung)",
      "- tcreScenario: 'mid' (Mittelwert für TCRE-Szenario)",
      "- slrScenario: 'median' (Mittelwert für Meeresspiegelanstieg)",
      "- scaleLabel: 'Welt' (Standard für Zielpopulation)",
      "- scaleType: 'PRESET' (Standard für Skalierungstyp)",
      "- selectedCountries: [WORLD] (Standardmäßig keine spezifischen Länder ausgewählt, da bereits mit WORLD alle Länder ausgewählt sind). Verwendet Ländercodes.",
      "- behaviors: [] (Standardmäßig keine Verhaltensänderungen definiert, da diese genuin durch den Nutzer eingegeben werden sollen)",
      "- selectedYear: 2100 (Dieses Jahr ist intuitiv gut nachvollziehbar, da es noch in unserem Zeithorizont ist)",
      "- displayMode: 'absolute' (Standardanzeigemodus für Simulationsergebnisse, da er nur ein Szenario zeigt statt zwei)",
      "- scenarioOrder: [] (Keine spezifische Szenarienreihenfolge definiert, da dies nur für die GUI wichtig ist)",
      "- dirtyScenarioIds: [] (Hier sollten alle Szenarien-IDs eingetragen werden, die neu berechnet werden müssen)",
      "- comparisonScenarioId: null (Kein Vergleichsszenario standardmäßig ausgewählt, aber nötig wenn displayMode 'delta' ist)",
      "",
      "# Antwortformat: ",
      "Deine Antwort MUSS ein einziges JSON-Objekt nach folgendem Typ sein. Gib KEINEN Freitext, KEINE Erklärungen, KEINE Kommentare, KEINE Codeblöcke zurück.",
      "Gib ausschließlich ein valides JSON aus.",
      "Alle Felder, die mit ? gekennzeichnet sind, sind optional.",
      "Alle anderen Felder müssen ausgefüllt werden.",
      "- message: String, die Nachricht an den User. MUSS gegeben werden.",
      "- suggestions: Array von Strings, die Antwortoptionen für den User. Sollte in der Regel gegeben werden.",
      "- profile: Objekt, das Änderungen zum aktuellen Profil des Users enthält. Sollte gegeben werden, sofern die Änderung in der UI sofort schon sichtbar sein soll. Ist in der Regel auf UI-Steuerung wie das Jahr, das ausgewählte Szenario, etc. relevant. Hier wird nur der PATCH gegeben",
      "- scenarioPatch: Objekt, das Änderungen zum aktuellen Szenario des Users enthält. Sollte gegeben werden, sofern die Änderung in der UI sofort schon sichtbar sein soll.",
      "-readyForExpertEvaluation: Boolean, ob die Antwort bereit ist, an den Experten weitergegeben zu werden. Auf true stellen, wenn du alle wichtigen Informationen erhalten hast, die für die Konfiguration eines Szenarios benötigt werden.",
      "Wichtig: Alle Felder, die im Schema als number deklariert sind, dürfen ausschließlich numerische Werte enthalten. KEINE Rechnungen, KEINE Strings, KEINE Platzhalter. Wenn du etwas berechnen musst, rechne es intern und gib nur das Ergebnis als Zahl zurück.",
      "So sieht ein-Objekt aus: ",
      `type OrchestratorOutput = {
        message: string;                     // Die Antwort/Nachricht an den Nutzer (Pflichtfeld)
        suggestions?: string[];              // Optionale Vorschlags-Chips (z.B. ["Deutschland", "Europa", "Welt"])
        profile?: {                          // Optional: Änderung am Profil, das den UI-State steuert. Das "profile"-Feld enthält nur die Felder, die geändert werden sollen. Die nicht genannten Felder bleiben unverändert.
          displayMode?: "absolute" | "delta";
          selectedYear?: number;
          selectedScenarioId?: string;
          comparisonScenarioId?: string;
          // ...weitere Profilfelder möglich
        };
        scenarioPatch?: {                    // Optional: Änderungen an einem Szenario. Das "scenarioPatch"-Feld enthält nur die Felder, die geändert werden sollen. Die nicht genannten Felder bleiben unverändert.
          target: "main" | "comparison";     // Welches Szenario soll gepatcht werden?
          patch: Partial<ScenarioObject>;    // Felder und Werte für das Patchen.
        };
        readyForExpertEvaluation?: boolean; // Optional: Ob die Antwort bereit ist, an den Experten weitergegeben zu werden.
      }`,
      "",
      "Deine Nachrichten an den User schreibst du als String in den Key 'message'. ",
      "Du versuchst zudem, wenn du Aspekte erfahren möchtest, im Key 'suggestions' sehr gut passende Antwortoptionen zu geben. Zum Beispiel zur Frage, wie lange die Verhaltensänderung simuliert werden soll, könntest du anbieten '1 Jahr', '10 Jahre', '75 Jahre' (das bezeichnet auch die Ober- und Untergrenze). ",
      "",
      "Konzentriere dich bei der Frage, welchen Aspekt du abfragen solltest, jeweils auf den nächsten wichtigen Schritt, der zugleich intuitiv am nächsten liegt.",
      "Grundsätzlich sollten drei Hauptaspekte abgefragt werden: Wie viele Menschen (d.h. welche Länder/Ländergruppen) machen wie häufig und wie lang was, bzw. was an Stelle von was?",
      "",
      "Wenn der User etwa fragt: 'Viele Leute essen Falafel statt Döner', dann frage erstmal direkt: Wie viele Leute? Und biete die Optionen 'Deutschland', 'Europa' oder 'die ganze Welt'. ",
      "Dann fragst du nach der Fleischsorte und bietest in Suggestion an: 'Huhn', 'Kalb'.",
      "Danach fragst du ab, wie häufig (von 1x täglich bis 1x im Monat). Danach, wie lange. Usw. Du versuschst immer, alltagsnah, intuitiv und verständlich zu sein. Du fragst immer nur einen Aspekt auf einmal ab. ",
      "Wenn du alle unverzichtbaren Daten erfahren hast, dann schreibst du als Antwort den String '<<<complete>>>'. Dann wird die gesamte Konversation ausgewertet und daraus eine Konfiguration für eine Klimwandelsmulation erstellt.",
      "",
      "Falls du in profile oder scenarioPatch etwas änderst, musst du darauf achten, die an die Datentypen und Affordanzen des Datenmodells zu halten. Dies ist die Dokumentation dazu: ",
      STORE_DOC,
      "",
      "--- Konversation bisher ---",
      convo.messages.map(m => (m.role === 'user' ? "User: " : "Assistant: ") + m.text).join('\n'),
      "",
      "--- Gesamtes Profil (bisher) ---",
      JSON.stringify(convo.profile, null, 2),
      "",
      "--- UI-State, patchbar im Feld 'profile' ---",
      JSON.stringify(uiState, null, 2),
      "",
      "--- ANTWORTSCHEMA ---",
      `{
  "message": "...",
  "suggestions": [ "Option 1", "Option 2" ],
  "profile": { /* aktuelles Profil */ },
  "scenarioPatch": { "target": "...", "patch": {/* scenario fields */} }
}`
    ].join('\n');
  }
}

async function callAgenticLLM(convo) {
  const input = makeLLMInput(convo, 'agentic');
  const res = await fetch('/api/llm-raw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput: input })
  });
  if (!res.ok) throw new Error('LLM HTTP ' + res.status);

  // ----------- NEU: Extrahiere & parse das LLM-JSON-String-Objekt -----------
  const raw = await res.json();
  let respObj;
  try {
    let text = raw.output?.[0]?.content?.[0]?.text?.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }
    respObj = JSON.parse(text);
  } catch (e) {
    console.error('LLM-Output:', text);
    await replacePlaceholder('❌ Die Antwort konnte nicht gelesen werden.', ["nochmal probieren"]);
    throw e;
  }
  
  return respObj;
}


async function callExpertLLM(convo) {
  const input = makeLLMInput(convo, 'expert');
  const res = await fetch('/api/llm-raw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput: input })
  });
  if (!res.ok) throw new Error('LLM HTTP ' + res.status);

  // Die Response ist NICHT das gewünschte JSON, sondern enthält erst in .output[0].content[0].text den eigentlichen JSON-String!
  const raw = await res.json();
  let respObj;
  try {
    // Defensive: Stelle sicher, dass die Struktur wie erwartet ist
    const text = raw.output?.[0]?.content?.[0]?.text;
    if (!text) throw new Error("LLM response has no text output");
    respObj = JSON.parse(text);
  } catch (e) {
    await replacePlaceholder('❌ Die Antwort konnte nicht gelesen werden. ', ["nochmal probieren"]);
    throw e;
  }
  return respObj;
}


////////////////////////////////////////////////////////////////////////////////
// Applying LLM replies
////////////////////////////////////////////////////////////////////////////////

async function applyAgenticLLMResponse(resp) {
  await replacePlaceholder(resp.message, resp.suggestions || []);
  const chat = getChat();
  const convo = getHelper().chats[chat._id];
  convo.messages.push({ role: 'bot', text: resp.message });
  persistChats(getHelper().chats, chat._id);

  // Overwrite profile if given
  if (resp.profile) {
    const oldProfile = { ...convo.profile };
    const patchedProfile = { ...oldProfile, ...resp.profile };

    chat.setProfile(patchedProfile);
    convo.profile = patchedProfile;
    persistChats(getHelper().chats, chat._id);

    // Nur die im Patch enthaltenen Felder in den globalen store übernehmen:
    const p = resp.profile;
    const patch = {};
    if ('displayMode' in p) patch.displayMode = p.displayMode;
    if ('selectedYear' in p) patch.selectedYear = p.selectedYear;
    if ('selectedScenarioId' in p) patch.selectedScenarioId = p.selectedScenarioId;
    if ('comparisonScenarioId' in p) patch.comparisonScenarioId = p.comparisonScenarioId;
    if (Object.keys(patch).length) store.setState(patch);
  }

  // Scenario patch (if any)
  if (resp.scenarioPatch) {
    const ui = store.getState();
    const targetId = resp.scenarioPatch.target === 'comparison'
      ? ui.comparisonScenarioId
      : ui.selectedScenarioId;

    if (targetId) {
      // Check if the scenario has already been duplicated
      const helper = getHelper();
      const convo = helper.chats[chat._id];
      if (!convo.isDuplicated) {
        // Duplicate the scenario before applying the patch
        const originalScenario = { ...store.getState().scenariosById[targetId] };
        const newScenarioId = crypto.randomUUID();
        const duplicatedScenario = { ...originalScenario, id: newScenarioId };

        // Add the duplicated scenario to the store
        const updatedScenarios = { ...store.getState().scenariosById, [newScenarioId]: duplicatedScenario };
        store.setState({ scenariosById: updatedScenarios });

        // Update the active scenario ID to the duplicated scenario
        if (resp.scenarioPatch.target === 'comparison') {
          store.setState({ comparisonScenarioId: newScenarioId });
        } else {
          store.setState({ selectedScenarioId: newScenarioId });
        }

        // Mark the scenario as duplicated
        convo.isDuplicated = true;
        persistChats(helper.chats, chat._id);

        // Apply the patch to the duplicated scenario
        store.patchScenario(newScenarioId, resp.scenarioPatch.patch);
      } else {
        // Apply the patch directly to the existing scenario
        store.patchScenario(targetId, resp.scenarioPatch.patch);
      }
    }
  }

  // Expertenauswertung triggern, falls Bot-Output bereit ist
  if (resp.readyForExpertEvaluation === true) {
    // Optional: Bot-Nachricht an User, dass es losgeht (kann aber auch schon im LLM-message-Text stehen)
    await replacePlaceholder('Alle Infos sind da, Szenario wird jetzt erstellt...');
    // Jetzt Expert-Flow triggern
    const chat = getChat();
    const convo = getHelper().chats[chat._id];
    try {
      const expertResp = await callExpertLLM(convo);
      await applyExpertLLMResponse(expertResp);
    } catch (err) {
      await replacePlaceholder('❌ Fehler bei der Szenariokonfiguration: ', err, ["nochmal probieren"]);
    }
  }
}

async function applyExpertLLMResponse(resp) {
  // console.log('[Expert] Eingehende Antwort:', resp);

  // Check scenarios array
  if (!resp.scenarios || !Array.isArray(resp.scenarios) || !resp.scenarios.length) {
    console.error('[Expert] Keine Szenarien im Response:', resp);
    await replacePlaceholder('❌ Antwort ist nicht valide. ', ["nochmal probieren"]);
    return;
  }

  // Apply scenarios (write to store)
  const state = store.getState();
  const updates = { ...state.scenariosById };
  let firstId = null;
  resp.scenarios.forEach(scn => {
    updates[scn.id] = scn;
    if (!firstId) firstId = scn.id;
    store.markScenarioAsDirty(scn.id);
  });

  // Prepare scenario order
  const scenarioOrder = [];

  // Apply (potential) profile-patch
  if (resp.profile) {
    // Patch/merge profile in chat + conversation
    const chat = getChat();
    const convo = getHelper().chats[chat._id];
    const oldProfile = { ...convo.profile };
    const patchedProfile = { ...oldProfile, ...resp.profile };

    chat.setProfile(patchedProfile);
    convo.profile = patchedProfile;
    persistChats(getHelper().chats, chat._id);

    // Nur die Felder aus resp.profile ins globale store übernehmen:
    const p = resp.profile;
    const patch = {};
    if ('displayMode' in p) patch.displayMode = p.displayMode;
    if ('selectedYear' in p) patch.selectedYear = p.selectedYear;
    if ('selectedScenarioId' in p) patch.selectedScenarioId = p.selectedScenarioId;
    if ('comparisonScenarioId' in p) patch.comparisonScenarioId = p.comparisonScenarioId;
    if (Object.keys(patch).length) {
      // console.log('[Expert] Patch für store.setState:', patch);
      store.setState(patch);
    }
  }

  // Setzen von Szenarien, Order, aktive IDs. Wenn profile nichts setzt, wird einfach wie vorher verfahren.
  store.setState({
    scenariosById: updates,
    scenarioOrder: scenarioOrder,
    selectedScenarioId: resp.profile?.selectedScenarioId || scenarioOrder[0],
    comparisonScenarioId: resp.profile?.comparisonScenarioId || (resp.scenarios[1]?.id ?? null)
  });

  await replacePlaceholder('✅ Simulation eingerichtet! Ergebnisse werden berechnet.');
}


async function replacePlaceholder(text, chips = []) {
  const chat = getChat();
  chat.removeLastBotMessageIf('Nachdenken');          // drop the spinner bubble
  await chat.sendBot(text, chips);                    // show final answer
  // also keep the orchestrator’s convo in sync:
  const helper = getHelper();
  const convo  = helper.chats[chat._id];
  convo.messages.push({ role: 'bot', text });
  persistChats(helper.chats, chat._id);
}
