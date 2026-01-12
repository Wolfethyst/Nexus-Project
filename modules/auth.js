// src/modules/auth.js
import { API, OWNER_UUID, State, apiGet, apiPost, escapeHtml, getDisplayName } from './config.js';
import { updateChatControls } from './chat.js';

// ================= THEME & SETTINGS ENGINE =================
(function loadSettings() {
    const savedTheme = localStorage.getItem("nexus_theme") || "default";
    if (savedTheme !== "default") {
        document.documentElement.setAttribute("data-theme", savedTheme);
    }
    const showDecos = localStorage.getItem("nexus_show_decos");
    const shouldHide = showDecos === "false"; 
    if (shouldHide) {
        document.body.classList.add("hide-decorations");
    }
    window.addEventListener('DOMContentLoaded', () => {
        const toggle = document.getElementById("decoToggle");
        if (toggle) toggle.checked = !shouldHide;
        const btn = document.getElementById("openSettingsBtn");
        const modal = document.getElementById("settingsModal");
        if(btn && modal) {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                modal.classList.add("open");
                const menu = document.getElementById("userMenu");
                if(menu) menu.style.display = "none";
            });
        }
    });
})();

export function setTheme(themeName) {
    if (themeName === "default") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("nexus_theme", themeName);
}

export function toggleDecorations(show) {
    if (show) {
        document.body.classList.remove("hide-decorations");
        localStorage.setItem("nexus_show_decos", "true");
    } else {
        document.body.classList.add("hide-decorations");
        localStorage.setItem("nexus_show_decos", "false");
    }
}

// ================= AUTH LOGIC =================

export async function loadAuth() {
  let session = null;
  try { const { data } = await apiGet("/auth/session"); session = data; } catch (err) { renderLoggedOutUI(); return; }

  if (!session || !session.loggedIn) { renderLoggedOutUI(); return; }

  const u = session.user;
  State.user = u;
  State.isOwner = (String(u.id) === String(OWNER_UUID));
  State.nexusRoles = session.roles || [];
  State.isModOrOwner = State.nexusRoles.includes("owner") || State.nexusRoles.includes("mod");
  State.inventory = u.inventory || [];

  if (State.isModOrOwner) {
      document.body.classList.add("is-mod");
      const modSection = document.querySelector(".mod-tools-section");
      if(modSection) modSection.classList.remove("hidden");
  }
  if (State.isOwner) document.body.classList.add("is-owner");
  else document.body.classList.remove("is-owner");

  // Handle Bans
  if (session.banStatus && session.banStatus.isBanned) {
      const { expiresAt, reason, banKind } = session.banStatus;
      const { startTimeoutCountdown, showAutomodModal, lockChatInput } = await import('./chat.js');
      
      if (!expiresAt) {
          lockChatInput(true, "You are permanently banned."); 
          showAutomodModal("automod_ban", reason);
      } else {
          const now = Date.now();
          const remainingMs = expiresAt - now;
          if (remainingMs > 0) {
              startTimeoutCountdown(expiresAt, reason, banKind || "manual_timeout");
          } else {
              updateChatControls(true);
          }
      }
  } else {
      updateChatControls(true);
  }

  const headerCrystalDisplay = document.getElementById("headerCrystalDisplay"); 
  if(headerCrystalDisplay) headerCrystalDisplay.classList.remove("hidden");
  
  loadNexusProfileForCurrentUser(session);
  
  const loginArea = document.getElementById("loginArea");
  if (loginArea) loginArea.innerHTML = `<div id="welcomeText">${escapeHtml(getDisplayName(u))}</div>`;
  
  const avatarBox = document.getElementById("avatarContainer");
  const avatarSrc = u.avatar || "https://data.wolfethyst.tv/assets/nexus_icon";
  const decoClass = u.decoration ? ` ${escapeHtml(u.decoration)}` : ""; 
  if (avatarBox) avatarBox.innerHTML = `<img id="userAvatar" class="avatar${decoClass}" src="${avatarSrc}" />`;

  const userMenuPlatforms = document.getElementById("userMenuPlatforms");
  if (userMenuPlatforms) {
    const twitch = session.twitch; const youtube = session.youtube;
    userMenuPlatforms.innerHTML = `
      <div class="platformRow"><div class="platformLeft"><img class="platformIcon" src="https://data.wolfethyst.tv/assets/twitch_icon"><span>Twitch</span></div><button class="platformBtn" onclick="location.href='${API}/auth/twitch/${twitch ? "logout" : "login"}'">${twitch ? "Disconnect" : "Connect"}</button></div>
      <div class="platformRow"><div class="platformLeft"><img class="platformIcon" src="https://data.wolfethyst.tv/assets/youtube_icon"><span>YouTube</span></div><button class="platformBtn" onclick="location.href='${API}/auth/youtube/${youtube ? "logout" : "login"}'">${youtube ? "Disconnect" : "Connect"}</button></div>`;
  }
  const userMenuButtons = document.getElementById("userMenuButtons"); if (userMenuButtons) userMenuButtons.innerHTML = `<div class="logout" onclick="location.href='${API}/auth/logout'">Logout</div>`;
}

