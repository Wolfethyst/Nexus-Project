// src/mods.js
const BASE = "https://data.wolfethyst.tv";
const LOGIN_URL = `${BASE}/auth/twitch/login`;

const loginScreen = document.getElementById("loginScreen");
const modContainer = document.getElementById("modContainer");
const loginBtn = document.getElementById("modLoginBtn");
const modUserInfo = document.getElementById("modUserInfo");

// Panels
const panelBans      = document.getElementById("panelBans");
const panelTimeouts  = document.getElementById("panelTimeouts");
const panelUnban     = document.getElementById("panelUnban");
const panelWarn      = document.getElementById("panelWarnings");
const panelHist      = document.getElementById("panelHistory");
const panelGames     = document.getElementById("panelGames");
const panelUsers     = document.getElementById("panelUsers");
const panelBannedUsers = document.getElementById("panelBannedUsers");

// Stats & Counts
const bannedUsersCountEl = document.getElementById("bannedUsersCount");
const bannedUsersListEl  = document.getElementById("bannedUsersList");
const historySelectedUserEl = document.getElementById("historySelectedUser");
const btnTimeoutUser = document.getElementById("btnTimeoutUser");
const btnBanUser     = document.getElementById("btnBanUser");
const statActiveBansEl     = document.getElementById("statActiveBans");
const statActiveTimeoutsEl = document.getElementById("statActiveTimeouts");
const statWarningsEl       = document.getElementById("statWarnings");
const statUnbanRequestsEl  = document.getElementById("statUnbanRequests");
const usersSearchInput = document.getElementById("usersSearchInput");
const usersCountEl     = document.getElementById("usersCount");

// Game Modal Elements
const btnGameAdd      = document.getElementById("btnGameAdd");
const gameModal       = document.getElementById("gameModal");
const gameModalTitle  = document.getElementById("gameModalTitle");
const gameNameInput   = document.getElementById("gameNameInput");
const gameCoverInput  = document.getElementById("gameCoverInput");
const gameSaveBtn     = document.getElementById("gameSaveBtn");
const gameCancelBtn   = document.getElementById("gameCancelBtn");

// Mod Action Modal Elements
const modActionModal           = document.getElementById("modActionModal");
const modActionModalTitle      = document.getElementById("modActionModalTitle");
const modActionUserLine        = document.getElementById("modActionUserLine");
const modActionDurationRow     = document.getElementById("modActionDurationRow");
const modActionDurationButtons = document.getElementById("modActionDurationButtons");
const modActionCustomMinutes   = document.getElementById("modActionCustomMinutes");
const modActionReason          = document.getElementById("modActionReason");
const modActionCancelBtn       = document.getElementById("modActionCancelBtn");
const modActionConfirmBtn      = document.getElementById("modActionConfirmBtn");

// Points Modal Elements
const pointsModal           = document.getElementById("pointsModal");
const pointsModalTitle      = document.getElementById("pointsModalTitle");
const pointsModalUserLine   = document.getElementById("pointsModalUserLine");
const pointsModeButtons     = document.getElementById("pointsModeButtons");
const pointsAmountInput     = document.getElementById("pointsAmountInput");
const pointsConfirmBtn      = document.getElementById("pointsConfirmBtn");
const pointsCancelBtn       = document.getElementById("pointsCancelBtn");

// State
let modActionKind = null;
let modActionSelectedSeconds = 900;
let pointsModalMode = "add";
let pointsModalUser = null;
let currentBansAll = [];
let currentBansActive = [];
let selectedBanId = null;
let selectedUser = null;
let gamesList = [];
let editingGameIndex = null;
let nexusUsersAll = [];
let nexusUsersFiltered = [];
let currentModsList = [];
let chatSocket = null;
let isOwnerSession = false; 

// Live Chat
const liveChatMessagesEl = document.getElementById("liveChatMessages");

