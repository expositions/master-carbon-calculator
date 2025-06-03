/**
 * SeaLevelAnimator
 * -----------------
 * One class to rule the *sea-level* animation for the Neustadt-Harbour SVG.
 *
 * Responsibilities
 *  1.  Load a timeline (year → mm SLR + °C anomaly).
 *  2.  Move the harbour-sea polygon (`path1`) up/down while keeping the bottom edge fixed.
 *  3.  Move the ships group with the sea (cosmetics).
 *  4.  Drive the gauge:
 *        •  `gauge-water-top`  → moves as a whole (white “foam” line).
 *        •  `gauge-water-base` → stretches upward, bottom edge stays put.
 *        •  `gauge` group      → frame; hides with the water when flooded.
 *  5.  Hide the entire gauge cluster once the *relative* sea-level
 *      exceeds **+0.2 m** above the hard-coded 10 m “zero” baseline
 *      (simulates the gauge being submerged).
 *
 *  All geometry changes are made in **viewBox units**, independent of screen-pixels.
 */

class SeaLevelAnimator {
  /* ---------- constructor & configuration ---------- */

  constructor() {
    /* timeline staging */
    this.timelineData = [];
    this.currentYear  = null;

    /* original path snapshots (captured once) */
    this.originalSeaCoords       = null; // path1 (harbour sea)
    this.originalGaugeBaseCoords = null; // gauge-water-base (blue rectangle)

    /* viewBox geometry (captured once) */
    this.svgViewBoxWidth  = null;
    this.svgViewBoxHeight = null;

    /* constants (tweak here if artwork or scaling changes) */
    this.REFERENCE_WIDTH_PX  = 1200;  // base design width
    this.PX_PER_CM_AT_REF    = 14/100;/* 14 px per 100 cm at reference width  */
    this.GAUGE_ZERO_M        = 10;    // artwork already shows 10 m at “zero”
    this.GAUGE_SPEED_FACTOR  = 2.5;   // gauge reacts 2.5× faster than harbour
    this.GAUGE_HIDE_THRESHOLD= 0.2;   // hide gauge above +0.2 m relative
  }

  /* ---------- public API ---------- */

  /** 1) Persist timeline (array of {year, seaLevelMm, temperatureC}). */
  ingestSeaLevelTimeline(timelineObject){
    if(!timelineObject || !Array.isArray(timelineObject.data)){
      console.error("Invalid timeline data.");
      return;
    }
    this.timelineData = timelineObject.data;
    // console.log(`Timeline loaded (${this.timelineData.length} samples).`);
  }

  /** 2) Main entry – draw chosen year. */
  showSeaLevel(year){
    /* --- data lookup ---------------------------------------------------- */
    const entry = this.timelineData.find(d => d.year === year);
    if(!entry){ console.warn(`No data for ${year}`); return; }

    const seaMm    = entry.seaLevelMm;       // mm since 1850-1900 baseline
    const seaMeters= seaMm/1000;             // convert to m
    const deltaM   = seaMeters - this.GAUGE_ZERO_M;

    /* --- DOM handles & viewBox cache ------------------------------------ */
    const host = document
       .querySelector("sea-level-visualization").shadowRoot;
    const svg      = host.getElementById("slr-svg");
    if(!svg){ console.error("slr-svg not found."); return; }

    /* cache viewBox once */
    if(this.svgViewBoxWidth === null){
      [, , this.svgViewBoxWidth, this.svgViewBoxHeight] =
        svg.getAttribute("viewBox").split(" ").map(Number);
    }

    /* update label ------------------------------------------------------- */
    
    const label = host.getElementById("slr-label");
    if (year > 2025 && year < 12025) {
      label.classList.add("change-effect");
      setTimeout(() => label.classList.remove("change-effect"), 300);
    }
    label.textContent = `Jahr ${year}: ${entry.temperatureC.toFixed(6)} °C über ø1850-1900`;

    /* --- global scale factor (m → viewBox-units) ----------------------- */
    const viewUnitsPerMeter =
      this.PX_PER_CM_AT_REF * 100 * (this.svgViewBoxWidth/this.REFERENCE_WIDTH_PX);

    /* harbour sea shift (negative = upwards in SVG) */
    const seaShiftVU = seaMeters * viewUnitsPerMeter * -1;

    /* gauge delta shift (relative + faster) */
    const gaugeShiftVU = deltaM * viewUnitsPerMeter * this.GAUGE_SPEED_FACTOR;

    /* --- apply transformations ----------------------------------------- */
    this.#applySeaShift(seaShiftVU);
    this.#applyGauge(gaugeShiftVU, deltaM);
  }

