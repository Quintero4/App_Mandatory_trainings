/* =========================================================
   SUBGRUPOS
   Cuando un curso trae varias hojas de detalle o varios
   bloques de resumen dentro del mismo archivo (p.ej. "WC" y
   "BC" en Safety Culture), cada uno se trata como un
   subgrupo independiente: su propia tabla de detalle
   (filtrable desde el desplegable "Subgrupo"), su propia
   tabla de resumen y su propio gráfico anual.
   SUBGROUP_NONE es la clave interna que se usa para los
   cursos que NO tienen subgrupos (comportamiento igual que
   antes: una sola tabla/resumen/gráfico).
   ========================================================= */
const SUBGROUP_NONE = "__ALL__";

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
  // Qué subgrupos existen (si los hay) para cada curso, p.ej.
  // { "SAFETY CULTURE": ["BC", "WC"] }. Curso sin entrada (o
  // array vacío) = sin subgrupos, comportamiento clásico.
  subgroupsByCourse: {},
  employees: [
    { employeeId: "10234", name: "Laura Gómez", siglum: "TAOAA", managerName: "Ana Ruiz",
      courses: { "FOD": { subgroup: SUBGROUP_NONE, hasRecurrent: true, initialTraining: { status: "Completed", date: "2022-03-14" }, mostRecent: { status: "Completed", date: "2025-04-02", courseName: "FOD Recurrent 2025" } } } },
    { employeeId: "10871", name: "Marcos Iglesias", siglum: "TAOAE", managerName: "Pedro Salas",
      courses: { "FOD": { subgroup: SUBGROUP_NONE, hasRecurrent: true, initialTraining: { status: "Completed", date: "2021-11-09" }, mostRecent: { status: "Pending", date: null, courseName: null } } } },
    { employeeId: "11045", name: "Beatriz Núñez", siglum: "TAOAF", managerName: "Carla Ortiz",
      courses: { "FOD": { subgroup: SUBGROUP_NONE, hasRecurrent: true, initialTraining: { status: "Pending", date: null }, mostRecent: { status: "Pending", date: null, courseName: null } } } },
    { employeeId: "11322", name: "Iván Castro", siglum: "TAOAP", managerName: "Sofía León",
      courses: { "FOD": { subgroup: SUBGROUP_NONE, hasRecurrent: true, initialTraining: { status: "Completed", date: "2020-06-22" }, mostRecent: { status: "Completed", date: "2024-06-30", courseName: "FOD Recurrent 2024" } } } },
    { employeeId: "11890", name: "Elena Vidal", siglum: "TAOAX", managerName: "Ana Ruiz",
      courses: { "FOD": { subgroup: SUBGROUP_NONE, hasRecurrent: true, initialTraining: { status: "Completed", date: "2023-01-17" }, mostRecent: { status: "Completed", date: "2025-01-20", courseName: "FOD Recurrent 2025" } } } }
  ],
  // Resumen precalculado de ejemplo, tal como lo indicaste (solo disponible para FOD por ahora).
  // Cada curso es ahora un objeto { subgrupo: {columns,population,completed,pending} };
  // los cursos sin subgrupos usan la clave SUBGROUP_NONE.
  summaryByCourse: {
    "FOD": {
      [SUBGROUP_NONE]: {
        label: null,
        columns: ["TAOA(X)", "TAOA", "TAOAA", "TAOAE", "TAOAF", "TAOAI", "TAOAP", "TAOAT", "TAOAX"],
        population: [291, 15, 99, 35, 41, 19, 4, 68, 10],
        completed:  [277, 14, 94, 31, 37, 19, 4, 68, 10],
        pending:    [14, 1, 5, 4, 4, 0, 0, 0, 0]
      }
    }
  },
  // Histórico mensual del % Total por curso Y subgrupo, para el gráfico anual.
  // Formato: history[curso][subgrupo]["AAAA-MM"] = { population, completed, pct }
  history: {}
};

/* =========================================================
   MIGRACIÓN: adapta datos guardados con la estructura ANTIGUA
   (un único resumen/histórico por curso, sin subgrupos) a la
   nueva estructura anidada por subgrupo, para que nada de lo
   que ya tenías guardado en este navegador se pierda.
   ========================================================= */
function normalizeTrainingData(data){
  data.subgroupsByCourse = data.subgroupsByCourse || {};
  data.history = data.history || {};
  data.summaryByCourse = data.summaryByCourse || {};

  (data.employees || []).forEach(emp => {
    Object.values(emp.courses || {}).forEach(c => {
      if(c.subgroup === undefined || c.subgroup === null) c.subgroup = SUBGROUP_NONE;
    });
  });

  Object.keys(data.summaryByCourse).forEach(course => {
    const val = data.summaryByCourse[course];
    if(val && Array.isArray(val.columns)){
      // Formato antiguo (resumen "plano", sin subgrupos) -> lo envolvemos
      data.summaryByCourse[course] = { [SUBGROUP_NONE]: val };
    }
  });

  Object.keys(data.history).forEach(course => {
    const val = data.history[course] || {};
    const looksFlat = Object.keys(val).some(k => /^\d{4}-\d{1,2}$/.test(k));
    if(looksFlat){
      data.history[course] = { [SUBGROUP_NONE]: val };
    }
  });

  Object.keys(data.summaryByCourse).forEach(course => {
    if(!data.subgroupsByCourse[course]){
      const keys = Object.keys(data.summaryByCourse[course]).filter(k => k !== SUBGROUP_NONE);
      data.subgroupsByCourse[course] = keys;
    }
  });

  return data;
}

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
      normalizeTrainingData(parsed);
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
  normalizeTrainingData(data);
  trainingData = data;
  document.getElementById("lastUpdated").textContent = trainingData.lastUpdated;
  buildCourseSelects();
  renderDetailPanel(detailSelect.value);
  renderSummaryPanel(summarySelect.value);
  updateExportButtonLabel();
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
const subgroupSelectDetail = document.getElementById("subgroupSelectDetail");
const subgroupFilterGroup = document.getElementById("subgroupFilterGroup");
const summaryBlocksContainer = document.getElementById("summaryBlocksContainer");

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

