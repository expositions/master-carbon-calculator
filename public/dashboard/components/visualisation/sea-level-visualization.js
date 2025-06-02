/**************************************************************************
 * Sea-Level Visualization (Dashboard) – mit JS-Interpolation             *
 * ---------------------------------------------------------------------- *
 *  • Enthält SeaLevelAnimator mit requestAnimationFrame-Animation        *
 *  • Unterstützt flüssige Bewegung der SeaPath + GaugeBase (Pfad d)     *
 *  • Keine externen Libraries                                            *
 *  • Volle Rückwärtskompatibilität (_showSeaLevel, CustomElement)       *
 **************************************************************************/

import store from '../../store.js';
/* --------------------------------------------------------------------- *
 *  SeaLevelAnimator – mit JS-Interpolation                              *
 * --------------------------------------------------------------------- *
 *  • Unterstützt zwei Szenarien gleichzeitig (Primär + Vergleich)       *
 *  • Gemeinsame Baseline für beide Pfade → kein Doppel-Offset mehr      *
 *  • Animiert zwei Meeresspiegelpfade (durchgezogen + transparent)      *
 * --------------------------------------------------------------------- */

class SeaLevelAnimator {
  constructor(root) {
    this.root = root;

    /* ---------------------- Zeitleisten ---------------------- */
    this.primaryTimelineData    = [];
    this.comparisonTimelineData = [];

    /* ---------------------- Baseline ------------------------- *
     *   Beim ersten Rendern des Primärpfads speichern wir       *
     *   - die Ausgangskoordinaten als Array                     *
     *   - den kompletten d-String                               *
     *   Diese Werte gelten als NULLEBENE für beide Szenarien.   */
    this.seaBaselineCoords = null;   // Array der 12 Zahlen
    this.seaBaselineD      = null;   // Originaler 'd'-String

    /* ---------------------- Meta ----------------------------- */
    this.currentYear             = null;
    this.originalSeaCoords       = {};   // { primary|comparison : Array }
    this.originalGaugeBaseCoords = null;
    this.svgViewBoxWidth         = null;
    this.svgViewBoxHeight        = null;

    /* ---------------------- Konstanten ----------------------- */
    this.REFERENCE_WIDTH_PX   = 1200;
    this.PX_PER_CM_AT_REF     = 14 / 100;
    this.GAUGE_ZERO_M         = 10;
    this.GAUGE_SPEED_FACTOR   = 2.5;
    this.GAUGE_HIDE_THRESHOLD = 0.2;

    /* ---------------------- letzte Animation ---------------- */
    this.lastSeaShiftVU   = {}; // { primary|comparison : number }
    this.lastGaugeShiftVU = 0;
  }

  /* ========================================================== *
   *  Daten ingestieren                                         *
   * ========================================================== */
  ingestSeaLevelTimeline(tlObj, type = 'primary') {
    if (!tlObj || !Array.isArray(tlObj.data)) {
      console.error('SeaLevelAnimator: Ungültige Timeline');
      return;
    }
    if (type === 'primary')      this.primaryTimelineData    = tlObj.data;
    else if (type === 'comparison') this.comparisonTimelineData = tlObj.data;
    else console.warn('SeaLevelAnimator: Unbekannter Timeline-Typ:', type);
  }

