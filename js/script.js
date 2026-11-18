/* ==========================================================================
   Apex Auto Club — main script
   Every page loads this one file. Page-specific features start only when
   their elements exist on the page (see "init" at the bottom).

   Sections:
   1.  Theme (light / dark) — runs immediately to avoid a flash
   2.  Helpers (storage, DOM, toast)
   3.  Header: mobile menu, account link, theme toggle
   4.  Scroll reveal + number counters
   5.  Form validation (custom JavaScript, no HTML validation)
   6.  Authentication simulation (sign up / log in / profile)
   7.  Member Cars: search, filter, sort, liked cars
   8.  Model Finder: external API (NHTSA vPIC)
   9.  Events: filter + RSVP
   10. Contact form
   11. FAQ accordion
   12. Init
   ========================================================================== */

/* 1. THEME ---------------------------------------------------------------
   The chosen theme is stored in localStorage, so it stays the same on
   every page. This part runs before the page is drawn. */
const THEME_KEY = "apex-theme";

(function applySavedTheme() {
  let theme = null;
  try {
    theme = localStorage.getItem(THEME_KEY);
  } catch (error) {
    theme = null;
  }
  if (theme !== "light" && theme !== "dark") {
    // first visit: follow the operating system setting
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();

/* 2. HELPERS ------------------------------------------------------------- */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/** Safe localStorage read that returns a fallback if data is missing or broken. */
function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Could not save to localStorage:", error);
  }
}

/** Escapes text before putting it inside innerHTML (protects against HTML injection). */
function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Small notification in the bottom-right corner (used instead of alert()). */
function showToast(message, icon = "fa-circle-check") {
  let stack = $(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span></span>`;
  toast.querySelector("span").textContent = message;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3200);
}

/* 3. HEADER -------------------------------------------------------------- */
function initThemeToggle() {
  const toggle = $(".theme-toggle");
  if (!toggle) return;

  const updateLabel = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  };

  updateLabel();
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      /* storage blocked: theme still changes for this page */
    }
    updateLabel();
  });
}

function initMobileMenu() {
  const burger = $(".burger");
  const nav = $(".nav");
  if (!burger || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.innerHTML = open
      ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
  };

  burger.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  // close the menu with Escape or after choosing a link
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  $$(".nav__link", nav).forEach((link) => link.addEventListener("click", () => setOpen(false)));
}

/** Shows "Log in" for guests and the user's first name when logged in. */
function updateAccountLink() {
  const link = $(".account-link");
  if (!link) return;
  const user = getCurrentUser();
  if (user) {
    link.href = "profile.html";
    link.innerHTML = '<i class="fa-solid fa-user" aria-hidden="true"></i><span></span>';
    link.querySelector("span").textContent = user.name.split(" ")[0];
    link.setAttribute("aria-label", "My profile");
  } else {
    link.href = "login.html";
    link.innerHTML = '<i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i><span>Log in</span>';
    link.setAttribute("aria-label", "Log in");
  }
}

function setFooterYear() {
  $$(".js-year").forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* 4. SCROLL REVEAL + COUNTERS ------------------------------------------ */
function initReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  items.forEach((el) => observer.observe(el));
}

/** Numbers with data-count="120" count up from 0 when they appear on screen. */
function initCounters() {
  const counters = $$("[data-count]");
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animate);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  });
  counters.forEach((el) => observer.observe(el));
}

/* 5. FORM VALIDATION ----------------------------------------------------
   All forms use novalidate, so the browser does not check anything.
   Each rule below returns an error message, or "" when the value is fine. */
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i,
  // letters (Latin, Cyrillic, Kazakh), spaces, hyphens and apostrophes
  name: /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі' -]+$/,
  phoneChars: /^[+\d\s()-]+$/,
  make: /^[A-Za-z0-9 -]+$/,
};

const rules = {
  required: (value) => (value.trim() === "" ? "This field is required." : ""),

  name: (value) => {
    const v = value.trim();
    if (v.length < 2) return "Name must be at least 2 characters.";
    if (v.length > 50) return "Name must be 50 characters or fewer.";
    if (!PATTERNS.name.test(v)) return "Use letters only (spaces and hyphens are fine).";
    return "";
  },

  email: (value) =>
    PATTERNS.email.test(value.trim()) ? "" : "Enter a valid email, for example name@mail.com.",

  /* Kazakhstan format: +7 7XX XXX XX XX or 8 7XX XXX XX XX (spaces, dashes, brackets allowed) */
  phone: (value) => {
    const v = value.trim();
    const digits = v.replace(/\D/g, "");
    const okChars = PATTERNS.phoneChars.test(v);
    const okLength = digits.length === 11 && (digits[0] === "7" || digits[0] === "8");
    const plusOnlyFirst = v.indexOf("+") <= 0 && v.split("+").length <= 2;
    return okChars && okLength && plusOnlyFirst
      ? ""
      : "Enter a valid phone number, for example +7 701 234 56 78.";
  },

  password: (value) => {
    const missing = passwordChecks(value).filter((check) => !check.ok);
    return missing.length ? "Password needs: " + missing.map((c) => c.label).join(", ") + "." : "";
  },

  minLength: (min) => (value) =>
    value.trim().length < min ? `Please write at least ${min} characters (now ${value.trim().length}).` : "",

  matches: (otherFieldName, label) => (value, form) =>
    value === form.elements[otherFieldName].value ? "" : `${label} do not match.`,

  checked: (message) => (value, form, input) => (input.checked ? "" : message),

  make: (value) =>
    PATTERNS.make.test(value.trim()) && value.trim().length >= 2
      ? ""
      : "Enter a car brand, for example BMW or Toyota (letters and numbers only).",
};

/** Password complexity: used both for validation and the live checklist. */
function passwordChecks(value) {
  return [
    { id: "length", label: "8+ characters", ok: value.length >= 8 },
    { id: "upper", label: "an uppercase letter", ok: /[A-Z]/.test(value) },
    { id: "lower", label: "a lowercase letter", ok: /[a-z]/.test(value) },
    { id: "number", label: "a number", ok: /\d/.test(value) },
  ];
}

/** Rules for every form on the site, by form id → field name → list of rules. */
const FORM_RULES = {
  "signup-form": {
    name: [rules.required, rules.name],
    email: [rules.required, rules.email],
    phone: [rules.required, rules.phone],
    password: [rules.required, rules.password],
    confirm: [rules.required, rules.matches("password", "Passwords")],
    terms: [rules.checked("Please accept the club rules to continue.")],
  },
  "login-form": {
    email: [rules.required, rules.email],
    password: [rules.required],
  },
  "contact-form": {
    name: [rules.required, rules.name],
    email: [rules.required, rules.email],
    phone: [rules.required, rules.phone],
    topic: [rules.required],
    message: [rules.required, rules.minLength(20)],
  },
  "finder-form": {
    make: [rules.required, rules.make],
  },
};

function setFieldError(input, message) {
  const field = input.closest(".field");
  if (!field) return;
  const errorBox = $(".field__error", field);
  field.classList.toggle("is-invalid", Boolean(message));
  field.classList.toggle("is-valid", !message && input.type !== "checkbox");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (errorBox) {
    errorBox.innerHTML = message
      ? `<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>${escapeHTML(message)}</span>`
      : "";
  }
}

/** Runs the rules for one field and shows the first error. Returns true if valid. */
function validateField(form, name) {
  const input = form.elements[name];
  const fieldRules = FORM_RULES[form.id][name];
  const value = input.type === "checkbox" ? "" : input.value;
  let message = "";
  for (const rule of fieldRules) {
    message = rule(value, form, input);
    if (message) break;
  }
  setFieldError(input, message);
  return !message;
}

/** Validates the whole form; focuses the first wrong field. */
function validateForm(form) {
  const names = Object.keys(FORM_RULES[form.id]);
  const results = names.map((name) => validateField(form, name));
  const firstInvalid = names.find((name, i) => !results[i]);
  if (firstInvalid) form.elements[firstInvalid].focus();
  return !firstInvalid;
}

/** Live feedback: check a field when the user leaves it, then on every change. */
function attachLiveValidation(form) {
  Object.keys(FORM_RULES[form.id]).forEach((name) => {
    const input = form.elements[name];
    const check = () => validateField(form, name);
    input.addEventListener("blur", () => {
      if (input.value.trim() !== "" || input.type === "checkbox") check();
    });
    input.addEventListener(input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input", () => {
      if (input.closest(".field").classList.contains("is-invalid")) check();
    });
  });
}

function showFormAlert(form, type, message) {
  const alertBox = $(".form-alert", form);
  if (!alertBox) return;
  const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";
  alertBox.className = `form-alert form-alert--${type} is-visible`;
  alertBox.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span>${escapeHTML(message)}</span>`;
}

function hideFormAlert(form) {
  const alertBox = $(".form-alert", form);
  if (alertBox) alertBox.className = "form-alert";
}

/** Eye button that shows / hides a password field. */
function initPasswordToggles() {
  $$(".toggle-pass").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.innerHTML = `<i class="fa-solid ${show ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
}

/** Strength bar + checklist under the sign-up password field. */
function initPasswordMeter(input) {
  const meter = $(".strength");
  const list = $(".rules");
  if (!meter || !list) return;
  input.addEventListener("input", () => {
    const checks = passwordChecks(input.value);
    const passed = checks.filter((c) => c.ok).length;
    meter.dataset.level = input.value ? String(passed) : "0";
    checks.forEach((check) => {
      const item = $(`[data-rule="${check.id}"]`, list);
      if (item) item.classList.toggle("is-ok", check.ok);
    });
  });
}

/** Simulates a short network delay and shows a spinner on the button. */
function withLoadingButton(button, text, callback) {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner" aria-hidden="true"></span>${text}`;
  setTimeout(() => {
    button.disabled = false;
    button.innerHTML = original;
    callback();
  }, 700);
}

/* 6. AUTHENTICATION SIMULATION -----------------------------------------
   There is no server, so users are stored in localStorage:
   - "apex-users"   → array of registered users
   - "apex-session" → email of the user who is logged in now
   NOTE: storing passwords in the browser is only acceptable for this
   student demo; a real site must use a server and hashed passwords. */
const USERS_KEY = "apex-users";
const SESSION_KEY = "apex-session";

const getUsers = () => readStorage(USERS_KEY, []);
const saveUsers = (users) => writeStorage(USERS_KEY, users);

function findUser(email) {
  return getUsers().find((user) => user.email === email.trim().toLowerCase());
}

function getCurrentUser() {
  const email = readStorage(SESSION_KEY, null);
  return email ? findUser(email) || null : null;
}

/** Saves changes to the logged-in user (used for saved cars and events). */
function updateCurrentUser(changes) {
  const current = getCurrentUser();
  if (!current) return null;
  const users = getUsers().map((user) => (user.email === current.email ? { ...user, ...changes } : user));
  saveUsers(users);
  return getCurrentUser();
}

function logOut() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

function initSignup() {
  const form = $("#signup-form");
  if (!form) return;

  if (getCurrentUser()) {
    showFormAlert(form, "success", "You are already logged in. Open your profile from the top menu.");
  }

  attachLiveValidation(form);
  initPasswordMeter(form.elements.password);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    hideFormAlert(form);
    if (!validateForm(form)) {
      showFormAlert(form, "error", "Please fix the highlighted fields.");
      return;
    }

    const email = form.elements.email.value.trim().toLowerCase();
    if (findUser(email)) {
      setFieldError(form.elements.email, "An account with this email already exists. Try logging in.");
      form.elements.email.focus();
      return;
    }

    const newUser = {
      name: form.elements.name.value.trim().replace(/\s+/g, " "),
      email,
      phone: form.elements.phone.value.trim(),
      password: form.elements.password.value,
      joined: new Date().toISOString(),
      savedCars: [],
      events: [],
      wishlist: [],
    };

    withLoadingButton($("button[type=submit]", form), "Creating account…", () => {
      saveUsers([...getUsers(), newUser]);
      writeStorage(SESSION_KEY, email);
      window.location.href = "profile.html";
    });
  });
}

