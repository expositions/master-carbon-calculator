class FormulaVar extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    const wrapper = document.createElement('span');
    wrapper.setAttribute('class', 'var');

    const tooltipText = this.getAttribute('tooltip') || '';

    const style = document.createElement('style');
    style.textContent = `
      .var {
        position: relative;
        cursor: help;
        text-decoration: dotted underline;
      }

      .var:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 1.5em;
        left: 0;
        background:rgba(38, 101, 146, 0.91);
        color: white;
        padding: 6px 10px;
        border-radius: 4px;
        white-space: pre-wrap;
        font-size: 0.85em;
        z-index: 1000;
        max-width: 300px;
        min-width: 150px;
      }
    `;

    wrapper.setAttribute('data-tooltip', tooltipText);
    wrapper.innerHTML = `<slot></slot>`;

    shadow.appendChild(style);
    shadow.appendChild(wrapper);
  }
}

class FormulaDisplay extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    const container = document.createElement('div');
    container.setAttribute('class', 'formula');

    const style = document.createElement('style');
    style.textContent = `
      .formula {
        font-family: 'Georgia', serif;
        font-size: 1.2em;
        line-height: 1.6em;
        margin-bottom: 1.5em;
      }
    `;

    container.innerHTML = `<slot></slot>`;

    shadow.appendChild(style);
    shadow.appendChild(container);
  }
}

customElements.define('formula-var', FormulaVar);
customElements.define('formula-display', FormulaDisplay);