function renderLoggedOutUI() {
  State.user = null; State.isOwner = false; State.nexusRoles = []; State.isModOrOwner = false;
  document.body.classList.remove("is-owner", "is-mod");
  
  const profileSection = document.getElementById("nexusProfileSection");
  if (profileSection) profileSection.innerHTML = "";
  
  State.nexusProfiles = {};
  updateChatControls(false);
  
  // FIXED: Safety check to prevent crash if element is missing
  const crysDisplay = document.getElementById("headerCrystalDisplay");
  if (crysDisplay) crysDisplay.classList.add("hidden");
  
  const avatarContainer = document.getElementById("avatarContainer");
  if (avatarContainer) {
      avatarContainer.innerHTML = `<img id="userAvatar" class="avatar" src="https://data.wolfethyst.tv/assets/nexus_icon" style="opacity:0.5; filter:grayscale(1);" />`;
  }
  
  const loginArea = document.getElementById("loginArea");
  if (loginArea) {
    loginArea.innerHTML = `
      <button id="crystalLoginBtn">Sign in to Nexus</button>
      <div id="loginPopup">
        <div style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:6px;">Your <b>Nexus ID</b> is powered by Twitch &amp; YouTube</div>
        <div class="loginOption" onclick="location.href='${API}/auth/twitch/login'"><img src="https://data.wolfethyst.tv/assets/twitch_icon"> Continue with Twitch</div>
        <div class="loginOption" onclick="location.href='${API}/auth/youtube/login'"><img src="https://data.wolfethyst.tv/assets/youtube_icon"> Continue with YouTube</div>
      </div>`;
      const btn = document.getElementById("crystalLoginBtn"); const popup = document.getElementById("loginPopup");
      if(btn && popup) {
          btn.addEventListener("click", (e) => { e.stopPropagation(); popup.classList.toggle("open"); });
          document.addEventListener("click", (e) => { if(!popup.contains(e.target) && e.target !== btn) popup.classList.remove("open"); });
      }
  }
}

// --- PROFILE UI ---
const avatarContainer = document.getElementById("avatarContainer");
const userMenu = document.getElementById("userMenu");
if (avatarContainer) {
  avatarContainer.addEventListener("click", (e) => { e.stopPropagation(); if (!userMenu) return; const isVisible = userMenu.style.display === "block"; userMenu.style.display = isVisible ? "none" : "block"; });
}
document.addEventListener("click", (e) => { if (userMenu && userMenu.style.display === "block") { if (!userMenu.contains(e.target) && !avatarContainer.contains(e.target)) { userMenu.style.display = "none"; } } });

