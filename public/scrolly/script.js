import { collectAllYears } from '../scenario-data/simulateFutureScenario.js';

// Progress Bar scroll depending on position on site
document.addEventListener("DOMContentLoaded", function () {
  const progressBar = document.querySelector(".progress-bar");

  function updateProgress() {
    const scrollTop = globalThis.scrollY;
    const docHeight = document.documentElement.scrollHeight - globalThis.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;

    progressBar.style.height = scrollPercent + "vh"; // Setzt Höhe in % des Viewports
  }

  globalThis.addEventListener("scroll", updateProgress);
});


// Header and Footer background setting depending on which section type is in the viewport
document.addEventListener("DOMContentLoaded", function () {
  const header = document.querySelector(".header");
  const footer = document.querySelector(".footer");
  const scroller = scrollama();

  scroller
    .setup({
      step: ".section", // Jede Section ist ein Step
      offset: 0.05, // Trigger an der Oberkante der Section
    })
    .onStepEnter((response) => {
      const section = response.element;
      const headlineCard = section.querySelector(".headline-card");

      if (headlineCard && headlineCard.classList.contains("title")) {
        header.className = "header transparent";
        if (footer) footer.className = "footer transparent";
      } else if (headlineCard) {
        header.className = "header dark";
        if (footer) footer.className = "footer dark";
      } else if (section.classList.contains("single-column")) {
        header.className = "header dark";
        if (footer) footer.className = "footer bright";
      } else if (section.classList.contains("two-columns")) {
        header.className = "header dark";
        if (footer) footer.className = "footer dark";
      }
    })
    .onStepExit((response) => {
      if (response.direction === "up") {
        const prevSection = response.element.previousElementSibling;

        if (prevSection) {
          const prevHeadlineCard = prevSection.querySelector(".headline-card");

          if (prevHeadlineCard && prevHeadlineCard.classList.contains("title")) {
            header.className = "header transparent";
            if (footer) footer.className = "footer transparent";
          } else if (prevHeadlineCard) {
            header.className = "header dark";
            if (footer) footer.className = "footer dark";
          } else if (prevSection.classList.contains("single-column")) {
            header.className = "header dark";
            if (footer) footer.className = "footer bright";
          } else if (prevSection.classList.contains("two-columns")) {
            header.className = "header dark";
            if (footer) footer.className = "footer dark";
          }
        }
      }
    });
});



// This  calculates the scroll percentage between these triggers to dynamically update the sea level visualization based on the year.
document.addEventListener("DOMContentLoaded", function () {
  // Alle Multimedia-Elemente standardmäßig verbergen
  document.querySelectorAll('.multimedia-element').forEach(el => {
    el.classList.remove('active');
  });

  // Scrollama initialisieren
  const scroller = scrollama();

  scroller.setup({
    step: '.media-trigger',   // Unsere Trigger-Elemente
    offset: 0.5,              // 20 % vom oberen Viewport
    debug: false
  })
  .onStepEnter(function(response) {
    // Wenn ein Trigger in den 20%-Bereich kommt:
    const trigger = response.element;
    const targetId = trigger.getAttribute('data-target');
    const mediaEl = document.getElementById(targetId);
    if (mediaEl) {
      mediaEl.classList.add('active');
    }
  })
  .onStepExit(function(response) {
    // Wenn ein Trigger den Bereich wieder verlässt, z. B. wenn er weniger als 20 % sichtbar ist:
    const trigger = response.element;
    const targetId = trigger.getAttribute('data-target');
    const mediaEl = document.getElementById(targetId);
    if (mediaEl) {
      if (trigger.classList.contains('first-vis-trigger') && response.direction === 'down') {
        mediaEl.classList.add('active');
      } else if (trigger.classList.contains('last-vis-trigger') && response.direction === 'up') {
        mediaEl.classList.add('active');
      } else {
        mediaEl.classList.remove('active');
      }
    }
  });
});





