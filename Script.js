/* =========================================================
   DATOS DE EJEMPLO (estructura definida en el Paso 1)
   Esto se usa solo la primera vez, antes de que exista algo
   guardado en localStorage o hayas subido tu primer archivo.
   ========================================================= */
let trainingData = {
  lastUpdated: "2026-07-16",
  courseList: ["FOD", "ESPACIOS CONFINADOS", "SAFETY CULTURE", "CRISIS MANAGEMENT", "AVIATION SAFETY", "HUMAN FACTORS"],
  siglumGroups: {
    "TAOA": ["TAOAA", "TAOAE", "TAOAF", "TAOAI", "TAOAP", "TAOAT", "TAOAX"]
  },
  employees: [
    { employeeId: "10234", name: "Laura Gómez", siglum: "TAOAA", managerName: "Ana Ruiz",
      courses: { "FOD": { initialTraining: { status: "Completed", date: "2022-03-14" }, mostRecent: { status: "Completed", date: "2025-04-02", courseName: "FOD Recurrent 2025" } } } },
    { employeeId: "10871", name: "Marcos Iglesias", siglum: "TAOAE", managerName: "Pedro Salas",
      courses: { "FOD": { initialTraining: { status: "Completed", date: "2021-11-09" }, mostRecent: { status: "Pending", date: null, courseName: null } } } },
    { employeeId: "11045", name: "Beatriz Núñez", siglum: "TAOAF", managerName: "Carla Ortiz",
      courses: { "FOD": { initialTraining: { status: "Pending", date: null }, mostRecent: { status: "Pending", date: null, courseName: null } } } },
    { employeeId: "11322", name: "Iván Castro", siglum: "TAOAP", managerName: "Sofía León",
      courses: { "FOD": { initialTraining: { status: "Completed", date: "2020-06-22" }, mostRecent: { status: "Completed", date: "2024-06-30", courseName: "FOD Recurrent 2024" } } } },
    { employeeId: "11890", name: "Elena Vidal", siglum: "TAOAX", managerName: "Ana Ruiz",
      courses: { "FOD": { initialTraining: { status: "Completed", date: "2023-01-17" }, mostRecent: { status: "Completed", date: "2025-01-20", courseName: "FOD Recurrent 2025" } } } }
  ],
  // Resumen precalculado de ejemplo, tal como lo indicaste (solo disponible para FOD por ahora)
  summaryByCourse: {
    "FOD": {
      columns: ["TAOA(X)", "TAOA", "TAOAA", "TAOAE", "TAOAF", "TAOAI", "TAOAP", "TAOAT", "TAOAX"],
      population: [291, 15, 99, 35, 41, 19, 4, 68, 10],
      completed:  [277, 14, 94, 31, 37, 19, 4, 68, 10],
      pending:    [14, 1, 5, 4, 4, 0, 0, 0, 0]
    }
  },
  // Histórico mensual del % Total por curso, para el gráfico anual.
  // Formato: history[curso]["AAAA-MM"] = { population, completed, pct }
  history: {}
};

/* =========================================================
   PASO 4 — PERSISTENCIA (localStorage) + EXPORTAR/IMPORTAR
   ========================================================= */
const STORAGE_KEY = "mandatoryTrainingsData";

function saveToStorage(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trainingData));
    document.getElementById("storageStatus").textContent = `Guardado en este navegador · última actualización ${trainingData.lastUpdated}`;
  }catch(err){
    console.error(err);
    document.getElementById("storageStatus").textContent = "⚠ No se ha podido guardar en este navegador (¿modo privado o espacio lleno?).";
  }
}

function loadFromStorage(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return false;
  try{
    const parsed = JSON.parse(raw);
    if(parsed && Array.isArray(parsed.employees) && Array.isArray(parsed.courseList)){
      parsed.history = parsed.history || {};
      trainingData = parsed;
      return true;
    }
  }catch(err){
    console.error("No se pudo leer lo guardado en este navegador:", err);
  }
  return false;
}

/* Reconstruye los 3 desplegables de curso a partir del
   trainingData actual (necesario tras cargar/importar datos) */
function buildCourseSelects(){
  [detailSelect, summarySelect, uploadSelect].forEach(sel => { sel.innerHTML = ""; });
  trainingData.courseList.forEach(course => {
    detailSelect.appendChild(new Option(course, course));
    summarySelect.appendChild(new Option(course, course));
    uploadSelect.appendChild(new Option(course, course));
  });
}