async function loadNexusProfileForCurrentUser(session) {
  if (!State.user) return;
  const nexusId = State.user.id;
  const baseProfile = { displayName: getDisplayName(State.user), color: "#fdf1ff", pronouns: "", avatar: session?.user?.avatar || session?.twitch?.avatar || session?.youtube?.avatar || "https://data.wolfethyst.tv/assets/nexus_icon" };
  let profile = { ...baseProfile };
  try {
    const { res, data } = await apiGet("/nexus/profile");
    if (res.ok && data) { const p = data.profile || data; profile = { ...profile, displayName: p.displayName || profile.displayName, color: p.nameColor || p.color || profile.color, pronouns: p.pronouns || profile.pronouns, avatar: p.avatar || profile.avatar }; }
  } catch (err) { }
  State.nexusProfiles[nexusId] = profile;
  renderNexusProfileEditor(profile);
}

function renderNexusProfileEditor(profile) {
  const container = document.getElementById("nexusProfileSection"); if (!container) return;
  const displayName = profile.displayName || ""; const color = profile.color || "#fdf1ff"; const pronouns = profile.pronouns || "";
  container.innerHTML = `
    <h3>Nexus Profile</h3>
    <label class="nexusProfileField"><span class="nexusProfileLabel">Nexus ID</span><input id="nexusProfileIdInput" type="text" value="${escapeHtml(displayName)}" class="nexusProfileInput" /></label>
    <label class="nexusProfileField"><span class="nexusProfileLabel">Name Color</span><div class="nexusColorFieldInner"><div class="nexusColorSwatch" id="nexusProfileColorSwatch" style="background:${color};"></div><div class="nexusColorCode" id="nexusProfileColorCode">${escapeHtml(color)}</div><input id="nexusProfileColorInput" type="color" value="${color}" /></div></label>
    <label class="nexusProfileField"><span class="nexusProfileLabel">Pronouns</span><input id="nexusProfilePronounsInput" type="text" value="${escapeHtml(pronouns)}" placeholder="they/them" class="nexusProfileInput" /></label>
    <button id="nexusProfileSaveBtn" class="panelSmallBtn">Save Nexus Profile</button>
    <div id="nexusProfileStatus" style="height:20px; margin-top:8px; text-align:center; font-size:12px; color:var(--accent); font-style:italic; transition:opacity 0.3s; opacity:0;"></div>
  `;
  const saveBtn = document.getElementById("nexusProfileSaveBtn"); const colorInput = document.getElementById("nexusProfileColorInput"); const colorCode = document.getElementById("nexusProfileColorCode"); const colorSwatch = document.getElementById("nexusProfileColorSwatch");
  if (colorInput) { colorInput.addEventListener("input", () => { const v = colorInput.value; if (colorCode) colorCode.textContent = v; if (colorSwatch) colorSwatch.style.background = v; }); }
  if (saveBtn) { saveBtn.addEventListener("click", saveNexusProfile); }
}

async function saveNexusProfile() {
  if (!State.user) return;
  const nexusId = State.user.id;
  const nameInput = document.getElementById("nexusProfileIdInput"); const colorInput = document.getElementById("nexusProfileColorInput"); const pronounsInput = document.getElementById("nexusProfilePronounsInput");
  if (!nameInput || !colorInput || !pronounsInput) return;
  const displayName = nameInput.value.trim() || getDisplayName(State.user); const color = colorInput.value; const pronouns = pronounsInput.value.trim();
  try {
    const { res, data } = await apiPost("/nexus/profile", { displayName, nameColor: color, pronouns });
    if (!res.ok) { alert(data?.error || "Unable to save profile."); return; }
    const existing = State.nexusProfiles[nexusId] || {}; State.nexusProfiles[nexusId] = { ...existing, displayName, color, pronouns };
    const loginArea = document.getElementById("loginArea"); if (loginArea) loginArea.innerHTML = `<div id="welcomeText">Welcome, ${escapeHtml(displayName)}</div>`;
    const statusEl = document.getElementById("nexusProfileStatus"); if(statusEl) { statusEl.textContent = "Profile Saved!"; statusEl.style.opacity = "1"; setTimeout(() => { statusEl.style.opacity = "0"; }, 2000); }
  } catch (err) { }
}