// The following code ensures that the sea level visualization remains sticky between the first and third triggers.
// It also calculates the scroll percentage between these triggers to dynamically update the sea level visualization based on the year.

const vis1 = document.getElementById('vis1');
const firstTrigger = document.querySelectorAll('.media-trigger[data-target="vis1"]')[1];
const thirdTrigger = document.querySelectorAll('.media-trigger[data-target="vis1"]')[2];
globalThis.addEventListener('scroll', function() {
  const firstTriggerTop = firstTrigger.getBoundingClientRect().top;
  const thirdTriggerTop = thirdTrigger.getBoundingClientRect().top;

  // Ensure vis1 is not visible if the firstTrigger is significantly above the viewport
  if (firstTriggerTop > globalThis.innerHeight * 1.5 || thirdTriggerTop <= -globalThis.innerHeight * 0.5) {
    vis1.classList.remove('sticky', 'active');
    return;
  }

  if (firstTriggerTop <= 0 && thirdTriggerTop > 0) {
    vis1.classList.add('sticky');
  } else {
    vis1.classList.remove('sticky');
  }

  // Measure percentage advancement in scrolling
  const scrollTop = globalThis.scrollY;
  const firstTriggerOffset = firstTrigger.offsetTop;
  const thirdTriggerOffset = thirdTrigger.offsetTop;
  const totalScrollDistance = thirdTriggerOffset - firstTriggerOffset;
  const scrollPercentage = ((scrollTop - firstTriggerOffset) / totalScrollDistance) * 100;

  const allYears = collectAllYears();
  const totalYears = allYears.length;

  let year;
  if (scrollPercentage <= 0) {
    year = allYears[0];
  } else if (scrollPercentage >= 100) {
    year = allYears[totalYears - 1];
  } else {
    const yearIndex = Math.floor((scrollPercentage / 100) * totalYears);
    year = allYears[yearIndex];
  }

    showSeaLevel(year);
});


// This code sets up Scrollama to trigger background changes when entering or exiting steps.
// It listens for step enter and exit events and updates the background accordingly.
document.addEventListener("DOMContentLoaded", function () {
  const scrollyBgScroller = scrollama();

  scrollyBgScroller
    .setup({
      step: ".media-trigger",
      offset: 0.5,
      debug: false
    })
    .onStepEnter(response => {
      const bgTarget = response.element.getAttribute("data-bg-target");
      if (bgTarget) {
        document.querySelectorAll(".scrolly-background").forEach(el => {
          el.classList.remove("active");
        });
        const bg = document.getElementById(bgTarget);
        if (bg) bg.classList.add("active");
      }
    })
    .onStepExit(response => {
      const bgTarget = response.element.getAttribute("data-bg-target");
      if (bgTarget) {
        const bg = document.getElementById(bgTarget);
        if (bg && response.direction === "up") {
          bg.classList.remove("active");
        }
        // Optional: willst du beim Scrollen nach unten das Bild weiter anzeigen oder ausblenden?
        if (bg && response.direction === "down") {
          bg.classList.remove("active");
        }
      }
    });
});


// ---------- Scroll-Indicator ---------- //
document.addEventListener("DOMContentLoaded", () => {
  const indicator = document.getElementById("scroll-indicator");
  const fadeAfter = 120; // px: ab hier wird Pfeil ausgeblendet

  // Pfeil ein- / ausblenden
  globalThis.addEventListener("scroll", () => {
    if (globalThis.scrollY > fadeAfter) {
      indicator.classList.add("hide");
    } else {
      indicator.classList.remove("hide");
    }
  });
});

// ---------- CTA ---------- //
document.addEventListener("DOMContentLoaded", () => {
  const ctaBtn = document.getElementById("to-simulator");

  // Smooth scroll zum Simulator
  ctaBtn.addEventListener("click", () => {
    document.getElementById("simulator").scrollIntoView({ behavior: "smooth" });
  });
});
