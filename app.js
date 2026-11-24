const STORAGE_KEY = "carlog-records-v1";
const CURRENT_KM_KEY = "carlog-current-km-v1";
const VEHICLES_KEY = "carlog-vehicles-v1";
const ACTIVE_VEHICLE_KEY = "carlog-active-vehicle-v1";
const STARTER_FLEET_KEY = "carlog-starter-fleet-v1";
const READ_NOTIFICATIONS_KEY = "carlog-read-notifications-v1";
const TRIP_CHECKLIST_KEY = "carlog-trip-checklist-v1";
const BACKUP_FORMAT = "carlog-backup";
const BACKUP_VERSION = 1;
const BACKUP_KEYS = [STORAGE_KEY, CURRENT_KM_KEY, VEHICLES_KEY, ACTIVE_VEHICLE_KEY, STARTER_FLEET_KEY, READ_NOTIFICATIONS_KEY, TRIP_CHECKLIST_KEY];
const DEFAULT_KM = 124500;
const DEFAULT_VEHICLE_ID = "carlog-default-bmw";
const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const dateFormat = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric" });

const starterVehicles = [
  {
    id: DEFAULT_VEHICLE_ID,
    model: "BMW Série 1",
    plate: "",
    year: 2018,
    km: DEFAULT_KM,
    displacement: 1496,
    power: 116,
    fuel: "Gasóleo",
    tank: 50,
    insuranceUntil: "",
    inspectionUntil: "",
    photo: "",
  },
  { id: "carlog-bmw-serie-3", model: "BMW Série 3", plate: "", year: null, km: 0, displacement: null, power: null, fuel: "Por definir", insuranceUntil: "", inspectionUntil: "", photo: "" },
  { id: "carlog-mercedes-classe-c", model: "Mercedes-Benz Classe C", plate: "", year: null, km: 0, displacement: null, power: null, fuel: "Por definir", insuranceUntil: "", inspectionUntil: "", photo: "" },
  { id: "carlog-audi-a3", model: "Audi A3", plate: "", year: null, km: 0, displacement: null, power: null, fuel: "Por definir", insuranceUntil: "", inspectionUntil: "", photo: "" },
  { id: "carlog-volkswagen-golf", model: "Volkswagen Golf", plate: "", year: null, km: 0, displacement: null, power: null, fuel: "Por definir", insuranceUntil: "", inspectionUntil: "", photo: "" },
  { id: "carlog-porsche-911", model: "Porsche 911", plate: "", year: null, km: 0, displacement: null, power: null, fuel: "Por definir", insuranceUntil: "", inspectionUntil: "", photo: "" },
];
const starterRecords = [
  { id: "seed-fuel", vehicleId: DEFAULT_VEHICLE_ID, type: "fuel", description: "Abastecimento — Galp", date: recentDate(5), amount: 85, litres: 50, pricePerLitre: 1.7, km: 124200, category: "Combustível" },
  { id: "seed-maintenance", vehicleId: DEFAULT_VEHICLE_ID, type: "maintenance", description: "Mudança de óleo e filtros", date: recentDate(12), amount: 120, km: 123850, category: "Mudança de óleo", nextKm: 130000 },
  { id: "seed-inspection", vehicleId: DEFAULT_VEHICLE_ID, type: "expense", description: "Inspeção periódica", date: recentDate(35), amount: 35, km: 123400, category: "Inspeção periódica" },
  { id: "seed-fuel-old", vehicleId: DEFAULT_VEHICLE_ID, type: "fuel", description: "Abastecimento — Repsol", date: recentDate(35), amount: 72.5, litres: 42, pricePerLitre: 1.726, km: 123600, category: "Combustível" },
];
const tripChecklistItems = [
  "Verificar a pressão e o estado dos pneus",
  "Confirmar os níveis de óleo e dos líquidos",
  "Testar luzes, travões e limpa-vidros",
  "Confirmar documentos, IPO e seguro",
  "Planear combustível e autonomia",
];

let vehicles = readStoredVehicles();
let activeVehicleId = localStorage.getItem(ACTIVE_VEHICLE_KEY) || vehicles[0].id;
if (!vehicles.some((vehicle) => vehicle.id === activeVehicleId)) activeVehicleId = vehicles[0].id;
let records = readStoredRecords();
let currentView = "dashboard";
let editingVehicleId = null;
let editingRecordId = null;

function getActiveVehicle() {
  return vehicles.find((vehicle) => vehicle.id === activeVehicleId) || vehicles[0];
}

function recordsForActiveVehicle() {
  return records.filter((record) => record.vehicleId === activeVehicleId);
}

function readStoredVehicles() {
  try {
    const saved = JSON.parse(localStorage.getItem(VEHICLES_KEY));
    if (Array.isArray(saved) && saved.length) {
      if (localStorage.getItem(STARTER_FLEET_KEY) !== "1") {
        const existingModels = new Set(saved.map((vehicle) => String(vehicle.model).toLocaleLowerCase("pt-PT")));
        const missingVehicles = starterVehicles.slice(1).filter((vehicle) => !existingModels.has(vehicle.model.toLocaleLowerCase("pt-PT")));
        const mergedVehicles = [...saved, ...missingVehicles];
        localStorage.setItem(VEHICLES_KEY, JSON.stringify(mergedVehicles));
        localStorage.setItem(STARTER_FLEET_KEY, "1");
        return mergedVehicles;
      }
      return saved;
    }
    const legacyKm = Number(localStorage.getItem(CURRENT_KM_KEY)) || DEFAULT_KM;
    const defaults = [{ ...starterVehicles[0], km: legacyKm }, ...starterVehicles.slice(1)];
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(defaults));
    localStorage.setItem(STARTER_FLEET_KEY, "1");
    return defaults;
  } catch (error) {
    console.error("Não foi possível carregar os veículos guardados.", error);
    return starterVehicles;
  }
}

function recentDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function readStoredRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const source = Array.isArray(saved) ? saved : starterRecords;
    return source.map((record) => ({
      ...record,
      vehicleId: record.vehicleId || DEFAULT_VEHICLE_ID,
      category: record.type === "maintenance" && ["Manutenção", "Revisão periódica"].includes(record.category) && /óleo/i.test(record.description)
        ? "Mudança de óleo"
        : record.type === "maintenance" && record.category === "Manutenção" ? "Revisão periódica" : record.category,
    }));
  } catch (error) {
    console.error("Não foi possível carregar os registos guardados.", error);
    return starterRecords;
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
    localStorage.setItem(ACTIVE_VEHICLE_KEY, activeVehicleId);
    localStorage.setItem(CURRENT_KM_KEY, String(getActiveVehicle().km));
  } catch (error) {
    console.error("Não foi possível guardar os registos.", error);
    showFormError("Não foi possível guardar. Verifica o espaço disponível no navegador.");
    throw error;
  }
}