// --- UTILS ---
loginBtn.addEventListener("click", () => {
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${LOGIN_URL}?redirect=${redirect}`;
});

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] || c));
}

function parseTime(value) {
    if (!value) return null;
    if (typeof value === "number") return value;
    const n = Date.parse(value);
    return Number.isNaN(n) ? null : n;
}

function formatDateTime(ts) {
    return new Date(ts).toLocaleString();
}

function formatRelative(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if(mins < 1) return "just now";
    if(mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if(hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
}

function deriveDisplayNameFromUser(user) {
    if (!user || typeof user !== "object") return "Unknown";
    return (user.display || user.displayName || user.name || user.username || user.login || (user.profile && user.profile.displayName) || "Unknown");
}

function deriveUserId(user) {
    if (!user || typeof user !== "object") return "unknown";
    return (user.uuid || user.userId || user.id || user.nexusId || user.sub || "unknown");
}

function normalizeChatMessage(raw) {
    if (!raw || typeof raw !== "object") return null;

    let data = raw;
    if (data.type === "chat" && data.message) {
        data = data.message;
    } else if (data.type === "chat" && data.payload) {
        data = data.payload;
    }

    const text = data.text || data.message || "";
    if (!text || typeof text !== "string") return null;

    let displayName = "Unknown";
    if (typeof data.user === "string") {
        displayName = data.user;
    } else if (data.displayName) {
        displayName = data.displayName;
    } else if (data.username) {
        displayName = data.username;
    }

    const userId = data.userId || data.uuid || "";
    const platform = (data.platform || "nexus").toLowerCase();
    const ts = parseTime(data.ts) || parseTime(data.timestamp) || Date.now();

    return { userId, displayName, platform, text, ts };
}

function appendLiveChatMessage(msg) {
    if (!liveChatMessagesEl || !msg) return;
    const empty = liveChatMessagesEl.querySelector(".empty");
    if (empty) empty.remove();
    const atBottom = liveChatMessagesEl.scrollHeight - liveChatMessagesEl.scrollTop <= liveChatMessagesEl.clientHeight + 10;

    const userDisplay = msg.displayName;
    const platform = msg.platform;
    const text = msg.text;
    const timeLabel = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const wrapper = document.createElement("div");
    wrapper.className = "liveChatMessage";
    wrapper.dataset.userId = msg.userId;
    wrapper.dataset.displayName = userDisplay;
    wrapper.dataset.platform = platform;

    wrapper.innerHTML = `
    <div class="liveChatHeaderLine">
      <span class="liveChatUser">${escapeHtml(userDisplay)}</span>
      <span class="liveChatPlatformTag">${escapeHtml(platform)}</span>
      <span class="liveChatTime">${escapeHtml(timeLabel)}</span>
    </div>
    <div class="liveChatText">${escapeHtml(text)}</div>
  `;
    wrapper.addEventListener("click", () => {
        selectedUser = {
            userId: wrapper.dataset.userId || "",
            displayName: wrapper.dataset.displayName || "Unknown",
            platform: wrapper.dataset.platform || "nexus",
        };
        selectedBanId = null;
        updateHistorySelectionUI();
        clearHistoryPanel();
    });
    liveChatMessagesEl.appendChild(wrapper);
    if (atBottom) liveChatMessagesEl.scrollTop = liveChatMessagesEl.scrollHeight;
}

function connectLiveChat() {
    if (!liveChatMessagesEl) return;
    if (!("WebSocket" in window)) {
        liveChatMessagesEl.innerHTML = '<div class="empty">Your browser does not support WebSockets.</div>';
        return;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//data.wolfethyst.tv/nexus/chat/stream`;
    try {
        chatSocket = new WebSocket(url);
    } catch (err) {
        console.error("Failed to open chat WebSocket", err);
        liveChatMessagesEl.innerHTML = '<div class="empty">Failed to connect to chat.</div>';
        return;
    }
    chatSocket.addEventListener("open", () => {
        liveChatMessagesEl.innerHTML = '<div class="empty">Connected. Waiting for messages…</div>';
    });
    chatSocket.addEventListener("message", (event) => {
        let raw;
        try { raw = JSON.parse(event.data); } catch { return; }
        const normalized = normalizeChatMessage(raw);
        if (!normalized) return;
        appendLiveChatMessage(normalized);
    });
    chatSocket.addEventListener("close", () => {
        console.warn("Chat WebSocket closed, retrying…");
        setTimeout(connectLiveChat, 5000);
    });
}

function classifyBan(ban) {
    const now = Date.now();
    const expiresAt = parseTime(ban.expiresAt);
    const liftedAt = parseTime(ban.liftedAt);
    let type = "ban";
    let status = "active";
    if (expiresAt) {
        type = "timeout";
        if (expiresAt <= now) status = "expired";
    }
    if (liftedAt) status = "lifted";
    return { type, status, expiresAt, liftedAt };
}

function isAutoModeration(ban) {
    if (!ban) return false;
    if (ban.auto === true) return true;
    if (typeof ban.source === "string" && ban.source.toLowerCase() === "auto") return true;
    if (Array.isArray(ban.tags) && ban.tags.some(t => String(t).toLowerCase() === "auto")) return true;
    if (typeof ban.reasonCode === "string" && ban.reasonCode.toLowerCase().startsWith("auto_")) return true;
    return false;
}

function updateHistorySelectionUI() {
    if (!selectedUser) {
        if (historySelectedUserEl) historySelectedUserEl.textContent = "No user selected.";
        if (btnTimeoutUser) btnTimeoutUser.disabled = true;
        if (btnBanUser) btnBanUser.disabled = true;
    } else {
        if (historySelectedUserEl) {
            historySelectedUserEl.innerHTML = `
        Selected user: <strong>${escapeHtml(selectedUser.displayName)}</strong>
      `;
        }
        if (btnTimeoutUser) btnTimeoutUser.disabled = false;
        if (btnBanUser) btnBanUser.disabled = false;
    }
    document.querySelectorAll(".banRow").forEach(row => {
        row.classList.toggle("selected", row.dataset.banId === (selectedBanId || ""));
    });
    document.querySelectorAll(".userRow").forEach(row => {
        const rowUuid = row.dataset.uuid;
        row.classList.toggle("selected", selectedUser && rowUuid === selectedUser.userId);
    });
}

function clearHistoryPanel() {
    let list = panelHist.querySelector(".historyList");
    if (list) list.innerHTML = `<div class="empty">Select a user to view history.</div>`;
}

function renderChatHistoryForBan(ban) {
    clearHistoryPanel();
    const list = panelHist.querySelector(".historyList");
    const history = Array.isArray(ban.history) ? ban.history.slice() : [];
    if (history.length === 0) {
        list.innerHTML = `<div class="empty">No recorded history.</div>`;
        return;
    }
    history.sort((a, b) => (parseTime(a.ts) || 0) - (parseTime(b.ts) || 0));
    list.innerHTML = history.map(msg => {
        const timeLabel = new Date(msg.ts).toLocaleTimeString();
        return `
      <div class="historyItem">
        <div class="historyTime">${escapeHtml(timeLabel)}</div>
        <div class="historyText">${escapeHtml(msg.text)}</div>
      </div>
    `;
    }).join("");
}

function renderBanList(panel, items, kind) {
    if (!panel) return;
    const empty = panel.querySelector(".empty");
    if (empty) empty.remove();
    let list = panel.querySelector(".banList");
    if (!list) {
        list = document.createElement("div");
        list.className = "banList";
        panel.appendChild(list);
    }
    if (!items.length) {
        list.innerHTML = `<div class="empty">${kind === "timeout" ? "No active timeouts." : "No active bans."}</div>`;
        return;
    }

    list.innerHTML = items.map(ban => {
        const name = ban.displayName || "Unknown";
        const info = classifyBan(ban);
        let timeInfo = "";
        if (info.type === "timeout" && info.expiresAt) {
            timeInfo = `Ends: ${new Date(info.expiresAt).toLocaleTimeString()}`;
        }

        // [FIX] Added data-user-id to the button
        return `
      <div class="banRow" data-ban-id="${ban.id}" data-user-id="${ban.userId}">
        <div class="banMain">
          <div class="banName">${escapeHtml(name)}</div>
          <div class="banMeta">${escapeHtml(ban.reason)} <br> ${timeInfo}</div>
        </div>
        <div class="banActions">
           <button class="banActionBtn unban" data-action="unban" data-ban-id="${ban.id}" data-user-id="${ban.userId}" data-user-name="${name}" data-kind="${info.type}">
             ${info.type === "timeout" ? "Clear" : "Unban"}
           </button>
        </div>
      </div>
    `;
    }).join("");
}

function renderBansAndTimeouts(bans) {
    const activeBans = [];
    const activeTimeouts = [];

    for (const ban of bans) {
        const info = classifyBan(ban);
        if (info.status !== "active") continue;
        if (info.type === "ban") activeBans.push(ban);
        else activeTimeouts.push(ban);
    }

    currentBansActive = [...activeBans, ...activeTimeouts];
    renderBanList(panelBans, activeBans, "ban");
    renderBanList(panelTimeouts, activeTimeouts, "timeout");

    // Render Banned Users Summary List
    if (bannedUsersListEl) {
        if (activeBans.length === 0) {
            bannedUsersListEl.innerHTML = `<div class="empty">No active bans.</div>`;
        } else {
            // [FIX] Added data-user-id here as well
            bannedUsersListEl.innerHTML = activeBans.map(ban => `
             <div class="banRow">
                 <div class="banMain">
                     <div class="banName">${escapeHtml(ban.displayName)}</div>
                     <div class="banMeta">${escapeHtml(ban.reason)}</div>
                 </div>
                 <button class="banActionBtn unban" data-action="unban" data-ban-id="${ban.id}" data-user-id="${ban.userId}">Unban</button>
             </div>
         `).join("");
        }
    }

    if (statActiveBansEl) statActiveBansEl.textContent = activeBans.length;
    if (statActiveTimeoutsEl) statActiveTimeoutsEl.textContent = activeTimeouts.length;
}

async function loadBans() {
    try {
        const res = await fetch(`${BASE}/mods/bans`, { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            currentBansAll = data.bans || [];
            renderBansAndTimeouts(currentBansAll);
        }
    } catch (e) { }
}

// [FIX] Added userId parameter
async function apiLiftBan(banId, userId) {
    if (!confirm("Lift this penalty?")) return;
    await fetch(`${BASE}/mods/unban`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // [FIX] Sending userId explicitly
        body: JSON.stringify({ banId, userId })
    });
    loadBans();
}

document.addEventListener("click", (e) => {
    if (e.target.classList.contains("banActionBtn")) {
        // [FIX] Passing userId from dataset
        apiLiftBan(e.target.dataset.banId, e.target.dataset.userId);
    }
});

// ... (Rest of the file remains the same) ...
// ===================== NEXUS USERS PANEL ======================
function applyUsersFilter() {
    const term = (usersSearchInput?.value || "").trim().toLowerCase();
    if (!term) { nexusUsersFiltered = nexusUsersAll.slice(); }
    else {
        nexusUsersFiltered = nexusUsersAll.filter(u => {
            const d = (u.displayName || "").toLowerCase();
            const id = (u.uuid || "").toLowerCase();
            return (d.includes(term) || id.includes(term));
        });
    }
    renderNexusUsers();
}

function renderNexusUsers() {
    if (!panelUsers) return;
    const list = panelUsers.querySelector(".usersList");
    if (!list) return;

    if (!nexusUsersFiltered.length) {
        list.innerHTML = `<div class="empty">No users found.</div>`;
        return;
    }

    nexusUsersFiltered.sort((a, b) => (b.points || 0) - (a.points || 0));
    if(usersCountEl) usersCountEl.innerText = nexusUsersAll.length;

    list.innerHTML = nexusUsersFiltered.map(u => {
        const isMod = currentModsList.includes(u.uuid);
        const modButton = isOwnerSession 
            ? `<button class="userActionBtn modToggle" type="button" data-uuid="${escapeHtml(u.uuid)}">${isMod ? "Unmod" : "Mod"}</button>`
            : "";

        return `
      <div class="userRow" data-uuid="${escapeHtml(u.uuid)}">
        <div class="userMain">
          <div class="userName">
            ${escapeHtml(u.displayName)} 
            ${isMod ? '<span class="userBadge mod">MOD</span>' : ""}
          </div>
          <div class="userId">UUID: ${escapeHtml(u.uuid)}</div>
          <div class="userMeta">Points: ${u.points || 0}</div>
        </div>
        <div class="userActions">
          <button class="userActionBtn points" type="button">Points</button>
          ${modButton}
          <button class="userActionBtn timeoutUser" type="button">Timeout</button>
          <button class="userActionBtn banUser" type="button">Ban</button>
        </div>
      </div>
    `;
    }).join("");
}

async function loadNexusUsers() {
    try {
        // [UPDATED] Points to the new D1-backed endpoint
        const res = await fetch(`${BASE}/mods/users`, { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            // The backend now returns { users: [ ... ] }
            nexusUsersAll = data.users || [];
            applyUsersFilter();
        }
    } catch (e) {
        console.error("Failed to load users:", e);
    }
}

async function loadModsRoles() {
    try {
        const res = await fetch(`${BASE}/mods/roles/list`, { credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            currentModsList = data.mods || [];
            renderNexusUsers();
        }
    } catch (e) { }
}

async function toggleModRole(uuid) {
    const isMod = currentModsList.includes(uuid);
    const endpoint = isMod ? "/mods/roles/remove" : "/mods/roles/add";

    if (!confirm(isMod ? "Remove mod role?" : "Grant mod role?")) return;

    await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uuid })
    });

    await loadModsRoles(); 
}

