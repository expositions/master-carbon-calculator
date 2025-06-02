/* llm-chat.js — Vanilla Web Component (orchestrator-driven) ------------ */

/**
 * <llm-chat> is now a “dumb” UI component:
 *  - It no longer persists to localStorage.
 *  - It relies on an external orchestrator to supply conversation data and profiles.
 *  - It exposes methods to load a conversation and retrieve its current state.
 *
 * Events emitted:
 *  - "user-message": { detail: { text } }
 *  - "rename-conversation": { detail: { id, newName } }
 *  - "new-conversation-request": void
 *  - "open-conversation-list": void
 *
 * Public methods:
 *  - loadConversation({ id, name, messages: [ { role, text }… ], profile })
 *  - getConversation(): [ { role, text }… ]
 *  - getProfile(): Object
 *  - setProfile(profileObj)
 *  - sendUser(text)
 *  - sendBot(text, options?)
 */

export class LLMChat extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = this._html();

    // DOM shortcuts
    this.$ = (sel) => this.shadowRoot.querySelector(sel);

    // Internal state
    this._id = null;                 // current conversation ID
    this._name = '';                 // current conversation name
    this._messages = [];             // [ { role: 'user'|'bot', text: '…' }, … ]
    this._profile = {};              // full profile object
    this._options = [];              // current suggestion chips
  }

  connectedCallback() {
    // Send-button & textarea listeners
    this.$('#sendBtn').addEventListener('click', () => this._handleSend());
    this.$('#input').addEventListener('keydown', (e) => this._onKey(e));

    // Burger menu opens the conversation list (orchestrator handles drawer)
    this.$('#burger').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-conversation-list'));
    });

    // Plus button requests creation of a new conversation
    this.$('#plus').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('new-conversation-request'));
    });

    // In-place rename: blur or Enter → emit rename event
    const nameSpan = this.$('#title');
    nameSpan.addEventListener('blur', () => {
      const newName = nameSpan.textContent.trim() || 'Untitled';
      if (newName !== this._name) {
        this._name = newName;
        this.dispatchEvent(new CustomEvent('rename-conversation', {
          detail: { id: this._id, newName: this._name }
        }));
      }
    });
    nameSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameSpan.blur();
      }
    });

    // Initial render (empty)
    this._render();
  }

  disconnectedCallback() {
    // Remove any event listeners if needed (none persisted)
  }

  /* ---------- Public API --------------------------------------------- */

  /**
   * Load a conversation (or switch to it). The orchestrator calls this
   * whenever the user selects or creates a new convo. Pass the entire object:
   *   { id, name, messages: [ {role, text}, … ], profile: {…} }
   */
  loadConversation({ id, name, messages, profile }) {
    this._id = id;
    this._name = name;
    this._messages = Array.isArray(messages) ? messages.slice() : [];
    this._profile = profile ? { ...profile } : {};
    this._options = [];  // clear any leftover chips
    this._render();
  }

  /**
   * Returns the current conversation’s message array (copy).
   * [ { role: 'user'|'bot', text: '…' }, … ]
   */
  getConversation() {
    return this._messages.slice();
  }

  /**
   * Returns the current profile object (copy).
   */
  getProfile() {
    return structuredClone(this._profile);
  }

  /**
   * Overwrite the current profile entirely. Emit "profile-changed".
   */
  setProfile(profileObj) {
    this._profile = profileObj ? structuredClone(profileObj) : {};
    this.dispatchEvent(new CustomEvent('profile-changed', {
      detail: this.getProfile()
    }));
  }

  /**
   * Append a user message to the UI (but does NOT persist to storage).
   * Emits “user-message” so orchestrator can react (e.g. call LLM).
   */
  sendUser(text) {
    this._messages.push({ role: 'user', text });
    this._clearOptions();
    this._render();
    return this._afterRender();
  }

  /**
   * Append a bot message to the UI; optionally display suggestion chips.
   */
  sendBot(text, options) {
    this._messages.push({ role: 'bot', text });
    if (Array.isArray(options) && options.length) {
      this._options = options.slice();
    }
    this._render();
    return this._afterRender();
  }

  /* ---------- Private helpers ---------------------------------------- */

  _html() {
    return /*html*/`
<style>
:host {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: system-ui;
  position: relative;
}

/* Toolbar */
#bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid #ddd;
  background: #fafafa;
  z-index: 1;
}
#burger,
#plus {
  cursor: pointer;
  border: none;
  background: none;
  font-size: 1.3em;
  line-height: 1;
  user-select: none;
}
#title {
  flex: 1;
  font-weight: 600;
  outline: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* Messages */
#log {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
}
.msg {
  max-width: 70%;
  padding: 6px 10px;
  border-radius: 7px;
  font-size: 0.95em;
  line-height: 1.35;
  word-wrap: break-word;
}
.msg.bot {
  background: #f1f3f7;
  align-self: flex-start;
}
.msg.user {
  background: #cce4ff;
  align-self: flex-end;
}
.msg a {
  color: #005ad6;
  text-decoration: none;
}

/* Chips */
#chipsWrap {
  display: flex;
  overflow-x: auto;
  gap: 6px;
  padding: 6px 10px;
  background: #fafafa;
}
.chip {
  background: #eee;
  border-radius: 18px;
  padding: 4px 12px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.9em;
  user-select: none;
}
.chip:hover {
  background: #ddd;
}

/* Input */
#inputBar {
  display: flex;
  align-items: flex-end;
  border-top: 1px solid #ddd;
  padding: 6px 10px;
  gap: 8px;
  background: #fafafa;
}
#input {
  flex: 1;
  resize: none;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 6px;
  font-family: inherit;
  font-size: 1em;
  line-height: 1.35;
  max-height: 6.5em;
  overflow-y: auto;
}
#sendBtn {
  border: none;
  background: none;
  font-size: 1.4em;
  cursor: pointer;
  line-height: 1;
  user-select: none;
}

/* Floating Overlay (Conversation List) */
#drawerBg {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.2);
  display: none;
  z-index: 999;
}
#drawer {
  position: absolute;
  top: 5%;
  left: 5%;
  width: 80%;
  height: 80%;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  border-radius: 8px;
  display: none;
  z-index: 1000;
  overflow: auto;
}
#drawer.open {
  display: block;
}
.conv {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}
.conv input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-size: 0.9em;
  font-weight: 600;
}
.conv button {
  flex-shrink: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1em;
}
</style>

<div id="bar">
  <button id="burger" aria-label="Open Chats">☰</button>
  <span id="title" contenteditable="true"></span>
  <button id="plus" aria-label="New Chat">＋</button>
</div>

<div id="log"></div>
<div id="chipsWrap"></div>

<div id="inputBar">
  <textarea id="input" rows="1" placeholder="Type a message…"></textarea>
  <button id="sendBtn" aria-label="Send">▶️</button>
</div>

<!-- Floating Overlay -->
<div id="drawerBg"></div>
<div id="drawer"></div>
`;
  }

  _render() {
    // Title
    const titleSpan = this.$('#title');
    if (titleSpan.textContent !== this._name) {
      titleSpan.textContent = this._name;
    }

    // Messages
    const log = this.$('#log');
    log.innerHTML = this._messages
      .map(m => `<div class="msg ${m.role}">${this._escape(m.text)}</div>`)
      .join('');
    log.scrollTop = log.scrollHeight;

    // Chips (suggestions)
    const chipsWrap = this.$('#chipsWrap');
    chipsWrap.innerHTML = this._options
      .map(t => `<div class="chip">${this._escape(t)}</div>`)
      .join('');
      [...chipsWrap.children].forEach(chip => {
        chip.addEventListener('click', () => {
          const text = chip.textContent;
          this.sendUser(text);
          // Der eigentliche Trigger für den Orchestrator:
          this.dispatchEvent(new CustomEvent('user-message', { detail: { text } }));
          // (Optional: Input-Feld leeren)
          // this.$('#input').value = '';
          this._autogrow();
        });
      });

    // Drawer (conversation list) is left empty; orchestrator populates it via external code.
  }

  _escape(str) {
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  _onKey(e) {
    if ((e.key === 'Enter' && !e.shiftKey) ||
        (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      this._handleSend();
    } else {
      this._autogrow();
    }
  }

  _autogrow() {
    const ta = this.$('#input');
    ta.style.height = 'auto';
    const lineH = parseInt(getComputedStyle(ta).lineHeight);
    ta.style.height = Math.min(ta.scrollHeight, lineH * 5) + 'px';
  }

  _handleSend() {
    const ta = this.$('#input');
    const txt = ta.value.trim();
    if (!txt) return;
    this.sendUser(txt);
    ta.value = '';
    this._autogrow();
    this.dispatchEvent(new CustomEvent('user-message', { detail: { text: txt } }));
  }

  _clearOptions() {
    this._options = [];
  }

  _afterRender() {
    return new Promise(r => requestAnimationFrame(() => {
      this._render();
      r();
    }));
  }

  /* Drawer open/close (actual content rendered by orchestrator) */
  _openDrawer() {
    this.$('#drawerBg').style.display = 'block';
    this.$('#drawer').classList.add('open');
    this.$('#drawerBg').onclick = () => this._closeDrawer();
  }
  _closeDrawer() {
    this.$('#drawerBg').style.display = 'none';
    this.$('#drawer').classList.remove('open');
  }
}

customElements.define('llm-chat', LLMChat);
