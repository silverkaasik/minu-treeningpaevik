const defaultExercisesByPlan = {
  Seistes: ["Sõudmine", "Lindi surumine", "Õla rotation (int/ext)", "Kerepöörded", "Puusa sirutus ette", "Puusa sirutus välja", "Puusa sirutus sisse", "Puusa sirutus taha", "Sääre tõste", "Seina kükk"],
  Istudes: ["Reie lähendamine", "Merekarp", "Ülalttõmme", "Reie sirutus", "Sääre kõverdus", "Kere ette kallutus", "Kerepööre", "Õlapress", "Sõudmine"],
  Põrandal: ["Süvalihased", "Selili käed üle pea", "Puusatõsted", "Külili U", "Külili puusa tõsted", "Puusa sirutus", "Russian twist", "Jalapress"],
  Kardio: ["Velo"]
};

const defaultPlanColors = { Seistes: "#d6a94f", Istudes: "#58a6a1", Põrandal: "#9673b9", Kardio: "#e26d5a" };
const customColors = ["#4c78a8", "#e26d5a", "#7a9e45", "#b06ab3", "#d08b37", "#4c9a8a"];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

let customPlans = readStorage("myCustomTrainingPlans", []);
let customizedDefaultPlans = readStorage("myDefaultPlanExercises", {});
const exercisesByPlan = { ...defaultExercisesByPlan, ...customizedDefaultPlans };
const planColors = { ...defaultPlanColors };

customPlans.forEach((plan) => {
  exercisesByPlan[plan.name] = plan.exercises;
  planColors[plan.name] = plan.color;
});

const planList = document.querySelector(".plan-list");
const addPlanButton = document.querySelector("#show-add-plan");
const addPlanForm = document.querySelector("#add-plan-form");
const planTitle = document.querySelector(".plan-details h3");
const exerciseArea = document.querySelector(".exercise-area");
const workoutHistory = document.querySelector("#workout-history");
const calendarMonth = document.querySelector("#calendar-month");
const calendarGrid = document.querySelector("#calendar-grid");
const progressExerciseList = document.querySelector("#progress-exercise-list");
const progressChart = document.querySelector("#progress-chart");
const pageTabs = document.querySelectorAll(".page-tab");

let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let editingWorkoutIndex = null;
let selectedProgressKey = null;

function escapeHTML(value) {
  const characters = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (character) => characters[character]);
}

function getSavedWorkouts() {
  return readStorage("myTrainingDiary", []);
}

function getResistanceLevel(exercise) {
  const value = exercise.resistanceLevel !== undefined ? exercise.resistanceLevel : exercise.intensity;
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 && level <= 5 ? level : null;
}

function renderCustomPlanButtons() {
  document.querySelectorAll(".custom-plan-button").forEach((button) => button.remove());
  customPlans.forEach((plan) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "plan-button custom-plan-button";
    button.textContent = plan.name;
    button.style.borderColor = plan.color;
    planList.appendChild(button);
  });
}

function renderCalendar() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  calendarMonth.textContent = displayedMonth.toLocaleDateString("et-EE", { month: "long", year: "numeric" });

  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const workouts = getSavedWorkouts();
  const cells = [];

  for (let i = 0; i < offset; i++) cells.push('<div class="calendar-day calendar-empty"></div>');

  for (let day = 1; day <= daysInMonth; day++) {
    const date = [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
    const events = workouts.filter((workout) => workout.date === date).map((workout) =>
      '<span class="calendar-event" style="--event-color: ' + workout.color +
      '" title="' + escapeHTML(workout.planName) + '">' + escapeHTML(workout.planName) + "</span>"
    ).join("");
    cells.push('<div class="calendar-day"><span class="calendar-day-number">' + day + "</span>" + events + "</div>");
  }

  calendarGrid.innerHTML = cells.join("");
}

