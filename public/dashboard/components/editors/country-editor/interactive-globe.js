// interactive-globe.js
import * as THREE from 'https://esm.sh/three@0.150.1';
import { OrbitControls } from 'https://esm.sh/three@0.150.1/examples/jsm/controls/OrbitControls.js';

/**
 * InteractiveGlobe Web Component
 * ==============================
 *
 * <interactive-globe> ist eine Web-Komponente zur 3D-Visualisierung von Ländern
 * auf einer Kugeloberfläche mit THREE.js. Sie erlaubt interaktive oder passive
 * Darstellung sowie Auswahl von Ländern über Mausinteraktion oder externe Steuerung.
 *
 * -----------------------------------------------
 * 🔧 Verwendung im HTML:
 * -----------------------------------------------
 *
 * <interactive-globe
 *   backgroundcolor="#ffffff"
 *   oceancolor="0xe0f7fa"
 *   countrycolor="0xcccccc"
 *   selectedcolor="0x28b200"
 *   lightintensity="1.2"
 *   rotationspeed="0.3"
 *   mode="interactive"
 * ></interactive-globe>
 *
 * -----------------------------------------------
 * 🔁 Attribute (alle optional):
 * -----------------------------------------------
 *
 * - backgroundcolor:   Hintergrund des Canvas (Default: "#ffffff")
 * - oceancolor:        Farbe des Ozeans (hex, z. B. 0xe0f7fa)
 * - countrycolor:      Standardfarbe für Länder
 * - selectedcolor:     Farbe für ausgewählte Länder
 * - lightintensity:    Lichtstärke der Szene (float)
 * - rotationspeed:     Geschwindigkeit der Eigenrotation
 * - mode:              Steuert das Verhalten:
 *     - "interactive" (Default) – voll interaktiv, Auswahl änderbar
 *     - "readonly" – Anzeige erlaubt, aber keine Änderung der Auswahl
 *     - "static" – keine Mausinteraktion möglich
 *
 * -----------------------------------------------
 * 📡 Auslesen ausgewählter Länder:
 * -----------------------------------------------
 *
 * const globe = document.querySelector('interactive-globe');
 * const selected = globe.selectedCountries;
 *
 * // Beispielausgabe:
 * [
 *   { id: "DEU", name: "Germany" },
 *   { id: "FRA", name: "France" },
 *   ...
 * ]
 *
 * -----------------------------------------------
 * 📥 Länder-Auswahl setzen (z. B. aus App-Logik):
 * -----------------------------------------------
 *
 * globe.selectedCountries = ["DEU", "FRA", "ITA"];
 *
 * → Namen oder ISO-Codes (Alpha-3) möglich
 * → Triggered intern updateColors() und dispatchSelection()
 *
 * -----------------------------------------------
 * 📢 Events:
 * -----------------------------------------------
 *
 * Der Globe feuert ein Event, wenn sich die Auswahl ändert:
 *
 * globe.addEventListener('selected-countries-changed', (e) => {
 *   console.log("Neue Auswahl:", e.detail); // wie selectedCountries
 * });
 *
 * -----------------------------------------------
 * ⚠ Hinweise:
 * -----------------------------------------------
 * - GeoJSON wird extern geladen – Komponente benötigt Internetverbindung.
 * - Alpha-3 Codes (ISO-3166-1) werden intern verwendet.
 * - Der Hintergrund muss explizit transparent oder weiß gesetzt werden,
 *   da WebGL sonst dunkelgrau rendert.
 */