function createBackupPayload() {
  const data = {
    [STORAGE_KEY]: JSON.stringify(records),
    [CURRENT_KM_KEY]: String(getActiveVehicle().km),
    [VEHICLES_KEY]: JSON.stringify(vehicles),
    [ACTIVE_VEHICLE_KEY]: activeVehicleId,
    [STARTER_FLEET_KEY]: localStorage.getItem(STARTER_FLEET_KEY) || "1",
    [READ_NOTIFICATIONS_KEY]: JSON.stringify(readNotificationIds()),
    [TRIP_CHECKLIST_KEY]: JSON.stringify(readTripChecklistState()),
  };
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

function validateBackupPayload(payload) {
  if (!payload || payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    throw new Error("O ficheiro não é uma cópia CarLog compatível.");
  }
  const { data } = payload;
  for (const key of BACKUP_KEYS) {
    if (!Object.hasOwn(data, key) || (data[key] !== null && typeof data[key] !== "string")) {
      throw new Error("A cópia está incompleta ou tem um formato inválido.");
    }
  }

  let restoredVehicles;
  let restoredRecords;
  let notificationIds;
  let checklist;
  try {
    restoredVehicles = JSON.parse(data[VEHICLES_KEY]);
    restoredRecords = JSON.parse(data[STORAGE_KEY]);
    notificationIds = JSON.parse(data[READ_NOTIFICATIONS_KEY]);
    checklist = JSON.parse(data[TRIP_CHECKLIST_KEY]);
  } catch {
    throw new Error("A cópia contém dados JSON inválidos.");
  }

  if (!Array.isArray(restoredVehicles) || restoredVehicles.length === 0 ||
      restoredVehicles.some((vehicle) => !vehicle || typeof vehicle.id !== "string" || !vehicle.id || typeof vehicle.model !== "string" || !vehicle.model || !Number.isFinite(Number(vehicle.km)) || Number(vehicle.km) < 0)) {
    throw new Error("A cópia contém uma lista de veículos inválida.");
  }
  const vehicleIds = new Set(restoredVehicles.map((vehicle) => vehicle.id));
  if (vehicleIds.size !== restoredVehicles.length || !vehicleIds.has(data[ACTIVE_VEHICLE_KEY])) {
    throw new Error("A cópia tem veículos repetidos ou não identifica o veículo ativo.");
  }
  if (!Array.isArray(restoredRecords) || restoredRecords.some((record) => {
    if (!record || typeof record.id !== "string" || !record.id || typeof record.vehicleId !== "string" ||
        !["fuel", "maintenance", "expense", "trip"].includes(record.type) ||
        typeof record.description !== "string" || !Number.isFinite(Number(record.amount)) || Number(record.amount) < 0) return true;
    if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) return true;
    const date = new Date(`${record.date}T12:00:00`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== record.date;
  })) {
    throw new Error("A cópia contém registos inválidos.");
  }
  if (!Array.isArray(notificationIds) || notificationIds.some((id) => typeof id !== "string")) {
    throw new Error("A cópia contém notificações inválidas.");
  }
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist) ||
      Object.values(checklist).some((state) => !Array.isArray(state) || state.length > tripChecklistItems.length || state.some((checked) => checked !== true && checked !== false && checked !== null))) {
    throw new Error("A cópia contém uma checklist inválida.");
  }
  if (!Number.isFinite(Number(data[CURRENT_KM_KEY])) || Number(data[CURRENT_KM_KEY]) < 0) {
    throw new Error("A cópia contém uma quilometragem inválida.");
  }
  return data;
}

function restoreBackupData(data) {
  const previousData = Object.fromEntries(BACKUP_KEYS.map((key) => [key, localStorage.getItem(key)]));
  try {
    for (const key of BACKUP_KEYS) {
      if (data[key] === null) localStorage.removeItem(key);
      else localStorage.setItem(key, data[key]);
    }
  } catch (error) {
    try {
      for (const key of BACKUP_KEYS) {
        if (previousData[key] === null) localStorage.removeItem(key);
        else localStorage.setItem(key, previousData[key]);
      }
    } catch (rollbackError) {
      console.error("Não foi possível repor todos os dados após falha no restauro.", rollbackError);
    }
    console.error("Não foi possível restaurar a cópia CarLog.", error);
    throw new Error("Não foi possível restaurar a cópia. Verifica o espaço disponível no navegador.");
  }
  vehicles = readStoredVehicles();
  records = readStoredRecords();
  activeVehicleId = localStorage.getItem(ACTIVE_VEHICLE_KEY);
}

function formatCurrency(value) {
  return currency.format(value);
}

function formatKm(value) {
  return Math.round(value).toLocaleString("pt-PT");
}

function formatVehicleMileage(vehicle) {
  return Number(vehicle.km) > 0 ? `${formatKm(vehicle.km)} km` : "Por preencher";
}