function renderHistory() {
  const workouts = getSavedWorkouts();
  if (workouts.length === 0) {
    workoutHistory.innerHTML = "<p>Salvestatud treeningud ilmuvad siia.</p>";
    return;
  }

  workoutHistory.innerHTML = workouts.map((workout, index) => ({ workout, index })).reverse().map(({ workout, index }) => {
    const date = new Date(workout.date + "T00:00:00").toLocaleDateString("et-EE");
    const exerciseItems = workout.exercises.map((exercise) => {
      const result = exercise.minutes !== undefined
        ? exercise.minutes + " min"
        : exercise.sets + " seeriat × " + exercise.repetitions + " kordust";
      const level = getResistanceLevel(exercise);
      const levelText = level ? "Raskusaste " + level + "/5" : "Raskusaste märkimata";
      return "<li>" + escapeHTML(exercise.name) + ": " + result + ", " + levelText + "</li>";
    }).join("");

    const editButton = exercisesByPlan[workout.planName]
      ? '<button type="button" class="edit-workout-button" data-index="' + index + '">Muuda</button>'
      : "";
    const notes = workout.notes
      ? '<p class="workout-notes"><strong>Märkus:</strong> ' + escapeHTML(workout.notes) + "</p>"
      : "";

    return '<article class="workout-card"><h3><span class="workout-color" style="background-color: ' +
      workout.color + '"></span>' + escapeHTML(workout.planName) + " – " + date + "</h3><ul>" +
      exerciseItems + "</ul>" + notes + '<div class="workout-actions">' + editButton +
      '<button type="button" class="delete-workout-button" data-index="' + index + '">Kustuta</button>' +
      "</div></article>";
  }).join("");
}

function getProgressGroups() {
  const groups = new Map();

  getSavedWorkouts().forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const level = getResistanceLevel(exercise);
      if (level === null) return;

      const key = workout.planName + "|||" + exercise.name;
      if (!groups.has(key)) {
        groups.set(key, { key, planName: workout.planName, exerciseName: exercise.name, records: [] });
      }
      groups.get(key).records.push({ date: workout.date, level });
    });
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    records: group.records.sort((a, b) => a.date.localeCompare(b.date))
  }));
}

function renderProgressGraph(group) {
  if (!group) {
    progressChart.innerHTML = "<p>Vali vasakult harjutus.</p>";
    return;
  }

  const records = group.records;
  const width = 680;
  const height = 340;
  const left = 54;
  const right = 24;
  const top = 24;
  const bottom = 58;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  function xPosition(index) {
    return records.length === 1 ? left + plotWidth / 2 : left + index * plotWidth / (records.length - 1);
  }

  function yPosition(level) {
    return top + ((5 - level) / 4) * plotHeight;
  }

  const grid = [1, 2, 3, 4, 5].map((level) => {
    const y = yPosition(level);
    return '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) +
      '" y2="' + y + '" stroke="#e1e8e0"></line><text x="' + (left - 18) +
      '" y="' + (y + 5) + '" text-anchor="middle" fill="#59665f" font-size="13">' +
      level + "</text>";
  }).join("");

  const points = records.map((record, index) => xPosition(index) + "," + yPosition(record.level)).join(" ");
  const dots = records.map((record, index) => {
    const date = new Date(record.date + "T00:00:00").toLocaleDateString("et-EE");
    return '<circle cx="' + xPosition(index) + '" cy="' + yPosition(record.level) +
      '" r="6" fill="#315c48"><title>' + date + ": raskusaste " + record.level + "</title></circle>";
  }).join("");

  const firstDate = new Date(records[0].date + "T00:00:00").toLocaleDateString("et-EE");
  const lastRecord = records[records.length - 1];
  const lastDate = new Date(lastRecord.date + "T00:00:00").toLocaleDateString("et-EE");

  progressChart.innerHTML =
    "<h3>" + escapeHTML(group.planName) + " – " + escapeHTML(group.exerciseName) + "</h3>" +
    '<p class="progress-summary">Esimene aste: ' + records[0].level +
    " → viimane aste: " + lastRecord.level + "</p>" +
    '<svg viewBox="0 0 ' + width + " " + height +
    '" role="img" aria-label="Raskusastme trend skaalal üks kuni viis">' +
    grid +
    '<line x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' +
    (height - bottom) + '" stroke="#8a978e"></line><line x1="' + left +
    '" y1="' + (height - bottom) + '" x2="' + (width - right) + '" y2="' +
    (height - bottom) + '" stroke="#8a978e"></line>' +
    (records.length > 1
      ? '<polyline points="' + points + '" fill="none" stroke="#315c48" stroke-width="3"></polyline>'
      : "") +
    dots +
    '<text x="' + left + '" y="' + (height - 20) + '" fill="#59665f" font-size="12">' +
    firstDate + "</text><text x='" + (width - right) + "' y='" + (height - 20) +
    "' text-anchor='end' fill='#59665f' font-size='12'>" + lastDate + "</text></svg>";
}

