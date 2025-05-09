// MiniValueCard.js
const template = document.createElement('template');
template.innerHTML = `
  <style>
    .mini-value-card {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      font-family: 'Aboreto', serif;
      box-shadow: 0 2px 5px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      position: relative;
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
    }

    .label {
      font-size: 0.8rem;
      color: #555;
      margin-bottom: 4px;
      line-height: 1;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .value {
      font-size: 1rem;
      font-weight: bold;
      color: #000;
      line-height: 1.1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: font-size 0.1s ease;
    }

    .hidden-measure {
      position: absolute;
      visibility: hidden;
      white-space: nowrap;
      pointer-events: none;
      z-index: 100;
    }
  </style>
  <div class="mini-value-card">
    <div class="label"></div>
    <div class="value"></div>
    <div class="hidden-measure"></div>
  </div>
`;

export class MiniValueCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
    this.labelEl = this.shadowRoot.querySelector('.label');
    this.valueEl = this.shadowRoot.querySelector('.value');
    this.measureEl = this.shadowRoot.querySelector('.hidden-measure');
  }

  static get observedAttributes() {
    return ['label', 'value'];
  }

  attributeChangedCallback(name, _, newVal) {
    if (name === 'label') {
      this.labelEl.textContent = newVal;
    }
    if (name === 'value') {
      this.valueEl.textContent = newVal;
      this.autoScaleFont(newVal);
    }
  }

  setValue(val) {
    this.setAttribute('value', val);
  }

  setLabel(val) {
    this.setAttribute('label', val);
  }

  autoScaleFont(valueString) {
    const minFontSize = 0.3;
    let fontSize = minFontSize;  // start with the smallest font size
    this.valueEl.style.fontSize = `${minFontSize}rem`;
    // console.log("min font size set");
    setTimeout(() => {
      const container = this.shadowRoot.querySelector('.mini-value-card');
      const maxWidth = container.clientWidth - 24; // reserve for padding/margin

      this.measureEl.textContent = valueString;
      this.measureEl.style.fontFamily = "'Aboreto', serif";
      this.measureEl.style.fontWeight = 'bold';
      this.measureEl.style.whiteSpace = 'nowrap';

      while (fontSize <= 1.3) {  // max font size
        this.measureEl.style.fontSize = `${fontSize}rem`;
        const measuredWidth = this.measureEl.offsetWidth;

        if (measuredWidth > maxWidth) {
          fontSize -= 0.05;
          break;
        }

        fontSize += 0.05;
      }

      this.valueEl.style.fontSize = `${fontSize.toFixed(2)}rem`;
    }, 40);
  }

}

customElements.define('mini-value-card', MiniValueCard);
