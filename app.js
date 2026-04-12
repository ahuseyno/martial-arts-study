const LOCAL_STORAGE_KEY = "roll-notes-sessions";
const DEFAULT_ENERGY = "Tired but useful";

const page = document.body.dataset.page;
const config = window.ROLL_NOTES_SUPABASE || {};
const isSupabaseConfigured =
  typeof config.url === "string" &&
  config.url.startsWith("https://") &&
  typeof config.publishableKey === "string" &&
  config.publishableKey.length > 20;

const supabaseClient =
  isSupabaseConfigured && window.supabase?.createClient
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;

const setupBanner = document.getElementById("setup-banner");

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
const cancelEditButton = document.getElementById("cancel-edit-button");
const formHeading = document.getElementById("form-heading");

let authMode = "signin";
let currentUser = null;
let editingSessionId = null;

if (sessionDateInput) {
  sessionDateInput.value = new Date().toISOString().split("T")[0];
}

if (energyRatingInput) {
  energyRatingInput.value = DEFAULT_ENERGY;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
}

if (authTabs.length) {
  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      authMode = tab.dataset.mode;
      syncAuthMode();
    });
  });
}

if (authForm) {
  authForm.addEventListener("submit", handleAuthSubmit);
}

if (magicLinkButton) {
  magicLinkButton.addEventListener("click", handleMagicLink);
}

if (signOutButton) {
  signOutButton.addEventListener("click", handleSignOut);
}

if (importLocalButton) {
  importLocalButton.addEventListener("click", handleLocalImport);
}

if (sessionForm) {
  sessionForm.addEventListener("submit", handleSessionSubmit);
}

if (cancelEditButton) {
  cancelEditButton.addEventListener("click", resetEditState);
}

if (!isSupabaseConfigured) {
  if (setupBanner) {
    setupBanner.hidden = false;
  }

  if (authMessage) {
    setMessage(
      authMessage,
      "Add your Supabase project URL and publishable key in supabase-config.js to enable sign-in.",
      "error"
    );
  }
} else if (!supabaseClient) {
  if (setupBanner) {
    setupBanner.hidden = false;
  }

  if (authMessage) {
    setMessage(
      authMessage,
      "Supabase client failed to load. Refresh the page and try again.",
      "error"
    );
  }
} else {
  initAuth();
}

syncAuthMode();
renderApp([]);

async function initAuth() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    if (authMessage) {
      setMessage(authMessage, error.message, "error");
    }
    return;
  }

  await routeForSession(data.session);

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    await routeForSession(session);
  });
}

async function routeForSession(session) {
  currentUser = session?.user ?? null;

  if (page === "landing") {
    if (currentUser) {
      window.location.replace(getDashboardUrl());
    }
    return;
  }

  if (page === "dashboard") {
    if (!currentUser) {
      window.location.replace(getIndexUrl());
      return;
    }

    userEmail.textContent = currentUser.email || "Signed in";
    await loadSessions();
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!supabaseClient) {
    return;
  }

  setLoading(authSubmitButton, true);
  clearMessage(authMessage);

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();

  try {
    if (authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getIndexUrl(),
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        window.location.replace(getDashboardUrl());
        return;
      }

      setMessage(
        authMessage,
        "Account created. Check your email if confirmation is enabled, then sign in.",
        "success"
      );
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      window.location.replace(getDashboardUrl());
    }
  } catch (error) {
    setMessage(authMessage, error.message, "error");
  } finally {
    setLoading(authSubmitButton, false);
  }
}

async function handleMagicLink() {
  if (!supabaseClient) {
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
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getIndexUrl(),
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
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    setMessage(sessionMessage, error.message, "error");
    return;
  }

  window.location.replace(getIndexUrl());
}

async function loadSessions() {
  clearMessage(sessionMessage);

  const { data, error } = await supabaseClient
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

  renderApp(data.map(mapSessionFromRow));
}