function renderProgress() {
  const groups = getProgressGroups();

  if (groups.length === 0) {
    progressExerciseList.innerHTML = "<p>Salvesta harjutusele raskusaste 1–5, et arengut näha.</p>";
    progressChart.innerHTML = "<p>Graafik ilmub pärast treeningu salvestamist.</p>";
    selectedProgressKey = null;
    return;
  }

  if (!groups.some((group) => group.key === selectedProgressKey)) selectedProgressKey = groups[0].key;

  progressExerciseList.innerHTML = groups.map((group) =>
    '<button type="button" class="progress-exercise-button ' +
    (group.key === selectedProgressKey ? "selected" : "") +
    '" data-progress-key="' + escapeHTML(group.key) + '">' +
    escapeHTML(group.planName) + " – " + escapeHTML(group.exerciseName) + "</button>"
  ).join("");

  renderProgressGraph(groups.find((group) => group.key === selectedProgressKey));
}

function showView(viewId) {
  document.querySelectorAll(".page-view").forEach((view) => {
    view.hidden = view.id !== viewId;
  });
  pageTabs.forEach((tab) => {
    const active = tab.dataset.view === viewId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
}

function showPlan(planName) {
  const exercises = exercisesByPlan[planName];
  if (!exercises) return;

  planTitle.textContent = planName + " kava";
  const exerciseRows = exercises.map((exercise) => {
    const fields = planName === "Kardio"
      ? '<label>Minutid<input class="minutes-input" type="number" min="0" step="1"></label>'
      : '<label>Seeriad<input class="sets-input" type="number" min="0" step="1"></label>' +
        '<label>Kordusi seerias<input class="repetitions-input" type="number" min="0" step="1"></label>';

    return '<li class="exercise-entry" data-exercise="' + escapeHTML(exercise) + '">' +
      "<strong>" + escapeHTML(exercise) + "</strong>" + fields +
      '<label>Raskusaste (1–5)<select class="resistance-input">' +
      '<option value="">Vali aste</option><option value="1">1</option><option value="2">2</option>' +
      '<option value="3">3</option><option value="4">4</option><option value="5">5</option>' +
      "</select></label></li>";
  }).join("");

  const saveText = editingWorkoutIndex === null ? "Salvesta trenn" : "Salvesta muudatused";
  exerciseArea.innerHTML =
    '<label class="date-field">Trenni kuupäev<input id="workout-date" type="date"></label>' +
    '<ul class="exercise-list">' + exerciseRows + "</ul>" +
    '<label class="notes-field">Märkmed<textarea id="workout-notes" rows="3" ' +
    'placeholder="Kuidas trenn läks? Mida tahan järgmisel korral meeles pidada?"></textarea></label>' +
    '<button type="button" class="save-workout-button">' + saveText + "</button>";

  const today = new Date();
  document.querySelector("#workout-date").value = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  document.querySelector(".save-workout-button").addEventListener("click", () => saveWorkout(planName));
  document.querySelectorAll(".plan-button").forEach((button) => {
    button.classList.toggle("selected", button.textContent.trim() === planName);
  });
  addPlanManagementButtons(planName);
}

function addPlanManagementButtons(planName) {
  const isCustom = customPlans.some((plan) => plan.name === planName);
  const controls = document.createElement("div");
  controls.className = "plan-management";
  controls.innerHTML =
    '<button type="button" class="edit-exercises-button">Muuda harjutusi</button>' +
    (isCustom
      ? '<button type="button" class="edit-plan-button">Muuda kava</button>' +
        '<button type="button" class="delete-plan-button">Kustuta kava</button>'
      : "");

  exerciseArea.appendChild(controls);
  controls.querySelector(".edit-exercises-button").addEventListener("click", () => editPlanExercises(planName));

  if (isCustom) {
    controls.querySelector(".edit-plan-button").addEventListener("click", () => editCustomPlan(planName));
    controls.querySelector(".delete-plan-button").addEventListener("click", () => deleteCustomPlan(planName));
  }
}

function editPlanExercises(planName) {
  const entered = prompt("Harjutused komadega eraldatult:", exercisesByPlan[planName].join(", "));
  if (entered === null) return;

  const exercises = entered.split(",").map((item) => item.trim()).filter(Boolean);
  if (exercises.length === 0) {
    alert("Kavas peab olema vähemalt üks harjutus.");
    return;
  }

  exercisesByPlan[planName] = exercises;
  const customPlan = customPlans.find((plan) => plan.name === planName);
  if (customPlan) {
    customPlan.exercises = exercises;
    localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));
  } else {
    customizedDefaultPlans[planName] = exercises;
    localStorage.setItem("myDefaultPlanExercises", JSON.stringify(customizedDefaultPlans));
  }
  showPlan(planName);
}