function formatDate(value) {
  return dateFormat.format(new Date(`${value}T12:00:00`));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function monthRecords(list = records) {
  const now = new Date();
  return list.filter((record) => {
    const date = new Date(`${record.date}T12:00:00`);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

function totalFor(list, type) {
  return list.filter((record) => type === "all" || record.type === type).reduce((sum, record) => sum + Number(record.amount || 0), 0);
}

function typeLabel(record) {
  if (record.type === "fuel") return "Combustível";
  if (record.type === "maintenance") return record.category || "Manutenção";
  return record.category || "Despesa";
}

function iconClass(record) {
  if (record.type === "fuel") return ["◉", "icon-blue"];
  if (record.type === "maintenance") return ["⚙", "icon-amber"];
  if (record.type === "trip") return ["⌁", "icon-blue"];
  return ["↗", "icon-green"];
}

function renderActiveVehicleSelect() {
  const selector = document.querySelector("#active-vehicle-select");
  selector.innerHTML = vehicles.map((vehicle) => `<option value="${escapeHtml(vehicle.id)}">${escapeHtml(vehicle.model)}</option>`).join("");
  selector.value = activeVehicleId;
}

function renderDashboard() {
  const activeRecords = recordsForActiveVehicle();
  const month = monthRecords(activeRecords);
  const fuelTotal = totalFor(month, "fuel");
  const maintenanceTotal = totalFor(month, "maintenance");
  const expenseTotal = totalFor(month, "all");
  const vehicle = getActiveVehicle();

  renderActiveVehicleSelect();
  const hasMileage = Number(vehicle.km) > 0;
  document.querySelector("#current-mileage").textContent = hasMileage ? formatKm(vehicle.km) : "—";
  document.querySelector(".mileage small").textContent = hasMileage ? "Quilometragem atual" : "Quilometragem por preencher";
  document.querySelector(".vehicle-card h2").textContent = vehicle.model;
  document.querySelector(".vehicle-card p").innerHTML = `${escapeHtml(vehicle.fuel || "Combustível")} <span class="dot-separator">·</span> ${vehicle.year || "Ano não indicado"}${vehicle.plate ? ` <span class="dot-separator">·</span> ${escapeHtml(vehicle.plate)}` : ""}`;
  document.querySelector("#sidebar-vehicle-name").textContent = vehicle.model;
  document.querySelector("#sidebar-vehicle-mark").textContent = vehicle.model.slice(0, 1).toUpperCase();
  document.querySelector("#fuel-total").innerHTML = `${fuelTotal.toFixed(2).replace(".", ",")} <span>€</span>`;
  document.querySelector("#maintenance-total").innerHTML = `${maintenanceTotal.toFixed(2).replace(".", ",")} <span>€</span>`;
  document.querySelector("#expense-total").innerHTML = `${expenseTotal.toFixed(2).replace(".", ",")} <span>€</span>`;
  const healthSummary = summarizeHealthChecks(getHealthChecks());
  const healthIcon = document.querySelector("#dashboard-health-icon");
  healthIcon.className = `trend ${healthSummary.status}`;
  healthIcon.textContent = healthSummary.status === "urgent" ? "!" : healthSummary.status === "good" ? "✓" : "i";
  document.querySelector("#dashboard-health-summary").textContent = `Saúde: ${healthSummary.title}`;
  const latestFuel = activeRecords.filter((record) => record.type === "fuel").sort(byDateDescending)[0];
  const average = estimateConsumption(activeRecords);
  const range = latestFuel && average ? Math.round((Number(latestFuel.litres) / average) * 100) : null;
  document.querySelector("#fuel-litres").textContent = range ? `Autonomia estimada: ${formatKm(range)} km` : latestFuel ? `${Number(latestFuel.litres || 0).toLocaleString("pt-PT")} L no último abastecimento` : "Sem abastecimentos registados";
  document.querySelector("#maintenance-count").textContent = activeRecords.filter((record) => record.type === "maintenance").length;
  renderRecentActivity();
  renderServiceReminder();
  renderVehicleAlerts();
  renderNotifications();
}

function byDateDescending(first, second) {
  return second.date.localeCompare(first.date);
}

function renderRecentActivity() {
  const recent = [...recordsForActiveVehicle()].sort(byDateDescending).slice(0, 4);
  const container = document.querySelector("#recent-activity");
  if (!recent.length) {
    container.innerHTML = '<div class="empty-state">Ainda não existem registos.</div>';
    return;
  }
  container.innerHTML = recent.map((record) => {
    const [icon, color] = iconClass(record);
    return `<div class="activity-row">
      <span class="activity-icon ${color}">${icon}</span>
      <span><span class="activity-name">${escapeHtml(record.description)}</span><span class="activity-meta">${escapeHtml(typeLabel(record))} · ${formatDate(record.date)}</span></span>
      <span class="activity-amount">${formatCurrency(record.amount)}</span>
    </div>`;
  }).join("");
}

function renderServiceReminder() {
  const nextMaintenance = recordsForActiveVehicle().filter((record) => record.type === "maintenance" && Number(record.nextKm) > 0)
    .sort((a, b) => Number(a.nextKm) - Number(b.nextKm))[0];
  if (!nextMaintenance) {
    document.querySelector(".service-alert strong").textContent = "Sem manutenção planeada";
    document.querySelector(".service-alert small").textContent = "Adiciona uma manutenção com quilometragem";
    document.querySelector(".alert-pill").textContent = "—";
    document.querySelector(".progress-label strong").textContent = formatVehicleMileage(getActiveVehicle());
    document.querySelector(".progress-track span").style.width = "0%";
    document.querySelector(".progress-caption").textContent = "Define a próxima revisão ao registar uma manutenção.";
    return;
  }
  const dueAt = Number(nextMaintenance.nextKm);
  const currentKm = Number(getActiveVehicle().km);
  const distance = Math.max(0, dueAt - currentKm);
  const previousKm = Number(nextMaintenance.km || currentKm);
  const interval = Math.max(1, dueAt - previousKm);
  const completed = Math.min(100, Math.max(0, ((currentKm - previousKm) / interval) * 100));
  document.querySelector(".service-alert strong").textContent = nextMaintenance.description;
  document.querySelector(".service-alert small").textContent = "Próxima manutenção";
  document.querySelector(".alert-pill").textContent = distance === 0 ? "POR FAZER" : distance <= 2000 ? "EM BREVE" : "PLANEADA";
  document.querySelector(".progress-label strong").innerHTML = `${formatKm(currentKm)} <small>/ ${formatKm(dueAt)} km</small>`;
  document.querySelector(".progress-track span").style.width = `${completed}%`;
  document.querySelector(".progress-caption").innerHTML = distance === 0
    ? "<strong>Manutenção recomendada agora</strong>"
    : `Faltam <strong>${formatKm(distance)} km</strong> para a próxima manutenção`;
}

function renderVehicleAlerts() {
  const alerts = [];
  const vehicle = getActiveVehicle();
  const now = new Date();
  for (const [field, label] of [["inspectionUntil", "Inspeção periódica"], ["insuranceUntil", "Seguro automóvel"]]) {
    if (!vehicle[field]) continue;
    const remaining = Math.ceil((new Date(`${vehicle[field]}T12:00:00`) - new Date(`${now.toISOString().slice(0, 10)}T12:00:00`)) / 86400000);
    if (remaining <= 30) {
      const daysLabel = Math.abs(remaining) === 1 ? "dia" : "dias";
      const message = remaining < 0 ? `Expirou há ${Math.abs(remaining)} ${daysLabel}` : remaining === 0 ? "Expira hoje" : `Expira em ${remaining} ${daysLabel}`;
      alerts.push(`<div class="document-alert"><span>!</span><strong>${label}</strong><small>${message}</small></div>`);
    }
  }
  document.querySelector("#vehicle-alerts").innerHTML = alerts.join("");
}

function getVehicleNotifications() {
  const notifications = [];
  const vehicle = getActiveVehicle();
  const vehicleRecords = recordsForActiveVehicle();
  const nextMaintenance = vehicleRecords
    .filter((record) => record.type === "maintenance" && Number(record.nextKm) > 0)
    .sort((a, b) => Number(a.nextKm) - Number(b.nextKm))[0];

  if (nextMaintenance) {
    const distance = Number(nextMaintenance.nextKm) - Number(vehicle.km || 0);
    if (distance <= 5500) {
      notifications.push({
        id: `${vehicle.id}:maintenance:${nextMaintenance.id}:${nextMaintenance.nextKm}`,
        title: distance <= 0 ? "Manutenção por fazer" : "Revisão a aproximar-se",
        message: distance <= 0 ? `${nextMaintenance.description} · prazo de quilometragem atingido` : `${nextMaintenance.description} · faltam ${formatKm(distance)} km`,
        view: "maintenance",
        severity: distance <= 0 ? "urgent" : "reminder",
      });
    }
  }

  const today = new Date();
  for (const [field, label] of [["inspectionUntil", "Inspeção periódica"], ["insuranceUntil", "Seguro automóvel"]]) {
    if (!vehicle[field]) continue;
    const expiry = new Date(`${vehicle[field]}T12:00:00`);
    const remaining = Math.ceil((expiry - new Date(`${today.toISOString().slice(0, 10)}T12:00:00`)) / 86400000);
    if (remaining <= 30) {
      notifications.push({
        id: `${vehicle.id}:${field}:${vehicle[field]}`,
        title: remaining < 0 ? `${label} expirado` : remaining === 0 ? `${label} expira hoje` : `${label} a expirar`,
        message: remaining < 0 ? `Validade terminou há ${Math.abs(remaining)} dias` : remaining === 0 ? "Verifica a validade do documento hoje" : `Validade em ${formatDate(vehicle[field])} · faltam ${remaining} dias`,
        view: "vehicles",
        severity: remaining <= 7 ? "urgent" : "reminder",
      });
    }
  }

  for (const [field, label] of [["frontTread", "Piso dos pneus dianteiros"], ["rearTread", "Piso dos pneus traseiros"]]) {
    const depth = vehicle[field];
    if (depth !== null && depth !== undefined && Number(depth) <= 3) {
      notifications.push({
        id: `${vehicle.id}:${field}:${depth}`,
        title: `${label} reduzido`,
        message: `${Number(depth).toLocaleString("pt-PT")} mm registados · verifica os pneus`,
        view: "vehicles",
        severity: "reminder",
      });
    }
  }
  return notifications;
}

function readNotificationIds() {
  try {
    const value = JSON.parse(localStorage.getItem(READ_NOTIFICATIONS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch (error) {
    console.error("Não foi possível carregar o estado das notificações.", error);
    return [];
  }
}

function saveReadNotificationIds(ids) {
  try {
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...new Set(ids)]));
  } catch (error) {
    console.error("Não foi possível guardar o estado das notificações.", error);
    window.alert("Não foi possível guardar o estado das notificações.");
    throw error;
  }
}

function renderNotifications() {
  const notifications = getVehicleNotifications();
  const readIds = readNotificationIds();
  const unreadCount = notifications.filter((notification) => !readIds.includes(notification.id)).length;
  const badge = document.querySelector("#notification-count");
  badge.hidden = unreadCount === 0;
  badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
  document.querySelector("#notification-toggle").setAttribute("aria-label", unreadCount ? `Notificações, ${unreadCount} por ler` : "Notificações");
  document.querySelector("#notifications-subtitle").textContent = `${getActiveVehicle().model} · ${notifications.length} ${notifications.length === 1 ? "alerta" : "alertas"}`;
  document.querySelector("#mark-notifications-read").disabled = unreadCount === 0;
  const list = document.querySelector("#notification-list");
  list.innerHTML = notifications.length ? notifications.map((notification) => {
    const unread = !readIds.includes(notification.id);
    return `<button type="button" class="notification-item ${notification.severity} ${unread ? "unread" : ""}" data-notification-id="${escapeHtml(notification.id)}" data-notification-view="${escapeHtml(notification.view)}">
      <span class="notification-indicator"></span>
      <span><strong>${escapeHtml(notification.title)}</strong><small>${escapeHtml(notification.message)}</small></span>
      ${unread ? '<span class="unread-label">NOVA</span>' : ""}
    </button>`;
  }).join("") : '<div class="notification-empty"><strong>Está tudo em dia</strong>Não há alertas para este veículo.</div>';
}

function estimateConsumption(list) {
  const fuelRecords = list.filter((record) => record.type === "fuel" && Number(record.km) > 0 && Number(record.litres) > 0).sort((a, b) => Number(a.km) - Number(b.km));
  if (fuelRecords.length < 2) return null;
  const distance = Number(fuelRecords[fuelRecords.length - 1].km) - Number(fuelRecords[0].km);
  if (distance <= 0) return null;
  const litresUsed = fuelRecords.slice(1).reduce((sum, record) => sum + Number(record.litres), 0);
  return (litresUsed / distance) * 100;
}

function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === viewName));
  if (viewName === "dashboard") {
    document.querySelector("#dashboard-view").classList.add("active");
    document.querySelector("#breadcrumb-current").textContent = "Dashboard";
    return;
  }
  if (viewName === "statistics") {
    document.querySelector("#statistics-view").classList.add("active");
    document.querySelector("#breadcrumb-current").textContent = "Estatísticas";
    renderStatistics();
    return;
  }
  if (viewName === "health") {
    document.querySelector("#health-view").classList.add("active");
    document.querySelector("#breadcrumb-current").textContent = "CarLog Health";
    renderHealthView();
    return;
  }
  if (viewName === "vehicles") {
    document.querySelector("#vehicles-view").classList.add("active");
    document.querySelector("#breadcrumb-current").textContent = "Veículos";
    renderVehicles();
    return;
  }
  document.querySelector("#records-view").classList.add("active");
  const section = {
    maintenance: { title: "Manutenção", description: "Acompanha revisões, reparações e próximos serviços.", eyebrow: "CUIDA DO TEU CARRO", heading: "Histórico de manutenção", subheading: "Revisões, avarias e reparações" },
    fuel: { title: "Combustível", description: "Regista abastecimentos e acompanha o consumo do teu veículo.", eyebrow: "ACOMPANHA O CONSUMO", heading: "Histórico de abastecimentos", subheading: "Litros, preço e quilometragem" },
    expenses: { title: "Despesas", description: "Todos os custos associados ao teu veículo, num só lugar.", eyebrow: "CONTROLA OS CUSTOS", heading: "Histórico de despesas", subheading: "Combustível, manutenção e outros custos" },
    trips: { title: "Diário de bordo", description: "Guarda os percursos e a quilometragem das tuas viagens.", eyebrow: "REGISTA AS TUAS VIAGENS", heading: "Histórico de viagens", subheading: "Percursos e quilómetros percorridos" },
  }[viewName] || { title: "Registos", description: "Histórico do veículo.", eyebrow: "O TEU VEÍCULO", heading: "Histórico", subheading: "Todos os registos do teu veículo" };
  document.querySelector("#breadcrumb-current").textContent = section.title;
  document.querySelector("#section-title").textContent = section.title;
  document.querySelector("#section-description").textContent = section.description;
  document.querySelector("#section-eyebrow").textContent = section.eyebrow;
  document.querySelector("#records-heading").textContent = section.heading;
  document.querySelector("#records-subheading").textContent = section.subheading;
  document.querySelector("#records-filter").value = "all";
  renderRecords();
}

function recordsForCurrentView() {
  const activeRecords = recordsForActiveVehicle();
  if (currentView === "maintenance") return activeRecords.filter((record) => record.type === "maintenance");
  if (currentView === "fuel") return activeRecords.filter((record) => record.type === "fuel");
  if (currentView === "trips") return activeRecords.filter((record) => record.type === "trip");
  return activeRecords;
}

function filteredRecords() {
  const period = document.querySelector("#records-filter").value;
  const now = new Date();
  return recordsForCurrentView().filter((record) => {
    const date = new Date(`${record.date}T12:00:00`);
    if (period === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    if (period === "year") return date.getFullYear() === now.getFullYear();
    return true;
  }).sort(byDateDescending);
}

function renderRecords() {
  const visible = filteredRecords();
  const selectedType = currentView === "maintenance" ? "maintenance" : currentView === "fuel" ? "fuel" : currentView === "trips" ? "trip" : "all";
  const sum = totalFor(visible, selectedType);
  document.querySelector("#records-summary").innerHTML = `
    <div class="summary-tile"><span>Registos</span><strong>${visible.length}</strong></div>
    <div class="summary-tile"><span>Total registado</span><strong>${formatCurrency(sum)}</strong></div>
    <div class="summary-tile"><span>Quilometragem atual</span><strong>${escapeHtml(formatVehicleMileage(getActiveVehicle()))}</strong></div>`;
  const container = document.querySelector("#record-list");
  if (!visible.length) {
    container.innerHTML = '<div class="empty-state"><strong>Sem registos neste período</strong>Adiciona um novo registo para começar.</div>';
    renderTripChecklist();
    return;
  }
  container.innerHTML = visible.map((record) => {
    const [icon, color] = iconClass(record);
    const details = [typeLabel(record), formatDate(record.date), record.route, record.distance ? `${formatKm(record.distance)} km percorridos` : null, record.km ? `${formatKm(record.km)} km` : null, record.type === "fuel" && record.litres ? `${Number(record.litres).toLocaleString("pt-PT")} L` : null].filter(Boolean).join(" · ");
    return `<div class="record-row">
      <span class="record-icon ${color}">${icon}</span>
      <span><span class="record-name">${escapeHtml(record.description)}</span><span class="record-meta">${escapeHtml(details)}</span></span>
      <span class="record-amount">${formatCurrency(record.amount)}</span>
      <span class="record-actions">
        <button class="edit-record" data-edit-record="${escapeHtml(record.id)}" aria-label="Editar ${escapeHtml(record.description)}">✎</button>
        <button class="delete-record" data-delete="${escapeHtml(record.id)}" aria-label="Apagar ${escapeHtml(record.description)}">×</button>
      </span>
    </div>`;
  }).join("");
  renderTripChecklist();
}

function readTripChecklistState() {
  try {
    const saved = JSON.parse(localStorage.getItem(TRIP_CHECKLIST_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (error) {
    console.error("Não foi possível carregar a checklist da viagem.", error);
    return {};
  }
}

function renderTripChecklist() {
  const panel = document.querySelector("#trip-checklist-panel");
  panel.hidden = currentView !== "trips";
  if (panel.hidden) return;

  const allStates = readTripChecklistState();
  const state = Array.isArray(allStates[activeVehicleId]) ? allStates[activeVehicleId] : [];
  const checkedCount = tripChecklistItems.reduce((count, _, index) => count + (state[index] ? 1 : 0), 0);
  document.querySelector("#checklist-progress-label").textContent = `${checkedCount} de ${tripChecklistItems.length} verificados`;
  document.querySelector("#checklist-progress-bar").style.width = `${(checkedCount / tripChecklistItems.length) * 100}%`;
  document.querySelector("#checklist-complete").hidden = checkedCount !== tripChecklistItems.length;
  document.querySelector("#reset-trip-checklist").disabled = checkedCount === 0;
  document.querySelector("#trip-checklist-items").innerHTML = tripChecklistItems.map((item, index) => `
    <label class="checklist-item ${state[index] ? "checked" : ""}">
      <input type="checkbox" data-checklist-index="${index}" ${state[index] ? "checked" : ""}>
      <span class="checklist-checkmark" aria-hidden="true"></span>
      <span>${escapeHtml(item)}</span>
    </label>`).join("");
}

function getHealthChecks() {
  const vehicle = getActiveVehicle();
  const vehicleRecords = recordsForActiveVehicle();
  const checks = [];
  const nextMaintenance = vehicleRecords
    .filter((record) => record.type === "maintenance" && Number(record.nextKm) > 0)
    .sort((a, b) => Number(a.nextKm) - Number(b.nextKm))[0];

  if (!nextMaintenance) {
    checks.push({ title: "Plano de manutenção", status: "unknown", message: "Regista a próxima revisão para acompanhar os quilómetros." });
  } else if (Number(vehicle.km) <= 0) {
    checks.push({ title: "Plano de manutenção", status: "unknown", message: "Preenche a quilometragem atual para calcular a próxima revisão." });
  } else {
    const distance = Number(nextMaintenance.nextKm) - Number(vehicle.km);
    checks.push({
      title: "Plano de manutenção",
      status: distance <= 0 ? "urgent" : distance <= 2000 ? "attention" : "good",
      message: distance <= 0 ? `${nextMaintenance.description} · quilometragem prevista atingida` : `${nextMaintenance.description} · faltam ${formatKm(distance)} km`,
    });
  }

  const treadValues = [vehicle.frontTread, vehicle.rearTread].filter((value) => value !== null && value !== undefined && value !== "");
  if (!treadValues.length) {
    checks.push({ title: "Pneus", status: "unknown", message: "Regista a profundidade do piso para acompanhar o desgaste." });
  } else if (treadValues.length < 2) {
    checks.push({ title: "Pneus", status: "unknown", message: "Falta registar a profundidade dos pneus dianteiros ou traseiros." });
  } else {
    const minimumTread = Math.min(...treadValues.map(Number));
    checks.push({
      title: "Pneus",
      status: minimumTread <= 1.6 ? "urgent" : minimumTread <= 3 ? "attention" : "good",
      message: `Menor profundidade registada: ${minimumTread.toLocaleString("pt-PT")} mm`,
    });
  }

  const today = new Date();
  const documents = [
    { field: "inspectionUntil", title: "Inspeção periódica" },
    { field: "insuranceUntil", title: "Seguro automóvel" },
  ].filter((document) => vehicle[document.field]);
  if (!documents.length) {
    checks.push({ title: "Documentos", status: "unknown", message: "Adiciona as datas de validade da IPO e do seguro." });
  } else {
    const expiries = documents.map((document) => {
      const expiry = new Date(`${vehicle[document.field]}T12:00:00`);
      const days = Math.ceil((expiry - new Date(`${today.toISOString().slice(0, 10)}T12:00:00`)) / 86400000);
      return { ...document, days };
    });
    const expired = expiries.filter((document) => document.days < 0);
    const expiring = expiries.filter((document) => document.days >= 0 && document.days <= 30);
    const missingDocuments = documents.length < 2;
    checks.push({
      title: "Documentos",
      status: expired.length ? "urgent" : expiring.length ? "attention" : "good",
      message: expired.length
        ? `${expired.map((document) => document.title).join(", ")} expirado`
        : expiring.length
          ? `${expiring.map((document) => document.title).join(", ")} a expirar`
          : missingDocuments ? "Validades registadas sem alertas; falta completar outro documento." : "IPO e seguro sem validade próxima registada",
    });
  }
  return checks;
}

function summarizeHealthChecks(checks) {
  const urgentCount = checks.filter((check) => check.status === "urgent").length;
  const attentionCount = checks.filter((check) => check.status === "attention").length;
  const knownCount = checks.filter((check) => check.status !== "unknown").length;
  if (urgentCount) return { status: "urgent", title: "Atenção recomendada", detail: `${urgentCount} verificação(ões) requer(em) atenção prioritária.` };
  if (attentionCount) return { status: "attention", title: "Verificações recomendadas", detail: `${attentionCount} alerta(s) ativo(s) nos dados registados.` };
  if (knownCount === checks.length) return { status: "good", title: "Sem alertas registados", detail: "Os dados disponíveis não indicam verificações próximas." };
  return { status: "unknown", title: "Dados incompletos", detail: "Preenche mais informações para obter um resumo útil do veículo." };
}

function renderHealthView() {
  const vehicle = getActiveVehicle();
  const checks = getHealthChecks();
  const overall = summarizeHealthChecks(checks);

  document.querySelector("#health-description").textContent = `Estado baseado nos dados registados para o ${vehicle.model}.`;
  document.querySelector("#health-overview").innerHTML = `
    <span class="health-overview-mark ${overall.status}">♥</span>
    <div><span class="eyebrow">ESTADO GERAL</span><h2>${overall.title}</h2><p>${overall.detail}</p></div>`;
  document.querySelector("#health-checks").innerHTML = checks.map((check) => `
    <article class="panel health-check-card ${check.status}">
      <div><span class="health-status-dot"></span><h3>${check.title}</h3></div>
      <p>${check.message}</p>
      <span class="health-status-label">${check.status === "urgent" ? "ATENÇÃO" : check.status === "attention" ? "A VERIFICAR" : check.status === "good" ? "SEM ALERTA" : "SEM DADOS"}</span>
    </article>`).join("");

  const systemGroups = [
    { title: "Bateria", matches: /bateria/i },
    { title: "Travagem", matches: /travagem|travão|discos/i },
    { title: "Refrigeração", matches: /refrigeração|refrigerante/i },
    { title: "Lubrificação", matches: /lubrificação|óleo/i },
    { title: "Correia de distribuição", matches: /correia de distribuição/i },
    { title: "Peças e reparações", matches: /peças|reparação|avaria/i },
  ];
  const maintenanceRecords = vehicleRecordsForHealth();
  const systems = systemGroups.map((system) => {
    const lastRecord = maintenanceRecords.filter((record) => system.matches.test(`${record.category} ${record.description}`)).sort(byDateDescending)[0];
    return { ...system, lastRecord };
  });
  document.querySelector("#health-component-list").innerHTML = systems.map((system) => `
    <div class="health-component-row">
      <span class="health-component-icon">${system.lastRecord ? "✓" : "·"}</span>
      <strong>${system.title}</strong>
      <span>${system.lastRecord ? `Último registo: ${formatDate(system.lastRecord.date)}${system.lastRecord.km ? ` · ${formatKm(system.lastRecord.km)} km` : ""}` : "Sem manutenção registada"}</span>
    </div>`).join("");
}

function vehicleRecordsForHealth() {
  return recordsForActiveVehicle().filter((record) => record.type === "maintenance");
}

function renderStatistics() {
  document.querySelector("#stats-description").textContent = `Uma visão clara dos custos e consumo do teu ${getActiveVehicle().model}.`;
  const period = document.querySelector("#stats-period").value;
  const now = new Date();
  const selected = recordsForActiveVehicle().filter((record) => {
    const date = new Date(`${record.date}T12:00:00`);
    if (period === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    if (period === "year") return date.getFullYear() === now.getFullYear();
    return true;
  });
  const fuel = totalFor(selected, "fuel");
  const maintenance = totalFor(selected, "maintenance");
  const expenses = totalFor(selected, "all");
  const allRecords = recordsForActiveVehicle();
  const recordedDistances = allRecords.filter((record) => Number(record.km) > 0).map((record) => Number(record.km));
  const distance = Math.max(0, Number(getActiveVehicle().km) - Math.min(...recordedDistances, Number(getActiveVehicle().km)));
  const costPerKm = distance > 0 ? totalFor(allRecords, "all") / distance : null;
  document.querySelector("#stats-overview").innerHTML = `
    <div class="summary-tile"><span>Total gasto</span><strong>${formatCurrency(expenses)}</strong></div>
    <div class="summary-tile"><span>Combustível</span><strong>${formatCurrency(fuel)}</strong></div>
    <div class="summary-tile"><span>Manutenção</span><strong>${formatCurrency(maintenance)}</strong></div>
    <div class="summary-tile"><span>Custo por km registado</span><strong>${costPerKm === null ? "—" : `${formatCurrency(costPerKm)}/km`}</strong></div>`;

  const categories = new Map();
  selected.forEach((record) => {
    const name = typeLabel(record);
    categories.set(name, (categories.get(name) || 0) + Number(record.amount || 0));
  });
  const sorted = [...categories.entries()].sort((a, b) => b[1] - a[1]);
  const maximum = Math.max(1, ...sorted.map(([, amount]) => amount));
  document.querySelector("#category-chart").innerHTML = sorted.length ? sorted.map(([name, amount]) => `
    <div class="category-row"><span class="category-name">${escapeHtml(name)}</span><span class="category-bar"><span style="width:${(amount / maximum) * 100}%"></span></span><span class="category-value">${formatCurrency(amount)}</span></div>`).join("")
    : '<div class="empty-state">Ainda não há despesas para este período.</div>';

  const consumption = estimateConsumption(allRecords);
  document.querySelector("#average-consumption").textContent = consumption === null ? "—" : consumption.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  document.querySelector("#consumption-caption").textContent = consumption === null
    ? "Adiciona pelo menos dois abastecimentos com quilometragem para calcular o consumo."
    : "Consumo médio estimado com base nos abastecimentos e quilometragem registados.";
}

function renderVehicles() {
  const container = document.querySelector("#vehicle-list");
  container.innerHTML = vehicles.map((vehicle) => {
    const active = vehicle.id === activeVehicleId;
    const specs = [
      vehicle.year ? `${vehicle.year}` : null,
      vehicle.fuel || null,
      vehicle.displacement ? `${Number(vehicle.displacement).toLocaleString("pt-PT")} cc` : null,
      vehicle.power ? `${vehicle.power} cv` : null,
      vehicle.plate || null,
    ].filter(Boolean).map(escapeHtml).join(" · ");
    const photo = vehicle.photo
      ? `<img src="${escapeHtml(vehicle.photo)}" alt="Fotografia de ${escapeHtml(vehicle.model)}">`
      : `<span class="vehicle-placeholder">${escapeHtml(vehicle.model.slice(0, 1).toUpperCase())}</span>`;
    const tireInfo = [
      vehicle.frontPressure ? `Dianteiros ${Number(vehicle.frontPressure).toLocaleString("pt-PT")} bar` : null,
      vehicle.rearPressure ? `Traseiros ${Number(vehicle.rearPressure).toLocaleString("pt-PT")} bar` : null,
      (vehicle.frontTread !== null && vehicle.frontTread !== undefined) || (vehicle.rearTread !== null && vehicle.rearTread !== undefined) ? `Piso ${vehicle.frontTread ?? "—"} / ${vehicle.rearTread ?? "—"} mm` : null,
      vehicle.tiresChangedOn ? `Substituídos ${formatDate(vehicle.tiresChangedOn)}` : null,
    ].filter(Boolean).map(escapeHtml).join(" · ");
    return `<article class="vehicle-list-card ${active ? "selected" : ""}">
      <div class="vehicle-list-photo">${photo}</div>
      <div class="vehicle-list-info"><span class="vehicle-status">${active ? "VEÍCULO ATIVO" : "NA TUA GARAGEM"}</span><h2>${escapeHtml(vehicle.model)}</h2>
        <p>${specs || "Ficha técnica por preencher"}</p>${tireInfo ? `<p class="vehicle-tire-info">${tireInfo}</p>` : ""}<strong>${escapeHtml(formatVehicleMileage(vehicle))}</strong></div>
      <div class="vehicle-list-actions">
        ${active ? '<span class="active-vehicle-label">Em utilização</span>' : `<button class="button button-outline" data-select-vehicle="${escapeHtml(vehicle.id)}">Definir ativo</button>`}
        <button class="vehicle-edit-button" data-edit-vehicle="${escapeHtml(vehicle.id)}">Editar ficha</button>
        ${vehicles.length > 1 ? `<button class="vehicle-delete-button" data-delete-vehicle="${escapeHtml(vehicle.id)}">Remover</button>` : ""}
      </div>
    </article>`;
  }).join("");
}

const dialog = document.querySelector("#record-dialog");
const form = document.querySelector("#record-form");
const vehicleDialog = document.querySelector("#vehicle-dialog");
const vehicleForm = document.querySelector("#vehicle-form");

function showFormError(message) {
  document.querySelector("#form-error").textContent = message;
}

function openDialog(record = null) {
  editingRecordId = record?.id || null;
  form.reset();
  document.querySelector("#record-date").value = new Date().toISOString().slice(0, 10);
  document.querySelector("#record-type").value = record?.type || (currentView === "maintenance" ? "maintenance" : currentView === "fuel" ? "fuel" : currentView === "trips" ? "trip" : "expense");
  if (record) {
    form.elements.description.value = record.description || "";
    form.elements.date.value = record.date || "";
    form.elements.amount.value = record.amount ?? "";
    form.elements.category.value = record.category || "Outros";
    form.elements.maintenanceKind.value = record.category || "Outra manutenção";
    form.elements.litres.value = record.litres ?? "";
    form.elements.pricePerLitre.value = record.pricePerLitre ?? "";
    form.elements.km.value = record.km ?? "";
    form.elements.nextKm.value = record.nextKm ?? "";
    form.elements.route.value = record.route || "";
    form.elements.startKm.value = record.startKm ?? record.km ?? "";
    form.elements.endKm.value = record.km ?? "";
  } else if (currentView === "trips") {
    form.elements.startKm.value = getActiveVehicle().km;
  }
  document.querySelector(".dialog-heading .eyebrow").textContent = getActiveVehicle().model.toUpperCase();
  document.querySelector("#form-error").textContent = "";
  updateFormFields();
  dialog.showModal();
}

function updateFormFields() {
  const type = document.querySelector("#record-type").value;
  const isFuel = type === "fuel";
  const isTrip = type === "trip";
  document.querySelector(".fuel-fields").classList.toggle("visible", isFuel);
  document.querySelector(".trip-fields").classList.toggle("visible", isTrip);
  document.querySelector(".category-field").classList.toggle("hidden", isFuel || isTrip);
  document.querySelector(".maintenance-kind-field").classList.toggle("hidden", type !== "maintenance");
  document.querySelector(".next-service-field").classList.toggle("hidden", type !== "maintenance");
  document.querySelector(".record-km-field").classList.toggle("hidden", isTrip);
  document.querySelector("#record-form input[name=\"amount\"]").required = !isTrip;
  document.querySelector("#record-form input[name=\"amount\"]").min = isTrip ? "0" : "0.01";
  const action = editingRecordId ? "Editar" : "Novo";
  document.querySelector("#dialog-title").textContent = type === "fuel" ? `${action} abastecimento` : type === "maintenance" ? `${action} manutenção` : isTrip ? `${editingRecordId ? "Editar" : "Registar"} viagem` : `${action} despesa`;
  document.querySelector("#record-description").placeholder = type === "fuel" ? "Ex.: Abastecimento — Galp" : type === "maintenance" ? "Ex.: Mudança de óleo" : isTrip ? "Ex.: Visita ao Porto" : "Ex.: Seguro automóvel";
  form.querySelector('button[type="submit"]').textContent = editingRecordId ? "Guardar alterações" : "Guardar registo";
}

function updateFuelAmount() {
  if (document.querySelector("#record-type").value !== "fuel") return;
  const litres = Number(form.elements.litres.value);
  const price = Number(form.elements.pricePerLitre.value);
  if (litres > 0 && price > 0) form.elements.amount.value = (litres * price).toFixed(2);
}

function openVehicleDialog(vehicle = null) {
  editingVehicleId = vehicle?.id || null;
  vehicleForm.reset();
  document.querySelector("#vehicle-dialog-title").textContent = vehicle ? "Editar veículo" : "Adicionar veículo";
  const modelSelect = document.querySelector("#vehicle-model");
  const customField = document.querySelector(".custom-model-field");
  if (vehicle) {
    const isKnown = [...modelSelect.options].some((option) => option.value === vehicle.model);
    modelSelect.value = isKnown ? vehicle.model : "Outro";
    customField.classList.toggle("hidden", isKnown);
    vehicleForm.elements.customModel.value = isKnown ? "" : vehicle.model;
    vehicleForm.elements.plate.value = vehicle.plate || "";
    vehicleForm.elements.year.value = vehicle.year || "";
    vehicleForm.elements.km.value = vehicle.km || 0;
    vehicleForm.elements.displacement.value = vehicle.displacement || "";
    vehicleForm.elements.power.value = vehicle.power || "";
    vehicleForm.elements.fuel.value = vehicle.fuel || "Gasóleo";
    vehicleForm.elements.insuranceUntil.value = vehicle.insuranceUntil || "";
    vehicleForm.elements.inspectionUntil.value = vehicle.inspectionUntil || "";
    vehicleForm.elements.frontPressure.value = vehicle.frontPressure || "";
    vehicleForm.elements.rearPressure.value = vehicle.rearPressure || "";
    vehicleForm.elements.frontTread.value = vehicle.frontTread || "";
    vehicleForm.elements.rearTread.value = vehicle.rearTread || "";
    vehicleForm.elements.tiresChangedOn.value = vehicle.tiresChangedOn || "";
  } else {
    modelSelect.value = "BMW Série 3";
    customField.classList.add("hidden");
    vehicleForm.elements.km.value = "0";
  }
  document.querySelector("#vehicle-form-error").textContent = "";
  vehicleDialog.showModal();
}

function saveVehicleFromForm(vehicle, photo) {
  const data = new FormData(vehicleForm);
  const model = String(data.get("model")) === "Outro" ? String(data.get("customModel")).trim() : String(data.get("model"));
  const plate = String(data.get("plate")).trim().toUpperCase();
  const duplicatePlate = plate && vehicles.some((item) => item.id !== vehicle.id && item.plate?.toUpperCase() === plate);
  if (!model) {
    document.querySelector("#vehicle-form-error").textContent = "Indica a marca e o modelo do veículo.";
    return false;
  }
  if (duplicatePlate) {
    document.querySelector("#vehicle-form-error").textContent = "Já existe um veículo com esta matrícula.";
    return false;
  }
  const km = Number(data.get("km"));
  if (!Number.isInteger(km) || km < Number(vehicle.km || 0)) {
    document.querySelector("#vehicle-form-error").textContent = `A quilometragem deve ser igual ou superior a ${formatKm(vehicle.km || 0)} km.`;
    return false;
  }
  Object.assign(vehicle, {
    model,
    plate,
    year: data.get("year") ? Number(data.get("year")) : null,
    km,
    displacement: data.get("displacement") ? Number(data.get("displacement")) : null,
    power: data.get("power") ? Number(data.get("power")) : null,
    fuel: String(data.get("fuel")),
    insuranceUntil: String(data.get("insuranceUntil")),
    inspectionUntil: String(data.get("inspectionUntil")),
    frontPressure: data.get("frontPressure") ? Number(data.get("frontPressure")) : null,
    rearPressure: data.get("rearPressure") ? Number(data.get("rearPressure")) : null,
    frontTread: data.get("frontTread") ? Number(data.get("frontTread")) : null,
    rearTread: data.get("rearTread") ? Number(data.get("rearTread")) : null,
    tiresChangedOn: String(data.get("tiresChangedOn")),
    photo: photo || vehicle.photo || "",
  });
  return true;
}

async function readVehiclePhoto(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("Escolhe um ficheiro de imagem.");
  if (file.size > 2 * 1024 * 1024) throw new Error("A fotografia deve ter no máximo 2 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a fotografia."));
    reader.readAsDataURL(file);
  });
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});
const notificationWrapper = document.querySelector(".notification-wrapper");
const notificationPanel = document.querySelector("#notifications-panel");
const notificationToggle = document.querySelector("#notification-toggle");
const dataDialog = document.querySelector("#data-dialog");
const backupFileInput = document.querySelector("#import-backup-file");

document.querySelector("#backup-toggle").addEventListener("click", () => dataDialog.showModal());
document.querySelector("#data-dialog-close").addEventListener("click", () => dataDialog.close());
document.querySelector("#export-backup").addEventListener("click", () => {
  try {
    const backup = createBackupPayload();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("Não foi possível exportar a cópia CarLog.", error);
    window.alert("Não foi possível criar a cópia de segurança.");
  }
});
document.querySelector("#choose-backup").addEventListener("click", () => backupFileInput.click());
backupFileInput.addEventListener("change", async () => {
  const file = backupFileInput.files[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("O ficheiro excede o limite de 10 MB.");
    const payload = JSON.parse(await file.text());
    const data = validateBackupPayload(payload);
    if (!window.confirm("Esta ação substitui os dados atuais do CarLog neste navegador. Queres continuar?")) return;
    restoreBackupData(data);
    refresh();
    dataDialog.close();
    window.alert("Cópia de segurança restaurada com sucesso.");
  } catch (error) {
    console.error("Não foi possível importar a cópia CarLog.", error);
    window.alert(error.message || "Não foi possível importar esta cópia.");
  } finally {
    backupFileInput.value = "";
  }
});
notificationToggle.addEventListener("click", () => {
  notificationPanel.hidden = !notificationPanel.hidden;
  notificationToggle.setAttribute("aria-expanded", String(!notificationPanel.hidden));
  if (!notificationPanel.hidden) renderNotifications();
});
document.querySelector("#mark-notifications-read").addEventListener("click", () => {
  const notifications = getVehicleNotifications();
  try {
    saveReadNotificationIds([...readNotificationIds(), ...notifications.map((notification) => notification.id)]);
    renderNotifications();
  } catch {
    return;
  }
});
document.querySelector("#notification-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-notification-id]");
  if (!button) return;
  try {
    saveReadNotificationIds([...readNotificationIds(), button.dataset.notificationId]);
  } catch {
    return;
  }
  renderNotifications();
  notificationPanel.hidden = true;
  notificationToggle.setAttribute("aria-expanded", "false");
  switchView(button.dataset.notificationView);
});
document.addEventListener("pointerdown", (event) => {
  if (notificationWrapper.contains(event.target)) return;
  notificationPanel.hidden = true;
  notificationToggle.setAttribute("aria-expanded", "false");
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || notificationPanel.hidden) return;
  notificationPanel.hidden = true;
  notificationToggle.setAttribute("aria-expanded", "false");
  notificationToggle.focus();
});
document.querySelector("#active-vehicle-select").addEventListener("change", (event) => {
  const previousVehicleId = activeVehicleId;
  activeVehicleId = event.target.value;
  try {
    saveRecords();
    refresh();
  } catch {
    activeVehicleId = previousVehicleId;
    event.target.value = previousVehicleId;
    window.alert("Não foi possível guardar a seleção do veículo.");
  }
});
document.querySelectorAll('[data-action="add"]').forEach((button) => button.addEventListener("click", openDialog));
document.querySelector('[data-action="add-vehicle"]').addEventListener("click", () => openVehicleDialog());
document.querySelector('[data-action="update-mileage"]').addEventListener("click", () => {
  const vehicle = getActiveVehicle();
  const entered = window.prompt(`Indica a quilometragem atual do ${vehicle.model} (km):`, String(vehicle.km));
  if (entered === null) return;
  const nextKm = Number(entered);
  if (!Number.isInteger(nextKm) || nextKm < vehicle.km) {
    window.alert(`Introduz um número inteiro igual ou superior a ${formatKm(vehicle.km)} km.`);
    return;
  }
  vehicle.km = nextKm;
  try {
    saveRecords();
    refresh();
  } catch {
    vehicle.km = Number(localStorage.getItem(CURRENT_KM_KEY)) || DEFAULT_KM;
  }
});
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
document.querySelector(".button-cancel").addEventListener("click", () => dialog.close());
document.querySelector(".vehicle-dialog-close").addEventListener("click", () => vehicleDialog.close());
document.querySelector(".vehicle-dialog-cancel").addEventListener("click", () => vehicleDialog.close());
document.querySelector("#record-type").addEventListener("change", updateFormFields);
document.querySelector("#vehicle-model").addEventListener("change", (event) => {
  document.querySelector(".custom-model-field").classList.toggle("hidden", event.target.value !== "Outro");
});
document.querySelector('input[name="litres"]').addEventListener("input", updateFuelAmount);
document.querySelector('input[name="pricePerLitre"]').addEventListener("input", updateFuelAmount);
document.querySelector("#records-filter").addEventListener("change", renderRecords);
document.querySelector("#stats-period").addEventListener("change", renderStatistics);
document.querySelector("#export-report").addEventListener("click", () => window.print());
document.querySelector("#trip-checklist-items").addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-checklist-index]");
  if (!checkbox) return;
  const allStates = readTripChecklistState();
  const state = Array.isArray(allStates[activeVehicleId]) ? [...allStates[activeVehicleId]] : [];
  state[Number(checkbox.dataset.checklistIndex)] = checkbox.checked;
  try {
    localStorage.setItem(TRIP_CHECKLIST_KEY, JSON.stringify({ ...allStates, [activeVehicleId]: state }));
    renderTripChecklist();
  } catch (error) {
    console.error("Não foi possível guardar a checklist da viagem.", error);
    window.alert("Não foi possível guardar a checklist neste navegador.");
    renderTripChecklist();
  }
});
document.querySelector("#reset-trip-checklist").addEventListener("click", () => {
  const allStates = readTripChecklistState();
  try {
    localStorage.setItem(TRIP_CHECKLIST_KEY, JSON.stringify({ ...allStates, [activeVehicleId]: [] }));
    renderTripChecklist();
  } catch (error) {
    console.error("Não foi possível repor a checklist da viagem.", error);
    window.alert("Não foi possível repor a checklist neste navegador.");
  }
});
document.querySelector("#record-list").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-record]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const record = records.find((item) => item.id === editButton.dataset.editRecord && item.vehicleId === activeVehicleId);
    if (record) openDialog(record);
    return;
  }
  if (!deleteButton) return;
  records = records.filter((record) => record.id !== deleteButton.dataset.delete);
  saveRecords();
  refresh();
});
document.querySelector("#vehicle-list").addEventListener("click", (event) => {
  const selectButton = event.target.closest("[data-select-vehicle]");
  const editButton = event.target.closest("[data-edit-vehicle]");
  const deleteButton = event.target.closest("[data-delete-vehicle]");
  if (selectButton) {
    activeVehicleId = selectButton.dataset.selectVehicle;
    saveRecords();
    renderDashboard();
    switchView("dashboard");
  } else if (editButton) {
    openVehicleDialog(vehicles.find((vehicle) => vehicle.id === editButton.dataset.editVehicle));
  } else if (deleteButton) {
    const vehicle = vehicles.find((item) => item.id === deleteButton.dataset.deleteVehicle);
    if (!vehicle || !window.confirm(`Remover ${vehicle.model} e os respetivos registos?`)) return;
    vehicles = vehicles.filter((item) => item.id !== vehicle.id);
    records = records.filter((record) => record.vehicleId !== vehicle.id);
    if (activeVehicleId === vehicle.id) activeVehicleId = vehicles[0].id;
    saveRecords();
    renderVehicles();
    renderDashboard();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const type = String(data.get("type"));
  const amount = Number(data.get("amount"));
  const startKm = type === "trip" && data.get("startKm") ? Number(data.get("startKm")) : null;
  const endKm = type === "trip" && data.get("endKm") ? Number(data.get("endKm")) : null;
  const km = type === "trip" ? endKm : data.get("km") ? Number(data.get("km")) : null;
  const litres = data.get("litres") ? Number(data.get("litres")) : null;
  const pricePerLitre = data.get("pricePerLitre") ? Number(data.get("pricePerLitre")) : null;
  if (type === "fuel" && (!litres || !pricePerLitre)) {
    showFormError("Indica os litros abastecidos e o preço por litro.");
    return;
  }
  if (km !== null && (!Number.isInteger(km) || km < 0)) {
    showFormError("A quilometragem deve ser um número inteiro positivo.");
    return;
  }
  if (type === "trip" && (startKm === null || !Number.isInteger(startKm) || startKm < 0 || endKm === null || !Number.isInteger(endKm) || endKm < startKm)) {
    showFormError("Indica quilómetros iniciais e finais válidos; os finais não podem ser inferiores aos iniciais.");
    return;
  }
  const vehicle = getActiveVehicle();
  if (km !== null && km < vehicle.km && type !== "fuel" && type !== "trip" && !editingRecordId) {
    showFormError(`A quilometragem deve ser igual ou superior a ${formatKm(vehicle.km)} km.`);
    return;
  }
  const nextKm = data.get("nextKm") ? Number(data.get("nextKm")) : null;
  if (type === "maintenance" && nextKm !== null && (!Number.isInteger(nextKm) || nextKm <= (km ?? vehicle.km))) {
    showFormError("A quilometragem da próxima manutenção deve ser superior à quilometragem atual.");
    return;
  }
  const record = {
    id: editingRecordId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    vehicleId: editingRecordId ? records.find((item) => item.id === editingRecordId)?.vehicleId || activeVehicleId : activeVehicleId,
    type,
    description: String(data.get("description")).trim(),
    date: String(data.get("date")),
    amount,
    km,
    category: type === "fuel" ? "Combustível" : type === "maintenance" ? String(data.get("maintenanceKind")) : type === "trip" ? "Viagem" : String(data.get("category")),
    ...(type === "trip" ? { route: String(data.get("route")).trim(), startKm, distance: endKm - startKm } : {}),
    ...(type === "fuel" ? { litres, pricePerLitre } : {}),
    ...(type === "maintenance" && nextKm ? { nextKm } : {}),
  };
  if (!record.description || !record.date || !Number.isFinite(amount) || (type === "trip" ? amount < 0 : amount <= 0)) {
    showFormError(type === "trip" ? "Confirma a descrição, a data e um custo igual ou superior a zero." : "Confirma a descrição, a data e um valor superior a zero.");
    return;
  }
  if (type === "trip" && !String(data.get("route")).trim()) {
    showFormError("Indica o percurso da viagem.");
    return;
  }
  const previousKm = vehicle.km;
  if (km !== null && km > vehicle.km) vehicle.km = km;
  const previousRecords = records;
  records = editingRecordId
    ? records.map((item) => item.id === editingRecordId ? record : item)
    : [...records, record];
  try {
    saveRecords();
  } catch {
    records = previousRecords;
    vehicle.km = previousKm;
    return;
  }
  dialog.close();
  editingRecordId = null;
  refresh();
});

vehicleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const previousVehicles = [...vehicles];
  const previousActiveVehicleId = activeVehicleId;
  const existing = editingVehicleId ? vehicles.find((vehicle) => vehicle.id === editingVehicleId) : null;
  const vehicle = existing ? { ...existing } : { id: `vehicle-${Date.now()}`, km: 0 };
  const file = vehicleForm.elements.photo.files[0];
  try {
    const photo = await readVehiclePhoto(file);
    if (!saveVehicleFromForm(vehicle, photo)) return;
    if (existing) {
      vehicles = vehicles.map((item) => item.id === vehicle.id ? vehicle : item);
    } else {
      vehicles.push(vehicle);
      activeVehicleId = vehicle.id;
    }
    saveRecords();
    vehicleDialog.close();
    renderVehicles();
    renderDashboard();
  } catch (error) {
    console.error("Não foi possível guardar a fotografia do veículo.", error);
    vehicles = previousVehicles;
    activeVehicleId = previousActiveVehicleId;
    document.querySelector("#vehicle-form-error").textContent = error.message || "Não foi possível guardar o veículo.";
  }
});

function refresh() {
  renderDashboard();
  if (currentView === "statistics") renderStatistics();
  else if (currentView === "health") renderHealthView();
  else if (currentView === "vehicles") renderVehicles();
  else if (currentView !== "dashboard") renderRecords();
}

const today = new Date();
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "numeric", month: "short" }).format(today);
document.querySelector(".welcome-row .eyebrow").textContent = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(today).toUpperCase();
renderDashboard();
