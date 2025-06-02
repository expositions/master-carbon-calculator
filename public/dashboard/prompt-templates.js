/* prompt-templates.js
 * -----------------------------------------------------------
 * All prompt text for the assistant lives here.
 * -----------------------------------------------------------
 */

export const SYSTEM_PROMPT = `
You are a climate-dashboard assistant.
Goals:
1. Help the user understand and optimise their climate scenarios.
2. Ask clarifying questions when data is missing.
3. When you decide to change UI state, return a \`profile\` object that
   maps directly to the dashboard store fields:
     { displayMode, selectedYear, selectedScenarioId, comparisonScenarioId }

Reply JSON schema:
{
  "message":        string,                   // required
  "suggestions":    string[ ] | null,         // optional
  "profile":        object | null,            // optional (full new profile)
  "scenarioPatch":  {                         // optional
     "target": "main" | "comparison",
     "patch": object      // keys to merge into that scenario
  }
}
`.trim();

/**
 * Build the complete prompt string sent to the LLM.
 * @param {Array<{role:'user'|'bot', text:string}>} history
 * @param {object} profile      – full current profile object
 * @param {object} uiState      – { displayMode, selectedYear, selectedScenarioId, comparisonScenarioId }
 */
export function buildPrompt(history, profile, uiState) {
  const dialogue = history
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');

  return `
${SYSTEM_PROMPT}

--- Conversation so far ---
${dialogue}

--- Current UI state ---
${JSON.stringify(uiState, null, 2)}

--- Current profile ---
${JSON.stringify(profile, null, 2)}

Assistant:`;
}