/* Carga un objeto trainingData completo (localStorage o
   importación) y refresca toda la interfaz */
function loadData(data){
  data.history = data.history || {};
  trainingData = data;
  document.getElementById("lastUpdated").textContent = trainingData.lastUpdated;
  buildCourseSelects();
  renderDetailTable(detailSelect.value);
  renderSummaryPanel(summarySelect.value);
}

/* ---------- INIT ---------- */
const hadStoredData = loadFromStorage();
document.getElementById("lastUpdated").textContent = trainingData.lastUpdated;
document.getElementById("storageStatus").textContent = hadStoredData
  ? `Guardado en este navegador · última actualización ${trainingData.lastUpdated}`
  : "Mostrando datos de ejemplo · sube tu primer archivo para empezar";

const detailSelect = document.getElementById("courseSelectDetail");
const summarySelect = document.getElementById("courseSelectSummary");
const uploadSelect = document.getElementById("courseSelectUpload");
const uploadMonthSelect = document.getElementById("uploadMonth");
const uploadYearInput = document.getElementById("uploadYear");
const chartYearSelect = document.getElementById("chartYearSelect");

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

buildCourseSelects();

/* Selector de mes/año de subida: por defecto, el mes y año actuales */
const today = new Date();
MONTH_NAMES.forEach((name, i) => uploadMonthSelect.appendChild(new Option(name, String(i + 1).padStart(2, "0"))));
uploadMonthSelect.value = String(today.getMonth() + 1).padStart(2, "0");
uploadYearInput.value = today.getFullYear();

/* ---------- TABS ---------- */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    document.getElementById(tab.dataset.panel).classList.add("is-active");
  });
});

/* ---------- STATUS BADGE HELPER ---------- */
const STATUS_LABELS = {
  Completed: { label: "Completado", cls: "status--completed" },
  Expired:   { label: "Caducado",   cls: "status--expired" },
  Pending:   { label: "Pendiente",  cls: "status--pending" },
  Exempt:    { label: "Exento",     cls: "status--exempt" }
};

function statusBadge(status, date){
  const s = STATUS_LABELS[status] || STATUS_LABELS.Pending;
  const dateLabel = date ? new Date(date).toLocaleDateString("es-ES") : "—";
  return `<span class="status ${s.cls}"><span class="status__dot"></span>${s.label}</span></br><span style="color:var(--color-text-muted); font-size:12px;">${dateLabel}</span>`;
}