// ============ POINTS MODAL LOGIC ============
function openPointsModal(user, mode) {
  pointsModalUser = user;
  pointsModalMode = mode || "add";

  pointsModalTitle.textContent = pointsModalMode === "add" ? "Add Points" : pointsModalMode === "remove" ? "Remove Points" : "Set Points";
  pointsModalUserLine.textContent = `${user.displayName || user.username || "Unknown"} (UUID: ${user.uuid || "unknown"})`;

  const btns = pointsModeButtons.querySelectorAll("button");
  btns.forEach(b => {
    b.classList.toggle("active", b.dataset.mode === pointsModalMode);
  });

  if (pointsModalMode === "set") {
    pointsAmountInput.value = user.points ?? 0;
  } else {
    pointsAmountInput.value = "100";
  }

  pointsModal.classList.add("open");
  pointsAmountInput.focus();
}

if (pointsModeButtons) {
  pointsModeButtons.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    const mode = btn.dataset.mode;
    if (!mode) return;
    pointsModalMode = mode;
    const btns = pointsModeButtons.querySelectorAll("button");
    btns.forEach(b => b.classList.toggle("active", b === btn));
    pointsModalTitle.textContent = mode === "add" ? "Add Points" : mode === "remove" ? "Remove Points" : "Set Points";
    if (pointsModalUser) {
      if (mode === "set") {
        pointsAmountInput.value = pointsModalUser.points ?? 0;
      } else if (!pointsAmountInput.value || Number(pointsAmountInput.value) <= 0) {
        pointsAmountInput.value = "100";
      }
    }
  });
}

