const STORAGE_KEY = "roll-notes-sessions";

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

const totalSessions = document.getElementById("total-sessions");
const topFocus = document.getElementById("top-focus");
const topStruggle = document.getElementById("top-struggle");
const latestTakeaway = document.getElementById("latest-takeaway");
const emptyState = document.getElementById("empty-state");
const sessionList = document.getElementById("session-list");
const sessionTemplate = document.getElementById("session-template");

sessionDateInput.value = new Date().toISOString().split("T")[0];

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
}

sessionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const session = {
    id: crypto.randomUUID(),
    date: sessionDateInput.value,
    classFocus: classFocusInput.value.trim(),
    coachName: coachNameInput.value.trim(),
    energyRating: energyRatingInput.value,
    techniques: getLines(techniquesInput.value),
    wins: winsInput.value.trim(),
    struggles: strugglesInput.value.trim(),
    sparringNotes: sparringNotesInput.value.trim(),
    takeaway: takeawayInput.value.trim(),
    createdAt: Date.now(),
  };

  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions);
  renderApp(sessions);
  sessionForm.reset();
  sessionDateInput.value = new Date().toISOString().split("T")[0];
  energyRatingInput.value = "Tired but useful";
  classFocusInput.focus();
});

renderApp(loadSessions());

function renderApp(sessions) {
  renderSummary(sessions);
  renderSessions(sessions);
}

function renderSummary(sessions) {
  totalSessions.textContent = String(sessions.length);
  topFocus.textContent = sessions.length
    ? mostFrequent(
        sessions.map((session) => session.classFocus),
        "No focus logged yet"
      )
    : "None yet";

  const strugglePhrases = sessions.flatMap((session) =>
    getSentences(session.struggles)
  );

  topStruggle.textContent = strugglePhrases.length
    ? mostFrequent(strugglePhrases, "No recurring struggle yet")
    : "Log a few sessions first";

  latestTakeaway.textContent = sessions.length
    ? sessions[0].takeaway
    : "Your latest takeaway will show up here.";
}

function renderSessions(sessions) {
  emptyState.hidden = sessions.length > 0;
  sessionList.innerHTML = "";

  sessions.forEach((session) => {
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

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Could not read saved sessions", error);
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function getLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getSentences(value) {
  return value
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
