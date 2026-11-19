const defaultExercisesByPlan = {
  Seistes: ["Sõudmine (seistes)", "Lindi surumine", "Õla rotation (int/ext)", "Kerepöörded", "Puusa sirutus ette", "Puusa sirutus välja", "Puusa sirutus sisse", "Puusa sirutus taha", "Sääre tõste", "Seina kükk"],
  Istudes: ["Reie lähendamine", "Merekarp", "Ülalttõmme", "Reie sirutus", "Sääre kõverdus", "Kere ette kallutus", "Kerepööre", "Õlapress", "Sõudmine (istudes)"],
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
let extraExercises = readStorage("myExtraExercises", []);
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
const exportBackupButton = document.querySelector("#export-backup");
const exportXlsxButton = document.querySelector("#export-xlsx");
const importBackupButton = document.querySelector("#import-backup");
const backupFileInput = document.querySelector("#backup-file");
const newPlanExercisePicker = document.querySelector("#new-plan-exercise-picker");
const exerciseLibraryList = document.querySelector("#exercise-library-list");
const libraryTargetPlan = document.querySelector("#library-target-plan");
const addLibraryExerciseForm = document.querySelector("#add-library-exercise-form");
let pendingPlanExercises = [];

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

function getExerciseLibrary() {
  const names = new Set();
  Object.entries(exercisesByPlan).forEach(([planName, exercises]) => {
    exercises.forEach((exercise) => {
      let name = String(exercise).trim();
      if (name.toLocaleLowerCase("et") === "sõudmine") {
        if (planName === "Seistes") name = "Sõudmine (seistes)";
        if (planName === "Istudes") name = "Sõudmine (istudes)";
      }
      if (name) names.add(name);
    });
  });
  extraExercises.forEach((exercise) => {
    const name = String(exercise).trim();
    if (name) names.add(name);
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b, "et"));
}

function renderExerciseLibrary() {
  const plans = Object.keys(exercisesByPlan);
  const previousPlan = libraryTargetPlan.value;
  libraryTargetPlan.innerHTML = plans.map((name) =>
    '<option value="' + escapeHTML(name) + '">' + escapeHTML(name) + "</option>"
  ).join("");
  if (plans.includes(previousPlan)) libraryTargetPlan.value = previousPlan;

  exerciseLibraryList.innerHTML = getExerciseLibrary().map((name) =>
    "<li><span>" + escapeHTML(name) + '</span><button type="button" class="add-library-exercise" data-exercise-name="' +
    escapeHTML(name) + '">Lisa kavasse</button><button type="button" class="remove-library-exercise" data-exercise-name="' +
    escapeHTML(name) + '" aria-label="Eemalda ' + escapeHTML(name) + '" title="Eemalda harjutus">×</button></li>'
  ).join("");
}

function renderNewPlanPicker() {
  const library = getExerciseLibrary();
  newPlanExercisePicker.innerHTML = library.map((name) =>
    '<label class="exercise-choice"><input type="checkbox" value="' + escapeHTML(name) + '" ' +
    (pendingPlanExercises.includes(name) ? "checked" : "") + "> " + escapeHTML(name) + "</label>"
  ).join("");
}

function migrateSowingNames() {
  const workouts = getSavedWorkouts();
  let changed = false;

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const oldName = String(exercise.name).trim().toLocaleLowerCase("et");

      if (oldName === "sõudmine" && workout.planName === "Seistes") {
        exercise.name = "Sõudmine (seistes)";
        changed = true;
      } else if (oldName === "sõudmine" && workout.planName === "Istudes") {
        exercise.name = "Sõudmine (istudes)";
        changed = true;
      }
    });
  });

  if (changed) {
    localStorage.setItem("myTrainingDiary", JSON.stringify(workouts));
  }
}

migrateSowingNames();