if (pointsConfirmBtn) {
  pointsConfirmBtn.addEventListener("click", async () => {
    if (!pointsModalUser) return;
    const raw = String(pointsAmountInput.value || "").trim();
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) { alert("Amount must be a positive number."); return; }
    const mode = pointsModalMode || "add";
    try {
      const res = await fetch(`${BASE}/mods/points`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pointsModalUser.uuid, displayName: pointsModalUser.displayName, mode, amount: value })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) { alert(data.error || "Failed to update points."); return; }
      if (data.user && data.user.uuid) {
        const updated = data.user;
        const target = nexusUsersAll.find(u => u.uuid === updated.uuid);
        if (target) { target.points = updated.points ?? target.points; }
      } else { await loadNexusUsers(); }
      applyUsersFilter();
      pointsModal.classList.remove("open");
      pointsModalUser = null;
    } catch (err) {
      console.error("Failed to update points", err);
      alert("Error talking to /mods/points.");
    }
  });
}

if (pointsCancelBtn) {
  pointsCancelBtn.addEventListener("click", () => {
    pointsModal.classList.remove("open");
    pointsModalUser = null;
  });
}

if (pointsModal) {
  pointsModal.addEventListener("click", (ev) => {
    if (ev.target === pointsModal) {
      pointsModal.classList.remove("open");
      pointsModalUser = null;
    }
  });
}