function editCustomPlan(oldName) {
  const enteredName = prompt("Kava nimi:", oldName);
  if (enteredName === null) return;

  const newName = enteredName.trim();
  if (!newName) {
    alert("Kava nimi ei tohi olla tühi.");
    return;
  }
  if (newName !== oldName && exercisesByPlan[newName]) {
    alert("Sellise nimega kava on juba olemas.");
    return;
  }

  const enteredExercises = prompt("Harjutused, komadega eraldatult:", exercisesByPlan[oldName].join(", "));
  if (enteredExercises === null) return;

  const exercises = enteredExercises.split(",").map((item) => item.trim()).filter(Boolean);
  if (exercises.length === 0) {
    alert("Kavas peab olema vähemalt üks harjutus.");
    return;
  }

  const plan = customPlans.find((item) => item.name === oldName);
  const color = planColors[oldName];
  plan.name = newName;
  plan.exercises = exercises;
  delete exercisesByPlan[oldName];
  delete planColors[oldName];
  exercisesByPlan[newName] = exercises;
  planColors[newName] = color;

  localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));
  renderCustomPlanButtons();
  showPlan(newName);
}

function deleteCustomPlan(planName) {
  if (!confirm('Kas kustutad kava "' + planName + '"?')) return;

  customPlans = customPlans.filter((plan) => plan.name !== planName);
  delete exercisesByPlan[planName];
  delete planColors[planName];
  localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));
  renderCustomPlanButtons();

  document.querySelectorAll(".plan-button").forEach((button) => button.classList.remove("selected"));
  planTitle.textContent = "Treeningkava harjutused";
  exerciseArea.innerHTML = "<p>Vali ülevalt kava, et näha selle harjutusi.</p>";
  renderProgress();
}

function startEditWorkout(index) {
  const workout = getSavedWorkouts()[index];
  if (!workout || !exercisesByPlan[workout.planName]) {
    alert("Selle treeningu kava pole enam olemas, seega seda muuta ei saa.");
    return;
  }

  editingWorkoutIndex = index;
  showPlan(workout.planName);
  document.querySelector("#workout-date").value = workout.date;
  document.querySelector("#workout-notes").value = workout.notes || "";

  document.querySelectorAll(".exercise-entry").forEach((entry) => {
    const saved = workout.exercises.find((exercise) => exercise.name === entry.dataset.exercise);
    if (!saved) return;

    const sets = entry.querySelector(".sets-input");
    const repetitions = entry.querySelector(".repetitions-input");
    const minutes = entry.querySelector(".minutes-input");
    const resistance = entry.querySelector(".resistance-input");
    const level = getResistanceLevel(saved);

    if (sets && saved.sets !== "—") sets.value = saved.sets;
    if (repetitions && saved.repetitions !== "—") repetitions.value = saved.repetitions;
    if (minutes && saved.minutes !== "—") minutes.value = saved.minutes;
    if (resistance && level !== null) resistance.value = String(level);
  });

  document.querySelector(".save-workout-button").textContent = "Salvesta muudatused";
  showView("training-view");
}