function exportBackup() {
  const backup = {
    format: "minu-trennipaevik-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    workouts: getSavedWorkouts(),
    customPlans: customPlans,
    customizedDefaultPlans: customizedDefaultPlans,
    extraExercises: extraExercises
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = "minu-trennipaevik-varukoopia-" + date + ".json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  })[character]);
}

function excelColumnName(number) {
  let name = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function excelDateSerial(dateText) {
  const parts = String(dateText).split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const utcDate = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  return Math.floor(utcDate / 86400000) + 25569;
}

function makeWorksheetCell(reference, value, style = null, numeric = false) {
  const styleAttribute = style === null ? "" : ' s="' + style + '"';
  if (value === null || value === undefined || value === "") return "";
  if (numeric && Number.isFinite(Number(value))) {
    return '<c r="' + reference + '"' + styleAttribute + '><v>' + Number(value) + "</v></c>";
  }
  return '<c r="' + reference + '" t="inlineStr"' + styleAttribute +
    '><is><t xml:space="preserve">' + xmlEscape(value) + "</t></is></c>";
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) |
    ((now.getMonth() + 1) << 5) | now.getDate();

  const header = (length, fill) => {
    const bytes = new Uint8Array(length);
    fill(new DataView(bytes.buffer));
    return bytes;
  };
  const joinBytes = (parts) => {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    parts.forEach((part) => { result.set(part, offset); offset += part.length; });
    return result;
  };

  files.forEach(([path, content]) => {
    const nameBytes = encoder.encode(path);
    const data = encoder.encode(content);
    const checksum = crc32(data);
    const localHeader = header(30, (view) => {
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true); view.setUint16(8, 0, true);
      view.setUint16(10, dosTime, true); view.setUint16(12, dosDate, true);
      view.setUint32(14, checksum, true); view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true); view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
    });
    localParts.push(localHeader, nameBytes, data);

    const centralHeader = header(46, (view) => {
      view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true);
      view.setUint16(6, 20, true); view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true); view.setUint16(12, dosTime, true);
      view.setUint16(14, dosDate, true); view.setUint32(16, checksum, true);
      view.setUint32(20, data.length, true); view.setUint32(24, data.length, true);
      view.setUint16(28, nameBytes.length, true); view.setUint16(30, 0, true);
      view.setUint16(32, 0, true); view.setUint16(34, 0, true);
      view.setUint16(36, 0, true); view.setUint32(38, 0, true);
      view.setUint32(42, localOffset, true);
    });
    centralParts.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + data.length;
  });

  const centralDirectory = joinBytes(centralParts);
  const endRecord = header(22, (view) => {
    view.setUint32(0, 0x06054b50, true); view.setUint16(4, 0, true);
    view.setUint16(6, 0, true); view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true); view.setUint32(12, centralDirectory.length, true);
    view.setUint32(16, localOffset, true); view.setUint16(20, 0, true);
  });
  return joinBytes([...localParts, centralDirectory, endRecord]);
}