if (panelUsers) {
    panelUsers.addEventListener("click", (e) => {
        const btn = e.target.closest(".userActionBtn");
        if (btn) {
            e.stopPropagation();
            const row = btn.closest(".userRow");
            if (!row) return;
            const uuid = row.dataset.uuid;
            const user = nexusUsersAll.find(u => u.uuid === uuid);
            if (!user) return;

            if (btn.classList.contains("points")) {
                openPointsModal(user, "add");
            } else if (btn.classList.contains("timeoutUser")) {
                 selectedUser = { userId: user.uuid, displayName: user.displayName, platform: "nexus" };
                 performBanOrTimeout("timeout");
            } else if (btn.classList.contains("banUser")) {
                 selectedUser = { userId: user.uuid, displayName: user.displayName, platform: "nexus" };
                 performBanOrTimeout("ban");
            } else if (btn.classList.contains("modToggle")) {
                 toggleModRole(uuid);
            }
            return;
        }

        const row = e.target.closest(".userRow");
        if (row) {
            const uuid = row.dataset.uuid;
            const user = nexusUsersAll.find(u => u.uuid === uuid);
            if (user) {
                selectedUser = { userId: user.uuid, displayName: user.displayName, platform: "nexus" };
                updateHistorySelectionUI();
            }
        }
    });
}