function initLogin() {
  const form = $("#login-form");
  if (!form) return;

  // profile.html sends guests here with ?from=profile
  if (new URLSearchParams(window.location.search).get("from") === "profile") {
    showFormAlert(form, "error", "Please log in to see your profile.");
  }

  attachLiveValidation(form);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    hideFormAlert(form);
    if (!validateForm(form)) return;

    const user = findUser(form.elements.email.value);
    if (!user || user.password !== form.elements.password.value) {
      showFormAlert(form, "error", "Wrong email or password. Check them and try again.");
      // the message above the form explains the problem, so the field is only outlined in red
      form.elements.password.closest(".field").classList.add("is-invalid");
      form.elements.password.value = "";
      form.elements.password.focus();
      return;
    }

    withLoadingButton($("button[type=submit]", form), "Logging in…", () => {
      writeStorage(SESSION_KEY, user.email);
      window.location.href = "profile.html";
    });
  });
}

function initProfile() {
  const page = $("#profile-page");
  if (!page) return;

  const user = getCurrentUser();
  if (!user) {
    // not logged in → go to the login page
    window.location.replace("login.html?from=profile");
    return;
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  $("#profile-initials").textContent = initials;
  $("#profile-name").textContent = user.name;
  $("#profile-email").textContent = user.email;
  $("#detail-name").textContent = user.name;
  $("#detail-email").textContent = user.email;
  $("#detail-phone").textContent = user.phone;
  $("#detail-joined").textContent = new Date(user.joined).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  $("#logout-btn").addEventListener("click", logOut);
  renderProfileCars();
  renderProfileEvents();
  renderProfileSearches();
  renderProfileWishlist();
}

function renderProfileWishlist() {
  const box = $("#wishlist");
  const wishlist = getCurrentUser().wishlist || [];
  $("#wishlist-count").textContent = wishlist.length;
  if (!wishlist.length) {
    box.innerHTML = `<p class="muted no-margin">Open a model in the <a href="explore.html">Model Finder</a> and press “Add to wishlist”.</p>`;
    return;
  }
  box.innerHTML = wishlist
    .map(
      (item) => `
      <span class="chip chip--remove">
        <i class="fa-solid fa-star" aria-hidden="true"></i>${escapeHTML(item.make)} ${escapeHTML(item.name)}
        <button class="link-btn" type="button" data-unwish="${item.id}" aria-label="Remove ${escapeHTML(item.name)} from wishlist">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </span>`
    )
    .join("");
  $$("[data-unwish]", box).forEach((button) =>
    button.addEventListener("click", () => {
      const user = getCurrentUser();
      updateCurrentUser({ wishlist: (user.wishlist || []).filter((item) => String(item.id) !== button.dataset.unwish) });
      renderProfileWishlist();
      showToast("Removed from your wishlist", "fa-star-half-stroke");
    })
  );
}

function renderProfileCars() {
  const list = $("#saved-cars");
  const user = getCurrentUser();
  const cars = GARAGE.filter((car) => user.savedCars.includes(car.id));
  $("#saved-cars-count").textContent = cars.length;

  if (!cars.length) {
    list.innerHTML = `<li class="muted">No liked cars yet. Tap the <i class="fa-regular fa-heart"></i> on any car in <a href="cars.html">Member Cars</a>.</li>`;
    return;
  }
  list.innerHTML = cars
    .map(
      (car) => `
      <li class="mini-item">
        <img src="${car.image}" alt="${escapeHTML(car.alt)}">
        <div class="mini-item__text">
          <strong>${escapeHTML(car.title)}</strong>
          <span>Owner: ${escapeHTML(car.owner)} · ${escapeHTML(car.categoryLabel)}</span>
        </div>
        <button class="fav-btn is-saved" type="button" data-remove-car="${car.id}" aria-label="Remove ${escapeHTML(car.title)} from liked cars">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </li>`
    )
    .join("");

  $$("[data-remove-car]", list).forEach((button) =>
    button.addEventListener("click", () => {
      const current = getCurrentUser();
      updateCurrentUser({ savedCars: current.savedCars.filter((id) => id !== button.dataset.removeCar) });
      renderProfileCars();
      showToast("Car removed from your liked list", "fa-trash-can");
    })
  );
}

function renderProfileEvents() {
  const list = $("#my-events");
  const user = getCurrentUser();
  const events = EVENTS.filter((ev) => user.events.includes(ev.id));
  $("#my-events-count").textContent = events.length;

  if (!events.length) {
    list.innerHTML = `<li class="muted">You have not joined any meets yet. See what's coming on the <a href="events.html">Events</a> page.</li>`;
    return;
  }
  list.innerHTML = events
    .map((ev) => {
      const date = new Date(ev.date + "T00:00:00");
      return `
      <li class="mini-item">
        <div class="event__date event__date--sm">
          <span class="event__day">${date.getDate()}</span>
          <span class="event__month">${date.toLocaleString("en", { month: "short" })}</span>
        </div>
        <div class="mini-item__text">
          <strong>${escapeHTML(ev.title)}</strong>
          <span><i class="fa-solid fa-location-dot"></i> ${escapeHTML(ev.place)} · ${escapeHTML(ev.time)}</span>
        </div>
      </li>`;
    })
    .join("");
}

function renderProfileSearches() {
  const box = $("#recent-searches");
  const recent = readStorage(RECENT_KEY, []);
  if (!recent.length) {
    box.innerHTML = `<p class="muted">No searches yet. Try the <a href="explore.html">Model Finder</a>.</p>`;
    return;
  }
  box.innerHTML = recent
    .map((make) => `<a class="chip" href="explore.html?make=${encodeURIComponent(make)}">${escapeHTML(make)}</a>`)
    .join("");
}

/* 7. MEMBER CARS: SEARCH, FILTER, SORT ------------------------------------- */
const GARAGE = [
  {
    id: "impala",
    title: "1969 Chevrolet Impala",
    year: 1969,
    owner: "Arman K.",
    memberSince: 2022,
    category: "classic",
    categoryLabel: "Classic",
    image: "images/chevrolet-front.jpg",
    focus: "center 60%", // which part of the photo stays visible in the card
    alt: "Front of a cream 1969 Chevrolet Impala with quad headlights and a chrome grille",
    text: "Bought as a rusty project and restored over three winters. Arman kept the original chrome grille.",
  },
  {
    id: "mustang",
    title: "1966 Ford Mustang",
    year: 1966,
    owner: "Dana S.",
    memberSince: 2023,
    category: "classic",
    categoryLabel: "Classic",
    image: "images/mustang-road.jpg",
    focus: "center 70%", // which part of the photo stays visible in the card
    alt: "Dark blue first-generation Ford Mustang driving on a road between green hills",
    text: "Dana's summer car. Rarely misses a club drive and always leads the convoy out of the city.",
  },
  {
    id: "lada-2106",
    title: "1984 Lada 2106",
    year: 1984,
    owner: "Madina Zh.",
    memberSince: 2025,
    category: "classic",
    categoryLabel: "Classic",
    image: "images/lada-2106.jpg",
    focus: "center 70%", // which part of the photo stays visible in the card
    alt: "Red Lada 2106 sedan parked in front of a rocky cliff",
    text: "Inherited from her grandfather and kept completely original — even the radio still works.",
  },
  {
    id: "golf-gti",
    title: "1989 Volkswagen Golf GTI",
    year: 1989,
    owner: "Alikhan R.",
    memberSince: 2024,
    category: "classic",
    categoryLabel: "Classic",
    image: "images/vw-golf-gti.jpg",
    focus: "center 55%", // which part of the photo stays visible in the card
    alt: "Red second-generation Volkswagen Golf GTI parked in an old industrial area",
    text: "A light, simple hot hatch from the eighties. Alikhan drives it to every Cars & Coffee meet.",
  },
  {
    id: "bmw-sedan",
    title: "2016 BMW 3 Series",
    year: 2016,
    owner: "Yerlan T.",
    memberSince: 2022,
    category: "modern",
    categoryLabel: "Modern",
    image: "images/car-2.jpg",
    focus: "center 55%", // which part of the photo stays visible in the card
    alt: "Black BMW sedan photographed from the rear at night with the city skyline behind",
    text: "Daily driver by week, star of our night photo walks by weekend. Lowered on factory wheels.",
  },
  {
    id: "bmw-coupe",
    title: "2017 BMW 4 Series Coupe",
    year: 2017,
    owner: "Aigerim B.",
    memberSince: 2024,
    category: "modern",
    categoryLabel: "Modern",
    image: "images/car-3.jpg",
    focus: "center 85%", // which part of the photo stays visible in the card
    alt: "Red BMW coupe with glowing headlights under palm trees at sunset",
    text: "Aigerim's first car and the reason she joined the club. Famous for her golden-hour photos.",
  },
  {
    id: "camry",
    title: "2019 Toyota Camry",
    year: 2019,
    owner: "Nurlan A.",
    memberSince: 2023,
    category: "modern",
    categoryLabel: "Modern",
    image: "images/toyota-camry.jpg",
    focus: "center 60%", // which part of the photo stays visible in the card
    alt: "Grey Toyota Camry sedan with black wheels in an empty parking lot",
    text: "The most popular car in Kazakhstan — Nurlan proves a family sedan can still look sharp.",
  },
  {
    id: "land-cruiser",
    title: "2018 Toyota Land Cruiser 200",
    year: 2018,
    owner: "Bauyrzhan M.",
    memberSince: 2022,
    category: "modern",
    categoryLabel: "Modern",
    image: "images/land-cruiser.jpg",
    focus: "center 60%", // which part of the photo stays visible in the card
    alt: "Dark grey Toyota Land Cruiser 200 SUV parked in front of a modern building",
    text: "Our winter rescue car: it has pulled more members out of the snow than anyone can count.",
  },
  {
    id: "amg-gt",
    title: "2020 Mercedes-AMG GT",
    year: 2020,
    owner: "Timur N.",
    memberSince: 2023,
    category: "sport",
    categoryLabel: "Sport",
    image: "images/amg-gt.jpg",
    focus: "center 65%", // which part of the photo stays visible in the card
    alt: "Matte black Mercedes-AMG GT sports car parked by a harbour",
    text: "Matte black paint and a V8 you can hear from the next street. A regular at our track days.",
  },
  {
    id: "porsche-911",
    title: "2018 Porsche 911 GT3",
    year: 2018,
    owner: "Sanzhar O.",
    memberSince: 2024,
    category: "sport",
    categoryLabel: "Sport",
    image: "images/porsche-911.jpg",
    focus: "center 75%", // which part of the photo stays visible in the card
    alt: "White Porsche 911 GT3 with a rear wing parked in front of snowy mountains",
    text: "Proof that a sports car can survive a Kazakh winter. Sanzhar drives it all year round.",
  },
  {
    id: "subaru-wrx",
    title: "2004 Subaru Impreza WRX STI",
    year: 2004,
    owner: "Aruzhan K.",
    memberSince: 2025,
    category: "sport",
    categoryLabel: "Sport",
    image: "images/subaru-wrx.jpg",
    focus: "center 65%", // which part of the photo stays visible in the card
    alt: "Blue Subaru Impreza WRX STI with gold wheels in an autumn forest",
    text: "Classic rally blue with gold wheels. Aruzhan won our first ice driving day in this car.",
  },
  {
    id: "skyline",
    title: "1997 Nissan Skyline GT-R",
    year: 1997,
    owner: "Daniyar S.",
    memberSince: 2023,
    category: "sport",
    categoryLabel: "Sport",
    image: "images/nissan-skyline.jpg",
    focus: "center 60%", // which part of the photo stays visible in the card
    alt: "Purple Nissan Skyline GT-R R33 with bronze wheels parked on asphalt",
    text: "Imported from Japan and still right-hand drive. The rarest car in our club.",
  },
];

const GARAGE_FILTER_KEY = "apex-garage-filters";

function initGarage() {
  const grid = $("#garage-grid");
  if (!grid) return;

  const searchInput = $("#garage-search");
  const sortSelect = $("#garage-sort");
  const chips = $$(".chip[data-category]");
  const savedOnly = $("#saved-only");
  const countEl = $("#garage-count");

  // restore the last used filters from localStorage
  const state = {
    query: "",
    category: "all",
    sort: "newest",
    savedOnly: false,
    ...readStorage(GARAGE_FILTER_KEY, {}),
  };
  // ignore saved values that no longer exist (e.g. after the categories changed)
  if (!chips.some((chip) => chip.dataset.category === state.category)) state.category = "all";
  if (![...sortSelect.options].some((option) => option.value === state.sort)) state.sort = "newest";
  searchInput.value = state.query;
  sortSelect.value = state.sort;
  savedOnly.checked = state.savedOnly;

  const render = () => {
    writeStorage(GARAGE_FILTER_KEY, state);
    chips.forEach((chip) => {
      const active = chip.dataset.category === state.category;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });

    const user = getCurrentUser();
    const saved = user ? user.savedCars : [];
    const query = state.query.trim().toLowerCase();

    let cars = GARAGE.filter((car) => {
      const text = `${car.title} ${car.owner} ${car.categoryLabel} ${car.text}`.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesCategory = state.category === "all" || car.category === state.category;
      const matchesSaved = !state.savedOnly || saved.includes(car.id);
      return matchesQuery && matchesCategory && matchesSaved;
    });

    const sorters = {
      newest: (a, b) => b.year - a.year,
      oldest: (a, b) => a.year - b.year,
      az: (a, b) => a.title.localeCompare(b.title),
    };
    cars.sort(sorters[state.sort] || sorters.newest);

    countEl.innerHTML = `Showing <strong>${cars.length}</strong> of ${GARAGE.length} cars`;

    if (!cars.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-car-burst" aria-hidden="true"></i>
          <h3>No cars match your search</h3>
          <p>${state.savedOnly && !saved.length ? "You have no saved cars yet." : "Try another word or category."}</p>
          <button class="btn btn--ghost btn--sm" type="button" data-reset>Reset filters</button>
        </div>`;
      $("[data-reset]", grid).addEventListener("click", resetFilters);
      return;
    }

    grid.innerHTML = cars
      .map((car) => {
        const isSaved = saved.includes(car.id);
        const initials = car.owner.split(" ").map((part) => part[0]).join("");
        return `
        <article class="card">
          <div class="card__media">
            <img src="${car.image}" alt="${escapeHTML(car.alt)}" style="object-position:${car.focus}" loading="lazy">
            <span class="tag">${escapeHTML(car.categoryLabel)}</span>
          </div>
          <div class="card__body">
            <h3>${escapeHTML(car.title)}</h3>
            <p>${escapeHTML(car.text)}</p>
            <div class="card__footer">
              <div class="owner">
                <span class="owner__avatar" aria-hidden="true">${escapeHTML(initials)}</span>
                <div><strong>${escapeHTML(car.owner)}</strong><span>Member since ${car.memberSince}</span></div>
              </div>
              <button class="fav-btn ${isSaved ? "is-saved" : ""}" type="button" data-save="${car.id}"
                aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove from" : "Add to"} liked cars">
                <i class="fa-${isSaved ? "solid" : "regular"} fa-heart" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </article>`;
      })
      .join("");

    $$("[data-save]", grid).forEach((button) => button.addEventListener("click", () => toggleSaved(button.dataset.save)));
  };

  const toggleSaved = (carId) => {
    const user = getCurrentUser();
    if (!user) {
      showToast("Log in to like member cars", "fa-lock");
      return;
    }
    const isSaved = user.savedCars.includes(carId);
    const savedCars = isSaved ? user.savedCars.filter((id) => id !== carId) : [...user.savedCars, carId];
    updateCurrentUser({ savedCars });
    showToast(isSaved ? "Removed from liked cars" : "Liked! Saved to your profile", isSaved ? "fa-heart-crack" : "fa-heart");
    render();
  };

  const resetFilters = () => {
    Object.assign(state, { query: "", category: "all", sort: "newest", savedOnly: false });
    searchInput.value = "";
    sortSelect.value = "newest";
    savedOnly.checked = false;
    render();
  };

  // results update while typing
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    render();
  });
  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    render();
  });
  savedOnly.addEventListener("change", () => {
    state.savedOnly = savedOnly.checked;
    render();
  });
  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      state.category = chip.dataset.category;
      render();
    })
  );
  $("#garage-reset").addEventListener("click", resetFilters);

  render();
}

/* 8. MODEL FINDER — EXTERNAL API ---------------------------------------
   NHTSA vPIC is a free public API (no key needed) with every car model
   sold in the USA. Docs: https://vpic.nhtsa.dot.gov/api/ */
const API_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";
const RECENT_KEY = "apex-recent-makes";
const LAST_SEARCH_KEY = "apex-finder-last";

async function fetchModels(make, year) {
  const url = year
    ? `${API_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
    : `${API_BASE}/GetModelsForMake/${encodeURIComponent(make)}?format=json`;

  // stop waiting after 12 seconds so the user is not stuck on the spinner
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Server answered with status ${response.status}`);
    const data = await response.json();
    // the API can return the same model twice → keep unique names, sorted A–Z
    const unique = new Map();
    (data.Results || []).forEach((item) => {
      const name = item.Model_Name.trim();
      if (!unique.has(name)) unique.set(name, { name, id: item.Model_ID, make: item.Make_Name });
    });
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  } finally {
    clearTimeout(timer);
  }
}

function initFinder() {
  const form = $("#finder-form");
  if (!form) return;

  const output = $("#finder-output");
  const yearSelect = form.elements.year;
  let lastModels = [];
  let lastMake = "";
  let lastYear = "";
  const dialog = $("#model-dialog");
  let openedModel = null;

  // fill the year list (current year down to 1995)
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 1995; y--) {
    yearSelect.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
  }

  attachLiveValidation(form);

  const renderRecent = () => {
    const box = $("#recent-makes");
    const recent = readStorage(RECENT_KEY, []);
    if (!recent.length) {
      box.innerHTML = `<p class="muted no-margin">Your last searches will appear here.</p>`;
      return;
    }
    box.innerHTML = recent
      .map(
        (make) => `
        <span class="chip chip--remove">
          <button class="link-btn" type="button" data-recent="${escapeHTML(make)}">${escapeHTML(make)}</button>
          <button class="link-btn" type="button" data-forget="${escapeHTML(make)}" aria-label="Remove ${escapeHTML(make)} from history">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </span>`
      )
      .join("");
    $$("[data-recent]", box).forEach((b) => b.addEventListener("click", () => runSearch(b.dataset.recent, "")));
    $$("[data-forget]", box).forEach((b) =>
      b.addEventListener("click", () => {
        writeStorage(RECENT_KEY, readStorage(RECENT_KEY, []).filter((m) => m !== b.dataset.forget));
        renderRecent();
      })
    );
  };

  const remember = (make) => {
    const recent = readStorage(RECENT_KEY, []).filter((m) => m.toLowerCase() !== make.toLowerCase());
    writeStorage(RECENT_KEY, [make, ...recent].slice(0, 6));
    renderRecent();
  };

  const renderModels = (filterText = "") => {
    const list = $("#models-list");
    const counter = $("#models-count");
    const query = filterText.trim().toLowerCase();
    const shown = lastModels.filter((model) => model.name.toLowerCase().includes(query));
    counter.innerHTML = `<span>Showing <strong>${shown.length}</strong> of ${lastModels.length} models · click a model for details</span>`;
    list.innerHTML = shown.length
      ? shown
          .map(
            (model, i) =>
              `<button class="model-item" type="button" data-model="${i}" style="animation-delay:${Math.min(i, 30) * 15}ms">
                <i class="fa-solid fa-car-side" aria-hidden="true"></i><span>${escapeHTML(model.name)}</span>
                <i class="fa-solid fa-chevron-right model-item__arrow" aria-hidden="true"></i>
              </button>`
          )
          .join("")
      : `<div class="empty-state"><h3>No models contain “${escapeHTML(filterText)}”</h3></div>`;
    $$("[data-model]", list).forEach((button) =>
      button.addEventListener("click", () => openModel(shown[Number(button.dataset.model)]))
    );
  };

  /* ---- model details window (native <dialog>) ---- */
  const isInWishlist = (model) => {
    const user = getCurrentUser();
    return Boolean(user && (user.wishlist || []).some((item) => item.id === model.id));
  };

  const updateWishlistButton = () => {
    const button = $("#wishlist-btn");
    const saved = isInWishlist(openedModel);
    button.classList.toggle("is-going", saved);
    button.classList.toggle("rsvp-btn", true);
    button.innerHTML = saved
      ? '<i class="fa-solid fa-check" aria-hidden="true"></i> In your wishlist'
      : '<i class="fa-regular fa-star" aria-hidden="true"></i> Add to wishlist';
  };

  const openModel = (model) => {
    openedModel = model;
    const fullName = `${lastMake} ${model.name}`;
    $("#model-dialog-make").textContent = model.make;
    $("#model-dialog-title").textContent = model.name;
    $("#model-dialog-brand").textContent = model.make;
    $("#model-dialog-id").textContent = model.id;
    $("#model-dialog-year").textContent = lastYear || "All years";
    $("#photos-link").href = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(fullName + (lastYear ? " " + lastYear : ""));
    $("#wiki-link").href = "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(fullName);
    updateWishlistButton();
    dialog.showModal();
  };

  $("#wishlist-btn").addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) {
      showToast("Log in to build your model wishlist", "fa-lock");
      return;
    }
    const wishlist = user.wishlist || [];
    const saved = wishlist.some((item) => item.id === openedModel.id);
    updateCurrentUser({
      wishlist: saved
        ? wishlist.filter((item) => item.id !== openedModel.id)
        : [...wishlist, { id: openedModel.id, make: openedModel.make, name: openedModel.name }],
    });
    showToast(saved ? "Removed from your wishlist" : `${openedModel.name} added to your wishlist`, saved ? "fa-star-half-stroke" : "fa-star");
    updateWishlistButton();
  });

  // close with the × button or by clicking the dark area around the window (Esc works by default)
  $$("[data-close]", dialog).forEach((b) => b.addEventListener("click", () => dialog.close()));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  const runSearch = async (make, year) => {
    make = make.trim();
    form.elements.make.value = make;
    yearSelect.value = year || "";
    setFieldError(form.elements.make, "");
    writeStorage(LAST_SEARCH_KEY, { make, year: year || "" });

    // 1) loading state
    output.innerHTML = `
      <div class="status" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <span>Loading ${escapeHTML(make)} models${year ? " for " + year : ""}…</span>
      </div>`;

    try {
      const models = await fetchModels(make, year);
      lastModels = models;
      lastMake = make;
      lastYear = year || "";

      // 2) empty result
      if (!models.length) {
        output.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <h3>No models found for “${escapeHTML(make)}”${year ? " in " + year : ""}</h3>
            <p>Check the spelling or try another year. Examples: Toyota, Audi, Porsche.</p>
          </div>`;
        return;
      }

      remember(make);

      // 3) results + a filter that works on the loaded list
      output.innerHTML = `
        <div class="panel">
          <div class="panel__head">
            <h2>${escapeHTML(make.toUpperCase())}${year ? " · " + year : ""}</h2>
            <span class="count-badge">${models.length}</span>
          </div>
          <div class="search-box search-box--spaced">
            <i class="fa-solid fa-filter" aria-hidden="true"></i>
            <label for="models-filter" class="visually-hidden">Filter models</label>
            <input id="models-filter" type="search" placeholder="Filter these models, e.g. X5 or Mustang" autocomplete="off">
          </div>
          <div class="results-bar" id="models-count"></div>
          <div class="models-grid" id="models-list"></div>
        </div>`;
      renderModels();
      $("#models-filter").addEventListener("input", (e) => renderModels(e.target.value));
    } catch (error) {
      // 4) error state with a retry button
      const reason = error.name === "AbortError" ? "The server took too long to answer." : "Could not reach the car database.";
      output.innerHTML = `
        <div class="status status--error" role="alert">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <p><strong>${reason}</strong> Check your internet connection and try again.</p>
          <button class="btn btn--primary btn--sm" type="button" id="retry-btn"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Retry</button>
        </div>`;
      $("#retry-btn").addEventListener("click", () => runSearch(make, year));
      console.error("API error:", error);
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    runSearch(form.elements.make.value, yearSelect.value);
  });

  $$("[data-make]").forEach((chip) => chip.addEventListener("click", () => runSearch(chip.dataset.make, "")));

  renderRecent();

  // start: ?make= from a link, otherwise restore the last search
  const fromUrl = new URLSearchParams(window.location.search).get("make");
  const last = readStorage(LAST_SEARCH_KEY, null);
  if (fromUrl) runSearch(fromUrl, "");
  else if (last && last.make) runSearch(last.make, last.year);
}

/* 9. EVENTS ------------------------------------------------------------- */
const EVENTS = [
  {
    id: "winter-coffee",
    title: "Winter Cars & Coffee",
    date: "2026-12-05",
    time: "11:00–14:00",
    place: "Expo district parking, Astana",
    type: "meet",
    typeLabel: "Meet",
    going: 34,
    text: "Our monthly morning meet. Bring your car, grab a hot drink and talk builds with other members.",
  },
  {
    id: "night-photo",
    title: "Night Photo Walk",
    date: "2026-12-19",
    time: "19:00–22:00",
    place: "Left bank embankment, Astana",
    type: "photo",
    typeLabel: "Photo",
    going: 18,
    text: "Learn light trails and long-exposure shots with city lights. Tripods recommended; phones welcome.",
  },
  {
    id: "detailing",
    title: "Detailing Basics Workshop",
    date: "2027-01-16",
    time: "12:00–15:00",
    place: "Partner garage, Astana",
    type: "workshop",
    typeLabel: "Workshop",
    going: 22,
    text: "Hands-on session: safe washing, clay bar, polishing and how to protect paint in a Kazakh winter.",
  },
  {
    id: "ice-day",
    title: "Ice Driving Day",
    date: "2027-02-13",
    time: "10:00–16:00",
    place: "Closed winter track, Astana region",
    type: "drive",
    typeLabel: "Drive",
    going: 27,
    text: "Car control on ice with instructors. Learn how to catch a slide safely before it happens on the road.",
  },
  {
    id: "spring-opener",
    title: "Spring Season Opener",
    date: "2027-04-10",
    time: "12:00–17:00",
    place: "City centre, Astana",
    type: "meet",
    typeLabel: "Meet",
    going: 61,
    text: "The biggest meet of the year: a short convoy through the city followed by a show-and-shine.",
  },
];

function initEvents() {
  const list = $("#events-list");
  if (!list) return;
  const chips = $$(".chip[data-type]");
  let activeType = "all";

  const render = () => {
    const user = getCurrentUser();
    const myEvents = user ? user.events : [];
    chips.forEach((chip) => {
      const active = chip.dataset.type === activeType;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });

    const shown = EVENTS.filter((ev) => activeType === "all" || ev.type === activeType);
    list.innerHTML = shown
      .map((ev) => {
        const date = new Date(ev.date + "T00:00:00");
        const isGoing = myEvents.includes(ev.id);
        const count = ev.going + (isGoing ? 1 : 0);
        return `
        <article class="event reveal is-visible">
          <div class="event__date" aria-hidden="true">
            <span class="event__day">${date.getDate()}</span>
            <span class="event__month">${date.toLocaleString("en", { month: "short" })}</span>
          </div>
          <div>
            <span class="tag">${escapeHTML(ev.typeLabel)}</span>
            <h3 class="event__title">${escapeHTML(ev.title)}</h3>
            <div class="event__meta">
              <span><i class="fa-regular fa-calendar" aria-hidden="true"></i>${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</span>
              <span><i class="fa-regular fa-clock" aria-hidden="true"></i>${escapeHTML(ev.time)}</span>
              <span><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${escapeHTML(ev.place)}</span>
            </div>
            <p>${escapeHTML(ev.text)}</p>
          </div>
          <div class="event__actions">
            <button class="btn btn--sm rsvp-btn ${isGoing ? "btn--primary is-going" : "btn--primary"}" type="button" data-rsvp="${ev.id}" aria-pressed="${isGoing}">
              <i class="fa-solid ${isGoing ? "fa-check" : "fa-plus"}" aria-hidden="true"></i>${isGoing ? "I'm going" : "Join event"}
            </button>
            <span class="event__count"><i class="fa-solid fa-users" aria-hidden="true"></i> ${count} going</span>
          </div>
        </article>`;
      })
      .join("");

    $$("[data-rsvp]", list).forEach((button) => button.addEventListener("click", () => toggleRsvp(button.dataset.rsvp)));
  };

  const toggleRsvp = (eventId) => {
    const user = getCurrentUser();
    if (!user) {
      showToast("Log in to join club events", "fa-lock");
      return;
    }
    const isGoing = user.events.includes(eventId);
    updateCurrentUser({ events: isGoing ? user.events.filter((id) => id !== eventId) : [...user.events, eventId] });
    showToast(isGoing ? "You left the event" : "See you there! Added to your profile", isGoing ? "fa-calendar-xmark" : "fa-calendar-check");
    render();
  };

  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      activeType = chip.dataset.type;
      render();
    })
  );
  render();
}