function createCalendarSheet(workouts, colorStyleIds) {
  const weekdays = ["E", "T", "K", "N", "R", "L", "P"];
  const groupedByDate = new Map();
  const yearValues = workouts.map((workout) => Number(String(workout.date).slice(0, 4)))
    .filter((year) => Number.isInteger(year) && year >= 1900 && year <= 9999);
  if (yearValues.length === 0) yearValues.push(new Date().getFullYear());
  const firstYear = Math.min(...yearValues);
  const lastYear = Math.max(...yearValues);
  const rows = [];
  const mergedCells = [];
  let rowNumber = 1;

  workouts.forEach((workout) => {
    if (!groupedByDate.has(workout.date)) groupedByDate.set(workout.date, []);
    groupedByDate.get(workout.date).push(workout);
  });

  const cell = (reference, value, style) =>
    value === "" ? '<c r="' + reference + '" s="' + style + '"/>' :
      '<c r="' + reference + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' +
      xmlEscape(value) + "</t></is></c>";

  for (let year = firstYear; year <= lastYear; year++) {
    const yearRow = '<row r="' + rowNumber + '" ht="26" customHeight="1">' +
      cell("A" + rowNumber, String(year), 6) + "</row>";
    rows.push(yearRow);
    mergedCells.push("A" + rowNumber + ":H" + rowNumber);
    rowNumber += 1;

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const weekdayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
      const weekCount = Math.ceil((weekdayOffset + daysInMonth) / 7);

      const headingCells = [cell("A" + rowNumber, "", 3)];
      weekdays.forEach((weekday, index) => headingCells.push(cell(excelColumnName(index + 2) + rowNumber, weekday, 3)));
      rows.push('<row r="' + rowNumber + '" ht="22" customHeight="1">' + headingCells.join("") + "</row>");
      rowNumber += 1;

      const monthStartRow = rowNumber;
      for (let week = 0; week < weekCount; week++) {
        const weekCells = [];
        if (week === 0) {
          const monthName = new Date(year, month, 1).toLocaleDateString("et-EE", { month: "long" }).toLocaleUpperCase("et");
          weekCells.push(cell("A" + rowNumber, monthName, 5));
        }

        for (let weekday = 0; weekday < 7; weekday++) {
          const day = week * 7 + weekday - weekdayOffset + 1;
          const reference = excelColumnName(weekday + 2) + rowNumber;
          if (day < 1 || day > daysInMonth) {
            weekCells.push(cell(reference, "", 4));
            continue;
          }

          const date = [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
          const sessions = groupedByDate.get(date) || [];
          if (sessions.length === 0) {
            weekCells.push(cell(reference, String(day), 4));
            continue;
          }

          const planNames = Array.from(new Set(sessions.map((workout) => workout.planName)));
          const color = sessions[0].color || planColors[sessions[0].planName] || "#315c48";
          const style = colorStyleIds.get(String(color).toUpperCase()) || 4;
          weekCells.push(cell(reference, String(day) + "\n" + planNames.join("\n"), style));
        }

        rows.push('<row r="' + rowNumber + '" ht="54" customHeight="1">' + weekCells.join("") + "</row>");
        rowNumber += 1;
      }
      mergedCells.push("A" + monthStartRow + ":A" + (rowNumber - 1));
      rows.push('<row r="' + rowNumber + '" ht="10" customHeight="1"/>');
      rowNumber += 1;
    }
  }

  const usedPlans = new Map();
  workouts.forEach((workout) => {
    const color = workout.color || planColors[workout.planName] || "#315c48";
    if (!usedPlans.has(workout.planName)) usedPlans.set(workout.planName, color);
  });
  if (usedPlans.size > 0) {
    rows.push('<row r="' + rowNumber + '" ht="24" customHeight="1">' + cell("A" + rowNumber, "Värvide tähendus", 6) + "</row>");
    mergedCells.push("A" + rowNumber + ":H" + rowNumber);
    rowNumber += 1;
    usedPlans.forEach((color, planName) => {
      const style = colorStyleIds.get(String(color).toUpperCase()) || 4;
      rows.push('<row r="' + rowNumber + '" ht="24" customHeight="1">' +
        cell("A" + rowNumber, planName, style) + cell("B" + rowNumber, planName, 0) + "</row>");
      rowNumber += 1;
    });
  }

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:H' + (rowNumber - 1) + '"/>' +
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/>' +
    '<cols><col min="1" max="1" width="7" customWidth="1"/><col min="2" max="8" width="17" customWidth="1"/></cols>' +
    '<sheetData>' + rows.join("") + '</sheetData><mergeCells count="' + mergedCells.length + '">' +
    mergedCells.map((range) => '<mergeCell ref="' + range + '"/>').join("") + "</mergeCells></worksheet>";
}

function makeWorkbookStylesXml(calendarColors) {
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF315C48"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF3CECE"/><bgColor indexed="64"/></patternFill></fill>',
    ...Array.from(calendarColors.keys()).map((color) => '<fill><patternFill patternType="solid"><fgColor rgb="FF' + color.replace("#", "") + '"/><bgColor indexed="64"/></patternFill></fill>')
  ];
  const cellFormats = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>',
    '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" textRotation="255" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    ...Array.from(calendarColors.keys()).map((color, index) => '<xf numFmtId="0" fontId="0" fillId="' + (4 + index) + '" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf>')
  ];

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy"/></numFmts>' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF315C48"/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="' + fills.length + '">' + fills.join("") + '</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFD6E3D8"/></left><right style="thin"><color rgb="FFD6E3D8"/></right><top style="thin"><color rgb="FFD6E3D8"/></top><bottom style="thin"><color rgb="FFD6E3D8"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="' + cellFormats.length + '">' + cellFormats.join("") + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}

