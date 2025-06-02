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

const fileContents = await fetchFileContents('../dashboard/store-documentation.md');

////////////////////////////////////////////////////////////////////////////////
// Helper: store schema as string for LLM context
////////////////////////////////////////////////////////////////////////////////
const STORE_DOC = `
# Klima-Simulationssystem: Datenmodell

Beachte exakt die Struktur und die Bezeichnungen der Felder in diesem Dokument:
"""
${fileContents}
"""
`.trim();

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
  const blank = { id: blankId, name: 'New Chat', messages: [], profile: {} };
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

  // 2. Toolbar actions: "+" (new), "☰" (drawer)
  chat.addEventListener('new-conversation-request', () => {
    const id = crypto.randomUUID();
    conversations[id] = { id, name: 'New Chat', messages: [], profile: {} };
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
          const blank = { id: newId, name: 'New Chat', messages: [], profile: {} };
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

  // 3. Chat message flow
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
        await replacePlaceholder('❌ Fehler bei der Szenariokonfiguration.');
      }
    } else {
      // Normal agentic flow
      try {
        const resp = await callAgenticLLM(convo);
        await applyAgenticLLMResponse(resp);
      } catch (err) {
        await replacePlaceholder('❌ Fehler beim Abrufen der Antwort.');
      }
    }
  });
}

requestAnimationFrame(initOrchestrator);

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
      "SYSTEM: Du bist ein Klimasimulations-Experte. Erstelle anhand der Konversation und des Profils ein vollständiges Szenariokonfigurations-Objekt nach folgender Dokumentation. Gib das JSON exakt nach Schema zurück (fehlende optionale Felder dürfen fehlen). Du verwendest zum Schreiben des JSONs die Informationen aus der eingefügten Konversation.",
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
      "- selectedCountries: [WORLD] (Standardmäßig keine spezifischen Länder ausgewählt, da bereits mit WORLD alle Länder ausgewählt sind)",
      "- behaviors: [] (Standardmäßig keine Verhaltensänderungen definiert, da diese genuin durch den Nutzer eingegeben werden sollen)",
      "- selectedYear: 2100 (Dieses Jahr ist intuitiv gut nachvollziehbar, da es noch in unserem Zeithorizont ist)",
      "- displayMode: 'absolute' (Standardanzeigemodus für Simulationsergebnisse, da er nur ein Szenario zeigt statt zwei)",
      "- scenarioOrder: [] (Keine spezifische Szenarienreihenfolge definiert, da dies nur für die GUI wichtig ist)",
      "- dirtyScenarioIds: [] (Hier sollten alle Szenarien-IDs eingetragen werden, die neu berechnet werden müssen)",
      "- comparisonScenarioId: null (Kein Vergleichsszenario standardmäßig ausgewählt, aber nötig wenn displayMode 'delta' ist)",
      "",
      "# Antwortformat: ",
      "Deine Antwort MUSS ein einziges JSON-Objekt nach folgendem Typ sein. Gib KEINEN Freitext, KEINE Erklärungen, KEINE Kommentare, KEINE Codeblöcke zurück, KEINE triple backticks.",
      "Gib ausschließlich ein valides JSON aus.",
      "Alle Felder, die mit ? gekennzeichnet sind, sind optional.",
      "Alle anderen Felder müssen ausgefüllt werden.",
      `type ScenarioObject = {
        id: string;
        name: string;
        description: string;

        co2DeltaKg: number;
        co2ApplicationTimeframe: number;
        co2EffectYearSpread: number;

        tempScenario: 'SSP1_1_9' | 'SSP1_2_6' | 'SSP2_4_5' | 'SSP3_7_0' | 'SSP5_8_5';
        tcreScenario: 'low' | 'mid' | 'high';
        slrScenario: 'low' | 'median' | 'high';

        scaleLabel: 'Nur ich' | 'Deutschland' | 'Europäische Union' | 'Welt' | 'G7' | 'G20' | 'Weit entwickelt' | 'Wenig entwickelt' | 'Meistes CO₂ pro Kopf' | 'Eigene Auswahl';
        scaleType: 'PRESET' | 'CUSTOM';
        selectedCountries: string[];

        behaviors: Behavior[];
      };

      type Behavior = {
        id: string;
        label: string;
        co2Amount: number;
        unit: string;
        frequency: number;
        timeUnit: 'Tag' | 'Woche' | 'Monat' | 'Jahr' | '10 Jahre';
        onceOnly: boolean;
        mode: 'DO_MORE' | 'DO_LESS';
        co2DeltaKg: number;
        isActive: boolean;
        source: 'llm' | 'user' | string;
        unsicherheitsbereichKg?: string;
        annahmen?: string;
        quellenStichworte?: string[];
        meta?: {
          name: string;
          amount_info: Array<{ text: string; amount: number; unit: string }>;
          co2_amount: number;
          sectors: Array<{ sector: string; percentage: number }>;
        }
      };

      type ExpertOutput = {
        scenarios: ScenarioObject[]; // Mindestens ein, maximal zwei Szenarien
      };

      **Optional-felder (mit ? gekennzeichnet) dürfen fehlen, wenn nicht bekannt. Alle anderen Felder müssen ausgefüllt werden.**

      **Gib als Antwort ausschließlich ein JSON nach folgendem Beispiel zurück:**

      {
        "scenarios": [
          {
            "id": "ssp1-1.9-path",
            "name": "Der 1,5 Grad Weg",
            "description": "Ambitionierter Klimaschutz...",
            "co2DeltaKg": 0,
            "co2ApplicationTimeframe": 20,
            "co2EffectYearSpread": 5,
            "tempScenario": "SSP1_1_9",
            "tcreScenario": "mid",
            "slrScenario": "median",
            "scaleLabel": "Welt",
            "scaleType": "PRESET",
            "selectedCountries": [],
            "behaviors": []
          }
        ]
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
      "# Aufgabe: Deine Aufgabe ist es, Informationen von einem Nutzer abzufragen. ",
      "Folgende Informationen solltest du abfragen: ",
      "- Welche Verhaltensänderung oder Wandel/Wechsel soll simuliert werden",
      "- Für wie lange ",
      "- Von wie vielen Menschen oder welchen Ländern",
      "- Welches Basisszenario",
      "- (und so weiter) ",
      "Für alle Aspekte, die nicht direkt als sinnvoll aus der Anfrage hervorgehen oder nötig zu wissen sind, nimmst du erstmal defaults an. Diese Defaults lauten: ",
      "- co2ApplicationTimeframe: 20 (Mittelwert für Anwendungszeitraum in Jahren)",
      "- co2EffectYearSpread: 5 (Mittelwert für Verteilung der Wirkung in Jahren)",
      "- tempScenario: 'SSP2_4_5' (Standard-Basisszenario für Temperaturentwicklung)",
      "- tcreScenario: 'mid' (Mittelwert für TCRE-Szenario)",
      "- slrScenario: 'median' (Mittelwert für Meeresspiegelanstieg)",
      "- scaleLabel: 'Welt' (Standard für Zielpopulation)",
      "- scaleType: 'PRESET' (Standard für Skalierungstyp)",
      "- selectedCountries: [WORLD] (Standardmäßig keine spezifischen Länder ausgewählt, da bereits mit WORLD alle Länder ausgewählt sind)",
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
      }`,
      "",
      "Deine Nachrichten an den User schreibst du als String in den Key 'message'. ",
      "Du versuchst zudem, wenn du Aspekte erfahren möchtest, im Key 'suggestions' sehr gut passende Antwortoptionen zu geben. Zum Beispiel zur Frage, wie lange die Verhaltensänderung simuliert werden soll, könntest du anbieten '1 Jahr', '10 Jahre', '75 Jahre' (das bezeichnet auch die Ober- und Untergrenze). ",
      "",
      "Konzentriere dich jeweils auf den nächsten wichtigen Schritt, der zugleich intuitiv am nächsten liegt.",
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
    const text = raw.output?.[0]?.content?.[0]?.text;
    respObj = JSON.parse(text);
  } catch (e) {
    await replacePlaceholder('❌ Die Antwort konnte nicht gelesen werden.');
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
  return res.json(); // expect { scenarios: [ ... ] }
}