if (usersSearchInput) usersSearchInput.addEventListener("input", applyUsersFilter);

// ===================== BAN / TIMEOUT ACTIONS ======================
function performBanOrTimeout(kind) { openModActionModal(kind); }

if (btnTimeoutUser) btnTimeoutUser.addEventListener("click", () => performBanOrTimeout("timeout"));
if (btnBanUser) btnBanUser.addEventListener("click", () => performBanOrTimeout("ban"));

modActionCancelBtn.addEventListener("click", () => { modActionModal.classList.remove("open"); });
modActionModal.addEventListener("click", (ev) => { if (ev.target === modActionModal) modActionModal.classList.remove("open"); });

modActionConfirmBtn.addEventListener("click", async () => {
    if (!selectedUser) return;
    const kind = modActionKind;
    const reason = modActionReason.value.trim();
    if (kind === "ban" && !reason) { alert("A reason is required for bans."); return; }
    let durationMinutes = 0;
    if (kind === "timeout") {
        if (modActionSelectedSeconds) durationMinutes = Math.round(modActionSelectedSeconds / 60);
        else {
            const raw = modActionCustomMinutes.value.trim();
            const n = Number(raw);
            if (!n || n <= 0) { alert("Please enter a valid timeout duration in minutes."); return; }
            durationMinutes = Math.round(n);
        }
    }
    try {
        const res = await fetch(`${BASE}/mods/ban`, {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedUser.userId, displayName: selectedUser.displayName, platform: selectedUser.platform || "nexus", reason, durationMinutes })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) { alert(data.error || "Failed to apply moderation action."); return; }
        modActionModal.classList.remove("open");
        await loadBans();
    } catch (err) {
        console.error("Error submitting moderation action:", err);
        alert("Error talking to /mods/ban.");
    }
});

