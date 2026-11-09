// ================= API BASE (support LAN) =================
const API_BASE = (function() {
  // 1. Kalau dibuka langsung dari file explorer (file://)
  if (window.location.protocol === "file:") {
    return "http://localhost/web_desa/backend";
  }
  
  // 2. Kalau diakses via Live Server VS Code (port 5500)
  if (window.location.port === "5500") {
    return "http://localhost/web_desa/backend";
  }
  
  // 3. Kalau diakses via Laragon pretty URL (web_desa.test)
  if (window.location.hostname.indexOf("web_desa") !== -1 && window.location.hostname.indexOf(".test") !== -1) {
    return "/backend";
  }
  
  // 4. Kalau diakses via IP LAN / localhost port 80
  return "/web_desa/backend";
})();

// ================= API HELPERS =================
async function handleApiResponse(res, resource) {
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error(`API ${resource} - Non-JSON (HTTP ${res.status}):`, text.slice(0, 300));
    return { error: `Server error (HTTP ${res.status}). Cek console.` };
  }

  if (res.status === 401) {
    clearSession();
    if (typeof state !== 'undefined') {
      state.user = null;
      state.page = "beranda";
      state.notifOpen = false;
      state.showForm = false;
      state.formType = null;
      render();
    }
    toastMsg("Sesi habis. Silakan login ulang.", "error");
    return { error: "Unauthorized" };
  }

  if (!res.ok) {
    return { error: json.error || `HTTP ${res.status}` };
  }
  return json;
}

function getActorHeader() {
  let actor = "System";
  
  // 1. Coba ambil dari variabel state (jika posisinya memungkinkan)
  try {
    if (window.state && window.state.user && window.state.user.name) {
      actor = window.state.user.name;
    } else if (typeof state !== 'undefined' && state.user && state.user.name) {
      actor = state.user.name;
    }
  } catch (e) {}

  // 2. Jika state gagal, ambil langsung dari teks di Topbar (elemen HTML)
  if (actor === "System") {
    try {
      const userElement = document.querySelector('#user-menu div[style*="font-size:14px"]');
      if (userElement && userElement.textContent) {
        actor = userElement.textContent.trim();
      }
    } catch (e) {}
  }

  return actor;
}

function buildHeaders(withBody) {
  const h = {};
  if (withBody) h["Content-Type"] = "application/json";
  h["X-Actor"] = getActorHeader();
  return h;
}

async function apiGet(resource, params = "") {
  try {
    const res = await fetch(`${API_BASE}/${resource}.php${params}`, {
      method: "GET",
      credentials: "include",          
      headers: buildHeaders(false),
    });
    return await handleApiResponse(res, `GET ${resource}`);
  } catch (e) {
    console.error(`API GET ${resource} error:`, e);
    return { error: e.message };
  }
}

async function apiPost(resource, data) {
  try {
    const res = await fetch(`${API_BASE}/${resource}.php`, {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(true),
      body: JSON.stringify(data),
    });
    return await handleApiResponse(res, `POST ${resource}`);
  } catch (e) {
    console.error(`API POST ${resource} error:`, e);
    return { error: e.message };
  }
}

async function apiPut(resource, data) {
  try {
    const res = await fetch(`${API_BASE}/${resource}.php`, {
      method: "PUT",
      credentials: "include",
      headers: buildHeaders(true),
      body: JSON.stringify(data),
    });
    return await handleApiResponse(res, `PUT ${resource}`);
  } catch (e) {
    console.error(`API PUT ${resource} error:`, e);
    return { error: e.message };
  }
}

