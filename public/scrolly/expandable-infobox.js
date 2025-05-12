const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }

    .expandable-infobox {
      background-color: lightgrey;
      padding: 20px;
    }

    .infobox-header {
      display: flex;
      align-items: center;
      gap: 0.5em;
      cursor: pointer;
    }

    .arrow {
      transform: rotate(-90deg);
      transition: transform 0.3s ease;
    }

    .expandable-infobox.active .arrow {
      transform: rotate(0deg);
    }

    .infobox-headline {
      margin: 0;
    }

    .infobox-content {
      text-align: left;
      font-family: Merriweather, serif;
      max-height: var(--collapsed-height, 4.5em);
      overflow: hidden;
      position: relative;
      transition: max-height 0.3s ease;
      -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
      mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    }

    .infobox-content::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4em;
      background: linear-gradient(to bottom, rgba(255,255,255,0), lightgrey);
      filter: blur(3px);
      mix-blend-mode: lighten;
      pointer-events: none;
    }

    .expandable-infobox.active .infobox-content {
      max-height: var(--expanded-height, 300px);
      overflow-y: auto;
      -webkit-mask-image: none;
      mask-image: none;
    }

    .expandable-infobox.active .infobox-content::after {
      display: none;
    }
  </style>

  <div class="expandable-infobox">
    <div class="infobox-header">
      <svg width="24" height="24" viewBox="0 0 24 24"
           fill="none" xmlns="http://www.w3.org/2000/svg"
           class="arrow">
        <line x1="0" y1="0" x2="12" y2="12"
              stroke="black" stroke-width="2" stroke-linecap="round"/>
        <line x1="24" y1="0" x2="12" y2="12"
              stroke="black" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <h2 class="infobox-headline">
        <slot name="headline">Default Headline</slot>
      </h2>
    </div>
    <div class="infobox-content">
      <slot>
        <p>Default paragraph content. Add your own by placing markup inside the component.</p>
      </slot>
    </div>
  </div>
`;

class ExpandableInfobox extends HTMLElement {
  static get observedAttributes() {
    return ['collapsed-height', 'expanded-height'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.applyHeights();
    this.shadowRoot.querySelector('.infobox-header')
      .addEventListener('click', () => this.toggle());
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (['collapsed-height', 'expanded-height'].includes(name)) {
      this.applyHeights();
    }
  }

  applyHeights() {
    const content = this.shadowRoot.querySelector('.infobox-content');
    const collapsed = this.getAttribute('collapsed-height') || '4.5em';
    const expanded = this.getAttribute('expanded-height') || '300px';

    content.style.setProperty('--collapsed-height', collapsed);
    content.style.setProperty('--expanded-height', expanded);
  }

  toggle() {
    const box = this.shadowRoot.querySelector('.expandable-infobox');
    box.classList.toggle('active');
  }
}

customElements.define('expandable-infobox', ExpandableInfobox);