  /* ---------- private helpers ---------- */

  /** Move harbour water path + ships in viewBox-units. */
  #applySeaShift(shiftVU){
    const svg   = document.querySelector("sea-level-visualization")
                          .shadowRoot.getElementById("slr-svg");
    const sea   = svg.getElementById("path1");
    const ships = svg.getElementById("ships");
    if(!sea || !ships){ console.warn("Sea elements missing."); return; }

    /* snapshot original coords once */
    if(!this.originalSeaCoords){
      this.originalSeaCoords =
        [...sea.getAttribute("d").matchAll(/-?\d+\.?\d*/g)].map(Number);
      if(this.originalSeaCoords.length < 12){
        console.warn("Unexpected harbour path."); return;
      }
    }

    const c = [...this.originalSeaCoords];
    c[1] += shiftVU;   // raise top
    c[9] -= shiftVU;   // counter-shift bottom (fixed)

    sea.setAttribute("d",
      `m ${c[0]},${c[1]} ${c[2]},${c[3]} ${c[4]},${c[5]} `
    + `${c[6]},${c[7]} ${c[8]},${c[9]} ${c[10]},${c[11]} z`);

    ships.setAttribute("transform",`translate(0, ${shiftVU})`);
  }

  /**
   * Position + optionally hide the gauge cluster.
   * @param {number} gaugeShiftVU  shift in viewBox-units
   * @param {number} deltaM        actual sea-level – GAUGE_ZERO_M  (m)
   */
  #applyGauge(gaugeShiftVU, deltaM){
    const svg        = document.querySelector("sea-level-visualization")
                               .shadowRoot.getElementById("slr-svg");
    const topGroup   = svg.getElementById("gauge-water-top");
    const basePath   = svg.getElementById("gauge-water-base");
    const frameGroup = svg.getElementById("gauge");
    if(!topGroup || !basePath || !frameGroup){
      console.warn("Gauge elements missing."); return;
    }

    /* snapshot original base rectangle once */
    if(!this.originalGaugeBaseCoords){
      const coords =
        [...basePath.getAttribute("d").matchAll(/-?\d+\.?\d*/g)].map(Number);
      // expects “m x0,y0 h w v h2 H x0 Z”  => 5 numbers
      if(coords.length < 5){ console.warn("Gauge base path format."); return; }
      this.originalGaugeBaseCoords = coords;
    }

    /* ---------- hide / show logic ------------------------------------- */
    const hide = deltaM > this.GAUGE_HIDE_THRESHOLD;
    [topGroup, basePath, frameGroup].forEach(el =>{
      // el.style.transition = "opacity 0.5s ease";
      el.style.opacity    = hide ? "0" : "1";
      el.style.visibility = hide ? "hidden" : "visible";
    });
    if(hide) return;     // nothing else to move while submerged

    /* ---------- move “foam line” -------------------------------------- */
    topGroup.setAttribute("transform",`translate(0, ${-gaugeShiftVU})`);

    /* ---------- stretch blue rectangle upward ------------------------- */
    const [x0, y0, w, hRect, x1] = this.originalGaugeBaseCoords;
    const bottomY = y0 + hRect;
    const newTopY = y0 - gaugeShiftVU;
    const newH    = bottomY - newTopY;

    basePath.setAttribute("d",
      `m ${x0},${newTopY} h ${w} v ${newH} H ${x1} Z`);
  }
}

/* --------------------------------------------------------------------- */
/*  Convenience globals so the HTML can simply call these                */
const seaLevelAnimator = new SeaLevelAnimator();
globalThis.ingestSeaLevelTimeline = data => seaLevelAnimator.ingestSeaLevelTimeline(data);
globalThis.showSeaLevel          = year => seaLevelAnimator.showSeaLevel(year);