function makeXlsxWorkbook(workouts) {
  const headers = ["Kuupäev", "Trenni ID", "Kava", "Harjutus", "Seeriad", "Kordused seerias", "Raskusaste", "Minutid", "Trenni märkus"];
  const sortedWorkouts = workouts.map((workout, index) => ({ workout, index }))
    .sort((a, b) => a.workout.date.localeCompare(b.workout.date) || a.index - b.index);
  const rows = [headers];

  sortedWorkouts.forEach(({ workout, index }) => {
    workout.exercises.forEach((exercise) => {
      const level = getResistanceLevel(exercise);
      rows.push([
        { value: excelDateSerial(workout.date), date: true },
        "T" + String(index + 1).padStart(5, "0"),
        workout.planName,
        exercise.name,
        exercise.sets === "—" ? "" : exercise.sets,
        exercise.repetitions === "—" ? "" : exercise.repetitions,
        level === null ? "" : level,
        exercise.minutes === "—" ? "" : (exercise.minutes === undefined ? "" : exercise.minutes),
        workout.notes || ""
      ]);
    });
  });

  const sheetRows = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const cells = row.map((item, columnIndex) => {
      const reference = excelColumnName(columnIndex + 1) + rowNumber;
      if (rowIndex === 0) return makeWorksheetCell(reference, item, 1);
      if (item && typeof item === "object" && item.date) {
        return item.value === null ? "" : makeWorksheetCell(reference, item.value, 2, true);
      }
      const numericColumn = [4, 5, 6, 7].includes(columnIndex) && item !== "";
      return makeWorksheetCell(reference, item, null, numericColumn);
    }).join("");
    return '<row r="' + rowNumber + '">' + cells + "</row>";
  }).join("");
  const lastRow = rows.length;

  const sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<dimension ref="A1:I' + lastRow + '"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="13" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="18" customWidth="1"/><col min="4" max="4" width="30" customWidth="1"/><col min="5" max="8" width="18" customWidth="1"/><col min="9" max="9" width="42" customWidth="1"/></cols>' +
    '<sheetData>' + sheetRows + '</sheetData><autoFilter ref="A1:I' + lastRow + '"/></worksheet>';
  const calendarColors = new Map();
  workouts.forEach((workout) => {
    let color = String(workout.color || planColors[workout.planName] || "#315c48").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(color)) color = "#315C48";
    if (!calendarColors.has(color)) calendarColors.set(color, 7 + calendarColors.size);
  });
  const calendarXml = createCalendarSheet(workouts, calendarColors);
  const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="1"/></bookViews><sheets><sheet name="Treeningud" sheetId="1" r:id="rId1"/><sheet name="Kalender" sheetId="2" r:id="rId2"/></sheets></workbook>';
  const stylesXml = makeWorkbookStylesXml(calendarColors);

  return createStoredZip([
    ["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ["xl/workbook.xml", workbookXml],
    ["xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ["xl/styles.xml", stylesXml],
    ["xl/worksheets/sheet1.xml", sheetXml],
    ["xl/worksheets/sheet2.xml", calendarXml]
  ]);
}

function exportTrainingXlsx() {
  const workouts = getSavedWorkouts();
  if (workouts.length === 0) {
    alert("Salvesta kõigepealt vähemalt üks treening, et Exceli faili eksportida.");
    return;
  }

  const bytes = makeXlsxWorkbook(workouts);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = "minu-trennipaevik-" + date + ".xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importBackup(file) {
  const reader = new FileReader();

  reader.onload = () => {
    let backup;
    try {
      backup = JSON.parse(reader.result);
    } catch {
      alert("Seda faili ei saanud lugeda. Vali kehtiv varukoopia JSON-fail.");
      backupFileInput.value = "";
      return;
    }

    const validPlans = Array.isArray(backup.customPlans) &&
      backup.customPlans.every((plan) => plan && typeof plan.name === "string" &&
        Array.isArray(plan.exercises) && typeof plan.color === "string");
    const validOverrides = backup.customizedDefaultPlans &&
      typeof backup.customizedDefaultPlans === "object" &&
      !Array.isArray(backup.customizedDefaultPlans);
    const validExtraExercises = backup.extraExercises === undefined ||
      (Array.isArray(backup.extraExercises) && backup.extraExercises.every((name) => typeof name === "string"));
    const validWorkouts = Array.isArray(backup.workouts) &&
      backup.workouts.every((workout) => workout && typeof workout.date === "string" &&
        typeof workout.planName === "string" && Array.isArray(workout.exercises));

    if (backup.format !== "minu-trennipaevik-backup" || backup.version !== 1 ||
        !validPlans || !validOverrides || !validWorkouts || !validExtraExercises) {
      alert("See fail ei paista olevat Minu Trennipäeviku varukoopia.");
      backupFileInput.value = "";
      return;
    }

    const confirmed = confirm(
      "Varukoopia taastamine asendab selles veebilehitsejas olevad treeningud ja kavad. Kas jätkan?"
    );
    if (!confirmed) {
      backupFileInput.value = "";
      return;
    }

    try {
      localStorage.setItem("myTrainingDiary", JSON.stringify(backup.workouts));
      localStorage.setItem("myCustomTrainingPlans", JSON.stringify(backup.customPlans));
      localStorage.setItem("myDefaultPlanExercises", JSON.stringify(backup.customizedDefaultPlans));
      localStorage.setItem("myExtraExercises", JSON.stringify(backup.extraExercises || []));
    } catch {
      alert("Varukoopia taastamine ebaõnnestus. Veebilehitseja salvestusruumis ei pruugi olla piisavalt ruumi.");
      backupFileInput.value = "";
      return;
    }

    alert("Varukoopia taastati. Rakendus värskendatakse.");
    window.location.reload();
  };

  reader.onerror = () => {
    alert("Faili lugemine ebaõnnestus.");
    backupFileInput.value = "";
  };

  reader.readAsText(file);
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

      const key = exercise.name;
      if (!groups.has(key)) {
        groups.set(key, { key, exerciseName: exercise.name, records: [] });
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
    "<h3>" + escapeHTML(group.exerciseName) + "</h3>" +
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
    escapeHTML(group.exerciseName) + "</button>"
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
  let selected = [...exercisesByPlan[planName]];
  const editor = document.createElement("div");
  editor.className = "plan-exercise-editor";
  editor.innerHTML = '<h4>Kava harjutused</h4><ul class="selected-plan-exercises"></ul>' +
    '<fieldset class="exercise-picker"><legend>Lisa harjutusi kogust</legend><div class="available-plan-exercises"></div></fieldset>' +
    '<div class="form-actions"><button type="button" class="save-plan-exercises">Salvesta harjutused</button>' +
    '<button type="button" class="cancel-plan-exercises">Loobu</button></div>';
  exerciseArea.appendChild(editor);

  const renderEditor = () => {
    const selectedList = editor.querySelector(".selected-plan-exercises");
    selectedList.innerHTML = selected.map((name, index) =>
      "<li><span>" + escapeHTML(name) + '</span><button type="button" class="remove-plan-exercise" data-index="' +
      index + '">Eemalda</button></li>'
    ).join("");
    const available = getExerciseLibrary().filter((name) => !selected.includes(name));
    editor.querySelector(".available-plan-exercises").innerHTML = available.map((name) =>
      '<label class="exercise-choice"><input type="checkbox" value="' + escapeHTML(name) + '"> ' +
      escapeHTML(name) + "</label>"
    ).join("") || "<p>Kõik kogus olevad harjutused on juba kavas.</p>";
  };

  editor.addEventListener("click", (event) => {
    const remove = event.target.closest(".remove-plan-exercise");
    if (remove) {
      selected.splice(Number(remove.dataset.index), 1);
      renderEditor();
    }
    if (event.target.closest(".save-plan-exercises")) {
      if (selected.length === 0) {
        alert("Kavas peab olema vähemalt üks harjutus.");
        return;
      }
      exercisesByPlan[planName] = selected;
      const customPlan = customPlans.find((plan) => plan.name === planName);
      if (customPlan) {
        customPlan.exercises = selected;
        localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));
      } else {
        customizedDefaultPlans[planName] = selected;
        localStorage.setItem("myDefaultPlanExercises", JSON.stringify(customizedDefaultPlans));
      }
      showPlan(planName);
      renderExerciseLibrary();
    }
    if (event.target.closest(".cancel-plan-exercises")) showPlan(planName);
  });
  editor.addEventListener("change", (event) => {
    if (event.target.matches(".available-plan-exercises input:checked")) {
      selected.push(event.target.value);
      renderEditor();
    }
  });
  renderEditor();
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

  const plan = customPlans.find((item) => item.name === oldName);
  const color = planColors[oldName];
  plan.name = newName;
  plan.exercises = exercisesByPlan[oldName];
  delete exercisesByPlan[oldName];
  delete planColors[oldName];
  exercisesByPlan[newName] = plan.exercises;
  planColors[newName] = color;

  localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));
  