function deleteSavedWorkout(index) {
  if (!confirm("Kas kustutad selle treeningu?")) return;

  const workouts = getSavedWorkouts();
  workouts.splice(index, 1);
  if (editingWorkoutIndex === index) editingWorkoutIndex = null;
  else if (editingWorkoutIndex !== null && editingWorkoutIndex > index) editingWorkoutIndex -= 1;

  localStorage.setItem("myTrainingDiary", JSON.stringify(workouts));
  renderHistory();
  renderCalendar();
  renderProgress();
}

function saveWorkout(planName) {
  const date = document.querySelector("#workout-date").value;
  const notes = document.querySelector("#workout-notes").value.trim();
  const isCardio = planName === "Kardio";

  if (!date) {
    alert("Palun vali trenni kuupäev.");
    return;
  }

  const exercises = [...document.querySelectorAll(".exercise-entry")].map((entry) => {
    const level = entry.querySelector(".resistance-input").value;

    if (isCardio) {
      const minutes = entry.querySelector(".minutes-input").value;
      if (minutes === "" && level === "") return null;
      return { name: entry.dataset.exercise, minutes: minutes || "—", resistanceLevel: level || "—" };
    }

    const sets = entry.querySelector(".sets-input").value;
    const repetitions = entry.querySelector(".repetitions-input").value;
    if (sets === "" && repetitions === "" && level === "") return null;
    return {
      name: entry.dataset.exercise,
      sets: sets || "—",
      repetitions: repetitions || "—",
      resistanceLevel: level || "—"
    };
  }).filter(Boolean);

  if (exercises.length === 0) {
    alert("Sisesta vähemalt ühe harjutuse andmed.");
    return;
  }

  const workouts = getSavedWorkouts();
  const workout = { date, planName, color: planColors[planName], exercises, notes };
  const wasEditing = editingWorkoutIndex !== null;

  if (wasEditing) {
    workouts[editingWorkoutIndex] = workout;
    editingWorkoutIndex = null;
  } else {
    workouts.push(workout);
  }

  localStorage.setItem("myTrainingDiary", JSON.stringify(workouts));
  renderHistory();
  renderCalendar();
  renderProgress();
  showPlan(planName);
  alert(wasEditing ? "Muudatused on salvestatud!" : "Trenn on salvestatud!");
}

planList.addEventListener("click", (event) => {
  const button = event.target.closest(".plan-button");
  if (button) showPlan(button.textContent.trim());
});

progressExerciseList.addEventListener("click", (event) => {
  const button = event.target.closest(".progress-exercise-button");
  if (!button) return;
  selectedProgressKey = button.dataset.progressKey;
  renderProgress();
});

workoutHistory.addEventListener("click", (event) => {
  const edit = event.target.closest(".edit-workout-button");
  const remove = event.target.closest(".delete-workout-button");
  if (edit) startEditWorkout(Number(edit.dataset.index));
  if (remove) deleteSavedWorkout(Number(remove.dataset.index));
});

pageTabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));

addPlanButton.addEventListener("click", () => {
  addPlanForm.hidden = !addPlanForm.hidden;
});

document.querySelector("#cancel-add-plan").addEventListener("click", () => {
  addPlanForm.reset();
  addPlanForm.hidden = true;
});

addPlanForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#new-plan-name").value.trim();
  const exerciseText = document.querySelector("#new-plan-exercises").value;

  if (exercisesByPlan[name]) {
    alert("Sellise nimega kava on juba olemas. Vali teine nimi.");
    return;
  }

  const exercises = exerciseText.split(",").map((item) => item.trim()).filter(Boolean);
  if (exercises.length === 0) {
    alert("Lisa kavasse vähemalt üks harjutus.");
    return;
  }

  const color = customColors[customPlans.length % customColors.length];
  const newPlan = { name, exercises, color };
  customPlans.push(newPlan);
  exercisesByPlan[name] = exercises;
  planColors[name] = color;
  localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));

  renderCustomPlanButtons();
  addPlanForm.reset();
  addPlanForm.hidden = true;
  showPlan(name);
});

document.querySelector("#previous-month").addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector("#next-month").addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
  renderCalendar();
});

renderCustomPlanButtons();
renderHistory();
renderCalendar();
renderProgress();
showView("training-view");