/* ---------- RENDER: INFORME DETALLADO ---------- */
function renderDetailTable(course){
  const wrap = document.getElementById("detailTableWrap");
  const searchTerm = normalizeHeader(document.getElementById("searchInput").value);
  const statusValue = document.getElementById("statusFilter").value;

  const allRows = trainingData.employees.filter(e => e.courses[course]);

  const rows = allRows.filter(e => {
    const c = e.courses[course];
    const matchesSearch = !searchTerm ||
      normalizeHeader(e.name).includes(searchTerm) ||
      normalizeHeader(e.siglum).includes(searchTerm);
    const matchesStatus = statusValue === "all" || c.mostRecent.status === statusValue;
    return matchesSearch && matchesStatus;
  });

  document.getElementById("detailCount").textContent = allRows.length
    ? `${rows.length} de ${allRows.length} empleados con datos para ${course}`
    : "";

  if(!allRows.length){
    wrap.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Todavía no hay datos para ${course}</p>
        <p class="empty-state__hint">Sube el archivo Excel mensual con este curso para generar el informe detallado.</p>
      </div>`;
    return;
  }

  if(!rows.length){
    wrap.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Sin resultados</p>
        <p class="empty-state__hint">Ningún empleado de ${course} coincide con la búsqueda o el filtro aplicado.</p>
      </div>`;
    return;
  }

  // Los cursos sin "recurrente" (p.ej. Human Factors) solo tienen un Estado.
  // Miramos el primer registro para decidir cómo pintar las columnas.
  const hasRecurrent = rows[0].courses[course].hasRecurrent !== false;

  const body = rows.map(e => {
    const c = e.courses[course];
    return hasRecurrent ? `
      <tr>
        <td>${e.name}</td>
        <td class="cell-id">${e.employeeId}</td>
        <td class="cell-siglum">${e.siglum}</td>
        <td>${e.managerName}</td>
        <td>${statusBadge(c.initialTraining.status, c.initialTraining.date)}</td>
        <td>${statusBadge(c.mostRecent.status, c.mostRecent.date)}</td>
        <td>${c.mostRecent.courseName ?? "—"}</td>
      </tr>` : `
      <tr>
        <td>${e.name}</td>
        <td class="cell-id">${e.employeeId}</td>
        <td class="cell-siglum">${e.siglum}</td>
        <td>${e.managerName}</td>
        <td>${statusBadge(c.mostRecent.status, c.mostRecent.date)}</td>
      </tr>`;
  }).join("");

  const extraHeaders = hasRecurrent
    ? `<th>${course} Initial Training</th><th>Curso Más Reciente</th><th>Nombre del Curso</th>`
    : `<th>Estado</th>`;

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Employee ID</th>
          <th>Siglum</th>
          <th>User Manager Name</th>
          ${extraHeaders}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

/* ---------- RENDER: RESUMEN POR SIGLUM ---------- */
function renderSummaryTable(course){
  const wrap = document.getElementById("summaryTableWrap");
  const data = trainingData.summaryByCourse[course];

  if(!data){
    wrap.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Todavía no hay resumen para ${course}</p>
        <p class="empty-state__hint">El resumen por Siglum se calculará automáticamente al subir el archivo de este curso.</p>
      </div>`;
    return;
  }

  const headerCells = data.columns.map((c, i) =>
    `<th class="${i === 1 ? 'col-parent' : ''}">${c}</th>`).join("");

  function dataRow(label, values){
    const cells = values.map((v, i) => `<td class="${i === 1 ? 'col-parent' : ''}">${v}</td>`).join("");
    return `<tr><td>${label}</td>${cells}</tr>`;
  }

  const totalPct = data.population.map((pop, i) => ((data.completed[i] / pop) * 100).toFixed(2).replace(".", ",") + "%");

  wrap.innerHTML = `
    <table class="summary-table">
      <thead><tr><th></th>${headerCells}</tr></thead>
      <tbody>
        ${dataRow("Population", data.population)}
        ${dataRow("Completed", data.completed)}
        ${dataRow("Pending", data.pending)}
        <tr class="row-total">${dataRow("Total", totalPct)}</tr>
      </tbody>
    </table>`;
}

/* ---------- GRÁFICO ANUAL (Chart.js) ---------- */
let summaryChartInstance = null;

/* Rellena el desplegable de Año con los años que existan en el
   histórico de ese curso (más el año actual si no hay ninguno) */
function populateChartYearSelect(course){
  const years = Object.keys(trainingData.history[course] || {})
    .map(k => k.split("-")[0]);
  const uniqueYears = [...new Set(years)].sort();
  if(!uniqueYears.length) uniqueYears.push(String(new Date().getFullYear()));

  const previousValue = chartYearSelect.value;
  chartYearSelect.innerHTML = "";
  uniqueYears.forEach(y => chartYearSelect.appendChild(new Option(y, y)));

  chartYearSelect.value = uniqueYears.includes(previousValue) ? previousValue : uniqueYears[uniqueYears.length - 1];
}

function renderSummaryChart(course, year){
  const ctx = document.getElementById("summaryChart").getContext("2d");
  const history = trainingData.history[course] || {};

  const values = MONTH_NAMES.map((_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return history[key] ? Number(history[key].pct.toFixed(2)) : null;
  });

  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, "#7FA0D6");
  gradient.addColorStop(1, "#2E5AA8");

  if(summaryChartInstance) summaryChartInstance.destroy();

  summaryChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: MONTH_NAMES,
      datasets: [{
        label: `${course} — % Total`,
        data: values,
        backgroundColor: gradient,
        borderRadius: 2,
        maxBarThickness: 46
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: course, font: { family: "IBM Plex Sans Condensed", size: 20, weight: "700" }, color: "#12233D", padding: { bottom: 18 } },
        tooltip: {
          callbacks: {
            label: ctx2 => ctx2.raw === null ? "Sin datos" : `${ctx2.raw}%`
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 120,
          ticks: { stepSize: 20, callback: v => v + "%", color: "#667085" },
          grid: { color: "#E1E5EA" }
        },
        x: {
          ticks: { color: "#667085", maxRotation: 45, minRotation: 45 },
          grid: { display: false }
        }
      }
    }
  });
}

/* Refresca tabla + selector de año + gráfico juntos, para no
   olvidarnos de ninguno al cambiar de curso o subir un archivo */
function renderSummaryPanel(course){
  renderSummaryTable(course);
  populateChartYearSelect(course);
  renderSummaryChart(course, chartYearSelect.value);
}

/* ---------- EVENTS ---------- */
detailSelect.addEventListener("change", e => renderDetailTable(e.target.value));
summarySelect.addEventListener("change", e => renderSummaryPanel(e.target.value));
chartYearSelect.addEventListener("change", () => renderSummaryChart(summarySelect.value, chartYearSelect.value));
document.getElementById("searchInput").addEventListener("input", () => renderDetailTable(detailSelect.value));
document.getElementById("statusFilter").addEventListener("change", () => renderDetailTable(detailSelect.value));

/* =========================================================
   PASO 3 — LECTURA DE EXCEL (SheetJS)
   ========================================================= */

/* Quita acentos, pasa a minúsculas y recorta espacios, para
   poder comparar cabeceras sin depender de mayúsculas/tildes */
function normalizeHeader(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/* Lee TODAS las hojas del archivo y las devuelve como
   { nombreHoja: filasEnBruto (array de arrays) } */
function readWorkbook(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = evt => {
      try{
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheets = {};
        workbook.SheetNames.forEach(name => {
          sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null });
        });
        resolve(sheets);
      }catch(err){ reject(err); }
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsArrayBuffer(file);
  });
}

/* Busca, dentro de las filas de UNA hoja, la fila de cabeceras
   (la que contiene "Employee ID") y localiza en qué columna
   está cada dato. Soporta tanto una única columna "Nombre" como
   "User Last Name" + "User First Name" por separado. Como
   "Estado" y "Fecha" aparecen dos veces (Initial Training y
   Curso Más Reciente), nos quedamos con la 1ª y 2ª aparición. */
function findDetailColumns(rows){
  const headerRowIndex = rows.findIndex(row =>
    Array.isArray(row) && row.some(cell => normalizeHeader(cell).includes("employee id"))
  );
  if(headerRowIndex === -1) return null;

  const headerRow = rows[headerRowIndex];
  const findFirst = predicate => headerRow.findIndex(c => predicate(normalizeHeader(c)));

  const findAllContaining = (...targets) => headerRow.reduce((acc, c, i) => {
    const n = normalizeHeader(c);
    if(targets.some(t => n.includes(t))) acc.push(i);
    return acc;
  }, []);

  const cols = {
    lastName: findFirst(n => n.includes("last name")),
    firstName: findFirst(n => n.includes("first name")),
    name: findFirst(n => n.includes("nombre") && !n.includes("curso")),
    employeeId: findFirst(n => n.includes("employee id")),
    siglum: findFirst(n => n.includes("siglum")),
    manager: findFirst(n => n.includes("manager")),
    courseName: findFirst(n => n.includes("nombre del curso"))
  };

  // Búsqueda flexible: cubre "Estado"/"Status" y "Fecha"/"Date"/
  // "Completed date" (algunos cursos usan una etiqueta distinta
  // para la columna de fecha, no siempre literalmente "Fecha").
  const statusCols = findAllContaining("estado", "status");
  const dateCols = findAllContaining("fecha", "date");

  if(cols.employeeId === -1 || cols.siglum === -1 || statusCols.length < 1 || dateCols.length < 1){
    return null;
  }

  /* Algunos cursos (p.ej. Human Factors) solo tienen UN estado,
     sin distinción Initial Training / Curso Más Reciente. En ese
     caso usamos la misma columna para ambos y lo marcamos con
     hasRecurrent = false, para que la tabla no muestre 2 columnas
     idénticas. */
  cols.hasRecurrent = statusCols.length > 1 && dateCols.length > 1;
  cols.statusInitial = statusCols[0];
  cols.dateInitial = dateCols[0];
  cols.statusRecent = cols.hasRecurrent ? statusCols[1] : statusCols[0];
  cols.dateRecent = cols.hasRecurrent ? dateCols[1] : dateCols[0];

  return { headerRowIndex, cols };
}

/* Clasifica el texto de "Estado" en 4 categorías. "Completado" y
   "Exento" cuentan como formación vigente; "Pendiente" y
   "Caducado" cuentan como acción pendiente (así coincide con el
   resumen oficial: 276 Completed + 1 Exempt = 277 Completed). */
function classifyStatus(val){
  const n = normalizeHeader(val);
  if(!n) return "Pending";
  if(n.includes("exempt") || n.includes("exent")) return "Exempt";
  if(n.includes("caduc") || n.includes("expired")) return "Expired";
  if(n.includes("complet")) return "Completed";
  return "Pending";
}

function isCompliant(status){
  return status === "Completed" || status === "Exempt";
}

/* Acepta fechas ya parseadas por SheetJS (Date) o texto en
   formato dd/mm/aaaa o aaaa-mm-dd */
function formatDateCell(val){
  if(val === null || val === undefined || val === "") return null;
  if(val instanceof Date && !isNaN(val)) return val.toISOString().slice(0, 10);
  const str = String(val).trim();
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return str || null;
}

/* Convierte las filas en bruto de la hoja de detalle en objetos
   limpios, saltando filas sin Employee ID */
function extractEmployeeRows(rows, headerRowIndex, cols){
  const out = [];
  for(let i = headerRowIndex + 1; i < rows.length; i++){
    const row = rows[i];
    if(!row) continue;
    const employeeId = row[cols.employeeId];
    if(employeeId === null || employeeId === undefined || String(employeeId).trim() === "") continue;

    let name = null;
    if(cols.lastName > -1 || cols.firstName > -1){
      const last = cols.lastName > -1 ? (row[cols.lastName] || "") : "";
      const first = cols.firstName > -1 ? (row[cols.firstName] || "") : "";
      name = [last, first].filter(Boolean).join(", ") || null;
    }else if(cols.name > -1){
      name = row[cols.name];
    }

    out.push({
      employeeId: String(employeeId).trim(),
      name,
      siglum: row[cols.siglum] ? String(row[cols.siglum]).trim() : null,
      managerName: cols.manager > -1 ? row[cols.manager] : null,
      hasRecurrent: cols.hasRecurrent,
      initialStatus: classifyStatus(row[cols.statusInitial]),
      initialDate: formatDateCell(row[cols.dateInitial]),
      recentStatus: classifyStatus(row[cols.statusRecent]),
      recentDate: formatDateCell(row[cols.dateRecent]),
      courseName: cols.courseName > -1 ? (row[cols.courseName] || null) : null
    });
  }
  return out;
}

/* Inserta o actualiza empleados en trainingData a partir de las
   filas ya extraídas para un curso concreto */
function mergeEmployees(course, parsedRows){
  parsedRows.forEach(p => {
    let emp = trainingData.employees.find(e => e.employeeId === p.employeeId);
    if(!emp){
      emp = { employeeId: p.employeeId, name: p.name, siglum: p.siglum, managerName: p.managerName, courses: {} };
      trainingData.employees.push(emp);
    }else{
      emp.name = p.name || emp.name;
      emp.siglum = p.siglum || emp.siglum;
      emp.managerName = p.managerName || emp.managerName;
    }
    emp.courses[course] = {
      hasRecurrent: p.hasRecurrent,
      initialTraining: { status: p.initialStatus, date: p.initialDate },
      mostRecent: { status: p.recentStatus, date: p.recentDate, courseName: p.courseName }
    };
  });
}

/* Busca, dentro de las filas de UNA hoja, una tabla de resumen ya
   calculada con etiquetas "Population" / "Completed" / "Pending"
   en alguna columna, y una fila de cabeceras de Siglum justo
   encima. Si la encuentra, devolvemos esos números TAL CUAL
   (son los oficiales de tu organización), sin recalcular nada. */
function findPrecomputedSummary(rows){
  const rowLabelIndex = (row, label) => Array.isArray(row) ? row.findIndex(c => normalizeHeader(c) === label) : -1;

  let popRow = -1, compRow = -1, pendRow = -1;
  rows.forEach((row, i) => {
    if(rowLabelIndex(row, "population") > -1) popRow = i;
    if(rowLabelIndex(row, "completed") > -1) compRow = i;
    if(rowLabelIndex(row, "pending") > -1) pendRow = i;
  });
  if(popRow === -1 || compRow === -1) return null; // PENDING es opcional: si falta, se calcula

  let headerRowIdx = -1;
  for(let i = popRow - 1; i >= 0; i--){
    const row = rows[i];
    if(row && row.filter(c => c !== null && String(c).trim() !== "").length >= 2){
      headerRowIdx = i;
      break;
    }
  }
  if(headerRowIdx === -1) return null;

  const headerCells = rows[headerRowIdx];
  const popCells = rows[popRow];
  const compCells = rows[compRow];
  const pendCells = pendRow > -1 ? rows[pendRow] : null;

  const columns = [], population = [], completed = [], pending = [];
  headerCells.forEach((cell, i) => {
    if(cell === null || String(cell).trim() === "") return;
    const pop = Number(popCells[i]);
    if(isNaN(pop)) return;
    const comp = Number(compCells[i]) || 0;
    columns.push(String(cell).trim());
    population.push(pop);
    completed.push(comp);
    pending.push(pendCells ? (Number(pendCells[i]) || 0) : (pop - comp));
  });

  return columns.length ? { columns, population, completed, pending } : null;
}

/* Recalcula la tabla POPULATION / COMPLETED / PENDING por Siglum
   SOLO cuando el archivo no trae ya una hoja de resumen. Agrupa
   por prefijo (p.ej. "TAOAA31" pertenece al grupo "TAOAA"), y
   cuenta como Completed: Completed + Exempt. */
function computeSummary(course){
  const employeesForCourse = trainingData.employees.filter(e => e.courses[course]);
  const columns = [], population = [], completed = [];
  const covered = new Set();

  Object.entries(trainingData.siglumGroups).forEach(([parent, children]) => {
    const sortedChildren = [...children].sort((a, b) => b.length - a.length);
    const childMatches = new Map(children.map(c => [c, []]));
    const parentOnly = [];

    employeesForCourse.forEach(e => {
      const sig = e.siglum || "";
      if(!sig.startsWith(parent)) return;
      const child = sortedChildren.find(c => sig.startsWith(c));
      if(child) childMatches.get(child).push(e);
      else parentOnly.push(e);
    });

    const allInGroup = [...parentOnly, ...[].concat(...childMatches.values())];
    allInGroup.forEach(e => covered.add(e.employeeId));

    columns.push(`${parent}(X)`);
    population.push(allInGroup.length);
    completed.push(allInGroup.filter(e => isCompliant(e.courses[course].mostRecent.status)).length);

    columns.push(parent);
    population.push(parentOnly.length);
    completed.push(parentOnly.filter(e => isCompliant(e.courses[course].mostRecent.status)).length);

    children.forEach(child => {
      const emps = childMatches.get(child);
      columns.push(child);
      population.push(emps.length);
      completed.push(emps.filter(e => isCompliant(e.courses[course].mostRecent.status)).length);
    });
  });

  const other = employeesForCourse.filter(e => !covered.has(e.employeeId));
  if(other.length){
    columns.push("OTROS");
    population.push(other.length);
    completed.push(other.filter(e => isCompliant(e.courses[course].mostRecent.status)).length);
  }

  const pending = population.map((p, i) => p - completed[i]);
  trainingData.summaryByCourse[course] = { columns, population, completed, pending };
}

function showUploadFeedback(msg, type){
  const el = document.getElementById("uploadFeedback");
  el.textContent = msg;
  el.className = `upload-feedback upload-feedback--${type}`;
  el.hidden = false;
}

/* Detecta el mes (y el año, si aparece) a partir del NOMBRE del
   archivo, buscando "ene", "feb", "mar"... como palabra suelta
   (mayúsculas o minúsculas, con o sin tilde). Si no encuentra
   nada, devuelve month/year = null y se usa lo que haya
   seleccionado a mano en los desplegables. */
const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function detectMonthYearFromFilename(filename){
  const name = normalizeHeader(filename);
  let month = null;
  for(let i = 0; i < MONTH_ABBR.length; i++){
    const re = new RegExp(`(^|[^a-z])${MONTH_ABBR[i]}([^a-z]|$)`);
    if(re.test(name)){ month = i + 1; break; }
  }
  const yearMatch = name.match(/(19|20)\d{2}/);
  return { month, year: yearMatch ? yearMatch[0] : null };
}

/* Guarda en el histórico el % Total del curso para un mes/año
   concretos, usando la columna de gran total (la 1ª, p.ej.
   "TAOA(X)") de trainingData.summaryByCourse[course]. */
function saveMonthlySnapshot(course, year, month){
  const summary = trainingData.summaryByCourse[course];
  if(!summary || !summary.population.length) return;

  const population = summary.population[0];
  const completed = summary.completed[0];
  if(!population) return;

  trainingData.history[course] = trainingData.history[course] || {};
  trainingData.history[course][`${year}-${month}`] = {
    population,
    completed,
    pct: (completed / population) * 100
  };
}

/* ---------- EVENTOS DE SUBIDA ---------- */
document.getElementById("uploadBtn").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if(!file) return;
  const course = uploadSelect.value;

  const detected = detectMonthYearFromFilename(file.name);
  let dateNote = `${MONTH_NAMES[Number(uploadMonthSelect.value) - 1]} ${uploadYearInput.value} (seleccionado a mano)`;
  if(detected.month){
    uploadMonthSelect.value = String(detected.month).padStart(2, "0");
    if(detected.year) uploadYearInput.value = detected.year;
    dateNote = `${MONTH_NAMES[detected.month - 1]} ${uploadYearInput.value} (detectado del nombre del archivo)`;
  }

  showUploadFeedback(`Procesando "${file.name}" para ${course} · ${dateNote}...`, "info");

  try{
    const sheets = await readWorkbook(file);

    let detailInfo = null, summaryData = null;
    for(const rows of Object.values(sheets)){
      if(!detailInfo){
        const found = findDetailColumns(rows);
        if(found) detailInfo = { rows, ...found };
      }
      if(!summaryData){
        summaryData = findPrecomputedSummary(rows);
      }
    }

    if(!detailInfo && !summaryData){
      showUploadFeedback('No se ha encontrado ni una hoja de detalle (columna "Employee ID") ni una hoja de resumen (con "Population/Completed/Pending") en este archivo.', "error");
      return;
    }

    let importedCount = 0;
    if(detailInfo){
      const parsed = extractEmployeeRows(detailInfo.rows, detailInfo.headerRowIndex, detailInfo.cols);
      mergeEmployees(course, parsed);
      importedCount = parsed.length;
    }

    if(summaryData){
      trainingData.summaryByCourse[course] = summaryData;
    }else if(detailInfo){
      computeSummary(course);
    }

    saveMonthlySnapshot(course, uploadYearInput.value, uploadMonthSelect.value);

    trainingData.lastUpdated = new Date().toISOString().slice(0, 10);
    document.getElementById("lastUpdated").textContent = trainingData.lastUpdated;
    saveToStorage();

    if(detailSelect.value === course) renderDetailTable(course);
    if(summarySelect.value === course) renderSummaryPanel(course);

    const parts = [];
    if(importedCount) parts.push(`${importedCount} empleados`);
    parts.push(summaryData ? "resumen oficial de la hoja" : (detailInfo ? "resumen recalculado" : ""));
    showUploadFeedback(`✔ ${course} actualizado: ${parts.filter(Boolean).join(" · ")} · guardado en histórico de ${dateNote} (desde "${file.name}").`, "success");
  }catch(err){
    console.error(err);
    showUploadFeedback(`Error al leer el archivo: ${err.message}`, "error");
  }finally{
    e.target.value = "";
  }
});

/* =========================================================
   EXPORTAR / IMPORTAR / BORRAR
   ========================================================= */
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(trainingData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mandatory-trainings-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importInput").click();
});

document.getElementById("importInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try{
      const parsed = JSON.parse(evt.target.result);
      if(!parsed || !Array.isArray(parsed.employees) || !Array.isArray(parsed.courseList)){
        throw new Error("El archivo no tiene la estructura esperada (faltan employees/courseList).");
      }
      loadData(parsed);
      saveToStorage();
      showUploadFeedback(`✔ Copia importada desde "${file.name}" (${parsed.employees.length} empleados).`, "success");
    }catch(err){
      console.error(err);
      showUploadFeedback(`Error al importar el JSON: ${err.message}`, "error");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("resetBtn").addEventListener("click", () => {
  const confirmed = confirm("Esto borrará todos los datos guardados en este navegador de forma permanente. ¿Seguro que quieres continuar? (Puedes exportar una copia antes si no lo has hecho.)");
  if(!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

/* ---------- PRIMER RENDERIZADO ---------- */
renderDetailTable(detailSelect.value);
renderSummaryPanel(summarySelect.value);
