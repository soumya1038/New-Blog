(function () {
  const root = document.documentElement;
  const body = document.body;
  const stage = document.querySelector("[data-stage]");
  const cards = Array.from(document.querySelectorAll(".orbit-card"));
  const formatButtons = Array.from(document.querySelectorAll("[data-target-card]"));
  const railDots = Array.from(document.querySelectorAll(".rail-dot"));
  const themeButton = document.querySelector("[data-theme-toggle]");
  const searchToggle = document.querySelector("[data-search-toggle]");
  const searchClose = document.querySelector("[data-search-close]");
  const searchPanel = document.querySelector("[data-search-panel]");
  const searchInput = document.querySelector("#landingSearch");
  const navToggle = document.querySelector(".nav-toggle");

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const savedTheme = localStorage.getItem("lekhon-3d-theme");
  const startingDark = savedTheme ? savedTheme === "dark" : prefersDark.matches;

  function setTheme(isDark) {
    root.classList.toggle("dark", isDark);
    localStorage.setItem("lekhon-3d-theme", isDark ? "dark" : "light");
    if (themeButton) {
      themeButton.innerHTML = isDark
        ? '<i class="fa-regular fa-sun"></i>'
        : '<i class="fa-regular fa-moon"></i>';
      themeButton.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateRail(progress) {
    railDots.forEach((dot, index) => {
      const threshold = index / Math.max(railDots.length - 1, 1);
      dot.classList.toggle("is-active", progress >= threshold - 0.05);
    });
  }

  function updateCards() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
    root.style.setProperty("--scroll", progress.toFixed(4));
    updateRail(progress);

    const heroProgress = clamp(window.scrollY / Math.max(window.innerHeight, 1), 0, 1.25);
    const viewportWidth = window.innerWidth;
    const spreadX = viewportWidth <= 560 ? 0.28 : viewportWidth <= 820 ? 0.62 : 1;
    const spreadY = viewportWidth <= 560 ? 0.78 : viewportWidth <= 820 ? 0.9 : 1;
    cards.forEach((card, index) => {
      const x = Number(card.dataset.x || 0) * spreadX;
      const y = Number(card.dataset.y || 0) * spreadY;
      const z = Number(card.dataset.z || 0);
      const rotate = Number(card.dataset.rotate || 0);
      const speed = Number(card.dataset.speed || 0);
      const wave = Math.sin(heroProgress * Math.PI + index * 0.82) * 15;
      const orbit = heroProgress * (index % 2 === 0 ? 34 : -31);
      const activeLift = card.classList.contains("is-active") ? 26 : 0;

      card.style.transform = [
        "translate(-50%, -50%)",
        `translate3d(${x}px, ${y + heroProgress * speed + wave - activeLift}px, ${z + heroProgress * 38}px)`,
        `rotateY(${rotate + orbit}deg)`,
        `rotateX(${8 - heroProgress * 5}deg)`,
        `rotateZ(${rotate / 4}deg)`
      ].join(" ");
      card.style.opacity = String(clamp(1.08 - heroProgress * 0.28, 0.76, 1));
    });
  }

  function setActiveCard(cardName) {
    cards.forEach((card) => {
      card.classList.toggle("is-active", card.dataset.card === cardName);
    });
    formatButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.targetCard === cardName);
    });
  }

  setTheme(startingDark);
  updateCards();

  window.addEventListener("scroll", updateCards, { passive: true });
  window.addEventListener("resize", updateCards);

  if (stage) {
    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      root.style.setProperty("--pointer-x", clamp(x * 2, -1, 1).toFixed(3));
      root.style.setProperty("--pointer-y", clamp(y * 2, -1, 1).toFixed(3));
    });

    stage.addEventListener("pointerleave", () => {
      root.style.setProperty("--pointer-x", "0");
      root.style.setProperty("--pointer-y", "0");
    });
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      setActiveCard(card.dataset.card);
    });
  });

  formatButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveCard(button.dataset.targetCard);
      const hero = document.querySelector(".hero-section");
      if (hero && window.innerWidth > 820) {
        hero.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  themeButton?.addEventListener("click", () => {
    setTheme(!root.classList.contains("dark"));
  });

  searchToggle?.addEventListener("click", () => {
    searchPanel?.classList.add("is-open");
    window.setTimeout(() => searchInput?.focus(), 60);
  });

  searchClose?.addEventListener("click", () => {
    searchPanel?.classList.remove("is-open");
    searchToggle?.focus();
  });

  searchPanel?.addEventListener("submit", (event) => {
    event.preventDefault();
    searchPanel.classList.remove("is-open");
  });

  navToggle?.addEventListener("click", () => {
    const isOpen = body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.innerHTML = isOpen
      ? '<i class="fa-solid fa-xmark"></i><span class="sr-only">Close navigation</span>'
      : '<i class="fa-solid fa-bars"></i><span class="sr-only">Open navigation</span>';
  });

  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      body.classList.remove("nav-open");
      navToggle?.setAttribute("aria-expanded", "false");
      if (navToggle) {
        navToggle.innerHTML = '<i class="fa-solid fa-bars"></i><span class="sr-only">Open navigation</span>';
      }
    });
  });
})();