/* 10. CONTACT FORM ------------------------------------------------------ */

/** Buttons with data-copy="text" copy that text to the clipboard. */
function initCopyButtons() {
  $$("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        showToast(`${text} copied to clipboard`, "fa-copy");
      } catch (error) {
        // clipboard can be blocked (e.g. on file:// pages) → show the text instead
        showToast(`Telegram: ${text}`, "fa-paper-plane");
      }
    });
  });
}

function initContact() {
  const form = $("#contact-form");
  if (!form) return;

  // logged-in users get their details filled in automatically
  const user = getCurrentUser();
  if (user) {
    form.elements.name.value = user.name;
    form.elements.email.value = user.email;
    form.elements.phone.value = user.phone;
  }

  attachLiveValidation(form);

  const counter = $("#message-counter");
  form.elements.message.addEventListener("input", () => {
    counter.textContent = `${form.elements.message.value.trim().length} characters (minimum 20)`;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    hideFormAlert(form);
    if (!validateForm(form)) {
      showFormAlert(form, "error", "Please fix the highlighted fields.");
      return;
    }

    withLoadingButton($("button[type=submit]", form), "Sending…", () => {
      // no backend: keep the message in localStorage as a demo
      const messages = readStorage("apex-messages", []);
      messages.push({
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        topic: form.elements.topic.value,
        message: form.elements.message.value.trim(),
        sent: new Date().toISOString(),
      });
      writeStorage("apex-messages", messages);

      const firstName = form.elements.name.value.trim().split(" ")[0];
      form.reset();
      $$(".field", form).forEach((field) => field.classList.remove("is-valid", "is-invalid"));
      counter.textContent = "0 characters (minimum 20)";
      showFormAlert(form, "success", `Thanks, ${firstName}! Your message was sent. We usually reply within one day.`);
    });
  });
}

/* 11. FAQ ACCORDION ----------------------------------------------------- */
function initFaq() {
  $$(".faq__item").forEach((item) => {
    const button = $(".faq__question", item);
    const answer = $(".faq__answer", item);
    button.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      item.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
      // animate height from 0 to the real content height
      answer.style.maxHeight = open ? answer.scrollHeight + "px" : "0";
    });
  });
}

/* 12. INIT -------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initMobileMenu();
  updateAccountLink();
  setFooterYear();
  initPasswordToggles();

  initSignup();
  initLogin();
  initProfile();
  initGarage();
  initFinder();
  initEvents();
  initContact();
  initCopyButtons();
  initFaq();

  initReveal();
  initCounters();
});