buildCourseSelects();
updateExportButtonLabel();

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

/* ---------- SUBGRUPOS: helpers compartidos ---------- */

/* Todas las claves de subgrupo que existen para un curso, en
   orden. Si el curso no tiene subgrupos, devuelve un único
   elemento SUBGROUP_NONE (comportamiento clásico). */
function getSubgroupKeysForCourse(course){
  const keys = trainingData.subgroupsByCourse[course];
  return (keys && keys.length) ? keys.slice().sort() : [SUBGROUP_NONE];
}

/* Título legible para la cabecera de un bloque de resumen:
   usa la etiqueta original de la hoja de Excel si la tenemos
   (p.ej. "Safety Culture BC"); si no, "<curso> <subgrupo>". */
function blockTitle(course, key){
  if(key === SUBGROUP_NONE) return course;
  const summary = (trainingData.summaryByCourse[course] || {})[key];
  return (summary && summary.label) ? summary.label : `${course} ${key}`;
}

/* Convierte una clave de subgrupo en algo seguro para usar
   como id/atributo HTML */
function cssKey(key){
  return String(key).replace(/[^a-zA-Z0-9]/g, "_");
}

/* Reconstruye el desplegable "Subgrupo" del Informe Detallado
   para el curso indicado. Se oculta automáticamente si el
   curso no tiene subgrupos. */
function populateSubgroupSelect(course){
  const keys = trainingData.subgroupsByCourse[course] || [];
  if(!keys.length){
    subgroupFilterGroup.hidden = true;
    subgroupSelectDetail.innerHTML = "";
    return;
  }
  subgroupFilterGroup.hidden = false;
  const previous = subgroupSelectDetail.value;
  subgroupSelectDetail.innerHTML = "";
  subgroupSelectDetail.appendChild(new Option("Todos los subgrupos", ""));
  keys.slice().sort().forEach(k => subgroupSelectDetail.appendChild(new Option(k, k)));
  subgroupSelectDetail.value = keys.includes(previous) ? previous : "";
}

/* Refresca el selector de subgrupo Y la tabla de detalle a la
   vez (usar SIEMPRE al cambiar de curso; usar renderDetailTable
   a secas para refrescos que no cambian de curso, como buscar
   o cambiar de subgrupo/estado) */
function renderDetailPanel(course){
  populateSubgroupSelect(course);
  renderDetailTable(course);
}