export class InteractiveGlobe extends HTMLElement {
  static _geojsonCache = null;
  static get observedAttributes() {
    return [
      'oceancolor',
      'countrycolor',
      'selectedcolor',
      'lightintensity',
      'rotationspeed',
      'backgroundcolor',
      'mode'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._animReq    = null;
    this._onResize   = null;
    this._onMouseDown = null;
    this._onMouseUp   = null;

    this.canvas = document.createElement('canvas');
    this.shadowRoot.appendChild(this.canvas);

    // Configuration defaults
    this.config = {
      oceanColor: 0xADD8E6,       // Light Blue
      countryColor: 0xffffff,     // Weiß
      selectedColor: 0x28b200,    // Sattes Hellgrün
      lightIntensity: 0.4,        // Weniger hart
      rotationSpeed: 0.25,        // Langsamer drehen
      backgroundColor: '#ffffff',  // <—
      mode: 'interactive'          // <— 'interactive' | 'readonly' | 'static'
    };

    this.RADIUS = 60;
    this.COUNTRY_ALTITUDE = 1.2;

    this.selected = new Set();
    this.countryMeshes = [];
    this.countryById = new Map();
    this.countryByName = new Map();
  }

  connectedCallback() {
    this.initThree();
    this.loadGeoJSON();
    this.animate();
    this.setupClickLogic();
  }

  disconnectedCallback() {
    // Animation stoppen
    if (this._animReq) {
      cancelAnimationFrame(this._animReq);
      this._animReq = null;
    }
    // Event-Listener entfernen
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
    if (this._onMouseDown) {
      this.canvas.removeEventListener('mousedown', this._onMouseDown);
      this._onMouseDown = null;
    }
    if (this._onMouseUp) {
      this.canvas.removeEventListener('mouseup', this._onMouseUp);
      this._onMouseUp = null;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!newVal) return;
    switch (name) {
      case 'oceancolor':
        this.config.oceanColor = Number(newVal);
        if (this.oceanMaterial) this.oceanMaterial.color.setHex(this.config.oceanColor);
        break;
      case 'countrycolor':
        this.config.countryColor = Number(newVal);
        this.updateColors();
        break;
      case 'selectedcolor':
        this.config.selectedColor = Number(newVal);
        this.updateColors();
        break;
      case 'lightintensity':
        this.config.lightIntensity = parseFloat(newVal);
        if (this.cameraLight) this.cameraLight.intensity = this.config.lightIntensity;
        break;
      case 'rotationspeed':
        this.config.rotationSpeed = parseFloat(newVal);
        if (this.controls) this.controls.autoRotateSpeed = this.config.rotationSpeed;
        break;
        case 'backgroundcolor':
          this.config.backgroundColor = newVal;
          this.canvas.style.backgroundColor = newVal;
          if (this.renderer) {
            const bg = new THREE.Color(newVal);
            this.renderer.setClearColor(bg, 1);
          }
          break;

        case 'mode':
          this.config.mode = newVal;
          break;
    }
  }

  set selectedCountries(codesOrNames) {
    // Wenn GeoJSON noch nicht geladen ist → speichern und später anwenden
    if (this.countryById.size === 0 && this.countryByName.size === 0) {
      this.pendingSelectedCountries = codesOrNames;
      return;
    }
  
    this.selected.clear();
    for (const val of codesOrNames) {
      const feature = this.countryById.get(val) || this.countryByName.get(val);
      if (feature) this.selected.add(feature.properties.name);
    }
  
    this.updateColors();
    this.dispatchSelection();
    requestAnimationFrame(() => this.updateColors());
  }

  get selectedCountries() {
    const result = [];
    for (const name of this.selected) {
      const feature = this.countryByName.get(name);
      if (feature) result.push({ id: feature.id, name });
    }
    return result;
  }

  dispatchSelection() {
    this.dispatchEvent(new CustomEvent('selected-countries-changed', {
      detail: this.selectedCountries,
      bubbles: true,
      composed: true
    }));
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, this.offsetWidth / this.offsetHeight, 0.1, 1000);
    this.camera.position.z = 200;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      alpha: false
    });
    this.renderer.setSize(this.offsetWidth, this.offsetHeight);

    // Set background color from config
    const bg = new THREE.Color(this.config.backgroundColor || '#ffffff');
    this.renderer.setClearColor(bg, 1);
    this.canvas.style.backgroundColor = this.config.backgroundColor || '#ffffff';

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = this.config.rotationSpeed;

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);

    this.cameraLight = new THREE.PointLight(0xffffff, this.config.lightIntensity);
    this.camera.add(this.cameraLight);
    this.scene.add(this.camera);

    this.oceanMaterial = new THREE.MeshPhongMaterial({ color: this.config.oceanColor, shininess: 5 });
    const ocean = new THREE.Mesh(new THREE.SphereGeometry(this.RADIUS, 64, 64), this.oceanMaterial);
    this.scene.add(ocean);

    // Resize-Listener merken, um ihn später wieder abzuhängen
    this._onResize = () => {
      this.camera.aspect = this.offsetWidth / this.offsetHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.offsetWidth, this.offsetHeight);
    };
    window.addEventListener('resize', this._onResize);
  }

  loadGeoJSON() {
    // 1) Falls schon geladen, direkt weiter zur Szene
    if (InteractiveGlobe._geojsonCache) {
      this._buildFromGeoJSON(InteractiveGlobe._geojsonCache);
      return;
    }
  
    // 2) Erstmal laden und cachen
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(res => res.json())
      .then(data => {
        InteractiveGlobe._geojsonCache = data;
        this._buildFromGeoJSON(data);
      })
      .catch(err => console.error('GeoJSON-Ladefehler:', err));
  }

  _buildFromGeoJSON(data) {
    for (const feature of data.features) {
      this.countryById.set(feature.id, feature);
      this.countryByName.set(feature.properties.name, feature);
      this.renderCountry(feature);
    }
    if (this.pendingSelectedCountries) {
      this.selectedCountries = this.pendingSelectedCountries;
      this.pendingSelectedCountries = null;
    }
    this.updateColors();
  }
  


  renderCountry(feature) {
    const name = feature.properties.name;
    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

    for (const polygon of polygons) {
      const shape = new THREE.Shape();
      const outer = polygon[0].map(([lon, lat]) => new THREE.Vector2(lon, lat));
      outer.forEach((pt, i) => i === 0 ? shape.moveTo(pt.x, pt.y) : shape.lineTo(pt.x, pt.y));

      for (let i = 1; i < polygon.length; i++) {
        const hole = new THREE.Path();
        polygon[i].forEach(([lon, lat], j) => {
          const pt = new THREE.Vector2(lon, lat);
          j === 0 ? hole.moveTo(pt.x, pt.y) : hole.lineTo(pt.x, pt.y);
        });
        shape.holes.push(hole);
      }

      const geometry2D = new THREE.ShapeGeometry(shape);
      const vectorArray = [];

      for (let i = 0; i < geometry2D.attributes.position.array.length; i += 3) {
        const lon = geometry2D.attributes.position.array[i];
        const lat = geometry2D.attributes.position.array[i + 1];
        const vec3 = this.latLonToVector3(lat, lon, this.RADIUS + this.COUNTRY_ALTITUDE);
        vectorArray.push(vec3.x, vec3.y, vec3.z);
      }

      const geometry3D = new THREE.BufferGeometry();
      geometry3D.setAttribute('position', new THREE.Float32BufferAttribute(vectorArray, 3));
      geometry3D.setIndex(geometry2D.index);
      geometry3D.computeVertexNormals();
      const finalGeometry = this.subdivideGeometry(geometry3D, 2);

      const material = new THREE.MeshPhongMaterial({
        color: this.selected.has(name) ? this.config.selectedColor : this.config.countryColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });

      const mesh = new THREE.Mesh(finalGeometry, material);
      mesh.userData.countryName = name;
      this.scene.add(mesh);
      this.countryMeshes.push({ name, mesh, material });

      // Outline
      const outlinePoints = outer.map(pt => this.latLonToVector3(pt.y, pt.x, this.RADIUS + this.COUNTRY_ALTITUDE + 0.1));
      const lineGeom = new THREE.BufferGeometry().setFromPoints(outlinePoints);
      const line = new THREE.LineLoop(lineGeom, new THREE.LineBasicMaterial({ color: 0x000000 }));
      this.scene.add(line);
    }
  }

  latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = -(lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  subdivideGeometry(geometry, iterations = 1) {
    geometry = geometry.toNonIndexed();
    for (let i = 0; i < iterations; i++) {
      const pos = geometry.attributes.position;
      const newPositions = [];

      for (let j = 0; j < pos.count; j += 3) {
        const v0 = new THREE.Vector3().fromBufferAttribute(pos, j);
        const v1 = new THREE.Vector3().fromBufferAttribute(pos, j + 1);
        const v2 = new THREE.Vector3().fromBufferAttribute(pos, j + 2);

        const v01 = this.midpoint(v0, v1);
        const v12 = this.midpoint(v1, v2);
        const v20 = this.midpoint(v2, v0);

        [v0, v1, v2, v01, v12, v20].forEach(v => v.setLength(this.RADIUS + this.COUNTRY_ALTITUDE));

        newPositions.push(
          v0.x, v0.y, v0.z,
          v01.x, v01.y, v01.z,
          v20.x, v20.y, v20.z,
          v01.x, v01.y, v01.z,
          v1.x, v1.y, v1.z,
          v12.x, v12.y, v12.z,
          v12.x, v12.y, v12.z,
          v2.x, v2.y, v2.z,
          v20.x, v20.y, v20.z,
          v01.x, v01.y, v01.z,
          v12.x, v12.y, v12.z,
          v20.x, v20.y, v20.z
        );
      }

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  midpoint(a, b) {
    return new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  }

  setupClickLogic() {
    // Wenn „static“-Modus, brauchen wir keine Klick-Logik
    if (this.config.mode === 'static') return;

    // Zwischen speichern von Klick-Startzeit und -Position
    let clickStartTime = 0;
    let clickStartPos = { x: 0, y: 0 };
    const MAX_CLICK_DURATION = 500;   // ms
    const MAX_MOVE_DISTANCE = 5;      // px

    // 1) Mousedown-Handler referenzieren für späteres Entfernen
    this._onMouseDown = (e) => {
      // Klickbeginn merken
      clickStartTime = performance.now();
      clickStartPos = { x: e.clientX, y: e.clientY };
    };

    // 2) Mouseup-Handler referenzieren für späteres Entfernen
    this._onMouseUp = (e) => {
      // Kein Selektionswechsel, wenn im readonly-Modus
      if (this.config.mode === 'readonly') return;

      // Dauer und Distanz berechnen
      const clickDuration = performance.now() - clickStartTime;
      const dx = e.clientX - clickStartPos.x;
      const dy = e.clientY - clickStartPos.y;
      const moveDist = Math.hypot(dx, dy);

      // Abbruch, wenn zu langsam oder zu viel Bewegung
      if (clickDuration > MAX_CLICK_DURATION || moveDist > MAX_MOVE_DISTANCE) return;

      // Normalisierte Maus-Koordinaten für Raycaster
      const mouse = new THREE.Vector2();
      const rect = this.canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycaster initialisieren und schneiden lassen
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(
        this.countryMeshes.map(c => c.mesh),
        true
      );

      // Wenn ein Land getroffen wurde, Toggle in this.selected
      if (intersects.length > 0) {
        const name = intersects[0].object.userData.countryName;
        if (this.selected.has(name)) {
          this.selected.delete(name);
        } else {
          this.selected.add(name);
        }
        // Farben updaten und Event feuern
        this.updateColors();
        this.dispatchSelection();
      }
    };

    // 3) Event-Listener binden
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mouseup',   this._onMouseUp);
  }

  updateColors() {
    this.countryMeshes.forEach(({ name, material }) => {
      material.color.setHex(this.selected.has(name)
        ? this.config.selectedColor
        : this.config.countryColor);
    });
  }

  animate() {
    const loop = () => {
      this._animReq = requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}

customElements.define('interactive-globe', InteractiveGlobe);
