class SeaLevelVisualization extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.injectSvg();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/public/scrolly/simple-sea-level-visualisation/sea-level-styles.css">
      <div id="slr-container">
        <div id="slr-svg-container"></div>
        <div id="slr-text-wrapper">
          <div id="slr-label">Jahr 1900: 0.000000 °C</div>
          <div id="slr-caption" style="visibility: hidden;">
            Hafenstadt Neustadt in Holstein: Simuliere die Auswirkungen von mehr CO₂ in der Atmosphäre.
          </div>
        </div>
      </div>
    `;
  }

  injectSvg() {
    const container = this.shadowRoot.getElementById("slr-svg-container");

    fetch("/public/assets/neustadt-complete-clean.svg")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load complete SVG");
        return res.text();
      })
      .then((svgText) => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgEl = svgDoc.documentElement;

        svgEl.setAttribute("id", "slr-svg");
        svgEl.style.width = "100%";
        svgEl.style.height = "auto";
        svgEl.style.display = "block";

        container.innerHTML = ""; // Clean up if necessary
        container.appendChild(svgEl);

        console.log("Complete SVG loaded.");

        if (window.showSeaLevel && typeof window.showSeaLevel === "function") {
          // Optional: fallback check if elements are not yet available
          setTimeout(() => window.showSeaLevel(1900), 50);
        }
      })
      .catch((err) => console.error("SVG injection error:", err));
  }
}

customElements.define("sea-level-visualization", SeaLevelVisualization);
