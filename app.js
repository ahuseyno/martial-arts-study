const LOCAL_STORAGE_KEY = "roll-notes-sessions";
const DEFAULT_ENERGY = "Tired but useful";

const config = window.ROLL_NOTES_SUPABASE || {};
const isSupabaseConfigured =
  typeof config.url === "string" &&
  config.url.startsWith("https://") &&
  typeof config.publishableKey === "string" &&
  config.publishableKey.length > 20;

const supabase = isSupabaseConfigured
  ? window.supabase.createClient(config.url, config.publishableKey)
  : null;

const setupBanner = document.getElementById("setup-banner");
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const authForm = document.getElementById("auth-form");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authSubmitButton = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");
const magicLinkButton = document.getElementById("magic-link-button");
const authTabs = Array.from(document.querySelectorAll(".auth-tab"));
const signOutButton = document.getElementById("sign-out-button");
const importLocalButton = document.getElementById("import-local-button");
const userEmail = document.getElementById("user-email");
const sessionForm = document.getElementById("session-form");
const sessionDateInput = document.getElementById("session-date");
const classFocusInput = document.getElementById("class-focus");
const coachNameInput = document.getElementById("coach-name");
const energyRatingInput = document.getElementById("energy-rating");
const techniquesInput = document.getElementById("techniques");
const winsInput = document.getElementById("wins");
const strugglesInput = document.getElementById("struggles");
const sparringNotesInput = document.getElementById("sparring-notes");
const takeawayInput = document.getElementById("takeaway");
const sessionMessage = document.getElementById("session-message");
const totalSessions = document.getElementById("total-sessions");
const topFocus = document.getElementById("top-focus");
const topStruggle = document.getElementById("top-struggle");
const latestTakeaway = document.getElementById("latest-takeaway");
const emptyState = document.getElementById("empty-state");
const sessionList = document.getElementById("session-list");
const sessionTemplate = document.getElementById("session-template");

let authMode = "signin";
let currentUser = null;
let sessions = [];

sessionDateInput.value = new Date().toISOString().split("T")[0];
energyRatingInput.value = DEFAULT_ENERGY;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
}

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authMode = tab.dataset.mode;
    syncAuthMode();
  });
});

authForm.addEventListener("submit", handleAuthSubmit);
magicLinkButton.addEventListener("click", handleMagicLink);
signOutButton.addEventListener("click", handleSignOut);
importLocalButton.addEventListener("click", handleLocalImport);
sessionForm.addEventListener("submit", handleSessionSubmit);

if (!isSupabaseConfigured) {
  setupBanner.hidden = false;
  setMessage(
    authMessage,
    "Add your Supabase project URL and publishable key in supabase-config.js to enable sign-in.",
    "error"
  );
} else {
  initAuth();
}

syncAuthMode();
renderApp([]);

async function initAuth() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    setMessage(authMessage, error.message, "error");
    return;
  }

  await applySession(data.session);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await applySession(session);
  });
}

async function applySession(session) {
  currentUser = session?.user ?? null;
  const isLoggedIn = Boolean(currentUser);

  authView.hidden = isLoggedIn;
  appView.hidden = !isLoggedIn;

  if (!isLoggedIn) {
    sessions = [];
    renderApp([]);
    return;
  }

  userEmail.textContent = currentUser.email || "Signed in";
  await loadSessions();
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!supabase) {
    return;
  }

  setLoading(authSubmitButton, true);
  clearMessage(authMessage);

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();

  try {
    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      setMessage(
        authMessage,
        "Account created. Check your email if confirmation is enabled, then sign in.",
        "success"
      );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setMessage(authMessage, "Signed in.", "success");
      authForm.reset();
    }
  } catch (error) {
    setMessage(authMessage, error.message, "error");
  } finally {
    setLoading(authSubmitButton, false);
  }
}

async function handleMagicLink() {
  if (!supabase) {
    return;
  }

  const email = authEmailInput.value.trim();

  if (!email) {
    setMessage(authMessage, "Enter your email first for a magic link.", "error");
    return;
  }

  setLoading(magicLinkButton, true);
  clearMessage(authMessage);

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }

    setMessage(authMessage, "Magic link sent. Check your inbox.", "success");
  } catch (error) {
    setMessage(authMessage, error.message, "error");
  } finally {
    setLoading(magicLinkButton, false);
  }
}

async function handleSignOut() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    setMessage(sessionMessage, error.message, "error");
    return;
  }

  setMessage(authMessage, "Signed out.", "success");
}

async function loadSessions() {
  clearMessage(sessionMessage);

  const { data, error } = await supabase
    .from("session_logs")
    .select(
      "id, class_date, class_focus, coach_name, energy_rating, techniques, wins, struggles, sparring_notes, takeaway, created_at"
    )
    .order("class_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    setMessage(sessionMessage, error.message, "error");
    return;
  }

  sessions = data.map(mapSessionFromRow);
  renderApp(sessions);
}