////////////////////////////////////////////////////////////////////////////////
// Applying LLM replies
////////////////////////////////////////////////////////////////////////////////

async function applyAgenticLLMResponse(resp) {
  await replacePlaceholder(resp.message, resp.suggestions || []);
  // persist bot message
  const chat = getChat();
  const convo = getHelper().chats[chat._id];
  convo.messages.push({ role: 'bot', text: resp.message });
  persistChats(getHelper().chats, chat._id);
  // Overwrite profile if given
  if (resp.profile) {
    // Merge/Patch das Profil!
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
      store.patchScenario(targetId, resp.scenarioPatch.patch);
    }
  }
}

async function applyExpertLLMResponse(resp) {
  // We expect: { scenarios: [ ...full ScenarioObject(s)... ] }
  if (!resp.scenarios || !Array.isArray(resp.scenarios)) {
    await replacePlaceholder('❌ Antwort ist nicht valide. Bitte noch einmal.');
    return;
  }
  // Update scenariosById, scenarioOrder, selectedScenarioId, etc.
  const state = store.getState();
  const updates = { ...state.scenariosById };
  let firstId = null;
  resp.scenarios.forEach(scn => {
    updates[scn.id] = scn;
    if (!firstId) firstId = scn.id;
    store.markScenarioAsDirty(scn.id);
  });
  store.setState({
    scenariosById: updates,
    scenarioOrder: resp.scenarios.map(scn => scn.id),
    selectedScenarioId: firstId,
    comparisonScenarioId: resp.scenarios[1]?.id || null
  });
  await replacePlaceholder('✅ Simulation eingerichtet! Ergebnisse werden berechnet.');
}

async function replacePlaceholder(text, chips = []) {
  const chat = getChat();
  const msgs = chat.shadowRoot.querySelectorAll('.msg.bot');
  const last = msgs[msgs.length - 1];
  if (last && last.textContent.includes('Nachdenken')) last.remove();
  await chat.sendBot(text, chips);
}
