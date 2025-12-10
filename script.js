// Nyckel för localStorage
const STORAGE_KEY = "klass_timglas_state_v1";

const hourglassGrid = document.getElementById("hourglassGrid");
const newTeamNameInput = document.getElementById("newTeamName");
const newTeamColorInput = document.getElementById("newTeamColor");
const addTeamBtn = document.getElementById("addTeamBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

const DEFAULT_TEAMS = [
  { id: "house1", name: "Lag 1", color: "#e74c3c", score: 0 },
  { id: "house2", name: "Lag 2", color: "#3498db", score: 0 },
  { id: "house3", name: "Lag 3", color: "#f1c40f", score: 0 },
  { id: "house4", name: "Lag 4", color: "#2ecc71", score: 0 }
];

let state = {
  teams: {},
  maxScore: 50
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      DEFAULT_TEAMS.forEach(t => {
        state.teams[t.id] = { ...t };
      });
      state.maxScore = 50;
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed && parsed.teams) {
      state = parsed;
    } else {
      throw new Error("Invalid state");
    }
  } catch (e) {
    console.warn("Kunde inte läsa state, återställer:", e);
    state = { teams: {}, maxScore: 50 };
    DEFAULT_TEAMS.forEach(t => {
      state.teams[t.id] = { ...t };
    });
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTeamsArray() {
  return Object.values(state.teams);
}

function recalcMaxScore() {
  const teams = getTeamsArray();
  const highest = teams.reduce((max, t) => Math.max(max, t.score), 0);
  state.maxScore = Math.max(50, highest, 1);
}

function createTeamCard(team) {
  const card = document.createElement("article");
  card.className = "hourglass-card";
  card.dataset.teamId = team.id;

  // Namn
  const nameInput = document.createElement("input");
  nameInput.className = "team-name-input";
  nameInput.value = team.name;
  nameInput.addEventListener("change", () => {
    state.teams[team.id].name = nameInput.value || "Namnlöst lag";
    saveState();
  });

  // Poäng
  const scoreDisplay = document.createElement("div");
  scoreDisplay.className = "score-display";
  const scoreValueSpan = document.createElement("span");
  scoreValueSpan.className = "score-value";
  scoreValueSpan.textContent = team.score;
  scoreDisplay.appendChild(scoreValueSpan);
  scoreDisplay.appendChild(document.createTextNode(" poäng"));

  // Timglas
  const hourglassWrapper = document.createElement("div");
  hourglassWrapper.className = "hourglass-wrapper";

  const tube = document.createElement("div");
  tube.className = "hourglass-tube";

  const sandBottom = document.createElement("div");
  sandBottom.className = "sand-bottom";
  sandBottom.style.background = `linear-gradient(to top, ${team.color}, #ffffffcc)`;

  const sandStream = document.createElement("div");
  sandStream.className = "sand-stream";

  tube.appendChild(sandBottom);
  tube.appendChild(sandStream);
  hourglassWrapper.appendChild(tube);

  // Färg & ta bort
  const colorRow = document.createElement("div");
  colorRow.className = "color-row";

  const colorLabel = document.createElement("span");
  colorLabel.textContent = "Färg:";

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = team.color;
  colorInput.addEventListener("input", () => {
    state.teams[team.id].color = colorInput.value;
    sandBottom.style.background = `linear-gradient(to top, ${colorInput.value}, #ffffffcc)`;
    saveState();
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-team-btn";
  removeBtn.type = "button";
  removeBtn.textContent = "Ta bort lag";
  removeBtn.addEventListener("click", () => {
    if (confirm(`Ta bort "${team.name}"?`)) {
      delete state.teams[team.id];
      recalcMaxScore();
      saveState();
      renderAll();
    }
  });

  colorRow.appendChild(colorLabel);
  colorRow.appendChild(colorInput);
  colorRow.appendChild(removeBtn);

  // Kontrollknappar
  const controls = document.createElement("div");
  controls.className = "card-controls";

  const increments = [
    { label: "+10", value: 10 },
    { label: "+5", value: 5 },
    { label: "+1", value: 1 },
    { label: "-1", value: -1 }
  ];

  increments.forEach(inc => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = inc.label;
    if (inc.value < 0) {
      btn.classList.add("small-danger");
    }
    btn.addEventListener("click", () => {
      updateScore(team.id, inc.value, { tube, sandStream, sandBottom, scoreValueSpan });
    });
    controls.appendChild(btn);
  });

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.textContent = "0";
  clearBtn.classList.add("small-danger");
  clearBtn.addEventListener("click", () => {
    updateScore(team.id, -state.teams[team.id].score, { tube, sandStream, sandBottom, scoreValueSpan });
  });
  controls.appendChild(clearBtn);

  card.appendChild(nameInput);
  card.appendChild(scoreDisplay);
  card.appendChild(hourglassWrapper);
  card.appendChild(controls);
  card.appendChild(colorRow);

  // Första rendering av sandnivå
  updateSandLevel(team, sandBottom);

  return card;
}

function updateSandLevel(team, sandBottom) {
  const pct = Math.max(0, Math.min(100, (team.score / state.maxScore) * 100));
  sandBottom.style.height = `${pct}%`;
}

function updateScore(teamId, delta, elements) {
  const team = state.teams[teamId];
  if (!team) return;

  const newScore = Math.max(0, team.score + delta);
  if (newScore === team.score) return;

  team.score = newScore;

  recalcMaxScore();
  saveState();

  // Uppdatera UI
  elements.scoreValueSpan.textContent = team.score;

  // Alla sandnivåer behöver uppdateras när maxScore ändras
  refreshAllSandLevels();

  // Liten ström-animation
  elements.tube.classList.remove("stream-active");
  void elements.tube.offsetWidth; // force reflow
  elements.tube.classList.add("stream-active");
}

function refreshAllSandLevels() {
  const teams = getTeamsArray();
  teams.forEach(team => {
    const card = hourglassGrid.querySelector(`[data-team-id="${team.id}"]`);
    if (!card) return;
    const sandBottom = card.querySelector(".sand-bottom");
    updateSandLevel(team, sandBottom);
  });
}

function renderAll() {
  hourglassGrid.innerHTML = "";
  const teams = getTeamsArray().sort((a, b) => a.name.localeCompare(b.name, "sv"));
  teams.forEach(team => {
    const card = createTeamCard(team);
    hourglassGrid.appendChild(card);
  });
}

// Lägg till nytt lag
addTeamBtn.addEventListener("click", () => {
  const name = newTeamNameInput.value.trim() || "Nytt lag";
  const color = newTeamColorInput.value || "#f39c12";
  const id = "team_" + Date.now();

  state.teams[id] = {
    id,
    name,
    color,
    score: 0
  };

  recalcMaxScore();
  saveState();
  newTeamNameInput.value = "";
  renderAll();
});

newTeamNameInput.addEventListener("keyup", e => {
  if (e.key === "Enter") {
    addTeamBtn.click();
  }
});

// Reset alla poäng
resetAllBtn.addEventListener("click", () => {
  if (!confirm("Nollställ poängen för alla lag?")) return;
  Object.values(state.teams).forEach(t => (t.score = 0));
  recalcMaxScore();
  saveState();
  renderAll();
});

// Init
loadState();
recalcMaxScore();
renderAll();