async function handleSessionSubmit(event) {
  event.preventDefault();

  if (!supabase || !currentUser) {
    return;
  }

  setLoading(sessionForm.querySelector(".primary-button"), true);
  clearMessage(sessionMessage);

  const payload = {
    user_id: currentUser.id,
    class_date: sessionDateInput.value,
    class_focus: classFocusInput.value.trim(),
    coach_name: coachNameInput.value.trim() || null,
    energy_rating: energyRatingInput.value,
    techniques: getLines(techniquesInput.value),
    wins: winsInput.value.trim() || null,
    struggles: strugglesInput.value.trim() || null,
    sparring_notes: sparringNotesInput.value.trim(),
    takeaway: takeawayInput.value.trim(),
  };

  try {
    const { error } = await supabase.from("session_logs").insert(payload);

    if (error) {
      throw error;
    }

    sessionForm.reset();
    sessionDateInput.value = new Date().toISOString().split("T")[0];
    energyRatingInput.value = DEFAULT_ENERGY;
    classFocusInput.focus();
    setMessage(sessionMessage, "Session saved.", "success");
    await loadSessions();
  } catch (error) {
    setMessage(sessionMessage, error.message, "error");
  } finally {
    setLoading(sessionForm.querySelector(".primary-button"), false);
  }
}

async function handleLocalImport() {
  if (!supabase || !currentUser) {
    return;
  }

  const localSessions = loadLocalSessions();

  if (!localSessions.length) {
    setMessage(sessionMessage, "No local-only notes found to import.", "error");
    return;
  }

  setLoading(importLocalButton, true);
  clearMessage(sessionMessage);

  const rows = localSessions.map((session) => ({
    user_id: currentUser.id,
    class_date: session.date,
    class_focus: session.classFocus,
    coach_name: session.coachName || null,
    energy_rating: session.energyRating || DEFAULT_ENERGY,
    techniques: session.techniques || [],
    wins: session.wins || null,
    struggles: session.struggles || null,
    sparring_notes: session.sparringNotes,
    takeaway: session.takeaway,
    created_at: session.createdAt
      ? new Date(session.createdAt).toISOString()
      : new Date().toISOString(),
  }));

  try {
    const { error } = await supabase.from("session_logs").insert(rows);

    if (error) {
      throw error;
    }

    setMessage(
      sessionMessage,
      `Imported ${rows.length} local entr${rows.length === 1 ? "y" : "ies"}.`,
      "success"
    );
    await loadSessions();
  } catch (error) {
    setMessage(sessionMessage, error.message, "error");
  } finally {
    setLoading(importLocalButton, false);
  }
}

function renderApp(nextSessions) {
  renderSummary(nextSessions);
  renderSessions(nextSessions);
}

function renderSummary(entries) {
  totalSessions.textContent = String(entries.length);
  topFocus.textContent = entries.length
    ? mostFrequent(
        entries.map((entry) => entry.classFocus),
        "No focus logged yet"
      )
    : "None yet";

  const strugglePhrases = entries.flatMap((entry) => getSentences(entry.struggles));

  topStruggle.textContent = strugglePhrases.length
    ? mostFrequent(strugglePhrases, "No recurring struggle yet")
    : "Log a few sessions first";

  latestTakeaway.textContent = entries.length
    ? entries[0].takeaway
    : "Your latest takeaway will show up here.";
}

function renderSessions(entries) {
  emptyState.hidden = entries.length > 0;
  sessionList.innerHTML = "";

  entries.forEach((session) => {
    const node = sessionTemplate.content.cloneNode(true);
    node.querySelector(".session-date").textContent = formatDate(session.date);
    node.querySelector(".session-focus").textContent = session.classFocus;
    node.querySelector(".session-energy").textContent = session.energyRating;
    node.querySelector(".session-meta").textContent = session.coachName
      ? `Coach / gym: ${session.coachName}`
      : "Coach / gym: Not logged";

    const techniquesList = node.querySelector(".session-techniques");
    session.techniques.forEach((technique) => {
      const item = document.createElement("li");
      item.textContent = technique;
      techniquesList.appendChild(item);
    });

    node.querySelector(".session-wins").textContent =
      session.wins || "No notes captured.";
    node.querySelector(".session-struggles").textContent =
      session.struggles || "No struggles captured.";
    node.querySelector(".session-sparring").textContent = session.sparringNotes;
    node.querySelector(".session-takeaway").textContent = session.takeaway;

    sessionList.appendChild(node);
  });
}

function syncAuthMode() {
  authTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.mode === authMode);
  });

  authSubmitButton.textContent = authMode === "signup" ? "Create account" : "Sign in";
  authPasswordInput.autocomplete =
    authMode === "signup" ? "new-password" : "current-password";
}

function setLoading(button, isLoading) {
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent;
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? "Working..." : button.dataset.defaultLabel;
}

function setMessage(element, message, tone) {
  element.textContent = message;
  element.classList.remove("is-success", "is-error");

  if (tone === "success") {
    element.classList.add("is-success");
  }

  if (tone === "error") {
    element.classList.add("is-error");
  }
}

function clearMessage(element) {
  setMessage(element, "", "");
}

function mapSessionFromRow(row) {
  return {
    id: row.id,
    date: row.class_date,
    classFocus: row.class_focus,
    coachName: row.coach_name || "",
    energyRating: row.energy_rating || DEFAULT_ENERGY,
    techniques: row.techniques || [],
    wins: row.wins || "",
    struggles: row.struggles || "",
    sparringNotes: row.sparring_notes,
    takeaway: row.takeaway,
    createdAt: row.created_at,
  };
}

function loadLocalSessions() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Could not read local sessions", error);
    return [];
  }
}

function getLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getSentences(value) {
  return (value || "")
    .split(/[.\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);
}

function mostFrequent(items, fallback) {
  if (!items.length) {
    return fallback;
  }

  const counts = new Map();

  items.forEach((item) => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });

  let topItem = fallback;
  let topCount = 0;

  counts.forEach((count, item) => {
    if (count > topCount) {
      topItem = item;
      topCount = count;
    }
  });

  return topItem;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