async function handleSessionSubmit(event) {
  event.preventDefault();

  if (!supabaseClient || !currentUser) {
    return;
  }

  const submitButton = sessionForm.querySelector(".primary-button");
  setLoading(submitButton, true);
  clearMessage(sessionMessage);

  const payload = {
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
    if (editingSessionId) {
      const { error } = await supabaseClient
        .from("session_logs")
        .update(payload)
        .eq("id", editingSessionId);

      if (error) {
        throw error;
      }

      resetEditState();
      setMessage(sessionMessage, "Session updated.", "success");
    } else {
      const { error } = await supabaseClient
        .from("session_logs")
        .insert({ user_id: currentUser.id, ...payload });

      if (error) {
        throw error;
      }

      sessionForm.reset();
      sessionDateInput.value = new Date().toISOString().split("T")[0];
      energyRatingInput.value = DEFAULT_ENERGY;
      classFocusInput.focus();
      setMessage(sessionMessage, "Session saved.", "success");
    }

    loadSessions();
  } catch (error) {
    setMessage(sessionMessage, error.message, "error");
  } finally {
    setLoading(submitButton, false);
  }
}

async function handleLocalImport() {
  if (!supabaseClient || !currentUser) {
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
    const { error } = await supabaseClient.from("session_logs").insert(rows);

    if (error) {
      throw error;
    }

    setMessage(
      sessionMessage,
      `Imported ${rows.length} local entr${rows.length === 1 ? "y" : "ies"}.`,
      "success"
    );
    loadSessions();
  } catch (error) {
    setMessage(sessionMessage, error.message, "error");
  } finally {
    setLoading(importLocalButton, false);
  }
}

function renderApp(entries) {
  if (!totalSessions || !sessionList) {
    return;
  }

  renderSummary(entries);
  renderSessions(entries);
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

    node.querySelector(".session-edit-button").addEventListener("click", () => handleEditSession(session));
    node.querySelector(".session-delete-button").addEventListener("click", () => handleDeleteSession(session.id));

    sessionList.appendChild(node);
  });
}

function handleEditSession(session) {
  editingSessionId = session.id;
  sessionDateInput.value = session.date;
  classFocusInput.value = session.classFocus;
  coachNameInput.value = session.coachName || "";
  energyRatingInput.value = session.energyRating;
  techniquesInput.value = session.techniques.join("\n");
  winsInput.value = session.wins || "";
  strugglesInput.value = session.struggles || "";
  sparringNotesInput.value = session.sparringNotes;
  takeawayInput.value = session.takeaway;

  if (formHeading) formHeading.textContent = "Edit class notes";
  const submitButton = sessionForm.querySelector(".primary-button");
  if (submitButton) {
    submitButton.textContent = "Update class log";
    submitButton.dataset.defaultLabel = "Update class log";
  }
  if (cancelEditButton) cancelEditButton.hidden = false;

  sessionForm.closest(".form-panel").scrollIntoView({ behavior: "smooth" });
}

async function handleDeleteSession(id) {
  if (!confirm("Delete this session? This cannot be undone.")) {
    return;
  }

  clearMessage(sessionMessage);

  try {
    const { error } = await supabaseClient
      .from("session_logs")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    setMessage(sessionMessage, "Session deleted.", "success");
    loadSessions();
  } catch (error) {
    setMessage(sessionMessage, error.message, "error");
  }
}

function resetEditState() {
  editingSessionId = null;
  sessionForm.reset();
  sessionDateInput.value = new Date().toISOString().split("T")[0];
  energyRatingInput.value = DEFAULT_ENERGY;
  if (formHeading) formHeading.textContent = "Add today's class notes";
  const submitButton = sessionForm.querySelector(".primary-button");
  if (submitButton) {
    submitButton.textContent = "Save class log";
    submitButton.dataset.defaultLabel = "Save class log";
  }
  if (cancelEditButton) cancelEditButton.hidden = true;
}

function syncAuthMode() {
  if (!authTabs.length || !authSubmitButton || !authPasswordInput) {
    return;
  }

  authTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.mode === authMode);
  });

  authSubmitButton.textContent = authMode === "signup" ? "Create account" : "Sign in";
  authPasswordInput.autocomplete =
    authMode === "signup" ? "new-password" : "current-password";
}

function setLoading(button, isLoading) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent;
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? "Working..." : button.dataset.defaultLabel;
}

function setMessage(element, message, tone) {
  if (!element) {
    return;
  }

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

function getBasePath() {
  return window.location.pathname.endsWith("/")
    ? window.location.pathname
    : window.location.pathname.replace(/[^/]+$/, "");
}

function getDashboardUrl() {
  return new URL(`${getBasePath()}dashboard.html`, window.location.origin).href;
}

function getIndexUrl() {
  return new URL(getBasePath(), window.location.origin).href;
}