  /* ========================================================== *
   *  Visualisieren                                             *
   * ========================================================== */
  showSeaLevel(year) {
    const svg = this.root.getElementById('slr-svg');
    if (!svg) return;

    if (this.svgViewBoxWidth === null) {
      [, , this.svgViewBoxWidth, this.svgViewBoxHeight] =
        svg.getAttribute('viewBox').split(' ').map(Number);
    }

    this.#renderScenarioSea('primary',    this.primaryTimelineData,    svg, year,
                            /* Farbe */   '#28b200');
    this.#renderScenarioSea('comparison', this.comparisonTimelineData, svg, year,
                            /* Farbe */   '#0077cc', 0.4, /* dashed */ true);
  }

  /* ========================================================== *
   *  Einzelpfad rendern                                        *
   * ========================================================== */
  #renderScenarioSea(key, data, svg, year, color, opacity = 1, dashed = false) {
    const entry = data.find(d => d.year === year);
    if (!entry) return;

    /* ---------- Label für Primär ------------ */
    if (key === 'primary') {
      const label = this.root.getElementById('slr-label');
      if (label) {
        label.textContent =
          `Jahr ${year}: ${entry.temperatureC.toFixed(6)} °C über ø1850–1900`;
      }
    }

    /* ---------- Pfad & Schiffe holen/erzeugen ---------- */
    const seaId  = key === 'primary' ? 'path1' : 'comparisonPath';
    const shipId = key === 'primary' ? 'ships' : null;

    let sea = svg.getElementById(seaId);

    /* ---------- Vergleichspfad dynamisch anlegen ---------- */
    if (!sea && key === 'comparison') {
      const primaryPath = svg.getElementById('path1');
      if (!primaryPath) return;

      sea = primaryPath.cloneNode();
      sea.setAttribute('id', 'comparisonPath');

      /* Baseline-d anwenden (wichtig!) */
      if (this.seaBaselineD) sea.setAttribute('d', this.seaBaselineD);

      sea.setAttribute('style', `
        stroke:${color};
        fill:${color};
        opacity:${opacity};
      `);
      if (dashed) sea.setAttribute('stroke-dasharray', '6,4');

      primaryPath.parentNode.appendChild(sea);
    }
    if (!sea) return;

    /* ---------- Baseline erfassen (nur 1×, beim allerersten Aufruf) ---------- */
    if (!this.seaBaselineCoords) {
      this.seaBaselineCoords =
        [...sea.getAttribute('d').matchAll(/-?\d+\.?\d*/g)].map(Number);
      this.seaBaselineD = sea.getAttribute('d');
    }

    /* ---------- Original-Coords initialisieren ---------- */
    if (!this.originalSeaCoords[key]) {
      this.originalSeaCoords[key] = [...this.seaBaselineCoords];
    }

    /* ---------- Verschiebung berechnen ---------- */
    const seaMeters  = entry.seaLevelMm / 1000;
    const deltaM     = seaMeters - this.GAUGE_ZERO_M;
    const vuPerMeter =
      this.PX_PER_CM_AT_REF * 100 * (this.svgViewBoxWidth / this.REFERENCE_WIDTH_PX);

    const seaShiftVU = seaMeters * vuPerMeter * -1;

    const from = this.lastSeaShiftVU[key] || 0;
    this.#animateSea(
      sea,
      shipId ? svg.getElementById(shipId) : null,
      from,
      seaShiftVU,
      this.originalSeaCoords[key]
    );
    this.lastSeaShiftVU[key] = seaShiftVU;

    /* ---------- Gauge nur für Primär ---------- */
    if (key === 'primary') {
      const gaugeShiftVU = deltaM * vuPerMeter * this.GAUGE_SPEED_FACTOR;
      this.#animateGauge(svg, this.lastGaugeShiftVU, gaugeShiftVU, deltaM);
      this.lastGaugeShiftVU = gaugeShiftVU;
    }
  }

  /* ========================================================== *
   *  SEA-Pfad animation                                        *
   * ========================================================== */
  #animateSea(sea, shipsEl, from, to, baselineCoords) {
    const duration = 1000;
    const start    = performance.now();
    const original = [...baselineCoords];

    const animate = (now) => {
      const t       = Math.min((now - start) / duration, 1);
      const eased   = t * (2 - t);          // easeOut
      const shiftVU = from + (to - from) * eased;

      const c = [...original];
      // y-Koordinaten: Index 1 und 9 (siehe ursprünglichen Pfad)
      c[1] = original[1] + shiftVU;
      c[9] = original[9] - shiftVU;

      sea.setAttribute(
        'd',
        `m ${c[0]},${c[1]} ${c[2]},${c[3]} ${c[4]},${c[5]} ` +
        `${c[6]},${c[7]} ${c[8]},${c[9]} ${c[10]},${c[11]} z`
      );

      if (shipsEl) shipsEl.setAttribute('transform', `translate(0, ${shiftVU})`);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  /* ========================================================== *
   *  Gauge-Animation (nur Primär)                              *
   * ========================================================== */
  #animateGauge(svg, from, to, deltaM) {
    const top   = svg.getElementById('gauge-water-top');
    const base  = svg.getElementById('gauge-water-base');
    const frame = svg.getElementById('gauge');
    if (!top || !base || !frame) return;

    const submerged = deltaM > this.GAUGE_HIDE_THRESHOLD;
    [top, base, frame].forEach(el => {
      el.style.opacity    = submerged ? '0' : '1';
      el.style.visibility = submerged ? 'hidden' : 'visible';
    });
    if (submerged) return;

    if (!this.originalGaugeBaseCoords) {
      this.originalGaugeBaseCoords =
        [...base.getAttribute('d').matchAll(/-?\d+\.?\d*/g)].map(Number);
      if (this.originalGaugeBaseCoords.length < 5) {
        console.warn('SeaLevelAnimator: Gauge-Path-Format ungültig');
        return;
      }
    }

    const duration = 1000;
    const start    = performance.now();
    const original = [...this.originalGaugeBaseCoords];

    const animate = (now) => {
      const t       = Math.min((now - start) / duration, 1);
      const eased   = t * (2 - t);
      const shiftVU = from + (to - from) * eased;

      // Foam line
      top.setAttribute('transform', `translate(0, ${-shiftVU})`);

      // Stretch rectangle
      const [x0, y0, w, hRect, x1] = original;
      const bottomY = y0 + hRect;
      const newTopY = y0 - shiftVU;
      const newH    = bottomY - newTopY;

      base.setAttribute('d', `m ${x0},${newTopY} h ${w} v ${newH} H ${x1} Z`);

      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}

export default SeaLevelAnimator;

/* --------------------------------------------------------------------- *
 *  Custom-Element für das Dashboard                                     *
 * --------------------------------------------------------------------- */
class SeaLevelVisualization extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.animator        = null;
    this.timelinePending = {};
    this.yearPending     = null;
  }

  connectedCallback() {
    this.render();
    this._injectSvg();


    store.subscribeTo(
      state => state.displayMode,
      (mode) => {
        const svg = this.shadowRoot.getElementById('slr-svg');
        if (!svg) return;

        const comparisonPath = svg.getElementById('comparisonPath');

        if (mode === 'delta') {
          // // Pfad wieder einblenden (falls vorhanden)
          // if (comparisonPath) {
          //   comparisonPath.style.opacity = '0.4';
          //   comparisonPath.style.visibility = 'visible';
          // }

          // // ggf. neu rendern
          // if (this.animator && this.yearPending !== null) {
          //   this.animator.showSeaLevel(this.yearPending);
          // }

        } else {
          // Pfad entfernen aus dem SVG
          if (comparisonPath) {
            comparisonPath.remove();
          }

          // Vergleichsdaten aus dem Animator löschen
          if (this.animator) {
            this.animator.comparisonTimelineData = [];
            delete this.animator.originalSeaCoords['comparison'];
            delete this.animator.lastSeaShiftVU['comparison'];
          }
        }
      }
    );

    // Timeline-Subskription (Primärszenario)
    store.subscribeTo(
      state => ({
        scenario: state.scenariosById?.[state.selectedScenarioId],
        year:     state.selectedYear
      }),
      ({ scenario, year }) => {
        if (!scenario?.computed?.data?.length || typeof year !== 'number') return;

        if (this.animator) {
          this.animator.ingestSeaLevelTimeline({ data: scenario.computed.data }, 'primary');
        } else {
          this.timelinePending.primary = { data: scenario.computed.data };
        }

        if (this.animator) {
          this.animator.showSeaLevel(year);
        } else {
          this.yearPending = year;
        }
      }
    );

    // Timeline-Subskription (Vergleichsszenario)
    store.subscribeTo(
      state => ({
        comparison: state.comparisonScenarioId
          ? state.scenariosById?.[state.comparisonScenarioId]
          : null,
        year: state.selectedYear
      }),
      ({ comparison, year }) => {
        if (!comparison?.computed?.data?.length || typeof year !== 'number') return;

        if (this.animator) {
          this.animator.ingestSeaLevelTimeline({ data: comparison.computed.data }, 'comparison');
        } else {
          this.timelinePending.comparison = { data: comparison.computed.data };
        }

        if (this.animator) {
          this.animator.showSeaLevel(year);
        } else {
          this.yearPending = year;
        }
      }
    );
  }

  render() {
    const hideText = this.hasAttribute('hide-text');

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet"
            href="../dashboard/components/visualisation/sea-level-styles.css">
      <div id="slr-container">
        <div id="slr-svg-container"></div>

        ${hideText ? '' : `
          <div id="slr-text-wrapper">
            <div id="slr-label">Jahr 1900: 0.000000 °C</div>
            <div id="slr-caption">
              Hafenstadt Neustadt in Holstein: Simuliere die Auswirkungen von mehr CO₂ in der Atmosphäre.
            </div>
          </div>`}
      </div>
    `;
  }

  _injectSvg() {
    const container = this.shadowRoot.getElementById('slr-svg-container');

    fetch('/assets/neustadt-complete-clean.svg')
      .then(res => {
        if (!res.ok) throw new Error('Sea-Level SVG konnte nicht geladen werden');
        return res.text();
      })
      .then(svgText => {
        const svgEl = new DOMParser()
          .parseFromString(svgText, 'image/svg+xml')
          .documentElement;

        svgEl.setAttribute('id', 'slr-svg');
        svgEl.style.width  = '100%';
        svgEl.style.height = 'auto';
        svgEl.style.display = 'block';

        container.replaceChildren(svgEl);

        this.animator = new SeaLevelAnimator(this.shadowRoot);

        if (this.timelinePending.primary) {
          this.animator.ingestSeaLevelTimeline(this.timelinePending.primary, 'primary');
        }

        if (this.timelinePending.comparison) {
          this.animator.ingestSeaLevelTimeline(this.timelinePending.comparison, 'comparison');
        }

        if (this.yearPending !== null) {
          this.animator.showSeaLevel(this.yearPending);
          this.yearPending = null;
        }
      })
      .catch(err => console.error('Sea-Level SVG-Injection-Fehler:', err));
  }

  _showSeaLevel(year) {
    if (this.animator) this.animator.showSeaLevel(year);
  }
}

customElements.define('sea-level-visualization-dashboard', SeaLevelVisualization);