renderCustomPlanButtons();
  renderExerciseLibrary();
  showPlan(newName);
}

function deleteCustomPlan(planName) {
  if (!confirm('Kas kustutad kava "' + planName + '"?')) return;

  customPlans = customPlans.filter((plan) => plan.name !== planName);
  delete exercisesByPlan[planName];
  delete planColors[planName];
  localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));
  
renderCustomPlanButtons();
  renderExerciseLibrary();

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

exerciseLibraryList.addEventListener("click", (event) => {
  const button = event.target.closest(".add-library-exercise");
  const removeButton = event.target.closest(".remove-library-exercise");
  if (removeButton) {
    const exerciseName = removeButton.dataset.exerciseName;
    const confirmed = confirm('Kas eemaldad harjutuse „' + exerciseName + '” harjutuste kogust ja kõigist kavadest? Salvestatud treeningajalugu jääb alles.');
    if (!confirmed) return;

    extraExercises = extraExercises.filter((name) => name !== exerciseName);
    localStorage.setItem("myExtraExercises", JSON.stringify(extraExercises));

    Object.keys(exercisesByPlan).forEach((planName) => {
      const remaining = exercisesByPlan[planName].filter((name) => name !== exerciseName);
      if (remaining.length === exercisesByPlan[planName].length) return;
      exercisesByPlan[planName] = remaining;

      const customPlan = customPlans.find((plan) => plan.name === planName);
      if (customPlan) {
        customPlan.exercises = remaining;
      } else {
        customizedDefaultPlans[planName] = remaining;
      }
    });

    localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));
    localStorage.setItem("myDefaultPlanExercises", JSON.stringify(customizedDefaultPlans));
    renderExerciseLibrary();
    if (planTitle.textContent.endsWith(" kava")) showPlan(planTitle.textContent.replace(/ kava$/, ""));
    return;
  }
  if (!button) return;

  const planName = libraryTargetPlan.value;
  const exerciseName = button.dataset.exerciseName;
  const exercises = exercisesByPlan[planName];
  if (exercises.includes(exerciseName)) {
    alert("See harjutus on juba valitud kavas olemas.");
    return;
  }

  exercises.push(exerciseName);
  const customPlan = customPlans.find((plan) => plan.name === planName);
  if (customPlan) {
    customPlan.exercises = exercises;
    localStorage.setItem("myCustomTrainingPlans", JSON.stringify(customPlans));
  } else {
    customizedDefaultPlans[planName] = exercises;
    localStorage.setItem("myDefaultPlanExercises", JSON.stringify(customizedDefaultPlans));
  }

  renderExerciseLibrary();
  if (planTitle.textContent === planName + " kava") showPlan(planName);
  alert('Harjutus „' + exerciseName + '” lisati kavasse „' + planName + '”.');
});

addLibraryExerciseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#new-library-exercise");
  const name = input.value.trim();
  const alreadyExists = getExerciseLibrary().some((exercise) =>
    exercise.toLocaleLowerCase("et") === name.toLocaleLowerCase("et")
  );
  if (alreadyExists) {
    alert("Selline harjutus on juba nimekirjas.");
    return;
  }

  extraExercises.push(name);
  localStorage.setItem("myExtraExercises", JSON.stringify(extraExercises));
  input.value = "";
  renderExerciseLibrary();
  alert('Harjutus „' + name + '” lisati nimekirja. Nüüd saad selle kava juurde lisada.');
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
  if (!addPlanForm.hidden) {
    pendingPlanExercises = [];
    renderNewPlanPicker();
  }
});

document.querySelector("#cancel-add-plan").addEventListener("click", () => {
  addPlanForm.reset();
  pendingPlanExercises = [];
  addPlanForm.hidden = true;
});

newPlanExercisePicker.addEventListener("change", (event) => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  if (event.target.checked) pendingPlanExercises.push(event.target.value);
  else pendingPlanExercises = pendingPlanExercises.filter((name) => name !== event.target.value);
});

addPlanForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#new-plan-name").value.trim();

  if (exercisesByPlan[name]) {
    alert("Sellise nimega kava on juba olemas. Vali teine nimi.");
    return;
  }

  const exercises = [...pendingPlanExercises];
  if (exercises.length === 0) {
    alert("Vali kavasse vähemalt üks harjutus.");
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
  pendingPlanExercises = [];
  addPlanForm.hidden = true;
  showPlan(name);
  renderExerciseLibrary();
});

document.querySelector("#previous-month").addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector("#next-month").addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
  renderCalendar();
});


exportBackupButton.addEventListener("click", exportBackup);
exportXlsxButton.addEventListener("click", exportTrainingXlsx);

importBackupButton.addEventListener("click", () => {
  backupFileInput.click();
});

backupFileInput.addEventListener("change", () => {
  const file = backupFileInput.files[0];
  if (file) importBackup(file);
});
renderCustomPlanButtons();
renderExerciseLibrary();
renderHistory();
renderCalendar();
renderProgress();
showView("training-view");