modActionDurationButtons.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    modActionDurationButtons.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (btn.dataset.custom) {
        modActionCustomMinutes.style.display = "block";
        modActionCustomMinutes.focus();
        modActionSelectedSeconds = null;
    } else {
        modActionCustomMinutes.style.display = "none";
        modActionSelectedSeconds = Number(btn.dataset.seconds);
    }
});

function openModActionModal(kind) {
    if (!selectedUser) { alert("Select a user first."); return; }
    modActionKind = kind;
    modActionModalTitle.textContent = kind === "timeout" ? "Timeout User" : "Ban User";
    modActionUserLine.textContent = `${selectedUser.displayName} (UUID: ${selectedUser.userId})`;
    modActionReason.value = "";
    modActionCustomMinutes.value = "";
    modActionCustomMinutes.style.display = "none";
    const buttons = modActionDurationButtons.querySelectorAll("button");
    buttons.forEach(b => b.classList.remove("active"));
    if (kind === "timeout") {
        modActionDurationRow.style.display = "block";
        modActionSelectedSeconds = 900;
        const btn15 = modActionDurationButtons.querySelector("button[data-seconds='900']");
        if (btn15) btn15.classList.add("active");
    } else {
        modActionDurationRow.style.display = "none";
        modActionSelectedSeconds = null;
    }
    modActionModal.classList.add("open");
}

// ===================== TABS ======================
const modTabButtons = document.querySelectorAll(".modTab");
const modPanelsMap = { panelBans, panelTimeouts, panelWarnings: panelWarn, panelUnban: panelUnban };

function setActiveModTab(targetId) {
    modTabButtons.forEach(btn => { btn.classList.toggle("active", btn.dataset.modTab === targetId); });
    Object.entries(modPanelsMap).forEach(([id, el]) => {
        if (!el) return;
        if (id === targetId) el.classList.add("activeModPanel");
        else el.classList.remove("activeModPanel");
    });
}

modTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const targetId = btn.dataset.modTab;
        setActiveModTab(targetId);
    });
});

setActiveModTab("panelBans");

// ===================== INIT ======================
async function initModPage() {
    let session;
    try {
        const res = await fetch(`${BASE}/auth/session`, { credentials: "include" });
        if (!res.ok) throw new Error("No session");
        session = await res.json();
    } catch { return; }

    if (!session.loggedIn || !session.user) return;

    const user = session.user;
    const roles = session.roles || [];
    const isOwner = user.isOwner === true || roles.includes("owner");
    const isMod = roles.includes("mod");

    if (!isOwner && !isMod) {
        loginScreen.innerHTML = `<h1>Access Denied</h1><p>You must be a moderator to access this page.</p>`;
        return;
    }

    isOwnerSession = isOwner;

    loginScreen.style.display = "none";
    modContainer.style.display = "flex";

    const displayName = deriveDisplayNameFromUser(user);
    const roleLabel = isOwner ? "Owner" : "Moderator";
    modUserInfo.innerHTML = `Logged in as <strong>${escapeHtml(displayName)}</strong><span class="role">${escapeHtml(roleLabel)}</span>`;

    connectLiveChat();
    loadBans();
    loadNexusUsers();
    loadModsRoles(); 

    setInterval(() => {
        loadBans();
        loadNexusUsers();
        loadModsRoles();
    }, 10000);
}

initModPage();