/* ---------- RENDER: INFORME DETALLADO ---------- */
function renderDetailTable(course){
  const wrap = document.getElementById("detailTableWrap");
  const searchTerm = normalizeHeader(document.getElementById("searchInput").value);
  const statusValue = document.getElementById("statusFilter").value;
  const subgroupValue = subgroupFilterGroup.hidden ? "" : subgroupSelectDetail.value;

  const allRows = trainingData.employees.filter(e =>
    e.courses[course] && (!subgroupValue || e.courses[course].subgroup === subgroupValue)
  );

  const rows = allRows.filter(e => {
    const c = e.courses[course];
    const matchesSearch = !searchTerm ||
      normalizeHeader(e.name).includes(searchTerm) ||
      normalizeHeader(e.siglum).includes(searchTerm);
    const matchesStatus = statusValue === "all" || c.mostRecent.status === statusValue;
    return matchesSearch && matchesStatus;
  });

  document.getElementById("detailCount").textContent = allRows.length
    ? `${rows.length} de ${allRows.length} empleados con datos para ${course}${subgroupValue ? " · " + subgroupValue : ""}`
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

/* ---------- RENDER: RESUMEN POR SIGLUM (por subgrupo) ---------- */
function renderSummaryTable(course, key){
  const wrap = document.getElementById(`summaryTableWrap--${cssKey(key)}`);
  if(!wrap) return;
  const data = (trainingData.summaryByCourse[course] || {})[key];

  if(!data){
    wrap.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Todavía no hay resumen para ${blockTitle(course, key)}</p>
        <p class="empty-state__hint">El resumen por Siglum se calculará automáticamente al subir el archivo de este curso.</p>
      </div>`;
    return;
  }

  const headerCells = data.columns.map((c, i) =>
    `<th class="${i === 1 ? 'col-parent' : ''}">${c}</th>`).join("");

  function dataRow(label, values, rowClass){
    const cells = values.map((v, i) => `<td class="${i === 1 ? 'col-parent' : ''}">${v}</td>`).join("");
    return `<tr class="${rowClass || ''}"><td>${label}</td>${cells}</tr>`;
  }

  const totalPct = data.population.map((pop, i) => ((data.completed[i] / pop) * 100).toFixed(2).replace(".", ",") + "%");

  wrap.innerHTML = `
    <table class="summary-table">
      <thead><tr><th></th>${headerCells}</tr></thead>
      <tbody>
        ${dataRow("Population", data.population)}
        ${dataRow("Completed", data.completed)}
        ${dataRow("Pending", data.pending)}
        ${dataRow("Total", totalPct, "row-total")}
      </tbody>
    </table>`;
}

/* ---------- GRÁFICO ANUAL (Chart.js), uno por subgrupo ---------- */
if(window.ChartDataLabels) Chart.register(ChartDataLabels); // muestra el % encima de cada barra, sin hover
const summaryChartInstances = {}; // clave: `${course}::${subgroupKey}` -> instancia Chart.js

/* Rellena el desplegable de Año de UN bloque con los años que
   existan en el histórico de ese curso+subgrupo (más el año
   actual si no hay ninguno) */
function populateChartYearSelect(course, key){
  const select = document.getElementById(`chartYearSelect--${cssKey(key)}`);
  if(!select) return;
  const history = (trainingData.history[course] || {})[key] || {};
  const years = Object.keys(history).map(k => k.split("-")[0]);
  const uniqueYears = [...new Set(years)].sort();
  if(!uniqueYears.length) uniqueYears.push(String(new Date().getFullYear()));

  const previousValue = select.value;
  select.innerHTML = "";
  uniqueYears.forEach(y => select.appendChild(new Option(y, y)));

  select.value = uniqueYears.includes(previousValue) ? previousValue : uniqueYears[uniqueYears.length - 1];
}

function renderSummaryChart(course, key, year){
  const canvas = document.getElementById(`summaryChart--${cssKey(key)}`);
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const history = ((trainingData.history[course] || {})[key]) || {};

  const values = MONTH_NAMES.map((_, i) => {
    const dateKey = `${year}-${String(i + 1).padStart(2, "0")}`;
    return history[dateKey] ? Number(history[dateKey].pct.toFixed(2)) : null;
  });

  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, "#7FA0D6");
  gradient.addColorStop(1, "#2E5AA8");

  const instanceKey = `${course}::${key}`;
  if(summaryChartInstances[instanceKey]) summaryChartInstances[instanceKey].destroy();

  summaryChartInstances[instanceKey] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: MONTH_NAMES,
      datasets: [{
        label: `${blockTitle(course, key)} — % Total`,
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
        title: { display: true, text: blockTitle(course, key), font: { family: "IBM Plex Sans Condensed", size: 20, weight: "700" }, color: "#12233D", padding: { bottom: 18 } },
        tooltip: {
          callbacks: {
            label: ctx2 => ctx2.raw === null ? "Sin datos" : `${ctx2.raw}%`
          }
        },
        datalabels: {
          display: ctx2 => ctx2.dataset.data[ctx2.dataIndex] !== null,
          anchor: "end",
          align: "top",
          offset: 4,
          clamp: true,
          color: "#12233D",
          font: { family: "Inter", size: 12, weight: "700" },
          formatter: v => v === null ? "" : `${v}%`
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

/* Construye tantos bloques (tabla + selector de año + gráfico)
   como subgrupos tenga el curso -- 1 bloque sin cabecera si no
   tiene subgrupos, o N bloques con cabecera (uno por subgrupo)
   si los tiene. Se reconstruye entero en cada refresco para no
   arrastrar estado obsoleto entre cursos. */
function renderSummaryPanel(course){
  const keys = getSubgroupKeysForCourse(course);
  const showTitles = keys.length > 1;

  summaryBlocksContainer.innerHTML = keys.map(key => `
    <div class="summary-block" data-subgroup="${key}">
      ${showTitles ? `<h2 class="summary-block__title">${blockTitle(course, key)}</h2>` : ""}
      <div class="card">
        <div class="table-wrap" id="summaryTableWrap--${cssKey(key)}"></div>
      </div>
      <div class="toolbar">
        <div class="toolbar__group">
          <span class="toolbar__label">Año</span>
          <select class="select chart-year-select" data-subgroup="${key}" id="chartYearSelect--${cssKey(key)}"></select>
        </div>
        <span class="meta-note">Evolución anual del % Total (se completa mes a mes según subas archivos)</span>
      </div>
      <div class="card chart-card">
        <div class="chart-wrap">
          <canvas id="summaryChart--${cssKey(key)}" height="110"></canvas>
        </div>
      </div>
    </div>`).join("");

  keys.forEach(key => {
    renderSummaryTable(course, key);
    populateChartYearSelect(course, key);
    const select = document.getElementById(`chartYearSelect--${cssKey(key)}`);
    renderSummaryChart(course, key, select.value);
  });
}

/* ---------- EVENTS ---------- */
detailSelect.addEventListener("change", e => renderDetailPanel(e.target.value));
subgroupSelectDetail.addEventListener("change", () => renderDetailTable(detailSelect.value));
summarySelect.addEventListener("change", e => renderSummaryPanel(e.target.value));
document.getElementById("searchInput").addEventListener("input", () => renderDetailTable(detailSelect.value));
document.getElementById("statusFilter").addEventListener("change", () => renderDetailTable(detailSelect.value));

/* Un único listener delegado para TODOS los selectores de año
   (uno por bloque de subgrupo), ya que se recrean dinámicamente */
summaryBlocksContainer.addEventListener("change", e => {
  if(!e.target.classList.contains("chart-year-select")) return;
  renderSummaryChart(summarySelect.value, e.target.dataset.subgroup, e.target.value);
});

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
   Curso Más Reciente), nos quedamos con la 1ª y 2ª aparición.
   Devuelve null si la hoja no es una hoja de detalle. */
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

/* Busca, dentro de las filas de UNA hoja, TODOS los bloques de
   resumen ya calculado con etiquetas "Population" / "Completed"
   (+ opcionalmente "Pending") en alguna columna, con una fila de
   cabeceras de Siglum justo encima, y -si la hay- una fila de
   título (una sola celda rellena, p.ej. "Safety Culture BC")
   justo encima de esa cabecera. Una misma hoja "Resumen" puede
   contener varios bloques seguidos (uno por subgrupo); esta
   función los detecta y devuelve TODOS, en orden. Los números se
   toman TAL CUAL están en el Excel (son los oficiales de tu
   organización), sin recalcular nada. */
function findAllSummaryBlocksInSheet(rows){
  const blocks = [];
  for(let i = 0; i < rows.length; i++){
    const row = rows[i];
    if(!Array.isArray(row) || !row.some(c => normalizeHeader(c) === "population")) continue;
    const popRow = i;

    let compRow = -1;
    for(let j = popRow + 1; j < Math.min(popRow + 4, rows.length); j++){
      if(rows[j] && rows[j].some(c => normalizeHeader(c) === "completed")){ compRow = j; break; }
    }
    if(compRow === -1) continue; // sin "Completed" cerca, no es un bloque válido

    let pendRow = -1;
    if(rows[compRow + 1] && rows[compRow + 1].some(c => normalizeHeader(c) === "pending")) pendRow = compRow + 1;

    // Cabecera: la fila más cercana por encima de POPULATION con >= 2 celdas rellenas
    let headerRowIdx = -1;
    for(let k = popRow - 1; k >= 0 && popRow - k <= 5; k--){
      const r = rows[k];
      if(r && r.filter(c => c !== null && String(c).trim() !== "").length >= 2){ headerRowIdx = k; break; }
    }
    if(headerRowIdx === -1) continue;

    // Título del bloque (opcional): la fila no vacía más cercana por
    // encima de la cabecera, SOLO si tiene exactamente 1 celda rellena
    let label = null;
    for(let k = headerRowIdx - 1; k >= 0 && headerRowIdx - k <= 5; k--){
      const r = rows[k];
      if(!r) continue;
      const filled = r.filter(c => c !== null && String(c).trim() !== "");
      if(filled.length === 0) continue;
      if(filled.length === 1) label = String(filled[0]).trim();
      break;
    }

    const headerCells = rows[headerRowIdx];
    const popCells = rows[popRow];
    const compCells = rows[compRow];
    const pendCells = pendRow > -1 ? rows[pendRow] : null;

    const columns = [], population = [], completed = [], pending = [];
    headerCells.forEach((cell, idx) => {
      if(cell === null || String(cell).trim() === "") return;
      const pop = Number(popCells[idx]);
      if(isNaN(pop)) return;
      const comp = Number(compCells[idx]) || 0;
      columns.push(String(cell).trim());
      population.push(pop);
      completed.push(comp);
      pending.push(pendCells ? (Number(pendCells[idx]) || 0) : (pop - comp));
    });

    if(columns.length) blocks.push({ label, columns, population, completed, pending });

    i = pendRow > -1 ? pendRow : compRow; // seguimos buscando después de este bloque
  }
  return blocks;
}

/* ---------- DETECCIÓN GENÉRICA DE SUBGRUPOS ---------- */

/* Frase común (palabra a palabra) al principio de TODOS los
   nombres dados, p.ej. ["Informe Safety Culture WC", "Informe
   Safety Culture BC"] -> "Informe Safety Culture" */
function commonPrefixWords(strings){
  if(!strings.length) return "";
  const wordArrays = strings.map(s => s.trim().split(/\s+/));
  const minLen = Math.min(...wordArrays.map(w => w.length));
  const prefix = [];
  for(let i = 0; i < minLen; i++){
    const word = wordArrays[0][i];
    if(wordArrays.every(w => w[i] && w[i].toLowerCase() === word.toLowerCase())) prefix.push(word);
    else break;
  }
  return prefix.join(" ");
}

/* Quita la frase común de un nombre y deja lo que sobra en
   mayúsculas como clave de subgrupo, p.ej. "Informe Safety
   Culture WC" con prefijo "Informe Safety Culture" -> "WC" */
function deriveSubgroupKey(fullName, prefix){
  let rest = String(fullName || "").trim();
  if(prefix && rest.toLowerCase().startsWith(prefix.toLowerCase())) rest = rest.slice(prefix.length).trim();
  rest = rest.replace(/^[-–—:]+/, "").trim();
  return rest ? rest.toUpperCase() : null;
}

/* A partir de una lista de nombres/etiquetas en bruto (nombres
   de hoja o títulos de bloque de resumen), asigna una clave de
   subgrupo a cada una. Si solo hay 0 o 1, no hay subgrupos
   (SUBGROUP_NONE). Si hay varias, se les quita la frase común y
   se usa el resto; si algo queda sin nombre o duplicado, se usa
   un identificador de reserva para que nunca se pierdan datos. */
function assignSubgroupKeys(rawNames){
  if(rawNames.length <= 1) return rawNames.map(() => SUBGROUP_NONE);
  const prefix = commonPrefixWords(rawNames.filter(Boolean));
  const used = new Set();
  return rawNames.map((raw, i) => {
    let key = raw ? deriveSubgroupKey(raw, prefix) : null;
    if(!key) key = `GRUPO ${i + 1}`;
    let finalKey = key, n = 2;
    while(used.has(finalKey)) finalKey = `${key} (${n++})`;
    used.add(finalKey);
    return finalKey;
  });
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
   limpios, saltando filas sin Employee ID. subgroupKey es la
   clave de subgrupo detectada para ESTA hoja (SUBGROUP_NONE si
   el curso no tiene subgrupos). */
function extractEmployeeRows(rows, headerRowIndex, cols, subgroupKey){
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
      subgroup: subgroupKey,
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
      subgroup: p.subgroup,
      hasRecurrent: p.hasRecurrent,
      initialTraining: { status: p.initialStatus, date: p.initialDate },
      mostRecent: { status: p.recentStatus, date: p.recentDate, courseName: p.courseName }
    };
  });
}

/* Recalcula la tabla POPULATION / COMPLETED / PENDING por Siglum
   SOLO cuando el archivo no trae ya una hoja de resumen para ese
   subgrupo. Agrupa por prefijo (p.ej. "TAOAA31" pertenece al
   grupo "TAOAA"), y cuenta como Completed: Completed + Exempt.
   subgroupKey filtra a los empleados de ese subgrupo concreto
   (SUBGROUP_NONE = todos los del curso, comportamiento clásico). */
function computeSummary(course, subgroupKey){
  const employeesForCourse = trainingData.employees.filter(e =>
    e.courses[course] && (subgroupKey === SUBGROUP_NONE || e.courses[course].subgroup === subgroupKey)
  );
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
  trainingData.summaryByCourse[course] = trainingData.summaryByCourse[course] || {};
  trainingData.summaryByCourse[course][subgroupKey] = { label: null, columns, population, completed, pending };
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

/* Guarda en el histórico el % Total de cada subgrupo del curso
   para un mes/año concretos, usando la columna de gran total (la
   1ª, p.ej. "TAOA(X)") de cada resumen. */
function saveMonthlySnapshot(course, year, month){
  const courseSummaries = trainingData.summaryByCourse[course];
  if(!courseSummaries) return;

  Object.entries(courseSummaries).forEach(([key, summary]) => {
    if(!summary || !summary.population.length) return;
    const population = summary.population[0];
    const completed = summary.completed[0];
    if(!population) return;

    trainingData.history[course] = trainingData.history[course] || {};
    trainingData.history[course][key] = trainingData.history[course][key] || {};
    trainingData.history[course][key][`${year}-${month}`] = {
      population,
      completed,
      pct: (completed / population) * 100
    };
  });
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

    // 1) Encuentra TODAS las hojas de detalle (una por subgrupo, si los hay)
    const detailSheetsFound = [];
    Object.entries(sheets).forEach(([sheetName, rows]) => {
      const found = findDetailColumns(rows);
      if(found) detailSheetsFound.push({ sheetName, rows, ...found });
    });

    // 2) Encuentra TODOS los bloques de resumen ya calculado, en cualquier hoja
    const summaryBlocksFound = [];
    Object.entries(sheets).forEach(([sheetName, rows]) => {
      findAllSummaryBlocksInSheet(rows).forEach(b => summaryBlocksFound.push({ sheetName, ...b }));
    });

    if(!detailSheetsFound.length && !summaryBlocksFound.length){
      showUploadFeedback('No se ha encontrado ni una hoja de detalle (columna "Employee ID") ni una hoja de resumen (con "Population/Completed") en este archivo.', "error");
      return;
    }

    // 3) Asigna clave de subgrupo a cada hoja de detalle y a cada bloque de
    //    resumen, de forma independiente (si solo hay 1 de cada, no hay
    //    subgrupos; si hay varios, se deriva del nombre de hoja / título)
    const detailKeys = assignSubgroupKeys(detailSheetsFound.map(d => d.sheetName));
    detailSheetsFound.forEach((d, i) => { d.subgroupKey = detailKeys[i]; });

    const summaryKeys = assignSubgroupKeys(summaryBlocksFound.map(b => b.label || b.sheetName));
    summaryBlocksFound.forEach((b, i) => { b.subgroupKey = summaryKeys[i]; });

    // 4) Importa el detalle de cada hoja
    let importedCount = 0;
    const touchedSubgroups = new Set();
    detailSheetsFound.forEach(d => {
      const parsed = extractEmployeeRows(d.rows, d.headerRowIndex, d.cols, d.subgroupKey);
      mergeEmployees(course, parsed);
      importedCount += parsed.length;
      touchedSubgroups.add(d.subgroupKey);
    });

    // 5) Aplica los resúmenes oficiales encontrados
    summaryBlocksFound.forEach(b => {
      trainingData.summaryByCourse[course] = trainingData.summaryByCourse[course] || {};
      trainingData.summaryByCourse[course][b.subgroupKey] = {
        label: b.label, columns: b.columns, population: b.population, completed: b.completed, pending: b.pending
      };
      touchedSubgroups.add(b.subgroupKey);
    });

    // 6) Para los subgrupos con detalle pero SIN resumen oficial, se recalcula
    const summarizedKeys = new Set(summaryBlocksFound.map(b => b.subgroupKey));
    new Set(detailSheetsFound.map(d => d.subgroupKey)).forEach(key => {
      if(!summarizedKeys.has(key)) computeSummary(course, key);
    });

    // 7) Recuerda qué subgrupos tiene este curso (unión con lo que ya hubiera)
    const newSubgroupKeys = [...touchedSubgroups].filter(k => k !== SUBGROUP_NONE);
    if(newSubgroupKeys.length){
      const merged = new Set([...(trainingData.subgroupsByCourse[course] || []), ...newSubgroupKeys]);
      trainingData.subgroupsByCourse[course] = [...merged].sort();
    }else{
      trainingData.subgroupsByCourse[course] = trainingData.subgroupsByCourse[course] || [];
    }

    saveMonthlySnapshot(course, uploadYearInput.value, uploadMonthSelect.value);

    trainingData.lastUpdated = new Date().toISOString().slice(0, 10);
    document.getElementById("lastUpdated").textContent = trainingData.lastUpdated;
    updateExportButtonLabel();
    saveToStorage();

    if(detailSelect.value === course) renderDetailPanel(course);
    if(summarySelect.value === course) renderSummaryPanel(course);

    const parts = [];
    if(importedCount) parts.push(`${importedCount} empleados`);
    parts.push(summaryBlocksFound.length ? "resumen oficial de la hoja" : (detailSheetsFound.length ? "resumen recalculado" : ""));
    const subgroupsMsg = newSubgroupKeys.length ? ` · subgrupos detectados: ${newSubgroupKeys.join(", ")}` : "";
    showUploadFeedback(`✔ ${course} actualizado: ${parts.filter(Boolean).join(" · ")}${subgroupsMsg} · guardado en histórico de ${dateNote} (desde "${file.name}").`, "success");
  }catch(err){
    console.error(err);
    showUploadFeedback(`Error al leer el archivo: ${err.message}`, "error");
  }finally{
    e.target.value = "";
  }
});

/* =========================================================
   EXPORTAR RESUMEN A PÁGINA WEB (todos los cursos, sin detalle
   de empleados). Genera un .html independiente, con los datos,
   las tablas y los gráficos ya incrustados dentro del propio
   archivo, para que se pueda abrir y compartir con cualquiera
   sin depender de esta app ni de lo guardado en este navegador.
   ========================================================= */

function updateExportButtonLabel(){
  const label = document.getElementById("exportSummaryHtmlLabel");
  if(!label) return;
  const [y, m] = String(trainingData.lastUpdated || "").split("-");
  label.textContent = (y && m && MONTH_NAMES[Number(m) - 1])
    ? `Exportar Resumen ${MONTH_NAMES[Number(m) - 1]} ${y}`
    : "Exportar Resumen";
}

/* Reúne, para cada curso que ya tenga resumen calculado, sus
   bloques (uno por subgrupo, o uno solo si no los tiene) con la
   tabla y el histórico necesarios para dibujar el gráfico */
function buildSummaryExportPayload(){
  const courses = trainingData.courseList
    .filter(course => trainingData.summaryByCourse[course] && Object.keys(trainingData.summaryByCourse[course]).length)
    .map(course => {
      const keys = getSubgroupKeysForCourse(course).filter(k => trainingData.summaryByCourse[course][k]);
      const blocks = keys.map(key => ({
        key,
        title: blockTitle(course, key),
        summary: trainingData.summaryByCourse[course][key],
        history: (trainingData.history[course] || {})[key] || {}
      }));
      return { course, showTitles: blocks.length > 1, blocks };
    })
    .filter(c => c.blocks.length);

  return {
    generatedAt: new Date().toISOString(),
    lastUpdated: trainingData.lastUpdated,
    courses
  };
}

/* Construye el .html independiente completo, como texto. Los
   valores calculados aquí (fechas, JSON de datos) se incrustan
   ahora; TODO lo demás dentro de <script> es código JS literal
   que se ejecutará más tarde, al abrir el archivo exportado -- por
   eso esa parte usa concatenación de strings en vez de plantillas,
   para no mezclar los dos niveles. */
function buildSummaryExportHtml(payload){
  const safeJson = JSON.stringify(payload).replace(/</g, "\\u003c");
  const [y, m] = String(payload.lastUpdated || "").split("-");
  const monthLabel = (y && m && MONTH_NAMES[Number(m) - 1]) ? `${MONTH_NAMES[Number(m) - 1]} ${y}` : (payload.lastUpdated || "");
  const generatedLabel = new Date(payload.generatedAt).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });

  const innerScript = [
    'var REPORT = __REPORT_JSON__;',
    'var MONTH_NAMES = __MONTH_NAMES_JSON__;',
    'if(window.ChartDataLabels) Chart.register(ChartDataLabels);',
    'var chartInstances = {};',
    '',
    'function renderTable(block, el){',
    '  var d = block.summary;',
    '  var headerCells = d.columns.map(function(c){ return "<th>" + c + "</th>"; }).join("");',
    '  function row(label, values, rowClass){',
    '    return "<tr" + (rowClass ? " class=\\"" + rowClass + "\\"" : "") + "><td>" + label + "</td>" + values.map(function(v){ return "<td>" + v + "</td>"; }).join("") + "</tr>";',
    '  }',
    '  var totalPct = d.population.map(function(p, i){',
    '    return p ? ((d.completed[i] / p) * 100).toFixed(2).replace(".", ",") + "%" : "0,00%";',
    '  });',
    '  el.innerHTML = "<table><thead><tr><th></th>" + headerCells + "</tr></thead><tbody>" +',
    '    row("Population", d.population) + row("Completed", d.completed) + row("Pending", d.pending) +',
    '    row("Total", totalPct, "row-total") + "</tbody></table>";',
    '}',
    '',
    'function yearsFor(history){',
    '  var years = Object.keys(history).map(function(k){ return k.split("-")[0]; });',
    '  years = years.filter(function(y, i){ return years.indexOf(y) === i; }).sort();',
    '  return years.length ? years : [String(new Date().getFullYear())];',
    '}',
    '',
    'function renderChart(course, block, canvas, year){',
    '  var ctx = canvas.getContext("2d");',
    '  var values = MONTH_NAMES.map(function(_, i){',
    '    var key = year + "-" + String(i + 1).padStart(2, "0");',
    '    return block.history[key] ? Number(block.history[key].pct.toFixed(2)) : null;',
    '  });',
    '  var gradient = ctx.createLinearGradient(0, 0, 0, 260);',
    '  gradient.addColorStop(0, "#7FA0D6");',
    '  gradient.addColorStop(1, "#2E5AA8");',
    '  var instanceKey = course + "::" + block.key;',
    '  if(chartInstances[instanceKey]) chartInstances[instanceKey].destroy();',
    '  chartInstances[instanceKey] = new Chart(ctx, {',
    '    type: "bar",',
    '    data: { labels: MONTH_NAMES, datasets: [{ data: values, backgroundColor: gradient, borderRadius: 2, maxBarThickness: 46 }] },',
    '    options: {',
    '      responsive: true,',
    '      plugins: {',
    '        legend: { display: false },',
    '        tooltip: { callbacks: { label: function(c){ return c.raw === null ? "Sin datos" : c.raw + "%"; } } },',
    '        datalabels: {',
    '          display: function(c){ return c.dataset.data[c.dataIndex] !== null; },',
    '          anchor: "end", align: "top", offset: 4, clamp: true,',
    '          color: "#12233D", font: { family: "Inter", size: 12, weight: "700" },',
    '          formatter: function(v){ return v === null ? "" : v + "%"; }',
    '        }',
    '      },',
    '      scales: {',
    '        y: { min: 0, max: 120, ticks: { stepSize: 20, callback: function(v){ return v + "%"; }, color: "#667085" }, grid: { color: "#E1E5EA" } },',
    '        x: { ticks: { color: "#667085", maxRotation: 45, minRotation: 45 }, grid: { display: false } }',
    '      }',
    '    }',
    '  });',
    '}',
    '',
    'var main = document.getElementById("reportMain");',
    '',
    'if(!REPORT.courses.length){',
    '  main.innerHTML = "<div class=\\"card\\"><div class=\\"empty\\"><p>Todavía no hay ningún curso con resumen para exportar.</p></div></div>";',
    '}',
    '',
    'REPORT.courses.forEach(function(c){',
    '  var section = document.createElement("section");',
    '  section.className = "course-section";',
    '  section.innerHTML = "<h2 class=\\"course-section__title\\">" + c.course + "</h2>";',
    '  c.blocks.forEach(function(block){',
    '    var years = yearsFor(block.history);',
    '    var defaultYear = years[years.length - 1];',
    '    var wrapper = document.createElement("div");',
    '    wrapper.className = "summary-block";',
    '    var titleHtml = c.showTitles ? ("<h3 class=\\"summary-block__title\\">" + block.title + "</h3>") : "";',
    '    var optionsHtml = years.map(function(y){',
    '      return "<option value=\\"" + y + "\\"" + (y === defaultYear ? " selected" : "") + ">" + y + "</option>";',
    '    }).join("");',
    '    wrapper.innerHTML = titleHtml +',
    '      "<div class=\\"card\\"><div class=\\"table-wrap\\" data-role=\\"table\\"></div></div>" +',
    '      "<div class=\\"chart-toolbar\\"><label>Año</label><select data-role=\\"year\\">" + optionsHtml + "</select></div>" +',
    '      "<div class=\\"card chart-card\\"><div class=\\"chart-wrap\\"><canvas height=\\"110\\"></canvas></div></div>";',
    '    section.appendChild(wrapper);',
    '    var tableEl = wrapper.querySelector(\'[data-role="table"]\');',
    '    var yearSelect = wrapper.querySelector(\'[data-role="year"]\');',
    '    var canvas = wrapper.querySelector("canvas");',
    '    renderTable(block, tableEl);',
    '    renderChart(c.course, block, canvas, defaultYear);',
    '    yearSelect.addEventListener("change", function(){ renderChart(c.course, block, canvas, yearSelect.value); });',
    '  });',
    '  main.appendChild(section);',
    '});'
  ].join("\n")
    .replace("__REPORT_JSON__", safeJson)
    .replace("__MONTH_NAMES_JSON__", JSON.stringify(MONTH_NAMES));

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mandatory Training · ${monthLabel}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js"></script>
<style>
:root{
  --color-bg:#F1F3F6; --color-surface:#FFFFFF; --color-navy:#10233F; --color-navy-light:#1B3A61;
  --color-accent:#E08E3E; --color-text:#1C2530; --color-text-muted:#667085; --color-border:#E1E5EA;
  --font-display:'IBM Plex Sans Condensed',sans-serif; --font-body:'Inter',sans-serif; --font-mono:'IBM Plex Mono',monospace;
}
*{box-sizing:border-box;}
body{margin:0;background:var(--color-bg);font-family:var(--font-body);color:var(--color-text);-webkit-font-smoothing:antialiased;}
header{background:linear-gradient(180deg,var(--color-navy) 0%, var(--color-navy-light) 100%);color:#fff;padding:28px clamp(16px,4vw,48px);}
header h1{font-family:var(--font-display);font-weight:700;font-size:clamp(22px,3vw,30px);letter-spacing:.04em;margin:0;text-transform:uppercase;}
header p{margin:6px 0 0;color:#AEC0D6;font-size:13.5px;}
main{padding:clamp(16px,4vw,40px);max-width:1100px;margin:0 auto;min-height:200px;}
.course-section{margin-bottom:46px;}
.course-section:last-child{margin-bottom:0;}
.course-section__title{font-family:var(--font-display);font-weight:700;font-size:21px;letter-spacing:.03em;text-transform:uppercase;color:var(--color-navy);margin:0 0 18px;padding-bottom:10px;border-bottom:3px solid var(--color-accent);}
.summary-block{margin-bottom:30px;}
.summary-block:last-child{margin-bottom:0;}
.summary-block__title{font-family:var(--font-display);font-weight:700;font-size:14.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--color-navy-light);margin:0 0 10px;}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(16,35,63,.04);}
.table-wrap{overflow-x:auto;}
table{width:100%;border-collapse:collapse;font-size:13.5px;}
thead th{text-align:right;font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted);background:#F7F8FA;padding:12px 16px;border-bottom:1px solid var(--color-border);white-space:nowrap;}
thead th:first-child{text-align:left;}
tbody td{text-align:right;padding:12px 16px;border-bottom:1px solid var(--color-border);white-space:nowrap;font-family:var(--font-mono);}
tbody td:first-child{text-align:left;font-family:var(--font-body);font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted);}
tbody tr:last-child td{border-bottom:none;}
tbody tr.row-total td{font-weight:700;font-family:var(--font-mono);}
tbody tr.row-total td:first-child{font-family:var(--font-body);}
.chart-toolbar{display:flex;align-items:center;gap:10px;margin:16px 0 10px;}
.chart-toolbar label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted);}
.chart-toolbar select{font-family:var(--font-body);font-weight:600;font-size:13px;padding:7px 10px;border-radius:6px;border:1px solid var(--color-border);background:#fff;cursor:pointer;}
.chart-card{padding:20px;}
.chart-wrap{position:relative;width:100%;}
.empty{padding:60px 24px;text-align:center;color:var(--color-text-muted);}
footer{text-align:center;padding:24px;font-size:12px;color:var(--color-text-muted);}
@media (max-width:620px){ .course-section__title{font-size:18px;} }
</style>
</head>
<body>
<header>
  <h1>Mandatory Training</h1>
  <p>Situación a fecha de la última actualización: <strong style="color:#fff;">${monthLabel}</strong> · Exportado el ${generatedLabel}</p>
</header>
<main id="reportMain"></main>
<footer>Exportado automáticamente desde el panel de Mandatory Trainings · No incluye datos individuales de empleados.</footer>
<script>
${innerScript}
</script>
</body>
</html>`;
}

document.getElementById("exportSummaryHtmlBtn").addEventListener("click", () => {
  try{
    const payload = buildSummaryExportPayload();
    const html = buildSummaryExportHtml(payload);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumen-formaciones-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showUploadFeedback(`✔ Página de resumen exportada (${payload.courses.length} curso${payload.courses.length === 1 ? "" : "s"}). Ábrela con doble clic o súbela a cualquier hosting para compartirla.`, "success");
  }catch(err){
    console.error(err);
    showUploadFeedback(`Error al generar la página de resumen: ${err.message}`, "error");
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
renderDetailPanel(detailSelect.value);
renderSummaryPanel(summarySelect.value);