async function apiDelete(resource, id) {
  try {
    const res = await fetch(`${API_BASE}/${resource}.php?id=${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: buildHeaders(false),
    });
    return await handleApiResponse(res, `DELETE ${resource}`);
  } catch (e) {
    console.error(`API DELETE ${resource} error:`, e);
    return { error: e.message };
  }
}

(function () {
  "use strict";

  // ================= KONSTANTA =================
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const TODAY = new Date();

  const CAT_WARNA = {
    kegiatan: { hex: "#2563EB", label: "Kegiatan Desa" },
    rapat: { hex: "#7C3AED", label: "Rapat" },
    pelayanan: { hex: "#10B981", label: "Pelayanan" },
    lapangan: { hex: "#F59E0B", label: "Kegiatan Lapangan" },
    deadline: { hex: "#EF4444", label: "Deadline" },
  };

  const KONDISI_WARNA = {
    Baik: "#10B981",
    "Rusak Ringan": "#F59E0B",
    "Rusak Berat": "#EF4444",
  };

  const LOKASI = ["Balai Desa", "Kantor Sekretariat", "Ruang Rapat", "Poskamling", "Gudang Desa", "Posyandu", "PAUD Desa", "Lapangan Desa"];
  const PIC = ["Kepala Desa", "Sekretaris Desa", "Kaur Tata Usaha dan Umum", "Kaur Keuangan", "Kasi Perencanaan", "Kasi Pemerintahan", "Kasi Kesejahteraan", "Kasi Pelayanan", "Kasun Wates", "Kasun Robyong"];

  // ================= HELPERS =================
  function pad(n) { return String(n).padStart(2, "0"); }
  function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
  function uid(prefix) { return `${prefix}-${Math.random().toString(36).slice(2, 9)}`; }

  function getDateRangeByPeriod(period) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const padN = function(n) { return String(n).padStart(2, "0"); };
    const fmt = function(dt) {
      return dt.getFullYear() + "-" + padN(dt.getMonth() + 1) + "-" + padN(dt.getDate());
    };
    const firstOfMonth = function(yy, mm) { return new Date(yy, mm, 1); };
    const lastOfMonth = function(yy, mm) { return new Date(yy, mm + 1, 0); };

    switch (period) {
      case "today":
        return { start: fmt(now), end: fmt(now) };
      case "this_week": {
        const day = now.getDay();
        const mon = new Date(now); mon.setDate(d - (day === 0 ? 6 : day - 1));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        return { start: fmt(mon), end: fmt(sun) };
      }
      case "this_month":
        return { start: fmt(firstOfMonth(y, m)), end: fmt(lastOfMonth(y, m)) };
      case "last_month": {
        const lm = m === 0 ? 11 : m - 1;
        const ly = m === 0 ? y - 1 : y;
        return { start: fmt(firstOfMonth(ly, lm)), end: fmt(lastOfMonth(ly, lm)) };
      }
      case "last_3_months": {
        const start = new Date(y, m - 2, 1);
        return { start: fmt(start), end: fmt(lastOfMonth(y, m)) };
      }
      case "last_6_months": {
        const start = new Date(y, m - 5, 1);
        return { start: fmt(start), end: fmt(lastOfMonth(y, m)) };
      }
      case "this_year":
        return { start: fmt(new Date(y, 0, 1)), end: fmt(new Date(y, 11, 31)) };
      case "last_year":
        return { start: fmt(new Date(y - 1, 0, 1)), end: fmt(new Date(y - 1, 11, 31)) };
      case "all":
        return { start: "2000-01-01", end: "2099-12-31" };
      default:
        return null;
    }
  }

  function formatTanggalID(dateStr, withDay) {
    if (!dateStr) return "-";
    const dateOnly = String(dateStr).slice(0, 10);
    const parts = dateOnly.split("-").map(Number);
    const y = parts[0], m = parts[1], d = parts[2];
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return "-";
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return "-";
    const s = `${pad(d)} ${BULAN[m - 1]} ${y}`;
    return withDay ? `${HARI[dt.getDay()]}, ${s}` : s;
  }

  function timeAgoID(dateStr) {
    if (!dateStr) return "-";
    const then = new Date(dateStr);
    const diffMs = Date.now() - then.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(mins, 1)} menit lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} jam lalu`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Kemarin";
    if (days < 7) return `${days} hari lalu`;
    return formatTanggalID(dateStr.slice(0, 10));
  }

  // ================= STATE =================
  const state = {
    booting: true,
    user: null,
    theme: "light",
    page: "beranda",
    sidebarCollapsed: false,
    data: {
      inventory: [],
      activities: [],
      reminders: [],
      activityLog: [],
      villageProfile: {},
      inventoryStats: [],
      users: [],
    },
    notifOpen: false,
    toasts: [],
    selectedItem: null,
    selectedActivity: null,
    dayDrawer: null,
    editItem: null,
    editActivity: null,
    showForm: false,
    formType: null,
    defaultActivityDate: null,
    pageNum: 1,
    pageSize: 8,
    invFilterCategory: "Semua",
    invFilterCondition: "Semua",
    invFilterLocation: "Semua",
    invSearchQuery: "",
    calendarCursor: new Date(TODAY),
    settingsTab: "profil",
    reportType: "Laporan Inventaris",
    reportPeriod: "this_month",
    reportStartDate: dateKey(new Date(TODAY.getFullYear(), TODAY.getMonth() - 11, 1)),
    reportEndDate: dateKey(new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0)),
    reportCategory: "Semua",
  };

  const session = { user: null, isLoggedIn: false };
  const appEl = document.getElementById("app");

  // ================= SESSION =================
  function saveSession() {
    try {
      localStorage.setItem("desa-session", JSON.stringify({
        user: session.user,
        isLoggedIn: session.isLoggedIn,
        timestamp: Date.now(),
      }));
    } catch (e) {}
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem("desa-session");
      if (raw) {
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
          session.user = data.user;
          session.isLoggedIn = data.isLoggedIn;
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function clearSession() {
    session.user = null;
    session.isLoggedIn = false;
    try { localStorage.removeItem("desa-session"); } catch (e) {}
  }

  // ================= LOAD DATA =================
  async function loadAllData() {
    try {
      console.log("Memuat data dari API...");
      const [inventory, activities, reminders, villageProfile, activityLog, inventoryStats, users] = await Promise.all([
        apiGet("inventory"),
        apiGet("activities"),
        apiGet("reminders"),
        apiGet("village_profile"),
        apiGet("activity_log"),
        apiGet("inventory_stats", "?months_back=6"),
        apiGet("users"),          // ✅ TAMBAH: hanya 1 admin
      ]);

      state.data.inventory      = Array.isArray(inventory) && !inventory.error ? inventory : [];
      state.data.activities     = Array.isArray(activities) && !activities.error ? activities : [];
      state.data.reminders      = Array.isArray(reminders) && !reminders.error ? reminders : [];
      state.data.villageProfile = villageProfile && !villageProfile.error ? villageProfile : {};
      state.data.activityLog    = Array.isArray(activityLog) && !activityLog.error ? activityLog : [];
      state.data.inventoryStats = (inventoryStats && inventoryStats.success && Array.isArray(inventoryStats.data))
        ? inventoryStats.data : [];
      state.data.users          = Array.isArray(users) && !users.error ? users : [];

      // Sinkronkan state.user dengan data admin dari backend (kalau ada)
      if (state.data.users.length > 0 && state.user) {
        const admin = state.data.users[0];
        state.user = {
          id: admin.id,
          name: admin.nama || state.user.name,
          username: admin.username || state.user.username,
          role: "ADMIN",
        };
        session.user = state.user;
        saveSession();
      }

      console.log(`Data dimuat: ${state.data.inventory.length} inventaris, ${state.data.activities.length} kegiatan, ${state.data.users.length} user`);
      state.booting = false;
      return true;
    } catch (e) {
      console.error("Gagal load data:", e);
      state.booting = false;
      return false;
    }
  }

  // ================= CRUD =================
  async function addInventory(data) {
    const result = await apiPost("inventory", data);
    if (result.success) {
      await loadAllData(); render();
      toastMsg("Inventaris berhasil ditambahkan.");
    } else {
      toastMsg("Gagal menambahkan: " + (result.error || "Unknown error"), "error");
    }
    return result;
  }

  async function updateInventory(id, data) {
    const result = await apiPut("inventory", { ...data, id });
    if (result.success) {
      await loadAllData(); render();
      toastMsg("Inventaris berhasil diperbarui.");
    } else {
      toastMsg("Gagal memperbarui: " + (result.error || "Unknown error"), "error");
    }
    return result;
  }

  async function deleteInventory(id) {
    const result = await apiDelete("inventory", id);
    if (result.success) {
      await loadAllData(); render();
      toastMsg("Inventaris berhasil dihapus.");
    } else {
      toastMsg("Gagal menghapus: " + (result.error || "Unknown error"), "error");
    }
    return result;
  }

  async function addActivity(data) {
    const result = await apiPost("activities", data);
    if (result.success) {
      await loadAllData(); render();
      toastMsg("Kegiatan berhasil ditambahkan.");
    } else {
      toastMsg("Gagal menambahkan kegiatan: " + (result.error || "Unknown error"), "error");
    }
    return result;
  }

  async function updateActivity(id, data) {
    const result = await apiPut("activities", { ...data, id });
    if (result.success) {
      await loadAllData(); render();
      toastMsg("Kegiatan berhasil diperbarui.");
    } else {
      toastMsg("Gagal memperbarui kegiatan: " + (result.error || "Unknown error"), "error");
    }
    return result;
  }

  async function deleteActivity(id) {
    const result = await apiDelete("activities", id);
    if (result.success) {
      await loadAllData(); render();
      toastMsg("Kegiatan berhasil dihapus.");
    } else {
      toastMsg("Gagal menghapus kegiatan: " + (result.error || "Unknown error"), "error");
    }
    return result;
  }

  async function updateVillageProfile(data) {
    const result = await apiPut("village_profile", data);
    if (result.success) {
      await loadAllData(); render();
      toastMsg("Profil desa berhasil diperbarui.");
    } else {
      toastMsg("Gagal memperbarui profil: " + (result.error || "Unknown error"), "error");
    }
    return result;
  }

  async function updateReminder(id, data) {
    const result = await apiPut("reminders", { ...data, id });
    if (result.success) {
      await loadAllData(); render();
      toastMsg("Reminder berhasil diperbarui.");
    } else {
      toastMsg("Gagal memperbarui reminder: " + (result.error || "Unknown error"), "error");
    }
    return result;
  }

  async function changeOwnPassword(oldPassword, newPassword) {
    return await apiPut("users", {
      old_password: oldPassword,
      new_password: newPassword,
      change_own_password: true
    });
  }

  async function loginUser(username, password) {
    try {
      const result = await apiPost("login", {
        username: String(username || "").trim(),
        password: String(password || "")
      });
      if (result.success && result.user) {
        session.user = {
          name: result.user.nama,
          username: result.user.username,
          role: "ADMIN",
          id: result.user.id,
        };
        session.isLoggedIn = true;
        state.user = session.user;
        state.page = "beranda";
        state.dayDrawer = null;
        state.selectedActivity = null;
        state.selectedItem = null;
        state.showForm = false;
        state.formType = null;
        saveSession();
        await loadAllData();
        render();
        toastMsg("Selamat datang, " + result.user.nama + "!");
        return true;
      } else {
        toastMsg(result.error || "Login gagal. Periksa username dan password.", "error");
        return false;
      }
    } catch (e) {
      toastMsg("Error: " + e.message, "error");
      return false;
    }
  }

  function toastMsg(msg, type) {
    type = type || "success";
    const id = uid("toast");
    state.toasts.push({ id, message: msg, type });
    render();
    setTimeout(function () {
      state.toasts = state.toasts.filter(function (t) { return t.id !== id; });
      render();
    }, 3200);
  }

  // ================= RENDER MAIN =================
  function render() {
    if (state.booting) {
      appEl.innerHTML = '<div class="flex items-center justify-center min-h-screen" style="background:#F8FAFC;"><div class="spin" style="width:28px;height:28px;border:3px solid #E2E8F0;border-top-color:#2563EB;border-radius:50%;"></div><span class="ml-3" style="color:var(--text-secondary);">Memuat data...</span></div>';
      return;
    }

    if (!state.user) {
      if (loadSession() && session.user) {
        state.user = session.user;
        state.page = "beranda";
      } else {
        appEl.innerHTML = renderLogin();
        applyTheme();
        bindEvents();
        return;
      }
    }

    appEl.innerHTML = renderApp();
    applyTheme();
    bindEvents();
  }

  function renderLogin() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg);">
        <div class="w-full max-w-sm">
          <div class="flex flex-col items-center mb-6">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background: linear-gradient(135deg,#2563EB,#7C3AED);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h1 class="text-lg font-semibold text-center" style="color: var(--text);">Sistem Informasi Inventaris</h1>
            <p class="text-sm text-center" style="color: var(--text-secondary);">& Monitoring Kegiatan Desa</p>
          </div>
          <form id="login-form" class="card p-6 flex flex-col gap-4">
            <div id="login-error" class="text-xs px-3 py-2 rounded-lg hidden" style="background:#EF44441A;color:#EF4444;border:1px solid #EF444433;"></div>
            <div>
              <label class="text-xs font-medium mb-1.5 block" style="color: var(--text-secondary);">Username</label>
              <input id="login-username" class="input" placeholder="masukkan username" autofocus />
            </div>
            <div>
              <label class="text-xs font-medium mb-1.5 block" style="color: var(--text-secondary);">Password</label>
              <div class="relative overflow-hidden">
                <input id="login-password" type="password" class="input pr-16" placeholder="********" />
                <button type="button" id="login-toggle-pw" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium" style="color: var(--primary);">Tampilkan</button>
              </div>
            </div>
            <button type="submit" class="btn-primary w-full justify-center py-2.5">Masuk</button>
          </form>
        </div>
      </div>
    `;
  }

  function renderApp() {
    const notifCount = state.data.reminders.filter(function (r) { return r.status === "pending"; }).length;
    return `
        <div class="flex min-h-screen" style="background: var(--bg);">
            ${renderSidebar()}
            <div id="main-content" class="flex-1 min-w-0 flex flex-col">
                ${renderTopbar(notifCount)}
                <main class="flex-1 p-4 md:p-6">${renderPageContent()}</main>
            </div>
        </div>
        ${renderNotifDrawer()}
        ${renderToasts()}
        ${renderModals()}
    `;
  }

  function renderSidebar() {
    const page = state.page;
    const items = [
        { key: "beranda", label: "Beranda", icon: "home" },
        { key: "inventaris", label: "Inventaris", icon: "package" },
        { key: "monitoring-inventaris", label: "Monitoring Inventaris", icon: "bar-chart" },  // ✅ TAMBAH
        { key: "kalender", label: "Kegiatan & Kalender", icon: "calendar" },
        { key: "reminder", label: "Reminder", icon: "bell" },
        { key: "monitoring-kegiatan", label: "Monitoring Kegiatan", icon: "bar-chart" },
        { key: "laporan", label: "Laporan", icon: "file-text" },
        { key: "pengaturan", label: "Pengaturan", icon: "settings" },
    ];
    const name = state.data.villageProfile?.name || "Desa";
    const collapsed = state.sidebarCollapsed || false;

    if (collapsed) {
        return `<aside id="main-sidebar" style="width:0;flex-shrink:0;height:100vh;position:sticky;top:0;overflow:hidden;transition:width 0.3s ease;border:none;"></aside>`;
    }

    let sidebarContent = `
    <div class="h-full flex flex-col" style="background: var(--card); overflow: hidden;">
        <div class="flex items-center gap-2 px-3" style="height: 52px; border-bottom: 1px solid var(--border);">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg,#2563EB,#7C3AED);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div class="min-w-0 flex-1">
                <div class="text-sm font-medium truncate" style="color: var(--text);">${name}</div>
            </div>
        </div>
        
        <nav class="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-1">
    `;

    items.forEach(function (item) {
        const active = page === item.key;
        sidebarContent += `
            <button onclick="window.navigate('${item.key}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style="background: ${active ? "var(--primary-soft)" : "transparent"}; color: ${active ? "var(--primary)" : "var(--text-secondary)"}; font-weight: ${active ? 600 : 500}; border:none; cursor:pointer;">
                ${getIcon(item.icon, 17)}
                <span class="truncate">${item.label}</span>
            </button>
        `;
    });

    sidebarContent += `
            </nav>
            <div class="p-3 border-t" style="border-color: var(--border);">
                <div class="text-xs text-center" style="color: var(--text-secondary);">v1.0.0</div>
            </div>
        </div>
    `;

    return `
    <aside id="main-sidebar" style="width:264px;flex-shrink:0;height:100vh;position:sticky;top:0;background:var(--card);border-right:1px solid var(--border);overflow:hidden;transition:width 0.3s ease;">
        ${sidebarContent}
    </aside>
`;
  }

  function renderTopbar(notifCount) {
    const user = state.user;
    const theme = state.theme;

    const svgSun = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const svgMoon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
    const svgMonitor = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    const svgBell = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`;
    const svgMenu = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
    const svgChevronDown = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
    const themeSvg = theme === "light" ? svgSun : theme === "dark" ? svgMoon : svgMonitor;

    const initial = (user.name || "A").split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("");

    return `
        <div class="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6" style="background: var(--card); border-bottom:1px solid var(--border); height: 52px;">
            <button onclick="window.toggleMobileSidebar()" style="background:none;border:none;cursor:pointer;color:var(--text);padding:8px;display:flex;align-items:center;justify-content:center;border-radius:8px;" title="Menu">
                ${svgMenu}
            </button>
            <div class="flex-1"></div>
            <div id="current-clock" class="hidden lg:block text-xs whitespace-nowrap" style="color: var(--text-secondary);">
                ${new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </div>
            <button onclick="window.cycleTheme()" style="background:none;border:none;cursor:pointer;color:var(--text);padding:8px;display:flex;align-items:center;justify-content:center;border-radius:8px;" title="Ganti tema">
                ${themeSvg}
            </button>
            <button onclick="window.toggleNotif()" style="position:relative;background:none;border:none;cursor:pointer;color:var(--text);padding:8px;display:flex;align-items:center;justify-content:center;border-radius:8px;" title="Notifikasi">
                ${svgBell}
                ${notifCount > 0 ? `<span style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;background:#EF4444;color:white;border-radius:9999px;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;line-height:1;">${notifCount}</span>` : ""}
            </button>
            <div style="position:relative;">
                <button onclick="window.toggleUserMenu()" style="display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:8px;color:var(--text);">
                    <div style="width:32px;height:32px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:white;background:linear-gradient(135deg,#2563EB,#7C3AED);">
                        ${initial}
                    </div>
                    <div class="hidden sm:block" style="text-align:left;">
                        <div style="font-size:12px;font-weight:500;color:var(--text);">${user.name}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">Administrator</div>
                    </div>
                    ${svgChevronDown}
                </button>
                <div id="user-menu" class="card hidden" style="position:absolute;right:0;margin-top:8px;width:240px;padding:0;z-index:40;box-shadow:0 10px 25px rgba(0,0,0,0.12);overflow:hidden;border-radius:14px;">
    
    <div style="padding:16px 16px 12px 16px;background:linear-gradient(135deg, #2563EB, #7C3AED);color:white;">
        <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:44px;height:44px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;background:rgba(255,255,255,0.25);backdrop-filter:blur(10px);flex-shrink:0;">
                ${initial}
            </div>
            <div style="min-width:0;flex:1;">
                <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.name}</div>
                <div style="font-size:11px;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@${user.username}</div>
            </div>
        </div>
        <div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;background:rgba(255,255,255,0.2);backdrop-filter:blur(10px);font-size:11px;font-weight:600;letter-spacing:0.3px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
            Administrator
        </div>
    </div>

    <div style="padding:6px;">
        <button onclick="window.openChangeNameForm(); window.closeUserMenu();" 
                style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:13.5px;font-weight:500;background:none;border:none;cursor:pointer;color:var(--text);border-radius:8px;text-align:left;font-family:inherit;" 
                onmouseover="this.style.background='var(--bg)'" 
                onmouseout="this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;flex-shrink:0;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Ubah Nama</span>
        </button>

        <button onclick="window.openChangeUsernameForm(); window.closeUserMenu();" 
                style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:13.5px;font-weight:500;background:none;border:none;cursor:pointer;color:var(--text);border-radius:8px;text-align:left;font-family:inherit;" 
                onmouseover="this.style.background='var(--bg)'" 
                onmouseout="this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;flex-shrink:0;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Ubah Username</span>
        </button>

        <button onclick="window.openChangePasswordForm(); window.closeUserMenu();" 
                style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:13.5px;font-weight:500;background:none;border:none;cursor:pointer;color:var(--text);border-radius:8px;text-align:left;font-family:inherit;" 
                onmouseover="this.style.background='var(--bg)'" 
                onmouseout="this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.75;flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span>Ubah Password</span>
        </button>
    </div>

    <div style="height:1px;background:var(--border);margin:0 8px;"></div>

    <div style="padding:6px;">
        <button onclick="window.doLogout()" 
                style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:13.5px;font-weight:500;background:none;border:none;cursor:pointer;color:#EF4444;border-radius:8px;text-align:left;font-family:inherit;" 
                onmouseover="this.style.background='rgba(239,68,68,0.08)'" 
                onmouseout="this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.9;flex-shrink:0;"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Keluar</span>
        </button>
    </div>

</div>
            </div>
        </div>
    `;
  }

  function renderPageContent() {
    const page = state.page;
    switch (page) {
      case "beranda": return renderDashboard();
      case "inventaris": return renderInventory();
      case "monitoring-inventaris": return renderInventoryMonitoring();
      case "kalender": return renderCalendar();
      case "reminder": return renderReminders();
      case "monitoring-kegiatan": return renderActivityMonitoring();
      case "laporan": return renderReports();
      case "pengguna": return renderUsers();
      case "pengaturan": return renderSettings();
      default: return renderDashboard();
    }
  }

  function renderGenericPieChart(slices, options) {
    options = options || {};
    const size = options.size || 220;
    const radius = options.radius || 85;
    const cx = size / 2;
    const cy = size / 2;
    const centerLabel = options.centerLabel || "";
    const validSlices = slices.filter(function(s) { return s.value > 0; });

    if (validSlices.length === 0) {
      return '<div class="text-center py-10 text-sm" style="color:var(--text-secondary);">Belum ada data</div>';
    }

    const total = validSlices.reduce(function(sum, s) { return sum + s.value; }, 0);

    if (validSlices.length === 1) {
      const s = validSlices[0];
      return `
        <div class="flex flex-col items-center justify-center">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${s.color}" stroke="#fff" stroke-width="2" />
            <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">100%</text>
            <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="12" fill="#fff">${s.label}</text>
          </svg>
        </div>
      `;
    }

    let currentAngle = -Math.PI / 2;
    let paths = "";
    let labels = "";

    validSlices.forEach(function(slice) {
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      const endAngle = currentAngle + sliceAngle;
      const x1 = cx + radius * Math.cos(currentAngle);
      const y1 = cy + radius * Math.sin(currentAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const path = [`M ${cx} ${cy}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`, "Z"].join(" ");
      paths += `<path d="${path}" fill="${slice.color}" stroke="#fff" stroke-width="2"><title>${slice.label}: ${slice.value} (${Math.round((slice.value/total)*100)}%)</title></path>`;
      const persen = (slice.value / total) * 100;
      if (persen >= 5) {
        const midAngle = currentAngle + sliceAngle / 2;
        const labelRadius = radius * 0.62;
        const lx = cx + labelRadius * Math.cos(midAngle);
        const ly = cy + labelRadius * Math.sin(midAngle);
        labels += `<text x="${lx}" y="${ly - 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${Math.round(persen)}%</text><text x="${lx}" y="${ly + 10}" text-anchor="middle" font-size="9" fill="#fff">${slice.shortLabel || slice.label}</text>`;
      }
      currentAngle = endAngle;
    });

    return `
      <div class="flex flex-col sm:flex-row items-center justify-center gap-5">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0;">${paths}${labels}</svg>
        <div class="flex flex-col gap-2 min-w-[140px]">
          ${centerLabel ? `<div class="text-xs mb-1" style="color:var(--text-secondary);">${centerLabel}</div>` : ""}
          ${validSlices.map(function(s) {
            const persen = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return `
              <div class="flex items-center gap-2">
                <span style="width:12px;height:12px;border-radius:3px;background:${s.color};flex-shrink:0;"></span>
                <span class="text-xs" style="color:var(--text);">${s.label}</span>
                <span class="text-xs ml-auto font-semibold" style="color:${s.color};">${s.value}</span>
                <span class="text-[10px]" style="color:var(--text-secondary);">(${persen}%)</span>
              </div>
            `;
          }).join("")}
          <div class="text-[10px] mt-1 pt-2 border-t" style="color:var(--text-secondary);border-color:var(--border);">
            Total: <strong style="color:var(--text);">${total}</strong>
          </div>
        </div>
      </div>
    `;
  }

  function renderDashboard() {
    const data = state.data;
    const inventory = data.inventory || [];
    const activities = data.activities || [];
    const reminders = data.reminders || [];
    const log = data.activityLog || [];

    const todayKey = dateKey(TODAY);
    const total = inventory.length;
    const baik = inventory.filter(function (i) { return i.condition === "Baik"; }).length;
    const rusakRingan = inventory.filter(function (i) { return i.condition === "Rusak Ringan"; }).length;
    const rusakBerat = inventory.filter(function (i) { return i.condition === "Rusak Berat"; }).length;

    const bulanIni = activities.filter(function (a) {
        const d = a.date || a.activity_date;
        return d && d.slice(0, 7) === dateKey(TODAY).slice(0, 7);
    }).length;

    const upcoming = activities
        .filter(function (a) {
            const d = a.date || a.activity_date;
            return d && d >= todayKey;
        })
        .sort(function (a, b) {
            const dA = a.date || a.activity_date;
            const dB = b.date || b.activity_date;
            return dA.localeCompare(dB);
        });

    const pending = reminders
        .filter(function (r) {
            return r.status === "pending" || r.status === "Pending";
        })
        .slice(0, 4);

    const invSlices = [
      { label: "Baik",         shortLabel: "Baik",    value: baik,        color: "#10B981" },
      { label: "Rusak Ringan", shortLabel: "Ringan",  value: rusakRingan, color: "#F59E0B" },
      { label: "Rusak Berat",  shortLabel: "Berat",   value: rusakBerat,  color: "#EF4444" },
    ];

    const direncanakan = activities.filter(function(a) {
      const progress = parseInt(a.progress) || 0;
      return progress === 0 && a.status !== "Selesai";
    }).length;
    const berlangsung = activities.filter(function(a) {
      const progress = parseInt(a.progress) || 0;
      return progress > 0 && progress < 100;
    }).length;
    const selesai = activities.filter(function(a) {
      const progress = parseInt(a.progress) || 0;
      return progress >= 100 || a.status === "Selesai";
    }).length;

    const actSlices = [
      { label: "Direncanakan", shortLabel: "Rencana",  value: direncanakan, color: "#F59E0B" },
      { label: "Berlangsung",  shortLabel: "Jalan",    value: berlangsung,  color: "#2563EB" },
      { label: "Selesai",      shortLabel: "Selesai",  value: selesai,      color: "#10B981" },
    ];

    const statCards = [
        { label: "Total Inventaris", value: total, icon: "package" },
        { label: "Kondisi Baik", value: baik, icon: "check-circle" },
        { label: "Rusak", value: rusakRingan + rusakBerat, icon: "alert-triangle" },
        { label: "Kegiatan Bulan Ini", value: bulanIni, icon: "calendar" },
    ];

    const agendaHtml = upcoming.slice(0, 5).map(function (a) {
        const dateStr = a.date || a.activity_date;
        return `
        <button onclick="window.navigateDate('${dateStr}')" class="text-left p-3 rounded-xl hover-bg w-full" style="border:1px solid var(--border);">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2 h-2 rounded-full" style="background:${CAT_WARNA[a.category]?.hex || "#64748B"};"></span>
            <span class="text-sm font-medium truncate" style="color:var(--text);">${a.title}</span>
          </div>
          <div class="text-xs" style="color:var(--text-secondary);">${formatTanggalID(dateStr)} - ${a.start_time || "09:00"} WIB - ${a.location || "-"}</div>
          <div class="mt-1">${renderStatusBadge(a.status || "Direncanakan")}</div>
        </button>
      `;
    }).join("");

    const reminderHtml = pending.map(function (r) {
        const icon = r.priority === "danger" ? "alert-octagon" : r.priority === "warning" ? "alert-triangle" : "info";
        const color = r.priority === "danger" ? "#EF4444" : r.priority === "warning" ? "#F59E0B" : "#2563EB";
        return `
        <div class="flex items-start gap-2 p-3 rounded-xl" style="border:1px solid var(--border);">
          ${getIcon(icon, 15, color)}
          <div class="min-w-0">
            <div class="text-sm font-medium truncate" style="color:var(--text);">${r.title}</div>
            <div class="text-xs" style="color:var(--text-secondary);">${r.category || "Reminder"} - ${formatTanggalID(r.date || r.reminder_date)}</div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-xl font-semibold" style="color:var(--text);">Selamat datang, ${state.user.name}</h1>
          <p class="text-sm mt-0.5" style="color:var(--text-secondary);">${formatTanggalID(dateKey(TODAY), true)}</p>
          <p class="text-sm" style="color:var(--text-secondary);">Total kegiatan: ${activities.length} | Total inventaris: ${inventory.length}</p>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${statCards.map(function (s) { return renderStatCard(s.label, s.value, s.icon); }).join("")}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-semibold" style="color:var(--text);">Kondisi Inventaris</h3>
                <p class="text-xs mt-0.5" style="color:var(--text-secondary);">Komposisi kondisi seluruh aset</p>
              </div>
              <button onclick="window.navigate('inventaris')" class="text-xs" style="color:var(--primary);">Detail</button>
            </div>
            ${renderGenericPieChart(invSlices, { size: 200, radius: 78, centerLabel: "Total Aset: " + total })}
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-semibold" style="color:var(--text);">Status Kegiatan</h3>
                <p class="text-xs mt-0.5" style="color:var(--text-secondary);">Progress seluruh kegiatan desa</p>
              </div>
              <button onclick="window.navigate('monitoring-kegiatan')" class="text-xs" style="color:var(--primary);">Detail</button>
            </div>
            ${renderGenericPieChart(actSlices, { size: 200, radius: 78, centerLabel: "Total Kegiatan: " + activities.length })}
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card p-5">
            <h3 class="text-sm font-semibold mb-3" style="color:var(--text);">Agenda Terdekat (${upcoming.length})</h3>
            ${upcoming.length === 0 ? '<div class="text-sm" style="color:var(--text-secondary);">Belum ada agenda</div>' : agendaHtml}
          </div>
          <div class="card p-5">
            <h3 class="text-sm font-semibold mb-3" style="color:var(--text);">Reminder (${pending.length})</h3>
            ${pending.length === 0 ? '<div class="text-sm" style="color:var(--text-secondary);">Tidak ada reminder</div>' : reminderHtml}
          </div>
        </div>
        <div class="card p-5">
          <h3 class="text-sm font-semibold mb-3" style="color:var(--text);">Aktivitas Terbaru</h3>
          ${log.slice(0, 10).map(function (l) {
            return `
              <div class="flex items-start gap-2.5 py-1.5 border-b" style="border-color:var(--border);">
                <div class="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style="background:var(--primary);"></div>
                <div class="min-w-0 text-xs" style="color:var(--text);"><span class="font-medium">${l.actor}</span> ${l.action} ${l.detail ? '<span class="font-medium">' + l.detail + '</span>' : ''}</div>
                <div class="text-[10px] ml-auto whitespace-nowrap" style="color:var(--text-secondary);">${timeAgoID(l.timestamp)}</div>
              </div>
            `;
          }).join("") || '<div class="text-sm" style="color:var(--text-secondary);">Belum ada aktivitas</div>'}
        </div>
      </div>
    `;
  }

  function renderStatCard(label, value, icon) {
    return `
      <div class="card p-5 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium" style="color:var(--text-secondary);">${label}</span>
          <div class="p-2 rounded-lg" style="background:var(--primary-soft);">${getIcon(icon, 16, "var(--primary)")}</div>
        </div>
        <div class="text-2xl font-semibold" style="color:var(--text);">${value}</div>
      </div>
    `;
  }

  function renderStatusBadge(status) {
    const kegiatanMap = {
      Direncanakan: { color: "#F59E0B", label: "Direncanakan" },
      Berlangsung: { color: "#2563EB", label: "Berlangsung" },
      Selesai: { color: "#10B981", label: "Selesai" },
      Dibatalkan: { color: "#EF4444", label: "Dibatalkan" },
    };
    const reminderMap = {
      pending: { color: "#F59E0B", label: "Pending" },
      done: { color: "#10B981", label: "Selesai" },
      'in-progress': { color: "#2563EB", label: "Berlangsung" },
      cancelled: { color: "#EF4444", label: "Dibatalkan" },
    };
    let config = kegiatanMap[status] || reminderMap[status] || { color: "#64748B", label: status || "Unknown" };
    return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style="background:${config.color}1A;color:${config.color};border:1px solid ${config.color}33;">${config.label}</span>`;
  }

  // ================= FILTER INVENTARIS (diekstrak) =================
  function getFilteredInventory() {
    const filterCat = state.invFilterCategory || "Semua";
    const filterCond = state.invFilterCondition || "Semua";
    const filterLoc = state.invFilterLocation || "Semua";
    const searchQ = (state.invSearchQuery || "").toLowerCase().trim();

    return (state.data.inventory || []).filter(function (item) {
      if (filterCat !== "Semua" && item.category !== filterCat) return false;
      if (filterCond !== "Semua" && item.condition !== filterCond) return false;
      if (filterLoc !== "Semua" && item.location !== filterLoc) return false;
      if (searchQ) {
        const haystack = [
          item.name || "",
          item.code || "",
          item.location || "",
          item.pic || ""
        ].join(" ").toLowerCase();
        if (haystack.indexOf(searchQ) === -1) return false;
      }
      return true;
    });
  }

  function renderInventory() {
    const data = state.data;
    const pageNum = state.pageNum || 1;
    const pageSize = state.pageSize || 8;

    const filterCat = state.invFilterCategory || "Semua";
    const filterCond = state.invFilterCondition || "Semua";
    const filterLoc = state.invFilterLocation || "Semua";
    const searchQ = (state.invSearchQuery || "").toLowerCase().trim();

    let rows = getFilteredInventory();

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (pageNum > totalPages) state.pageNum = totalPages;
    const pageRows = rows.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    const kondisiColors = { Baik: "#10B981", "Rusak Ringan": "#F59E0B", "Rusak Berat": "#EF4444" };

    const tableRows = pageRows.map(function (r, idx) {
      return `
        <tr class="hover-bg" style="border-bottom:1px solid var(--border);">
          <td class="px-4 py-3" style="color:var(--text-secondary);">${(pageNum - 1) * pageSize + idx + 1}</td>
          <td class="px-4 py-3 font-mono text-xs" style="color:var(--text);">${r.code || "-"}</td>
          <td class="px-4 py-3 font-medium" style="color:var(--text);">${r.name || "-"}</td>
          <td class="px-4 py-3" style="color:var(--text-secondary);">${r.category || "-"}</td>
          <td class="px-4 py-3" style="color:var(--text-secondary);">${r.qty || 0} ${r.unit || ""}</td>
          <td class="px-4 py-3" style="color:var(--text-secondary);">${r.location || "-"}</td>
          <td class="px-4 py-3"><span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style="background:${kondisiColors[r.condition] || "#64748B"}1A;color:${kondisiColors[r.condition] || "#64748B"};border:1px solid ${kondisiColors[r.condition] || "#64748B"}33;">${r.condition || "-"}</span></td>
          <td class="px-4 py-3" style="color:var(--text-secondary);">${r.pic || "-"}</td>
          <td class="px-4 py-3">
            <div class="flex gap-1">
              <button onclick="window.viewInventory('${r.id}')" class="p-1.5 rounded-lg hover-bg">${getIcon("eye", 15)}</button>
              <button onclick="window.editInventory('${r.id}')" class="p-1.5 rounded-lg hover-bg">${getIcon("pencil", 15)}</button>
              <button onclick="window.confirmDeleteInventory('${r.id}')" class="p-1.5 rounded-lg hover-bg" style="color:#EF4444;">${getIcon("trash", 15)}</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    const defaultCategories = ["Elektronik", "Furniture", "Kendaraan", "Peralatan Kantor", "Peralatan Lapangan"];
    const dataCategories = (data.inventory || []).map(function(i) { return i.category; }).filter(Boolean);
    const allCategories = Array.from(new Set(defaultCategories.concat(dataCategories)));

    const categoryOptions = ["Semua"].concat(allCategories).map(function(c) {
      return `<option value="${c}" ${filterCat === c ? "selected" : ""}>${c === "Semua" ? "Semua Kategori" : c}</option>`;
    }).join("");

    const conditionOptions = ["Semua", "Baik", "Rusak Ringan", "Rusak Berat"].map(function(c) {
      return `<option value="${c}" ${filterCond === c ? "selected" : ""}>${c === "Semua" ? "Semua Kondisi" : c}</option>`;
    }).join("");

    const defaultLocations = ["Balai Desa", "Kantor Sekretariat", "Ruang Rapat", "Poskamling", "Gudang Desa", "Posyandu", "PAUD Desa", "Lapangan Desa"];
    const dataLocations = (data.inventory || []).map(function(i) { return i.location; }).filter(Boolean);
    const allLocations = Array.from(new Set(defaultLocations.concat(dataLocations)));

    const locationOptions = ["Semua"].concat(allLocations).map(function(c) {
      return `<option value="${c}" ${filterLoc === c ? "selected" : ""}>${c === "Semua" ? "Semua Lokasi" : c}</option>`;
    }).join("");

    const hasActiveFilter = filterCat !== "Semua" || filterCond !== "Semua" || filterLoc !== "Semua" || searchQ !== "";

    return `
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-semibold" style="color:var(--text);">Inventaris</h1>
            <p class="text-sm" style="color:var(--text-secondary);">Kelola data aset dan inventaris desa.</p>
          </div>
          <button onclick="window.openInventoryForm()" class="btn-primary flex items-center gap-2">${getIcon("plus", 16)} Tambah</button>
        </div>

        <div class="card p-4">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div class="md:col-span-2">
              <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Cari</label>
              <input 
                id="inv-search"
                type="text" 
                class="input" 
                placeholder="Cari nama, kode, lokasi, atau penanggung jawab..." 
                value="${state.invSearchQuery || ""}"
                oninput="window.setInvSearch(this.value)"
              />
            </div>
            <div>
              <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kategori</label>
              <select class="input" onchange="window.setInvFilterCategory(this.value)">
                ${categoryOptions}
              </select>
            </div>
            <div>
              <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kondisi</label>
              <select class="input" onchange="window.setInvFilterCondition(this.value)">
                ${conditionOptions}
              </select>
            </div>
            <div>
              <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Lokasi</label>
              <select class="input" onchange="window.setInvFilterLocation(this.value)">
                ${locationOptions}
              </select>
            </div>
          </div>
          ${hasActiveFilter ? `
            <div class="flex items-center justify-between mt-3 pt-3 border-t flex-wrap gap-2" style="border-color:var(--border);">
              <div class="text-xs" style="color:var(--text-secondary);">
                Menampilkan <strong style="color:var(--text);">${rows.length}</strong> dari <strong style="color:var(--text);">${(data.inventory || []).length}</strong> data
                ${filterCat !== "Semua" ? ` - Kategori: <strong style="color:var(--text);">${filterCat}</strong>` : ""}
                ${filterCond !== "Semua" ? ` - Kondisi: <strong style="color:var(--text);">${filterCond}</strong>` : ""}
                ${filterLoc !== "Semua" ? ` - Lokasi: <strong style="color:var(--text);">${filterLoc}</strong>` : ""}
                ${searchQ ? ` - Cari: "<strong style="color:var(--text);">${state.invSearchQuery}</strong>"` : ""}
              </div>
              <button onclick="window.resetInvFilter()" class="text-xs px-3 py-1.5 rounded-lg hover-bg" style="border:1px solid var(--border);color:var(--text-secondary);background:var(--card);cursor:pointer;">
                Reset Filter
              </button>
            </div>
          ` : ""}
        </div>

        <div class="card overflow-x-auto">
          ${rows.length === 0 ? `
            <div class="text-center py-10" style="color:var(--text-secondary);">
              ${hasActiveFilter ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada data inventaris'}
            </div>
          ` : `
            <table class="w-full text-sm">
              <thead><tr style="border-bottom:1px solid var(--border);">${["No","Kode","Nama","Kategori","Jumlah","Lokasi","Kondisi","Penanggung Jawab","Aksi"].map(function(h){return '<th class="px-4 py-3 text-xs font-medium text-left" style="color:var(--text-secondary);">'+h+'</th>';}).join("")}</tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
          `}
        </div>
        ${rows.length > 0 ? `
          <div class="flex items-center justify-between text-sm px-1" style="color:var(--text-secondary);">
            <span>${(pageNum - 1) * pageSize + 1}-${Math.min(pageNum * pageSize, rows.length)} dari ${rows.length}</span>
            <div class="flex gap-1">
              <button onclick="window.invPrevPage()" class="px-3 py-1.5 rounded-lg hover-bg" ${pageNum === 1 ? "disabled" : ""}>Sebelumnya</button>
              <span class="px-3 py-1.5">${pageNum}/${totalPages}</span>
              <button onclick="window.invNextPage()" class="px-3 py-1.5 rounded-lg hover-bg" ${pageNum === totalPages ? "disabled" : ""}>Berikutnya</button>
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderCalendar() {
    const data = state.data;
    const cursor = state.calendarCursor || new Date(TODAY);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const activities = data.activities || [];

    const byDate = {};
    activities.forEach(function (a) {
      const dateK = a.date || a.activity_date;
      if (dateK) {
        if (!byDate[dateK]) byDate[dateK] = [];
        byDate[dateK].push(a);
      }
    });

    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    let monthOptions = '';
    for (let m = 0; m < 12; m++) {
      const selected = m === month ? 'selected' : '';
      monthOptions += `<option value="${m}" ${selected}>${BULAN[m]}</option>`;
    }

    let yearOptions = '';
    const currentYear = TODAY.getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      const selected = y === year ? 'selected' : '';
      yearOptions += `<option value="${y}" ${selected}>${y}</option>`;
    }

    const dayCells = cells.map(function (d, idx) {
      if (!d) return `<div key="${idx}" style="min-height:70px;"></div>`;
      const k = dateKey(d);
      const agenda = byDate[k] || [];
      const isToday = k === dateKey(TODAY);
      const dots = agenda.slice(0, 4).map(function (a) {
        const catColor = CAT_WARNA[a.category]?.hex || "#64748B";
        return `<span style="width:6px;height:6px;border-radius:50%;background:${catColor};display:inline-block;margin-right:2px;"></span>`;
      }).join("");

      return `
      <button onclick="window.openDayDrawer('${k}')" class="rounded-xl p-2 flex flex-col items-start text-left hover-bg transition-colors w-full" style="min-height:70px;border:${isToday ? "1.5px solid var(--primary)" : "1px solid var(--border)"};background:${isToday ? "var(--primary-soft)" : "transparent"};cursor:pointer;">
        <span class="text-xs font-medium" style="color:${isToday ? "var(--primary)" : "var(--text)"};">${d.getDate()}</span>
        <div class="flex flex-wrap gap-0.5 mt-1">${dots}</div>
        ${agenda.length > 0 ? `<span class="text-[10px] mt-auto pt-1" style="color:var(--text-secondary);">${agenda.length} agenda</span>` : ""}
      </button>
      `;
    }).join("");

    return `
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-xl font-semibold" style="color:var(--text);">Kegiatan & Kalender</h1>
            <p class="text-sm" style="color:var(--text-secondary);">Klik tanggal untuk lihat & edit agenda.</p>
          </div>
          <button onclick="window.openActivityForm()" class="btn-primary flex items-center gap-2">${getIcon("plus", 16)} Tambah</button>
        </div>
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span class="font-semibold" style="color:var(--text);">${BULAN[month]} ${year}</span>
            <div class="flex items-center gap-2 flex-wrap">
              <select id="month-selector" class="input text-sm py-1.5 px-2" style="width:auto;min-width:100px;" onchange="window.goToMonth(this.value, document.getElementById('year-selector').value)">
                ${monthOptions}
              </select>
              <select id="year-selector" class="input text-sm py-1.5 px-2" style="width:auto;min-width:80px;" onchange="window.goToMonth(document.getElementById('month-selector').value, this.value)">
                ${yearOptions}
              </select>
              <div class="flex gap-1">
                <button onclick="window.prevMonthCal()" class="p-1.5 rounded-lg hover-bg" title="Bulan sebelumnya">${getIcon("chevron-left", 16)}</button>
                <button onclick="window.resetMonthCal()" class="px-3 py-1.5 rounded-lg text-xs hover-bg" style="border:1px solid var(--border);color:var(--text);">Hari Ini</button>
                <button onclick="window.nextMonthCal()" class="p-1.5 rounded-lg hover-bg" title="Bulan berikutnya">${getIcon("chevron-right", 16)}</button>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-7 gap-1 mb-1">
            ${HARI_PENDEK.map(function (h) {
                return '<div class="text-center text-xs font-medium py-1" style="color:var(--text-secondary);">' + h + '</div>';
            }).join("")}
          </div>
          <div class="grid grid-cols-7 gap-1">${dayCells}</div>
        </div>
        ${renderDayDrawer()}
        ${renderActivityDetailModal()}
      </div>
    `;
  }

  function renderDayDrawer() {
    if (!state.dayDrawer) return "";
    const activities = state.data.activities || [];
    const dayActivities = activities.filter(function (a) {
      const dateK = a.date || a.activity_date;
      return dateK === state.dayDrawer;
    });

    const dayItems = dayActivities.map(function (a) {
      const catColor = CAT_WARNA[a.category]?.hex || "#64748B";
      const catLabel = CAT_WARNA[a.category]?.label || a.category;
      return `
        <div class="p-3 rounded-xl" style="border:1px solid var(--border);background:var(--card);">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span style="width:10px;height:10px;border-radius:50%;background:${catColor};flex-shrink:0;"></span>
              <span class="text-sm font-semibold truncate" style="color:var(--text);">${a.title}</span>
            </div>
            ${renderStatusBadge(a.status || "Direncanakan")}
          </div>
          <div class="text-xs mb-1" style="color:var(--text-secondary);">${a.start_time || "09:00"} - ${a.end_time || "11:00"} WIB</div>
          <div class="text-xs mb-1" style="color:var(--text-secondary);">${a.location || "-"}</div>
          <div class="text-xs mb-2" style="color:var(--text-secondary);">${a.pic || "-"} - ${catLabel}</div>
          ${a.description ? `<div class="text-xs mb-2 p-2 rounded-lg" style="background:var(--bg);color:var(--text);">${a.description}</div>` : ""}
          <div class="flex gap-2 mt-3">
            <button onclick="window.openActivityDetail('${a.id}')"
                    class="flex-1 text-xs font-medium py-2 rounded-lg transition-colors"
                    style="border:1px solid var(--border);background:var(--card);color:var(--text);cursor:pointer;"
                    onmouseover="this.style.background='var(--bg)'"
                    onmouseout="this.style.background='var(--card)'">
              Detail
            </button>
            <button onclick="window.editActivity('${a.id}')"
                    class="flex-1 text-xs font-medium py-2 rounded-lg transition-colors"
                    style="border:none;background:var(--primary);color:#fff;cursor:pointer;"
                    onmouseover="this.style.opacity='0.9'"
                    onmouseout="this.style.opacity='1'">
              Edit
            </button>
            <button onclick="window.deleteActivityFromDrawer('${a.id}')"
                    class="flex-1 text-xs font-medium py-2 rounded-lg transition-colors"
                    style="border:none;background:#EF4444;color:#fff;cursor:pointer;"
                    onmouseover="this.style.opacity='0.9'"
                    onmouseout="this.style.opacity='1'">
              Hapus
            </button>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="fixed inset-0 z-[100]" id="day-drawer">
        <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.closeDayDrawer()"></div>
        <aside class="absolute right-0 top-0 h-full flex flex-col p-5" style="width:420px;max-width:92vw;background:var(--card);box-shadow:-8px 0 24px rgba(0,0,0,0.15);">
          <div class="flex items-center justify-between mb-4 pb-3 border-b" style="border-color:var(--border);">
            <div>
              <h2 class="font-semibold" style="color:var(--text);">${formatTanggalID(state.dayDrawer, true)}</h2>
              <p class="text-xs mt-1" style="color:var(--text-secondary);">${dayActivities.length} kegiatan</p>
            </div>
            <button onclick="window.closeDayDrawer()" class="p-2 rounded-lg hover-bg">${getIcon("x", 18)}</button>
          </div>
          <div class="flex-1 overflow-y-auto flex flex-col gap-3">
            ${dayItems || '<div class="text-center py-10" style="color:var(--text-secondary);">Tidak ada kegiatan</div>'}
          </div>
          <button onclick="window.openActivityForm('${state.dayDrawer}')" class="btn-primary mt-4 justify-center">${getIcon("plus", 16)} Tambah Kegiatan</button>
        </aside>
      </div>
    `;
  }

  function renderActivityDetailModal() {
    if (!state.selectedActivity) return "";
    const a = state.selectedActivity;

    return `
      <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.closeActivityDetail()"></div>
        <div class="relative card w-full max-w-lg p-5">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span style="width:12px;height:12px;border-radius:50%;background:${CAT_WARNA[a.category]?.hex || "#64748B"};"></span>
                <h2 class="text-lg font-semibold" style="color:var(--text);">${a.title}</h2>
              </div>
              <div class="mt-1">${renderStatusBadge(a.status || "Direncanakan")}</div>
            </div>
            <button onclick="window.closeActivityDetail()" class="p-2 rounded-lg hover-bg">${getIcon("x", 18)}</button>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><div class="text-xs" style="color:var(--text-secondary);">Tanggal</div><div style="color:var(--text);">${formatTanggalID(a.date || a.activity_date)}</div></div>
            <div><div class="text-xs" style="color:var(--text-secondary);">Waktu</div><div style="color:var(--text);">${a.start_time || "09:00"} - ${a.end_time || "11:00"}</div></div>
            <div><div class="text-xs" style="color:var(--text-secondary);">Lokasi</div><div style="color:var(--text);">${a.location || "-"}</div></div>
            <div><div class="text-xs" style="color:var(--text-secondary);">Penanggung Jawab</div><div style="color:var(--text);">${a.pic || "-"}</div></div>
            <div class="col-span-2"><div class="text-xs" style="color:var(--text-secondary);">Deskripsi</div><div style="color:var(--text);">${a.description || "-"}</div></div>
            <div class="col-span-2">
              <div class="text-xs mb-1" style="color:var(--text-secondary);">Progress</div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 rounded-full overflow-hidden" style="background:var(--border);">
                  <div style="height:100%;width:${a.progress || 0}%;background:${CAT_WARNA[a.category]?.hex || "#2563EB"};"></div>
                </div>
                <span class="text-xs font-semibold" style="color:var(--text);">${a.progress || 0}%</span>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button onclick="window.closeActivityDetail()" class="btn-secondary">Tutup</button>
            <button onclick="window.editActivity('${a.id}')" class="btn-primary">Edit</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderReminders() {
    const reminders = state.data.reminders || [];
    const todayK = dateKey(TODAY);
    const besokK = dateKey(addDays(TODAY, 1));
    const weekEnd = dateKey(addDays(TODAY, 7));

    const groups = {
      "Hari Ini": reminders.filter(function (r) { return r.status !== "done" && (r.date || r.reminder_date) === todayK; }),
      Besok: reminders.filter(function (r) { return r.status !== "done" && (r.date || r.reminder_date) === besokK; }),
      "Minggu Ini": reminders.filter(function (r) { const d = r.date || r.reminder_date; return r.status !== "done" && d > besokK && d <= weekEnd; }),
      Mendatang: reminders.filter(function (r) { const d = r.date || r.reminder_date; return r.status !== "done" && d > weekEnd; }),
      Selesai: reminders.filter(function (r) { return r.status === "done"; }),
    };

    const groupHtml = Object.entries(groups).map(function (g) {
      const label = g[0];
      const items = g[1];
      const itemsHtml = items.map(function (r) {
        const conf = { info: ["Info", "#2563EB"], warning: ["Perhatian", "#F59E0B"], danger: ["Penting", "#EF4444"] };
        const c = conf[r.priority] || conf.info;
        const rDate = r.date || r.reminder_date;
        const rTime = r.time || r.reminder_time || "09:00";
        const hasActivity = r.related_type === "kegiatan" && r.related_id;

        return `
          <div class="flex items-start gap-3 p-3.5 rounded-xl ${hasActivity ? 'hover-bg cursor-pointer' : ''}"
               style="border:1px solid var(--border);${r.status === "done" ? "opacity:0.6;" : ""}"
               ${hasActivity ? `onclick="window.openReminderActivity('${r.related_id}')"` : ""}>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style="background:${r.status === "done" ? "#10B9811A" : c[1] + "1A"};color:${r.status === "done" ? "#10B981" : c[1]};border:1px solid ${r.status === "done" ? "#10B98133" : c[1] + "33"};">${r.status === "done" ? "Selesai" : c[0]}</span>
                <span class="text-xs" style="color:var(--text-secondary);">${r.category || "-"}</span>
              </div>
              <div class="text-sm font-medium" style="color:var(--text);">${r.title}</div>
              <div class="text-xs mt-0.5" style="color:var(--text-secondary);">${r.description || ""}</div>
              <div class="text-[11px] mt-1" style="color:var(--text-secondary);">${formatTanggalID(rDate)} - ${rTime} WIB</div>
              ${hasActivity ? `<div class="text-[10px] mt-1" style="color:var(--primary);">Klik untuk lihat kegiatan</div>` : ""}
            </div>
            ${r.status !== "done" ? `<button onclick="event.stopPropagation(); window.toggleReminder('${r.id}')" class="btn-secondary text-xs px-2.5 py-1.5 flex-shrink-0">Tandai Selesai</button>` : ""}
          </div>
        `;
      }).join("") || '<div class="text-sm py-3" style="color:var(--text-secondary);">Tidak ada reminder.</div>';

      return `
        <div>
          <h3 class="text-sm font-semibold mb-2.5" style="color:var(--text);">${label} <span style="color:var(--text-secondary);font-weight:400;">(${items.length})</span></h3>
          <div class="flex flex-col gap-2">${itemsHtml}</div>
        </div>
      `;
    }).join("");

    return `
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-xl font-semibold" style="color:var(--text);">Reminder</h1>
          <p class="text-sm" style="color:var(--text-secondary);">Notifikasi pengingat kegiatan & aset.</p>
        </div>
        ${groupHtml}
      </div>
    `;
  }

  function renderUsers() {
    const users = state.data.users || [];
    const me = users[0] || null;   // backend hanya return 1 admin

    if (!me) {
      return `
        <div class="flex flex-col gap-4">
          <div>
            <h1 class="text-xl font-semibold" style="color:var(--text);">Profil Admin</h1>
            <p class="text-sm" style="color:var(--text-secondary);">Data akun administrator sistem.</p>
          </div>
          <div class="card p-5 text-sm" style="color:var(--text-secondary);">
            Gagal memuat data admin. Coba refresh halaman.
          </div>
        </div>
      `;
    }

    return `
      <div class="flex flex-col gap-4">
        <div>
          <h1 class="text-xl font-semibold" style="color:var(--text);">Profil Admin</h1>
          <p class="text-sm" style="color:var(--text-secondary);">Kelola akun administrator sistem Anda.</p>
        </div>

        <div class="card p-5 max-w-2xl">
          <div class="flex items-center gap-4 mb-5 pb-4 border-b" style="border-color:var(--border);">
            <div style="width:64px;height:64px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;background:linear-gradient(135deg,#2563EB,#7C3AED);">
              ${(me.nama || "A").split(" ").map(function(w){return w[0];}).slice(0,2).join("")}
            </div>
            <div>
              <div class="text-lg font-semibold" style="color:var(--text);">${me.nama || "-"}</div>
              <div class="text-sm" style="color:var(--text-secondary);">@${me.username || "-"}</div>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium mt-1" style="background:#7C3AED1A;color:#7C3AED;border:1px solid #7C3AED33;">Administrator</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-sm">
            <div>
              <div class="text-xs" style="color:var(--text-secondary);">Email</div>
              <div style="color:var(--text);">${me.email || "-"}</div>
            </div>
            <div>
              <div class="text-xs" style="color:var(--text-secondary);">Status</div>
              <div style="color:var(--text);">${me.status || "Aktif"}</div>
            </div>
            <div>
              <div class="text-xs" style="color:var(--text-secondary);">Terakhir Login</div>
              <div style="color:var(--text);">${me.last_login ? formatTanggalID(me.last_login) : "-"}</div>
            </div>
            <div>
              <div class="text-xs" style="color:var(--text-secondary);">Dibuat</div>
              <div style="color:var(--text);">${me.created_at ? formatTanggalID(me.created_at) : "-"}</div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 pt-4 border-t" style="border-color:var(--border);">
            <button onclick="window.openChangeNameForm()" class="btn-secondary text-sm">Ubah Nama</button>
            <button onclick="window.openChangeUsernameForm()" class="btn-secondary text-sm">Ubah Username</button>
            <button onclick="window.openChangePasswordForm()" class="btn-primary text-sm">Ubah Password</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSettings() {
    const profile = state.data.villageProfile || {};
    const tab = state.settingsTab || "profil";
    const tabs = [
      ["profil", "Profil Desa"],
      ["tampilan", "Tampilan"],
    ];

    let content = "";
    if (tab === "profil") {
      content = `
        <div class="card p-5 max-w-xl flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2"><label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Nama Desa *</label><input id="set-name" class="input" value="${profile.name || ""}" placeholder="Nama desa" /></div>
            <div><label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kecamatan *</label><input id="set-kecamatan" class="input" value="${profile.kecamatan || ""}" placeholder="Kecamatan" /></div>
            <div><label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kabupaten *</label><input id="set-kabupaten" class="input" value="${profile.kabupaten || ""}" placeholder="Kabupaten" /></div>
            <div><label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Provinsi *</label><input id="set-provinsi" class="input" value="${profile.provinsi || ""}" placeholder="Provinsi" /></div>
            <div><label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kode Pos</label><input id="set-postal" class="input" value="${profile.postal_code || profile.postalCode || ""}" placeholder="Kode pos" /></div>
            <div class="col-span-2"><label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Alamat</label><input id="set-address" class="input" value="${profile.address || ""}" placeholder="Alamat lengkap" /></div>
            <div><label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Telepon</label><input id="set-phone" class="input" value="${profile.phone || ""}" placeholder="Nomor telepon" /></div>
            <div><label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Email</label><input id="set-email" class="input" value="${profile.email || ""}" placeholder="Email desa" /></div>
          </div>
          <div class="text-xs" style="color:var(--text-secondary);">* Wajib diisi</div>
          <button onclick="window.saveProfile()" class="btn-primary w-fit">Simpan Profil ke Database</button>
        </div>
      `;
    } else {
      content = `
        <div class="card p-5 max-w-md flex flex-col gap-3">
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Tema</label>
          <div class="flex gap-2">
            ${[["light","Terang"],["dark","Gelap"],["system","Sistem"]].map(function(t){
              const active = state.theme === t[0];
              return `<button onclick="window.setTheme('${t[0]}')" class="flex-1 py-3 rounded-xl text-sm" style="border:${active ? "1.5px solid var(--primary)" : "1px solid var(--border)"};color:${active ? "var(--primary)" : "var(--text-secondary)"};">${t[1]}</button>`;
            }).join("")}
          </div>
        </div>
      `;
    }

    return `
      <div class="flex flex-col gap-4">
        <div>
          <h1 class="text-xl font-semibold" style="color:var(--text);">Pengaturan</h1>
          <p class="text-sm" style="color:var(--text-secondary);">Konfigurasi sistem dan profil desa.</p>
        </div>
        <div class="flex gap-1 p-1 rounded-xl w-fit flex-wrap" style="background:var(--bg);border:1px solid var(--border);">
          ${tabs.map(function(t){return `<button onclick="window.setSettingsTab('${t[0]}')" class="px-3.5 py-1.5 rounded-lg text-sm font-medium" style="background:${tab===t[0]?"var(--card)":"transparent"};color:${tab===t[0]?"var(--primary)":"var(--text-secondary)"};">${t[1]}</button>`;}).join("")}
        </div>
        ${content}
      </div>
    `;
  }

  function renderInventoryMonitoring() {
    const data = state.data;
    const inventory = data.inventory || [];
    const stats = data.inventoryStats || [];

    const total = inventory.length;
    const baik = inventory.filter(function (i) { return i.condition === "Baik"; }).length;
    const ringan = inventory.filter(function (i) { return i.condition === "Rusak Ringan"; }).length;
    const berat = inventory.filter(function (i) { return i.condition === "Rusak Berat"; }).length;

    return `
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-xl font-semibold" style="color:var(--text);">Monitoring Inventaris</h1>
          <p class="text-sm" style="color:var(--text-secondary);">Pantau kondisi aset desa & tren per bulan.</p>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${renderStatCard("Total Aset", total, "package")}
          ${renderStatCard("Baik", baik, "check-circle")}
          ${renderStatCard("Rusak Ringan", ringan, "alert-triangle")}
          ${renderStatCard("Rusak Berat", berat, "alert-octagon")}
        </div>
        <div class="card p-5">
          <div class="mb-4">
            <h3 class="text-sm font-semibold" style="color:var(--text);">Komposisi Kondisi Inventaris</h3>
            <p class="text-xs mt-0.5" style="color:var(--text-secondary);">Persentase kondisi aset saat ini</p>
          </div>
          ${renderGenericPieChart([
            { label: "Baik",         shortLabel: "Baik",    value: baik,   color: "#10B981" },
            { label: "Rusak Ringan", shortLabel: "Ringan",  value: ringan, color: "#F59E0B" },
            { label: "Rusak Berat",  shortLabel: "Berat",   value: berat,  color: "#EF4444" },
          ], { size: 220, radius: 85, centerLabel: "Total Aset: " + total })}
        </div>
        ${stats.length > 0 ? `
          <div class="card p-5">
            <h3 class="text-sm font-semibold mb-3" style="color:var(--text);">Ringkasan Angka per Bulan</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr style="border-bottom:2px solid var(--border);">
                    <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Bulan</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center" style="color:#10B981;">Baik</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center" style="color:#F59E0B;">Rusak Ringan</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center" style="color:#EF4444;">Rusak Berat</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center" style="color:var(--text);">Total</th>
                    <th class="px-3 py-2 text-xs font-semibold text-center" style="color:var(--text);">% Baik</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.map(function(s) {
                    return `
                      <tr style="border-bottom:1px solid var(--border);">
                        <td class="px-3 py-2 font-medium" style="color:var(--text);">${s.label}</td>
                        <td class="px-3 py-2 text-center" style="color:#10B981;">${s.baik} <span class="text-xs" style="color:var(--text-secondary);">(${s.persen_baik}%)</span></td>
                        <td class="px-3 py-2 text-center" style="color:#F59E0B;">${s.rusak_ringan} <span class="text-xs" style="color:var(--text-secondary);">(${s.persen_ringan}%)</span></td>
                        <td class="px-3 py-2 text-center" style="color:#EF4444;">${s.rusak_berat} <span class="text-xs" style="color:var(--text-secondary);">(${s.persen_berat}%)</span></td>
                        <td class="px-3 py-2 text-center font-semibold" style="color:var(--text);">${s.total}</td>
                        <td class="px-3 py-2 text-center">
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                style="background:${s.persen_baik >= 70 ? "#10B9811A" : s.persen_baik >= 50 ? "#F59E0B1A" : "#EF44441A"};color:${s.persen_baik >= 70 ? "#10B981" : s.persen_baik >= 50 ? "#F59E0B" : "#EF4444"};">
                            ${s.persen_baik}%
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        ` : ""}
        <div class="card p-5">
          <h3 class="text-sm font-semibold mb-3" style="color:var(--text);">Aset Perlu Perhatian</h3>
          ${inventory.filter(function(i){return i.condition !== "Baik";}).slice(0,10).map(function(i){
            const color = KONDISI_WARNA[i.condition] || "#64748B";
            return `
              <div class="flex items-center justify-between p-3 rounded-xl mb-2" style="border:1px solid var(--border);">
                <div><div class="text-sm font-medium" style="color:var(--text);">${i.name}</div><div class="text-xs" style="color:var(--text-secondary);">${i.location} - ${i.pic}</div></div>
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style="background:${color}1A;color:${color};border:1px solid ${color}33;">${i.condition}</span>
              </div>
            `;
          }).join("") || '<div class="text-sm" style="color:var(--text-secondary);">Semua aset dalam kondisi baik.</div>'}
        </div>
      </div>
    `;
  }

  function renderActivityMonitoring() {
    const activities = state.data.activities || [];

    function getStatusFromProgress(progress) {
      if (progress >= 100) return "Selesai";
      if (progress > 0) return "Berlangsung";
      return "Direncanakan";
    }
    function getProgress(a) { return parseInt(a.progress) || 0; }

    const total = activities.length;
    const direncanakan = activities.filter(function (a) { return getStatusFromProgress(getProgress(a)) === "Direncanakan"; }).length;
    const berlangsung = activities.filter(function (a) { return getStatusFromProgress(getProgress(a)) === "Berlangsung"; }).length;
    const selesai = activities.filter(function (a) { return getStatusFromProgress(getProgress(a)) === "Selesai"; }).length;

    return `
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-xl font-semibold" style="color:var(--text);">Monitoring Kegiatan</h1>
          <p class="text-sm" style="color:var(--text-secondary);">Pantau progres kegiatan desa.</p>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${renderStatCard("Total", total, "calendar")}
          ${renderStatCard("Direncanakan", direncanakan, "clock")}
          ${renderStatCard("Berlangsung", berlangsung, "alert-triangle")}
          ${renderStatCard("Selesai", selesai, "check-circle")}
        </div>
        <div class="card p-5">
          <h3 class="text-sm font-semibold mb-4" style="color:var(--text);">Progress Kegiatan (${activities.length})</h3>
          ${activities.length === 0 ? '<div class="text-sm text-center py-8" style="color:var(--text-secondary);">Belum ada kegiatan</div>' : activities.map(function(a){
            const progress = getProgress(a);
            const displayStatus = getStatusFromProgress(progress);
            const color = CAT_WARNA[a.category]?.hex || "#2563EB";
            const dateStr = a.date || a.activity_date;
            const progressId = 'progress-' + a.id;

            return `
              <div class="mb-5 p-4 rounded-xl" style="border:1px solid var(--border);">
                <div class="flex items-start justify-between gap-2 mb-2 flex-wrap">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
                    <span class="text-sm font-medium truncate" style="color:var(--text);">${a.title}</span>
                    ${renderStatusBadge(displayStatus)}
                  </div>
                  <span id="${progressId}-label" class="text-sm font-bold" style="color:${color};min-width:50px;text-align:right;">${progress}%</span>
                </div>
                <div class="text-xs mb-3" style="color:var(--text-secondary);">
                  ${formatTanggalID(dateStr)} - ${a.location || "-"} - ${a.pic || "-"}
                </div>
                <div style="position:relative; height:24px;">
                  <div style="position:absolute; top:8px; left:0; right:0; height:8px; border-radius:9999px; background:var(--border); overflow:hidden;">
                    <div id="${progressId}-bar" style="height:100%; width:${progress}%; background:${color}; transition:width 0.15s ease;"></div>
                  </div>
                  <input type="range" min="0" max="100" step="5" value="${progress}"
                    id="${progressId}-slider"
                    style="position:absolute; top:0; left:0; width:100%; height:24px; margin:0; background:transparent; -webkit-appearance:none; appearance:none; cursor:pointer; opacity:0;"
                    oninput="window.previewProgress('${a.id}', this.value)"
                    onchange="window.updateProgressInline('${a.id}', this.value)" />
                </div>
                <div class="text-[10px] mt-2 text-center" style="color:var(--text-secondary);">
                  Klik dan geser pada bar untuk mengubah progress
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderReports() {
    const data = state.data;
    const inventory = data.inventory || [];
    const activities = data.activities || [];

    const reportType = state.reportType || "Laporan Inventaris";
    const startDate = state.reportStartDate;
    const endDate = state.reportEndDate;
    const category = state.reportCategory || "Semua";

    const isInventoryReport = reportType.toLowerCase().includes("inventaris") || reportType.toLowerCase().includes("aset");

    const invRows = inventory.filter(function (i) {
      return category === "Semua" || i.category === category;
    });

    const actRows = activities.filter(function (a) {
      const d = a.date || a.activity_date;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      if (category !== "Semua" && a.category !== category) return false;
      return true;
    });

    const kondisiColors = { Baik: "#10B981", "Rusak Ringan": "#F59E0B", "Rusak Berat": "#EF4444" };
    const invTableRows = invRows.map(function (r, idx) {
      return `
        <tr style="border-bottom:1px solid var(--border);">
          <td class="px-3 py-2 text-center" style="color:var(--text-secondary);">${idx + 1}</td>
          <td class="px-3 py-2 font-mono text-xs" style="color:var(--text);">${r.code || "-"}</td>
          <td class="px-3 py-2" style="color:var(--text);">${r.name || "-"}</td>
          <td class="px-3 py-2" style="color:var(--text-secondary);">${r.category || "-"}</td>
          <td class="px-3 py-2 text-center" style="color:var(--text-secondary);">${r.qty || 0} ${r.unit || ""}</td>
          <td class="px-3 py-2" style="color:var(--text-secondary);">${r.location || "-"}</td>
          <td class="px-3 py-2 text-center">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style="background:${kondisiColors[r.condition] || "#64748B"}1A;color:${kondisiColors[r.condition] || "#64748B"};">
              ${r.condition || "-"}
            </span>
          </td>
          <td class="px-3 py-2" style="color:var(--text-secondary);">${r.pic || "-"}</td>
        </tr>
      `;
    }).join("");

    const catColors = { kegiatan: "#2563EB", rapat: "#7C3AED", pelayanan: "#10B981", lapangan: "#F59E0B", deadline: "#EF4444" };
    const actTableRows = actRows.map(function (r, idx) {
      const catColor = catColors[r.category] || "#64748B";
      return `
        <tr style="border-bottom:1px solid var(--border);">
          <td class="px-3 py-2 text-center" style="color:var(--text-secondary);">${idx + 1}</td>
          <td class="px-3 py-2 whitespace-nowrap" style="color:var(--text-secondary);">${formatTanggalID(r.date || r.activity_date)}</td>
          <td class="px-3 py-2" style="color:var(--text);">${r.title || "-"}</td>
          <td class="px-3 py-2">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style="background:${catColor}1A;color:${catColor};">
              ${CAT_WARNA[r.category]?.label || r.category || "-"}
            </span>
          </td>
          <td class="px-3 py-2" style="color:var(--text-secondary);">${r.location || "-"}</td>
          <td class="px-3 py-2" style="color:var(--text-secondary);">${r.pic || "-"}</td>
          <td class="px-3 py-2 text-center">${renderStatusBadge(r.status || "Direncanakan")}</td>
          <td class="px-3 py-2 text-center" style="color:var(--text-secondary);">${r.progress || 0}%</td>
        </tr>
      `;
    }).join("");

    const reportTypes = ["Laporan Inventaris", "Laporan Kegiatan"];
    const typeOptions = reportTypes.map(function (t) {
      return `<option value="${t}" ${reportType === t ? "selected" : ""}>${t}</option>`;
    }).join("");

    let catOptions = "";
    if (isInventoryReport) {
      catOptions = ["Semua", "Elektronik", "Furniture", "Kendaraan", "Peralatan Kantor", "Peralatan Lapangan"]
        .map(function (c) { return `<option value="${c}" ${category === c ? "selected" : ""}>${c}</option>`; })
        .join("");
    } else {
      catOptions = ["Semua"].concat(Object.keys(CAT_WARNA))
        .map(function (c) {
          const label = c === "Semua" ? "Semua" : (CAT_WARNA[c]?.label || c);
          return `<option value="${c}" ${category === c ? "selected" : ""}>${label}</option>`;
        })
        .join("");
    }

    const emptyState = '<tr><td colspan="8" class="text-center py-10" style="color:var(--text-secondary);">Tidak ada data untuk periode ini</td></tr>';

    const invTableHtml = `
      <table class="w-full text-sm">
        <thead>
          <tr style="background:var(--bg);border-bottom:2px solid var(--border);">
            <th class="px-3 py-2 text-xs font-semibold text-center" style="color:var(--text);width:40px;">No</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Kode</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Nama Barang</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Kategori</th>
            <th class="px-3 py-2 text-xs font-semibold text-center" style="color:var(--text);">Jumlah</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Lokasi</th>
            <th class="px-3 py-2 text-xs font-semibold text-center" style="color:var(--text);">Kondisi</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Penanggung Jawab</th>
          </tr>
        </thead>
        <tbody>${invTableRows || emptyState}</tbody>
      </table>
    `;

    const actTableHtml = `
      <table class="w-full text-sm">
        <thead>
          <tr style="background:var(--bg);border-bottom:2px solid var(--border);">
            <th class="px-3 py-2 text-xs font-semibold text-center" style="color:var(--text);width:40px;">No</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Tanggal</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Judul Kegiatan</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Kategori</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Lokasi</th>
            <th class="px-3 py-2 text-xs font-semibold text-left" style="color:var(--text);">Penanggung Jawab</th>
            <th class="px-3 py-2 text-xs font-semibold text-center" style="color:var(--text);">Status</th>
            <th class="px-3 py-2 text-xs font-semibold text-center" style="color:var(--text);">Progress</th>
          </tr>
        </thead>
        <tbody>${actTableRows || emptyState}</tbody>
      </table>
    `;

    const tableHtml = isInventoryReport ? invTableHtml : actTableHtml;

    return `
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-xl font-semibold" style="color:var(--text);">Laporan</h1>
          <p class="text-sm" style="color:var(--text-secondary);">Buat dan ekspor laporan dalam format tabel.</p>
        </div>
        <div class="card p-5 flex flex-col gap-4 no-print">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="md:col-span-2">
              <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Jenis Laporan</label>
              <select class="input" onchange="window.setReportType(this.value)">${typeOptions}</select>
            </div>
            ${!isInventoryReport ? `
              <div class="md:col-span-2">
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Periode</label>
                <select class="input" onchange="window.setReportPeriod(this.value)">
                  <option value="today" ${state.reportPeriod === "today" ? "selected" : ""}>Hari Ini</option>
                  <option value="this_week" ${state.reportPeriod === "this_week" ? "selected" : ""}>Minggu Ini</option>
                  <option value="this_month" ${state.reportPeriod === "this_month" ? "selected" : ""}>Bulan Ini</option>
                  <option value="last_month" ${state.reportPeriod === "last_month" ? "selected" : ""}>Bulan Lalu</option>
                  <option value="last_3_months" ${state.reportPeriod === "last_3_months" ? "selected" : ""}>3 Bulan Terakhir</option>
                  <option value="last_6_months" ${state.reportPeriod === "last_6_months" ? "selected" : ""}>6 Bulan Terakhir</option>
                  <option value="this_year" ${state.reportPeriod === "this_year" ? "selected" : ""}>Tahun Ini</option>
                  <option value="last_year" ${state.reportPeriod === "last_year" ? "selected" : ""}>Tahun Lalu</option>
                  <option value="all" ${state.reportPeriod === "all" ? "selected" : ""}>Semua Periode</option>
                  <option value="custom" ${state.reportPeriod === "custom" ? "selected" : ""}>Custom (pilih tanggal manual)</option>
                </select>
              </div>
              ${state.reportPeriod === "custom" ? `
                <div>
                  <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Tanggal Mulai</label>
                  <input type="date" class="input" value="${startDate}" onchange="window.setReportStart(this.value)" />
                </div>
                <div>
                  <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Tanggal Selesai</label>
                  <input type="date" class="input" value="${endDate}" onchange="window.setReportEnd(this.value)" />
                </div>
              ` : `
                <div class="md:col-span-2">
                  <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Rentang Tanggal</label>
                  <div class="text-sm px-3 py-2 rounded-lg" style="background:var(--bg);color:var(--text);border:1px solid var(--border);">
                    ${formatTanggalID(startDate)} - ${formatTanggalID(endDate)}
                  </div>
                </div>
              `}
            ` : ""}
            <div class="md:col-span-2">
              <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kategori</label>
              <select class="input" onchange="window.setReportCategory(this.value)">${catOptions}</select>
            </div>
          </div>
          <div class="flex gap-2 justify-end flex-wrap">
            <button onclick="window.exportReport()" class="btn-primary flex items-center gap-2">${getIcon("download", 15)} Export Excel (CSV)</button>
            <button onclick="window.printReport()" class="btn-primary flex items-center gap-2" style="background:linear-gradient(135deg,#EF4444,#DC2626);">${getIcon("printer", 15)} Cetak / Simpan PDF</button>
          </div>
        </div>
        <div class="card p-5" id="report-preview">
          <div class="text-center mb-5 pb-4 border-b" style="border-color:var(--border);">
            <div class="font-bold text-base" style="color:var(--text);">PEMERINTAH ${(state.data.villageProfile?.name || "DESA").toUpperCase()}</div>
            <div class="text-xs mt-1" style="color:var(--text-secondary);">
              ${(state.data.villageProfile?.kecamatan || "").toUpperCase()} - ${(state.data.villageProfile?.kabupaten || "").toUpperCase()}
            </div>
            <div class="font-semibold text-sm mt-3" style="color:var(--text);">${reportType.toUpperCase()}</div>
            <div class="text-xs mt-1" style="color:var(--text-secondary);">
              ${isInventoryReport ? `Kategori: ${category}` : `Periode: ${formatTanggalID(startDate)} - ${formatTanggalID(endDate)}`}
            </div>
          </div>
          <div class="overflow-x-auto">${tableHtml}</div>
          <div class="flex items-center justify-between text-[11px] mt-5 pt-3 border-t" style="border-color:var(--border); color:var(--text-secondary);">
            <span>Dicetak: ${formatTanggalID(dateKey(TODAY))}</span>
            <span>Total: ${isInventoryReport ? invRows.length + " aset" : actRows.length + " kegiatan"}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderNotifDrawer() {
    if (!state.notifOpen) return "";
    const reminders = state.data.reminders.filter(function (r) { return r.status === "pending"; });
    return `
      <div class="fixed inset-0 z-50">
        <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.toggleNotif()"></div>
        <div class="absolute right-0 top-0 h-full flex flex-col" style="width:400px;max-width:92vw;background:var(--card);box-shadow:-8px 0 24px rgba(0,0,0,0.15);">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color:var(--border);">
            <h3 class="font-semibold" style="color:var(--text);">Notifikasi (${reminders.length})</h3>
            <button onclick="window.toggleNotif()" class="p-1.5 rounded-lg hover-bg">${getIcon("x", 18)}</button>
          </div>
          <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
            ${reminders.map(function(r){
              const rDate = r.date || r.reminder_date;
              const rTime = r.time || r.reminder_time || "09:00";
              const priorityColor = r.priority === "danger" ? "#EF4444" : r.priority === "warning" ? "#F59E0B" : "#2563EB";
              const priorityIcon = r.priority === "danger" ? "alert-octagon" : r.priority === "warning" ? "alert-triangle" : "info";
              const hasRelatedActivity = r.related_type === "kegiatan" && r.related_id;

              return `
                <button onclick="window.openNotifDetail('${r.id}')" class="text-left p-3 rounded-xl hover-bg w-full transition-colors" style="border:1px solid var(--border);cursor:pointer;">
                  <div class="flex items-start gap-2">
                    <div style="flex-shrink:0;color:${priorityColor};margin-top:2px;">
                      ${getIcon(priorityIcon, 16, priorityColor)}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-medium" style="color:var(--text);">${r.title}</div>
                      <div class="text-xs mt-0.5" style="color:var(--text-secondary);">${r.description || ""}</div>
                      <div class="flex items-center gap-2 mt-1.5">
                        <span class="text-[11px] px-2 py-0.5 rounded-full" style="background:${priorityColor}1A;color:${priorityColor};">
                          ${formatTanggalID(rDate)}
                        </span>
                        <span class="text-[11px] px-2 py-0.5 rounded-full" style="background:var(--bg);color:var(--text-secondary);">
                          ${rTime} WIB
                        </span>
                      </div>
                      ${hasRelatedActivity ? `<div class="text-[11px] mt-1.5" style="color:var(--primary);">Klik untuk lihat kegiatan</div>` : ""}
                    </div>
                  </div>
                </button>
              `;
            }).join("") || '<div class="text-sm text-center py-10" style="color:var(--text-secondary);">Tidak ada notifikasi</div>'}
          </div>
        </div>
      </div>
    `;
  }

  function renderToasts() {
    return `
      <div class="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        ${state.toasts.map(function(t){
          return `<div class="card px-4 py-3 flex items-center gap-2 text-sm shadow-md" style="border-left:3px solid ${t.type === "error" ? "#EF4444" : "#10B981"};">${t.type === "error" ? getIcon("alert-octagon", 16, "#EF4444") : getIcon("check-circle", 16, "#10B981")}<span style="color:var(--text);">${t.message}</span></div>`;
        }).join("")}
      </div>
    `;
  }

  function renderModals() {
    let html = "";

    if (state.selectedItem) {
      const item = state.selectedItem;
      html += `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.closeInventoryDetail()"></div>
          <div class="relative card w-full max-w-lg p-5">
            <div class="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 class="text-lg font-semibold" style="color:var(--text);">${item.name}</h2>
                <p class="text-xs" style="color:var(--text-secondary);">${item.code || ""}</p>
              </div>
              <button onclick="window.closeInventoryDetail()" class="p-2 rounded-lg hover-bg">${getIcon("x", 18)}</button>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div><div class="text-xs" style="color:var(--text-secondary);">Kategori</div><div style="color:var(--text);">${item.category || "-"}</div></div>
              <div><div class="text-xs" style="color:var(--text-secondary);">Jumlah</div><div style="color:var(--text);">${item.qty || 0} ${item.unit || ""}</div></div>
              <div><div class="text-xs" style="color:var(--text-secondary);">Lokasi</div><div style="color:var(--text);">${item.location || "-"}</div></div>
              <div><div class="text-xs" style="color:var(--text-secondary);">Kondisi</div><div style="color:var(--text);">${item.condition || "-"}</div></div>
              <div class="col-span-2"><div class="text-xs" style="color:var(--text-secondary);">Catatan</div><div style="color:var(--text);">${item.notes || "-"}</div></div>
            </div>
            <div class="flex justify-end gap-2 mt-5">
              <button onclick="window.closeInventoryDetail()" class="btn-secondary">Tutup</button>
            </div>
          </div>
        </div>
      `;
    }

    if (state.showForm && state.formType === "inventory") {
      const edit = state.editItem;
      html += `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.closeInventoryForm()"></div>
          <form id="inventory-form" class="relative card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onsubmit="return false;">
            <div class="flex items-center justify-between mb-4">
              <div><h2 class="text-lg font-semibold" style="color:var(--text);">${edit ? "Edit" : "Tambah"} Inventaris</h2></div>
              <button type="button" onclick="window.closeInventoryForm()" class="p-2 rounded-lg hover-bg">${getIcon("x", 18)}</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="md:col-span-2">
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Nama Barang *</label>
                <input name="name" class="input" required value="${edit ? edit.name : ""}" />
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kategori</label>
                <select name="category" class="input">
                  ${["Elektronik","Furniture","Kendaraan","Peralatan Kantor","Peralatan Lapangan"].map(function(c){
                    return `<option value="${c}" ${edit && edit.category === c ? "selected" : ""}>${c}</option>`;
                  }).join("")}
                </select>
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Jumlah</label>
                <input name="qty" type="number" min="1" value="${edit ? edit.qty : 1}" class="input" />
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Lokasi</label>
                <select name="location" class="input">
                  ${LOKASI.map(function(l){return `<option value="${l}" ${edit && edit.location === l ? "selected" : ""}>${l}</option>`;}).join("")}
                </select>
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Penanggung Jawab</label>
                <select name="pic" class="input">
                  ${PIC.map(function(p){return `<option value="${p}" ${edit && edit.pic === p ? "selected" : ""}>${p}</option>`;}).join("")}
                </select>
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kondisi</label>
                <select name="condition" class="input">
                  ${["Baik","Rusak Ringan","Rusak Berat"].map(function(c){return `<option value="${c}" ${edit && edit.condition === c ? "selected" : ""}>${c}</option>`;}).join("")}
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Catatan</label>
                <textarea name="notes" class="input" rows="2">${edit ? edit.notes : ""}</textarea>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" onclick="window.closeInventoryForm()" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      `;
    }

    if (state.showForm && state.formType === "activity") {
      const edit = state.editActivity;
      const defaultDate = state.defaultActivityDate || dateKey(TODAY);
      const progressVal = edit ? (parseInt(edit.progress) || 0) : 0;
      html += `
        <div class="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.closeActivityForm()"></div>
          <form id="activity-form" class="relative card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onsubmit="return false;">
            <div class="flex items-center justify-between mb-4">
              <div><h2 class="text-lg font-semibold" style="color:var(--text);">${edit ? "Edit" : "Tambah"} Kegiatan</h2></div>
              <button type="button" onclick="window.closeActivityForm()" class="p-2 rounded-lg hover-bg">${getIcon("x", 18)}</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="md:col-span-2">
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Judul *</label>
                <input name="title" class="input" required value="${edit ? edit.title : ""}" />
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Kategori</label>
                <select name="category" class="input">
                  ${Object.keys(CAT_WARNA).map(function(c){return `<option value="${c}" ${edit && edit.category === c ? "selected" : ""}>${CAT_WARNA[c].label}</option>`;}).join("")}
                </select>
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Tanggal</label>
                <input name="date" type="date" class="input" value="${edit ? (edit.date || edit.activity_date) : defaultDate}" />
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Jam Mulai</label>
                <input name="start_time" type="time" class="input" value="${edit ? (edit.start_time || "09:00") : "09:00"}" />
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Jam Selesai</label>
                <input name="end_time" type="time" class="input" value="${edit ? (edit.end_time || "11:00") : "11:00"}" />
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Lokasi</label>
                <select name="location" class="input">
                  ${LOKASI.map(function(l){return `<option value="${l}" ${edit && edit.location === l ? "selected" : ""}>${l}</option>`;}).join("")}
                </select>
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Penanggung Jawab</label>
                <select name="pic" class="input">
                  ${PIC.map(function(p){return `<option value="${p}" ${edit && edit.pic === p ? "selected" : ""}>${p}</option>`;}).join("")}
                </select>
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Status</label>
                <select name="status" class="input">
                  ${["Direncanakan","Berlangsung","Selesai"].map(function(s){return `<option value="${s}" ${edit && edit.status === s ? "selected" : ""}>${s}</option>`;}).join("")}
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Progress (%)</label>
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="position:relative;flex:1;height:20px;display:flex;align-items:center;">
                    <div style="position:absolute;left:0;right:0;height:6px;background:var(--border);border-radius:9999px;overflow:hidden;">
                      <div id="progress-fill" style="height:100%;width:${progressVal}%;background:var(--primary);border-radius:9999px;transition:width 0.1s ease;"></div>
                    </div>
                    <input
                      name="progress"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value="${progressVal}"
                      style="position:absolute;left:0;right:0;width:100%;height:20px;background:transparent;-webkit-appearance:none;appearance:none;outline:none;cursor:pointer;margin:0;z-index:2;opacity:0;"
                      oninput="window.updateProgressSlider(this.value)"
                    />
                    <div id="progress-thumb" style="position:absolute;left:calc(${progressVal}% - 9px);top:50%;transform:translateY(-50%);width:18px;height:18px;border-radius:50%;background:var(--primary);border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);pointer-events:none;transition:left 0.1s ease;z-index:3;"></div>
                  </div>
                  <span id="progress-value" style="font-size:14px;font-weight:600;color:var(--text);min-width:50px;text-align:right;">${progressVal}%</span>
                </div>
              </div>
              <div class="md:col-span-2">
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Deskripsi</label>
                <textarea name="description" class="input" rows="2">${edit ? edit.description : ""}</textarea>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" onclick="window.closeActivityForm()" class="btn-secondary">Batal</button>
              <button type="submit" class="btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      `;
    }

    if (state.showForm && state.formType === "change_name") {
      html += `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.closeChangeNameForm()"></div>
          <div class="relative card w-full max-w-md p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold" style="color:var(--text);">Ubah Nama</h2>
                <p class="text-sm" style="color:var(--text-secondary);">Ubah nama tampilan Anda.</p>
              </div>
              <button type="button" onclick="window.closeChangeNameForm()" class="p-2 rounded-lg hover-bg">${getIcon("x", 18)}</button>
            </div>
            <div class="flex flex-col gap-3">
              <div id="cn-error" class="text-xs px-3 py-2 rounded-lg hidden" style="background:#EF44441A;color:#EF4444;border:1px solid #EF444433;"></div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Nama Saat Ini</label>
                <input type="text" class="input" value="${state.user.name}" disabled style="background:var(--bg);color:var(--text-secondary);cursor:not-allowed;" />
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Nama Baru *</label>
                <input id="cn-new" type="text" class="input" placeholder="Masukkan nama baru" value="${state.user.name}" autocomplete="off" autofocus />
                <div class="text-[10px] mt-1" style="color:var(--text-secondary);">Min 2 karakter.</div>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" onclick="window.closeChangeNameForm()" class="btn-secondary">Batal</button>
              <button type="button" onclick="window.submitChangeName()" class="btn-primary">Simpan Nama</button>
            </div>
          </div>
        </div>
      `;
    }

    if (state.showForm && state.formType === "change_username") {
      html += `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.closeChangeUsernameForm()"></div>
          <div class="relative card w-full max-w-md p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold" style="color:var(--text);">Ubah Username</h2>
                <p class="text-sm" style="color:var(--text-secondary);">Ubah username untuk login.</p>
              </div>
              <button type="button" onclick="window.closeChangeUsernameForm()" class="p-2 rounded-lg hover-bg">${getIcon("x", 18)}</button>
            </div>
            <div class="flex flex-col gap-3">
              <div id="cu-error" class="text-xs px-3 py-2 rounded-lg hidden" style="background:#EF44441A;color:#EF4444;border:1px solid #EF444433;"></div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Username Saat Ini</label>
                <input type="text" class="input" value="${state.user.username}" disabled style="background:var(--bg);color:var(--text-secondary);cursor:not-allowed;" />
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Username Baru *</label>
                <input id="cu-new" type="text" class="input" placeholder="Masukkan username baru" value="${state.user.username}" autocomplete="off" autofocus />
                <div class="text-[10px] mt-1" style="color:var(--text-secondary);">Min 3 karakter. Hanya huruf, angka, titik, underscore, strip.</div>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" onclick="window.closeChangeUsernameForm()" class="btn-secondary">Batal</button>
              <button type="button" onclick="window.submitChangeUsername()" class="btn-primary">Simpan Username</button>
            </div>
          </div>
        </div>
      `;
    }

    if (state.showForm && state.formType === "change_password") {
      html += `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background:rgba(15,23,42,0.5);" onclick="window.closeChangePasswordForm()"></div>
          <div class="relative card w-full max-w-md p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold" style="color:var(--text);">Ubah Password</h2>
                <p class="text-sm" style="color:var(--text-secondary);">Masukkan password lama dan password baru Anda.</p>
              </div>
              <button type="button" onclick="window.closeChangePasswordForm()" class="p-2 rounded-lg hover-bg">${getIcon("x", 18)}</button>
            </div>
            <div class="flex flex-col gap-3">
              <div id="cp-error" class="text-xs px-3 py-2 rounded-lg hidden" style="background:#EF44441A;color:#EF4444;border:1px solid #EF444433;"></div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Password Lama</label>
                <div class="relative overflow-hidden">
                  <input id="cp-current" type="password" class="input pr-24" placeholder="Password saat ini" />
                  <button type="button" onclick="window.togglePwVisibility('cp-current', 'cp-current-toggle')" id="cp-current-toggle" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium" style="color:var(--primary);">Tampilkan</button>
                </div>
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Password Baru (min 6 karakter)</label>
                <div class="relative overflow-hidden">
                  <input id="cp-new" type="password" class="input pr-24" placeholder="Password baru" />
                  <button type="button" onclick="window.togglePwVisibility('cp-new', 'cp-new-toggle')" id="cp-new-toggle" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium" style="color:var(--primary);">Tampilkan</button>
                </div>
              </div>
              <div>
                <label class="text-xs font-medium mb-1.5 block" style="color:var(--text-secondary);">Konfirmasi Password Baru</label>
                <div class="relative overflow-hidden">
                  <input id="cp-confirm" type="password" class="input pr-24" placeholder="Ulangi password baru" />
                  <button type="button" onclick="window.togglePwVisibility('cp-confirm', 'cp-confirm-toggle')" id="cp-confirm-toggle" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium" style="color:var(--primary);">Tampilkan</button>
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-5">
              <button type="button" onclick="window.closeChangePasswordForm()" class="btn-secondary">Batal</button>
              <button type="button" onclick="window.submitChangePassword()" class="btn-primary">Simpan Password</button>
            </div>
          </div>
        </div>
      `;
    }

    return html;
  }

  function applyTheme() {
    const root = document.getElementById("app");
    const theme = state.theme || "light";
    const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
    root.className = "app-root " + resolved;
  }

  // ================= WINDOW EXPOSED =================
  window.togglePwVisibility = function(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (!input || !button) return;
    if (input.type === "password") {
      input.type = "text";
      button.textContent = "Sembunyikan";
    } else {
      input.type = "password";
      button.textContent = "Tampilkan";
    }
  };

  window.setReportType = function (val) {
    state.reportType = val;
    state.reportCategory = "Semua";
    state.reportPeriod = "this_month";
    const range = getDateRangeByPeriod("this_month");
    if (range) {
      state.reportStartDate = range.start;
      state.reportEndDate = range.end;
    }
    render();
  };

  window.setReportPeriod = function (period) {
    state.reportPeriod = period;
    if (period !== "custom") {
      const range = getDateRangeByPeriod(period);
      if (range) {
        state.reportStartDate = range.start;
        state.reportEndDate = range.end;
      }
    }
    render();
  };

  window.setReportStart = function (val) { state.reportStartDate = val; render(); };
  window.setReportEnd = function (val) { state.reportEndDate = val; render(); };
  window.setReportCategory = function (val) { state.reportCategory = val; render(); };
  window.navigate = function (page) { state.page = page; render(); };

  window.toggleMobileSidebar = function() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    try { localStorage.setItem("desa-sidebar-collapsed", state.sidebarCollapsed ? "1" : "0"); } catch (e) {}
    render();
  };

  window.navigateDate = function (dateK) {
    state.page = "kalender";
    state.dayDrawer = dateK;
    state.selectedActivity = null;
    render();
  };

  window.toggleNotif = function () { state.notifOpen = !state.notifOpen; render(); };

  window.openNotifDetail = function (reminderId) {
    const reminder = state.data.reminders.find(function (r) { return r.id == reminderId; });
    if (!reminder) { toastMsg("Notifikasi tidak ditemukan.", "error"); return; }
    state.notifOpen = false;
    const rDate = reminder.date || reminder.reminder_date;
    if (reminder.related_type === "kegiatan" && reminder.related_id) {
      const activity = state.data.activities.find(function (a) { return a.id == reminder.related_id; });
      if (activity) {
        state.page = "kalender";
        state.calendarCursor = new Date(rDate + "T00:00:00");
        state.dayDrawer = rDate;
        state.selectedActivity = activity;
        render();
        return;
      }
    }
    state.page = "kalender";
    state.calendarCursor = new Date(rDate + "T00:00:00");
    state.dayDrawer = rDate;
    state.selectedActivity = null;
    render();
  };

  window.toggleUserMenu = function (e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("user-menu");
    if (menu) menu.classList.toggle("hidden");
  };

  window.closeUserMenu = function () {
    const menu = document.getElementById("user-menu");
    if (menu) menu.classList.add("hidden");
  };

  document.addEventListener('click', function(e) {
    const menu = document.getElementById("user-menu");
    if (!menu || menu.classList.contains('hidden')) return;
    const userBtn = e.target.closest('[onclick*="toggleUserMenu"]');
    if (!userBtn && !menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });

  window.doLogout = function () {
    clearSession();
    state.user = null;
    state.page = "beranda";
    state.dayDrawer = null;
    state.selectedActivity = null;
    state.selectedItem = null;
    state.showForm = false;
    state.formType = null;
    state.notifOpen = false;
    render();
  };

  window.cycleTheme = function () {
    const themes = ["light", "dark", "system"];
    const idx = themes.indexOf(state.theme);
    state.theme = themes[(idx + 1) % themes.length];
    try { localStorage.setItem("desa-ui-theme", state.theme); } catch (e) {}
    render();
  };

  window.setTheme = function (theme) {
    state.theme = theme;
    try { localStorage.setItem("desa-ui-theme", theme); } catch (e) {}
    render();
  };

  // --- INVENTORY ---
  window.viewInventory = function (id) {
    const item = state.data.inventory.find(function (i) { return i.id == id; });
    if (item) { state.selectedItem = item; render(); }
  };
  window.closeInventoryDetail = function () { state.selectedItem = null; render(); };
  window.editInventory = function (id) {
    const item = state.data.inventory.find(function (i) { return i.id == id; });
    if (item) { state.editItem = item; state.showForm = true; state.formType = "inventory"; render(); }
  };
  window.openInventoryForm = function () {
    state.editItem = null; state.showForm = true; state.formType = "inventory"; render();
  };
  window.closeInventoryForm = function () {
    state.showForm = false; state.formType = null; state.editItem = null; render();
  };
  window.confirmDeleteInventory = function (id) {
    const item = state.data.inventory.find(function (i) { return i.id == id; });
    if (item && confirm("Yakin hapus " + item.name + "?")) { deleteInventory(id); }
  };
  window.invPrevPage = function () { if (state.pageNum > 1) { state.pageNum--; render(); } };

  window.invNextPage = function () {
    const rows = getFilteredInventory();
    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.pageNum < totalPages) { state.pageNum++; render(); }
  };

  window.setInvFilterCategory = function (val) {
    state.invFilterCategory = val;
    state.pageNum = 1;
    render();
  };

  window.setInvFilterCondition = function (val) {
    state.invFilterCondition = val;
    state.pageNum = 1;
    render();
  };

  window.setInvFilterLocation = function (val) {
    state.invFilterLocation = val;
    state.pageNum = 1;
    render();
  };

  window.setInvSearch = function (val) {
    state.invSearchQuery = val;
    state.pageNum = 1;

    const activeEl = document.activeElement;
    const isSearching = activeEl && activeEl.id === "inv-search";
    const cursorPos = isSearching ? activeEl.selectionStart : null;

    render();

    if (isSearching) {
      const newEl = document.getElementById("inv-search");
      if (newEl) {
        newEl.focus();
        try { newEl.setSelectionRange(cursorPos, cursorPos); } catch (e) {}
      }
    }
  };

  window.resetInvFilter = function () {
    state.invFilterCategory = "Semua";
    state.invFilterCondition = "Semua";
    state.invFilterLocation = "Semua";
    state.invSearchQuery = "";
    state.pageNum = 1;
    render();
  };

  // --- ACTIVITIES ---
  window.openActivityForm = function (defaultDate) {
    state.editActivity = null;
    state.showForm = true;
    state.formType = "activity";
    state.defaultActivityDate = defaultDate || dateKey(TODAY);
    render();
  };
  window.closeActivityForm = function () {
    state.showForm = false; state.formType = null; state.editActivity = null; state.defaultActivityDate = null; render();
  };
  window.editActivity = function (id) {
    const act = state.data.activities.find(function (a) { return a.id == id; });
    if (act) {
      state.editActivity = act;
      state.selectedActivity = null;
      state.showForm = true;
      state.formType = "activity";
      render();
    }
  };
  window.openDayDrawer = function (dateK) { state.dayDrawer = dateK; state.selectedActivity = null; render(); };
  window.closeDayDrawer = function () { state.dayDrawer = null; render(); };
  window.openActivityDetail = function (id) {
    const act = state.data.activities.find(function (a) { return a.id == id; });
    if (act) { state.selectedActivity = act; state.dayDrawer = null; render(); }
  };
  window.closeActivityDetail = function () { state.selectedActivity = null; render(); };

  window.deleteActivityFromDrawer = async function(id) {
    if (!id) { toastMsg("ID tidak valid", "error"); return; }
    if (!confirm("Yakin hapus kegiatan ini?")) return;
    toastMsg("Menghapus...", "info");
    const result = await apiDelete("activities", id);
    if (result && result.success) {
      state.dayDrawer = null;
      state.selectedActivity = null;
      state.editActivity = null;
      await loadAllData();
      render();
      toastMsg("Kegiatan berhasil dihapus.");
    } else {
      toastMsg("Gagal menghapus: " + (result.error || "Unknown"), "error");
    }
  };

  // --- CALENDAR ---
  window.prevMonthCal = function () {
    const cursor = state.calendarCursor || new Date(TODAY);
    state.calendarCursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    state.dayDrawer = null;
    render();
  };
  window.nextMonthCal = function () {
    const cursor = state.calendarCursor || new Date(TODAY);
    state.calendarCursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    state.dayDrawer = null;
    render();
  };
  window.resetMonthCal = function () { state.calendarCursor = new Date(TODAY); state.dayDrawer = null; render(); };
  window.goToMonth = function(month, year) {
    state.calendarCursor = new Date(parseInt(year), parseInt(month), 1);
    state.dayDrawer = null;
    render();
  };

  window.updateProgressSlider = function(value) {
    const numValue = parseInt(value) || 0;
    const valueEl = document.getElementById('progress-value');
    if (valueEl) valueEl.textContent = numValue + '%';
    const fillEl = document.getElementById('progress-fill');
    if (fillEl) fillEl.style.width = numValue + '%';
    const thumbEl = document.getElementById('progress-thumb');
    if (thumbEl) thumbEl.style.left = `calc(${numValue}% - 9px)`;
  };

  window.previewProgress = function(id, value) {
    const numValue = parseInt(value) || 0;
    const activity = state.data.activities.find(function(a) { return a.id == id; });
    if (!activity) return;
    const color = CAT_WARNA[activity.category]?.hex || "#2563EB";
    const progressId = 'progress-' + id;
    const labelEl = document.getElementById(progressId + '-label');
    if (labelEl) { labelEl.textContent = numValue + '%'; labelEl.style.color = color; }
    const barEl = document.getElementById(progressId + '-bar');
    if (barEl) { barEl.style.width = numValue + '%'; barEl.style.background = color; }
  };

  window.updateProgressInline = async function(id, newProgress) {
    const activity = state.data.activities.find(function(a) { return a.id == id; });
    if (!activity) { toastMsg("Kegiatan tidak ditemukan.", "error"); return; }
    const progressValue = parseInt(newProgress) || 0;
    let newStatus;
    if (progressValue >= 100) newStatus = "Selesai";
    else if (progressValue > 0) newStatus = "Berlangsung";
    else newStatus = "Direncanakan";

    const result = await apiPut("activities", {
      id: activity.id,
      title: activity.title,
      category: activity.category,
      date: activity.date || activity.activity_date,
      start_time: activity.start_time || "09:00",
      end_time: activity.end_time || "11:00",
      location: activity.location,
      pic: activity.pic,
      status: newStatus,
      description: activity.description || "",
      progress: progressValue,
      participants: activity.participants || 0,
      reminder: activity.reminder || "1 hari sebelum",
      notes: activity.notes || "",
      result: activity.result || ""
    });

    if (result.success) {
      await loadAllData(); render();
      toastMsg("Progress diperbarui menjadi " + progressValue + "% (" + newStatus + ")");
    } else {
      toastMsg("Gagal update progress: " + (result.error || "Unknown"), "error");
    }
  };

  window.openReminderActivity = function(activityId) {
    const activity = state.data.activities.find(function(a) { return a.id == activityId; });
    if (!activity) { toastMsg("Kegiatan tidak ditemukan.", "error"); return; }
    const dateStr = activity.date || activity.activity_date;
    state.page = "kalender";
    state.calendarCursor = new Date(dateStr + "T00:00:00");
    state.dayDrawer = dateStr;
    state.selectedActivity = activity;
    state.notifOpen = false;
    render();
  };

  // --- REMINDERS ---
  window.toggleReminder = async function (id) {
    const reminder = state.data.reminders.find(function (r) { return r.id == id; });
    if (reminder) {
      const result = await updateReminder(id, { status: "done" });
      if (result && result.success) { toastMsg("Reminder ditandai selesai!"); }
    }
  };

  // --- USERS (single admin — hanya edit diri sendiri) ---
  // Handler openUserForm / closeUserForm / toggleUserStatus / confirmDeleteUser /
  // doDeleteUser / openUbahPasswordUser / submitUbahPasswordUser /
  // openUbahUsername / submitUbahUsername / openUbahNama / submitUbahNama
  // DIHAPUS karena backend users.php hanya mengizinkan edit admin sendiri.

  window.openChangeNameForm = function () {
    state.showForm = true;
    state.formType = "change_name";
    render();
  };

  window.closeChangeNameForm = function () {
    state.showForm = false;
    state.formType = null;
    render();
  };

  window.submitChangeName = async function () {
    const newName = (document.getElementById("cn-new")?.value || "").trim();
    const errorEl = document.getElementById("cn-error");
    if (errorEl) errorEl.classList.add("hidden");

    if (!newName || newName.length < 2) {
      if (errorEl) { errorEl.textContent = "Nama minimal 2 karakter."; errorEl.classList.remove("hidden"); }
      return;
    }
    if (newName === state.user.name) {
      if (errorEl) { errorEl.textContent = "Nama baru sama dengan yang lama."; errorEl.classList.remove("hidden"); }
      return;
    }

    const result = await apiPut("users", {
      nama: newName,
      username: state.user.username,
      change_own_name: true
    });

    if (result.success) {
      state.user.name = newName;
      session.user.name = newName;
      saveSession();
      state.showForm = false;
      state.formType = null;
      await loadAllData();
      render();
      toastMsg("Nama berhasil diubah menjadi " + newName);
    } else {
      if (errorEl) { errorEl.textContent = result.error || "Gagal mengubah nama."; errorEl.classList.remove("hidden"); }
    }
  };

  window.openChangeUsernameForm = function () {
    state.showForm = true;
    state.formType = "change_username";
    render();
  };

  window.closeChangeUsernameForm = function () {
    state.showForm = false;
    state.formType = null;
    render();
  };

  window.submitChangeUsername = async function () {
    const newUsername = (document.getElementById("cu-new")?.value || "").trim();
    const errorEl = document.getElementById("cu-error");
    if (errorEl) errorEl.classList.add("hidden");

    if (!newUsername || newUsername.length < 3) {
      if (errorEl) { errorEl.textContent = "Username minimal 3 karakter."; errorEl.classList.remove("hidden"); }
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(newUsername)) {
      if (errorEl) { errorEl.textContent = "Username hanya boleh huruf, angka, titik, underscore, strip."; errorEl.classList.remove("hidden"); }
      return;
    }
    if (newUsername === state.user.username) {
      if (errorEl) { errorEl.textContent = "Username baru sama dengan yang lama."; errorEl.classList.remove("hidden"); }
      return;
    }

    const result = await apiPut("users", {
      nama: state.user.name,
      username: newUsername,
      change_own_username: true
    });

    if (result.success) {
      state.user.username = newUsername;
      session.user.username = newUsername;
      saveSession();
      state.showForm = false;
      state.formType = null;
      await loadAllData();
      render();
      toastMsg("Username berhasil diubah menjadi @" + newUsername);
    } else {
      if (errorEl) { errorEl.textContent = result.error || "Gagal mengubah username."; errorEl.classList.remove("hidden"); }
    }
  };

  window.openChangePasswordForm = function () { state.showForm = true; state.formType = "change_password"; render(); };
  window.closeChangePasswordForm = function () { state.showForm = false; state.formType = null; render(); };

  window.submitChangePassword = async function () {
    const currentPw = document.getElementById("cp-current")?.value || "";
    const newPw = document.getElementById("cp-new")?.value || "";
    const confirmPw = document.getElementById("cp-confirm")?.value || "";
    const errorEl = document.getElementById("cp-error");
    if (errorEl) errorEl.classList.add("hidden");

    if (!currentPw || !newPw || !confirmPw) {
      if (errorEl) { errorEl.textContent = "Semua field wajib diisi."; errorEl.classList.remove("hidden"); }
      return;
    }
    if (newPw.length < 6) {
      if (errorEl) { errorEl.textContent = "Password baru minimal 6 karakter."; errorEl.classList.remove("hidden"); }
      return;
    }
    if (newPw !== confirmPw) {
      if (errorEl) { errorEl.textContent = "Konfirmasi password tidak cocok."; errorEl.classList.remove("hidden"); }
      return;
    }
    if (newPw === currentPw) {
      if (errorEl) { errorEl.textContent = "Password baru harus berbeda dari password lama."; errorEl.classList.remove("hidden"); }
      return;
    }

    const result = await changeOwnPassword(currentPw, newPw);
    if (result.success) {
      state.showForm = false;
      state.formType = null;
      render();
      toastMsg("Password berhasil diubah. Silakan login ulang.");
      setTimeout(function () { clearSession(); state.user = null; render(); }, 2000);
    } else {
      if (errorEl) { errorEl.textContent = result.error || "Password lama salah."; errorEl.classList.remove("hidden"); }
    }
  };

  // --- SETTINGS ---
  window.setSettingsTab = function (tab) { state.settingsTab = tab; render(); };

  window.saveProfile = async function () {
    const data = {
      name: document.getElementById("set-name")?.value || "",
      kecamatan: document.getElementById("set-kecamatan")?.value || "",
      kabupaten: document.getElementById("set-kabupaten")?.value || "",
      provinsi: document.getElementById("set-provinsi")?.value || "",
      address: document.getElementById("set-address")?.value || "",
      postal_code: document.getElementById("set-postal")?.value || "",
      phone: document.getElementById("set-phone")?.value || "",
      email: document.getElementById("set-email")?.value || "",
    };
    if (!data.name || !data.kecamatan || !data.kabupaten || !data.provinsi) {
      toastMsg("Nama Desa, Kecamatan, Kabupaten, dan Provinsi wajib diisi!", "error");
      return;
    }
    await updateVillageProfile(data);
  };

  // --- REPORTS ---
  window.exportReport = function () {
    const data = state.data;
    const reportType = state.reportType || "Laporan Inventaris";
    const startDate = state.reportStartDate;
    const endDate = state.reportEndDate;
    const category = state.reportCategory || "Semua";
    const isInventoryReport = reportType.toLowerCase().includes("inventaris") || reportType.toLowerCase().includes("aset");

    let rows = [];
    let filename = "";

    if (isInventoryReport) {
      const invRows = data.inventory.filter(function (i) {
        return category === "Semua" || i.category === category;
      });
      rows = invRows.map(function (r, idx) {
        return {
          "No": idx + 1, "Kode": r.code || "-", "Nama Barang": r.name || "-",
          "Kategori": r.category || "-", "Jumlah": (r.qty || 0) + " " + (r.unit || ""),
          "Lokasi": r.location || "-", "Kondisi": r.condition || "-", "Penanggung Jawab": r.pic || "-"
        };
      });
      filename = "laporan-inventaris-" + dateKey(TODAY);
    } else {
      const actRows = data.activities.filter(function (a) {
        const d = a.date || a.activity_date;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        if (category !== "Semua" && a.category !== category) return false;
        return true;
      });
      rows = actRows.map(function (r, idx) {
        return {
          "No": idx + 1, "Tanggal": formatTanggalID(r.date || r.activity_date),
          "Judul Kegiatan": r.title || "-", "Kategori": CAT_WARNA[r.category]?.label || r.category || "-",
          "Lokasi": r.location || "-", "Penanggung Jawab": r.pic || "-",
          "Status": r.status || "Direncanakan", "Progress": (r.progress || 0) + "%"
        };
      });
      filename = "laporan-kegiatan-" + dateKey(TODAY);
    }

    if (rows.length === 0) { toastMsg("Tidak ada data untuk diexport.", "error"); return; }

    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")];
    rows.forEach(function (r) {
      csv.push(headers.map(function (h) { return '"' + String(r[h] || "").replace(/"/g, '""') + '"'; }).join(","));
    });

    const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename + ".csv"; a.click();
    URL.revokeObjectURL(url);
    toastMsg("Laporan berhasil diunduh (" + rows.length + " baris)");
  };

  window.printReport = function () {
    const data = state.data;
    const reportType = state.reportType || "Laporan Inventaris";
    const startDate = state.reportStartDate;
    const endDate = state.reportEndDate;
    const category = state.reportCategory || "Semua";
    const profile = state.data.villageProfile || {};
    const isInventoryReport = reportType.toLowerCase().includes("inventaris") || reportType.toLowerCase().includes("aset");

    let tableHeaders = "", tableRows = "", periodeText = "", totalText = "";

    if (isInventoryReport) {
        const invRows = data.inventory.filter(function (i) { return category === "Semua" || i.category === category; });
        if (invRows.length === 0) { toastMsg("Tidak ada data untuk dicetak.", "error"); return; }
        periodeText = `Kategori: ${category}`;
        totalText = invRows.length + " aset";
        tableHeaders = `<tr><th style="width:40px;">No</th><th>Kode</th><th>Nama Barang</th><th>Kategori</th><th style="width:80px;">Jumlah</th><th>Lokasi</th><th>Kondisi</th><th>Penanggung Jawab</th></tr>`;
        tableRows = invRows.map(function (r, idx) {
            return `<tr><td style="text-align:center;">${idx + 1}</td><td style="font-family:monospace;font-size:10px;">${r.code || "-"}</td><td>${r.name || "-"}</td><td>${r.category || "-"}</td><td style="text-align:center;">${r.qty || 0} ${r.unit || ""}</td><td>${r.location || "-"}</td><td>${r.condition || "-"}</td><td>${r.pic || "-"}</td></tr>`;
        }).join("");
    } else {
        const actRows = data.activities.filter(function (a) {
            const d = a.date || a.activity_date;
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            if (category !== "Semua" && a.category !== category) return false;
            return true;
        });
        if (actRows.length === 0) { toastMsg("Tidak ada data untuk dicetak.", "error"); return; }
        periodeText = `Periode: ${formatTanggalID(startDate)} - ${formatTanggalID(endDate)}`;
        totalText = actRows.length + " kegiatan";
        tableHeaders = `<tr><th style="width:40px;">No</th><th style="width:100px;">Tanggal</th><th>Judul Kegiatan</th><th>Kategori</th><th>Lokasi</th><th>Penanggung Jawab</th><th style="width:90px;">Status</th><th style="width:70px;">Progress</th></tr>`;
        tableRows = actRows.map(function (r, idx) {
            return `<tr><td style="text-align:center;">${idx + 1}</td><td style="white-space:nowrap;">${formatTanggalID(r.date || r.activity_date)}</td><td>${r.title || "-"}</td><td>${CAT_WARNA[r.category]?.label || r.category || "-"}</td><td>${r.location || "-"}</td><td>${r.pic || "-"}</td><td>${r.status || "Direncanakan"}</td><td style="text-align:center;">${r.progress || 0}%</td></tr>`;
        }).join("");
    }

    const printHTML = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${reportType} - ${profile.name || "Desa"}</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        @page { size: A4 landscape; margin: 25mm 20mm 25mm 20mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.4; padding: 25mm 20mm; background: #fff; }
        .print-container { max-width: 1100px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px double #333; }
        .header h1 { margin: 0 0 8px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
        .header h2 { margin: 0 0 4px 0; font-size: 13px; font-weight: normal; color: #555; letter-spacing: 0.5px; }
        .header h3 { margin: 15px 0 8px 0; font-size: 15px; text-transform: uppercase; text-decoration: underline; font-weight: 700; }
        .header .periode { font-size: 12px; color: #666; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th { background: #2c3e50; color: #fff; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; border: 1px solid #2c3e50; }
        td { padding: 9px 8px; border: 1px solid #cbd5e1; vertical-align: top; font-size: 10.5px; }
        tbody tr:nth-child(even) { background: #f8f9fa; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #666; }
        .ttd { margin-top: 60px; text-align: right; font-size: 12px; page-break-inside: avoid; }
        .ttd .tempat-tanggal { margin-bottom: 5px; }
        .ttd .jabatan { margin-bottom: 80px; }
        .ttd .nama { font-weight: 700; text-decoration: underline; letter-spacing: 0.5px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="print-container">
        <div class="header">
          <h1>PEMERINTAH ${(profile.name || "DESA").toUpperCase()}</h1>
          <h2>${(profile.kecamatan || "").toUpperCase()} - ${(profile.kabupaten || "").toUpperCase()}</h2>
          <h2>${(profile.provinsi || "").toUpperCase()}</h2>
          <h3>${reportType.toUpperCase()}</h3>
          <div class="periode">${periodeText}</div>
        </div>
        <table><thead>${tableHeaders}</thead><tbody>${tableRows}</tbody></table>
        <div class="footer"><span>Dicetak: ${formatTanggalID(dateKey(TODAY), true)}</span><span>Total: ${totalText}</span></div>
        <div class="ttd">
          <div class="tempat-tanggal">${profile.kecamatan || "Kecamatan"}, ${formatTanggalID(dateKey(TODAY))}</div>
          <div>${profile.name || "Desa"},</div>
          <div class="jabatan"></div>
          <div class="nama">KEPALA DESA</div>
        </div>
      </div></body></html>`;

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) { toastMsg("Popup diblokir. Izinkan popup untuk mencetak.", "error"); return; }
    printWindow.document.open();
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.onload = function() {
      setTimeout(function() { printWindow.focus(); printWindow.print(); }, 400);
    };
    toastMsg("Siap dicetak.");
  };

  // ================= BIND EVENTS =================
  function bindEvents() {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const username = document.getElementById("login-username")?.value || "";
        const password = document.getElementById("login-password")?.value || "";
        const errorEl = document.getElementById("login-error");
        if (!username || !password) {
          errorEl.textContent = "Username dan password wajib diisi.";
          errorEl.classList.remove("hidden");
          return;
        }
        const success = await loginUser(username, password);
        if (!success) {
          errorEl.textContent = "Login gagal. Periksa username dan password.";
          errorEl.classList.remove("hidden");
        } else {
          errorEl.classList.add("hidden");
        }
      });
    }

    const togglePw = document.getElementById("login-toggle-pw");
    if (togglePw) {
      togglePw.addEventListener("click", function () {
        const pw = document.getElementById("login-password");
        if (pw) {
          pw.type = pw.type === "password" ? "text" : "password";
          this.textContent = pw.type === "password" ? "Tampilkan" : "Sembunyikan";
        }
      });
    }

    const invForm = document.getElementById("inventory-form");
    if (invForm) {
      invForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const fd = new FormData(invForm);
        const data = {
          name: fd.get("name") || "",
          category: fd.get("category") || "Elektronik",
          qty: Number(fd.get("qty")) || 1,
          location: fd.get("location") || "Balai Desa",
          pic: fd.get("pic") || "Sekretaris Desa",
          condition: fd.get("condition") || "Baik",
          notes: fd.get("notes") || "",
          unit: "buah",
          year_acquired: new Date().getFullYear(),
          fund_source: "Dana Desa",
          price: 0,
        };
        if (!data.name) { toastMsg("Nama barang wajib diisi.", "error"); return; }
        if (state.editItem) { await updateInventory(state.editItem.id, data); }
        else { await addInventory(data); }
        state.showForm = false; state.formType = null; state.editItem = null; render();
      });
    }

    const actForm = document.getElementById("activity-form");
    if (actForm) {
      const clone = actForm.cloneNode(true);
      actForm.parentNode.replaceChild(clone, actForm);
      const sliderInit = clone.querySelector('input[name="progress"]');
      if (sliderInit) { window.updateProgressSlider(sliderInit.value); }

      clone.addEventListener("submit", async function (e) {
        e.preventDefault();
        const fd = new FormData(clone);
        const data = {
          title: fd.get("title") || "",
          category: fd.get("category") || "kegiatan",
          date: fd.get("date") || dateKey(TODAY),
          start_time: fd.get("start_time") || "09:00",
          end_time: fd.get("end_time") || "11:00",
          location: fd.get("location") || "Balai Desa",
          pic: fd.get("pic") || "Sekretaris Desa",
          status: fd.get("status") || "Direncanakan",
          description: fd.get("description") || "",
          participants: 0,
          progress: parseInt(fd.get("progress")) || 0,
          reminder: "1 hari sebelum",
        };
        if (!data.title) { toastMsg("Judul kegiatan wajib diisi.", "error"); return; }

        const targetDate = data.date;
        const wasEditing = !!state.editActivity;
        const editId = state.editActivity ? state.editActivity.id : null;

        state.showForm = false; state.formType = null; state.editActivity = null; state.defaultActivityDate = null;

        let result;
        if (wasEditing) { result = await updateActivity(editId, data); }
        else { result = await addActivity(data); }

        if (result && result.success) {
          state.page = "kalender";
          state.calendarCursor = new Date(targetDate + "T00:00:00");
          state.dayDrawer = targetDate;
          state.selectedActivity = null;
          render();
        }
      });
    }

    setInterval(function () {
      const clock = document.getElementById("current-clock");
      if (clock) {
        clock.textContent = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
      }
    }, 1000);
  }

  // ================= GET ICON =================
  function getIcon(name, size, color) {
    const strokeColor = color || "currentColor";
    const icons = {
        home: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        package: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M12.89 1.45l8 4A2 2 0 0122 7.24v9.53a2 2 0 01-1.11 1.79l-8 4a2 2 0 01-1.79 0l-8-4a2 2 0 01-1.11-1.79V7.24a2 2 0 011.11-1.79l8-4a2 2 0 011.78 0z"/><polyline points="2.32 6.16 12 11 21.68 6.16"/><line x1="12" y1="22.76" x2="12" y2="11"/></svg>`,
        calendar: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        bell: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
        'bar-chart': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
        'file-text': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
        users: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
        settings: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
        logout: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
        'chevron-down': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
        'chevron-left': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
        'chevron-right': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
        'check-circle': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        'alert-triangle': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        'alert-octagon': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        clock: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        plus: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        eye: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        pencil: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
        trash: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
        x: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        info: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        download: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        printer: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M18 9H6v9h12V9z"/><rect x="6" y="13" width="12" height="8"/></svg>`,
    };
    return icons[name] || `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
  }

  // ================= INITIALIZE =================
  async function initialize() {
    try {
      console.log("Starting application...");
      console.log("API_BASE =", API_BASE);
      console.log("Current URL =", window.location.href);

      try {
        const t = localStorage.getItem("desa-ui-theme");
        if (t) state.theme = t;
      } catch (e) {}

      try {
        const sc = localStorage.getItem("desa-sidebar-collapsed");
        if (sc === "1") state.sidebarCollapsed = true;
      } catch (e) {}

      if (loadSession() && session.user) {
        state.user = session.user;
        state.page = "beranda";
        console.log("Session loaded:", state.user.username);
      }

      console.log("Loading data from API...");
      await loadAllData();

      console.log("Data loaded:", {
        inventory: state.data.inventory.length,
        activities: state.data.activities.length,
        villageProfile: Object.keys(state.data.villageProfile).length,
        users: state.data.users.length,
      });

      if (Object.keys(state.data.villageProfile).length === 0) {
        console.log("Profil desa kosong, membuat default...");
        await updateVillageProfile({
          name: "Desa Contoh", kecamatan: "Kecamatan Contoh", kabupaten: "Kabupaten Contoh",
          provinsi: "Provinsi Contoh", address: "Alamat Desa", postal_code: "12345",
          phone: "08123456789", email: "desa@contoh.go.id"
        });
        await loadAllData();
      }

      state.booting = false;
      console.log("Application initialized successfully!");
      render();

    } catch (e) {
      console.error("Initialize error:", e);
      state.booting = false;
      appEl.innerHTML = `
        <div style="padding:40px;text-align:center;color:red;background:white;border-radius:8px;margin:20px;border:1px solid red;">
          <h2>Gagal memuat aplikasi</h2>
          <p><strong>${e.message}</strong></p>
          <p style="font-size:12px;color:gray;">Buka Console (F12) untuk detail.</p>
          <button onclick="location.reload()" style="padding:8px 20px;margin-top:10px;background:#2563EB;color:white;border:none;border-radius:4px;cursor:pointer;">Refresh</button>
        </div>
      `;
    }
  }

  window.onerror = function(msg, url, line, col, error) {
    console.error('GLOBAL ERROR:', msg, 'at', url, 'line', line);
    return true;
  };

  initialize();
})();