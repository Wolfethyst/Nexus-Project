// src/modules/chat.js
import { API, State, DECO_DURATIONS, apiPost, escapeHtml, getDisplayName, formatCompact } from './config.js';

let chatWs = null;
let brainrotWords = [];
let timeoutInterval = null;
const dashboardChatInputEl = document.getElementById("dashboardChatInput");
const dashboardChatFormEl = document.getElementById("dashboardChatForm");
const chatPanelEl = document.getElementById("chatPanel");
const timeoutInfoModalEl = document.getElementById("timeoutInfoModal");
const timeoutInfoBodyEl = document.getElementById("timeoutInfoBody");

let isScrolling = false;
export function scrollChatToBottom() { if (chatPanelEl && !isScrolling) { isScrolling = true; requestAnimationFrame(() => { chatPanelEl.scrollTop = chatPanelEl.scrollHeight; isScrolling = false; }); } }

export async function loadBrainrotList() {
    try { const { data } = await fetch(`${API}/admin/brainrot/list`).then(r=>r.json()); if(data?.words) brainrotWords = data.words; } catch(e) {}
}

export function checkBrainrot(text) {
    if(!brainrotWords.length) return false;
    const lower = text.toLowerCase();
    return brainrotWords.some(bad => lower.includes(bad.toLowerCase()));
}

export function hideMessagesForUser(userId, durationMinutes) {
    const msgs = document.querySelectorAll(`.chatMsg[data-userid="${userId}"]`);
    if(!msgs.length) return;
    const durationMs = (durationMinutes || 0) * 60 * 1000; 
    
    msgs.forEach(el => {
        const textEl = el.querySelector(".chatText");
        if(textEl) {
            const currentText = textEl.innerText;
            if (checkBrainrot(currentText)) {
                el.remove();
            } else {
                if(!textEl.hasAttribute("data-original-text")) textEl.setAttribute("data-original-text", currentText);
                textEl.innerHTML = `<span style="opacity:0.6; font-style:italic; color:#ff7777;">User has been timed out.</span>`;
            }
        }
    });
    if (durationMs > 0) setTimeout(() => restoreUserMessages(userId), durationMs);
}

export function restoreUserMessages(userId) {
    document.querySelectorAll(`.chatMsg[data-userid="${userId}"]`).forEach(el => {
        const textEl = el.querySelector(".chatText");
        if(textEl && textEl.hasAttribute("data-original-text")) {
            const original = textEl.getAttribute("data-original-text");
            if(checkBrainrot(original)) el.remove(); else textEl.innerText = original;
        }
    });
}

export function removeMessagesForUser(userId) {
    const msgs = document.querySelectorAll(`.chatMsg[data-userid="${userId}"]`);
    msgs.forEach(el => el.remove());
}

export async function applyActiveTimeouts() {
    try {
        const { data } = await fetch(`${API}/mods/bans`).then(r=>r.json());
        if (!data || !data.bans) return;
        const now = Date.now();
        data.bans.forEach(ban => {
            if (ban.liftedAt) return; 
            if (ban.expiresAt) {
                const remaining = ban.expiresAt - now;
                if (remaining > 0) {
                    const mins = Math.ceil(remaining / 60000);
                    hideMessagesForUser(ban.userId, mins);
                }
            } else {
                removeMessagesForUser(ban.userId);
            }
        });
    } catch(e) { console.error("Failed to sync timeouts", e); }
}

export function updateChatControls(isLoggedIn) {
    if(!dashboardChatInputEl) return;
    if(isLoggedIn) { dashboardChatInputEl.disabled = false; dashboardChatInputEl.placeholder = "Send a message..."; } 
    else { dashboardChatInputEl.disabled = true; dashboardChatInputEl.placeholder = "Sign in to chat"; }
}

export function lockChatInput(isLocked, placeholderText = "") {
    if (!dashboardChatInputEl) return;
    if (isLocked) {
        dashboardChatInputEl.disabled = true;
        dashboardChatInputEl.value = "";
        dashboardChatInputEl.placeholder = placeholderText;
        dashboardChatInputEl.classList.add("locked"); 
    } else {
        dashboardChatInputEl.disabled = false;
        dashboardChatInputEl.placeholder = "Send a message...";
        dashboardChatInputEl.classList.remove("locked");
    }
}

export function startTimeoutCountdown(expiresAt, reason, kind = "manual_timeout") {
    if (!dashboardChatInputEl) return;
    if (timeoutInterval) clearInterval(timeoutInterval);
    const initialDiff = expiresAt - Date.now();
    if (initialDiff <= 0) {
        lockChatInput(false);
        if(timeoutInfoModalEl) timeoutInfoModalEl.classList.remove("open");
        return; 
    }
    const updateTimer = () => {
        const now = Date.now();
        const diff = expiresAt - now;
        if (diff <= 0) {
            clearInterval(timeoutInterval);
            lockChatInput(false);
            if(timeoutInfoModalEl) timeoutInfoModalEl.classList.remove("open");
            return;
        }
        const m = Math.max(0, Math.floor((diff / 1000 / 60) % 60));
        const s = Math.max(0, Math.floor((diff / 1000) % 60));
        if(dashboardChatInputEl) dashboardChatInputEl.placeholder = `Timed out: ${m}m ${s}s remaining`;
    };
    updateTimer();
    lockChatInput(true, dashboardChatInputEl.placeholder); 
    timeoutInterval = setInterval(updateTimer, 1000);
    const remainingMinutes = Math.ceil(initialDiff / 60000);
    showAutomodModal(kind, reason, remainingMinutes);
}

export function showAutomodModal(kind, reason, duration) {
    if (!timeoutInfoModalEl || !timeoutInfoBodyEl) return;
    let html = "";
    if (kind === "lifted") {
        html = `<div class="modal-content-wrapper"><div class="modal-icon success">🔓</div><h2 class="modal-title success">Suspension Lifted</h2><p class="modal-text">Your account privileges have been restored.</p></div>`;
    } else if (kind === "brainrot" || kind === "automod_brainrot") {
        html = `<div class="modal-content-wrapper"><div class="modal-icon danger" style="filter: drop-shadow(0 0 15px #00ff00);">🧟</div><h2 class="modal-title danger" style="color:#72ff72; text-shadow: 0 0 15px rgba(0,255,0,0.5);">QUARANTINE</h2><p class="modal-text">We take contagious disease seriously.</p><p class="modal-text">You have been temporarily quarantined.</p><div class="modal-subtext" style="color:#aaffaa;">Reason: ${escapeHtml(reason)}</div></div>`;
    } else if (kind === "automod_ban") {
        html = `<div class="modal-content-wrapper"><div class="modal-icon danger">🚫</div><h2 class="modal-title danger">BANNED</h2><p class="modal-text">We have zero tolerance for hate speech and bigotry.</p><p class="modal-text">You have been <b>permanently banned</b>.</p></div>`;
    } else {
        html = `<div class="modal-content-wrapper"><div class="modal-icon warning">⏳</div><h2 class="modal-title warning">Timed Out</h2><p class="modal-text">You have been timed out for <b>${duration} minutes</b>.</p><div class="modal-subtext">Reason: ${escapeHtml(reason || "Violation of chat rules")}</div></div>`;
    }
    timeoutInfoBodyEl.innerHTML = html;
    timeoutInfoModalEl.classList.add("open");
}

export function replyToUser(username) {
    if (!dashboardChatInputEl) return;
    const tag = `@${username} `;
    if (!dashboardChatInputEl.value) {
        dashboardChatInputEl.value = tag;
    } else {
        const prefix = dashboardChatInputEl.value.endsWith(" ") ? "" : " ";
        dashboardChatInputEl.value += `${prefix}${tag}`;
    }
    dashboardChatInputEl.focus();
}

export function addSupportEventMessage(data) {
    if (!chatPanelEl) return;
    const el = document.createElement("div");
    el.className = "chatMsg support-event";
    el.innerHTML = `
        <div style="font-size:20px; margin-bottom:4px; text-shadow:0 0 10px gold;">${data.kind === "tip" ? "💎" : "⭐"}</div>
        <div style="font-weight:bold; color:#ffd700; font-family: 'Cinzel', serif; letter-spacing:1px;">
            ${escapeHtml(data.user.display)} ${data.kind === "tip" ? `tipped $${data.amount}!` : `subscribed at Tier: ${data.tier ? data.tier.toUpperCase() : "SUPPORTER"}!`}
        </div>
        ${data.message ? `<div style="font-style:italic; font-size:13px; margin-top:4px; color:#eee;">"${escapeHtml(data.message)}"</div>` : ""}
    `;
    chatPanelEl.appendChild(el);
    scrollChatToBottom();
}

// --- NEW FUNCTION: Handes visual alert and audio playback for redeems ---
export function addRedeemMessage(data) {
    if (!chatPanelEl) return;
    const el = document.createElement("div");
    el.className = "chatMsg redeem-event";
    
    // Custom styling for redeem cards
    el.style.borderLeft = "3px solid #d57bff";
    el.style.background = "rgba(181, 123, 255, 0.1)";

    const soundIcon = (data.redeem.soundKey || data.redeem.soundUrl) ? "🔊" : "🎁";

    el.innerHTML = `
        <div style="font-size:20px; margin-bottom:4px; text-shadow:0 0 10px #d57bff;">${soundIcon}</div>
        <div style="font-weight:bold; color:#e0c2ff; font-family: 'Cinzel', serif; letter-spacing:1px;">
            ${escapeHtml(data.user.display)} redeemed <br>
            <span style="color:#fff; text-transform:uppercase;">${escapeHtml(data.redeem.name)}</span>
        </div>
        ${data.input ? `<div style="font-style:italic; font-size:13px; margin-top:4px; color:#eee; border-left:2px solid rgba(255,255,255,0.3); padding-left:8px;">"${escapeHtml(data.input)}"</div>` : ""}
    `;

    chatPanelEl.appendChild(el);
    scrollChatToBottom();

    // Audio Playback Logic
    if (data.redeem.soundKey) {
        const key = data.redeem.soundKey;
        const audio = new Audio(`${API}/redeems/sound/${encodeURIComponent(key)}`);
        audio.volume = 0.6; // Adjust volume as needed
        audio.play().catch(e => console.warn("Redeem audio blocked (interaction needed?):", e));
    }
}

export function addDashboardChatMessage(msg) {
  if (!chatPanelEl) return;
  const rawUser = msg.user || "User"; const text = msg.text || ""; const source = (msg.platform || msg.source || "nexus").toLowerCase();
  
  const myName = State.user ? getDisplayName(State.user).toLowerCase() : "";
  const isMentioned = myName && text.toLowerCase().includes(`@${myName}`);

  let platformClass = "nexus"; let avatarSrc = "https://data.wolfethyst.tv/assets/nexus_icon"; 
  if (source === "twitch") { platformClass = "twitch"; avatarSrc = "https://data.wolfethyst.tv/assets/twitch_icon"; } else if (source === "youtube") { platformClass = "youtube"; avatarSrc = "https://data.wolfethyst.tv/assets/youtube_icon"; } else { platformClass = "nexus"; if (msg.avatar) avatarSrc = msg.avatar; else avatarSrc = "https://data.wolfethyst.tv/assets/wolfe_crystal"; }
  
  const msgDecoClass = msg.messageDecoration ? ` ${escapeHtml(msg.messageDecoration)}` : ""; 
  
  const el = document.createElement("div"); 
  el.className = `chatMsg ${platformClass}${msgDecoClass}${isMentioned ? " mentioned" : ""}`;
  
  if (isMentioned) {
      el.style.background = "rgba(185, 114, 255, 0.15)";
      el.style.borderLeft = "3px solid var(--accent)";
  }

  const decoClass = msg.decoration ? ` ${escapeHtml(msg.decoration)}` : ""; 
  let animStyle = "";
  
  if (msg.decoration) {
      const duration = DECO_DURATIONS[msg.decoration] || 4000; 
      const offset = (Date.now() % duration) / 1000;
      animStyle = `style="--anim-delay: -${offset}s"`; 
  }

  el.setAttribute("data-msgid", msg.id || ""); if(msg.userId) el.setAttribute("data-userid", msg.userId); const nameStyle = msg.color ? `style="color:${msg.color}"` : "";
  
  let badgeHtml = "";
  if (msg.badge) {
      badgeHtml = `<img class="chatBadge" src="${escapeHtml(msg.badge)}" alt="Badge">`;
  }

  el.innerHTML = `
    <div class="chatAvatarCol">
        <img class="chatAvatarImg${decoClass}" ${animStyle} src="${avatarSrc}">
    </div>
    <div class="chatContentCol">
        <div class="chatHeader">
            ${badgeHtml} <span class="chatUsername" ${nameStyle}>${escapeHtml(rawUser)}</span>
        </div>
        <div class="chatText">${escapeHtml(text)}</div>
    </div>`;
  
  el.querySelector(".chatUsername").onclick = () => replyToUser(rawUser);
  el.querySelector(".chatUsername").style.cursor = "pointer";

  chatPanelEl.appendChild(el); scrollChatToBottom();
}

export function connectDashboardChatWS() {
  chatWs = new WebSocket("wss://data.wolfethyst.tv/nexus/chat/stream");
  chatWs.onmessage = ev => {
    try {
      const data = JSON.parse(ev.data);

      if (data.type === "stream_update") {
          // Assuming these IDs exist in the DOM or handled via Video module
          const titleInput = document.getElementById("streamTitleInput");
          const gameInput = document.getElementById("streamGameInput");
          const titleLabel = document.getElementById("streamTitleLabel"); 
          const gameLabel = document.getElementById("streamGameLabel"); 
          
          if (titleInput && document.activeElement !== titleInput) titleInput.value = data.title;
          if (gameInput && document.activeElement !== gameInput) gameInput.value = data.game;
          
          if (titleLabel) titleLabel.textContent = data.title; 
          if (gameLabel) gameLabel.textContent = data.game ? `Playing: ${data.game}` : "";
          
          // Note: Updating the games list via module reference would be circular.
          // app.js can handle re-fetching played games if needed, or we just rely on page refresh.
          // Alternatively, expose `updatePlayedGamesList` globally.
          if (window.updatePlayedGamesList && data.game) window.updatePlayedGamesList(data.game);
      }

      if (data.type === "stream_live") {
          const tag = document.getElementById("liveStatusTag");
          if(tag) { tag.textContent = "LIVE"; tag.classList.remove("hidden"); tag.classList.add("live"); }
          if (Notification.permission === "granted") {
              new Notification("Wolfethyst is LIVE!", { body: `${data.game ? "[" + data.game + "] " : ""}${data.title || "Join the Nexus!"}`, icon: "https://data.wolfethyst.tv/assets/nexus_icon" });
          }
      }
      
      if (data.type === "timeout" || data.type === "ban" || (data.type === "system" && data.subtype === "automod_trigger")) {
          if (State.user && String(State.user.id) === String(data.userId)) {
             const kind = data.kind || (data.type === "ban" ? "automod_ban" : "manual_timeout");
             const reason = data.reason || "Moderator Action";
             
             if (kind === "automod_ban" || data.type === "ban") {
                 lockChatInput(true, "You are permanently banned."); 
                 showAutomodModal("automod_ban", reason);
             } else {
                 const duration = data.durationMinutes || 5;
                 const expiresAt = Date.now() + (duration * 60000);
                 startTimeoutCountdown(expiresAt, reason, kind);
             }
          }
          if (data.type === "timeout") hideMessagesForUser(data.userId, data.durationMinutes);
          if (data.type === "ban") removeMessagesForUser(data.userId);
      }

      if (data.type === "unban") {
          if (State.user && String(State.user.id) === String(data.userId)) {
              lockChatInput(false);
              if (timeoutInterval) clearInterval(timeoutInterval);
              if(timeoutInfoModalEl) timeoutInfoModalEl.classList.remove("open");
              showAutomodModal("lifted");
          }
      }

      if (data.type === "chat") addDashboardChatMessage(data.message);
      
      // --- REDEEM HANDLER (New) ---
      if (data.type === "redeem") addRedeemMessage(data);
      // ----------------------------

      if (data.type === "user_update") { 
          const msgs = document.querySelectorAll(`.chatMsg[data-userid="${data.userId}"]`); 
          msgs.forEach(el => { 
              if (data.decoration !== undefined) {
                  const img = el.querySelector(".chatAvatarImg"); 
                  if (img) img.className = `chatAvatarImg ${data.decoration || ""}`; 
              }
              if (data.messageDecoration !== undefined) {
                  let platformClass = "nexus";
                  if (el.classList.contains("twitch")) platformClass = "twitch";
                  else if (el.classList.contains("youtube")) platformClass = "youtube";
                  const isMentioned = el.classList.contains("mentioned") ? " mentioned" : "";
                  const newDeco = data.messageDecoration ? ` ${escapeHtml(data.messageDecoration)}` : "";
                  el.className = `chatMsg ${platformClass}${newDeco}${isMentioned}`;
              }
          }); 

          if (State.user && String(State.user.id) === String(data.userId)) {
              if (data.decoration !== undefined) {
                  State.user.decoration = data.decoration;
                  const sidebarAvatar = document.querySelector("#userAvatar");
                  if (sidebarAvatar) sidebarAvatar.className = `avatar ${data.decoration || ""}`;
              }
              if (data.messageDecoration !== undefined) {
                  State.user.activeMessageDecoration = data.messageDecoration;
              }
          }
      }

      if (data.type === "message_deleted") { const el = document.querySelector(`.chatMsg[data-msgid="${data.id}"]`); if (el) el.remove(); }
      if (data.type === "clear") { chatPanelEl.innerHTML = ""; }
      if (data.type === "support_event") { addSupportEventMessage(data); }
      if (data.type === "history") { 
          chatPanelEl.innerHTML = ""; 
          data.messages.forEach(m => addDashboardChatMessage(m));
          applyActiveTimeouts();
      }

    } catch(e) { console.error("WS Message Error", e); }
  };
  
  chatWs.onclose = () => setTimeout(connectDashboardChatWS, 3000);
}

if(dashboardChatFormEl) {
    dashboardChatFormEl.addEventListener("submit", async (e) => {
        e.preventDefault(); const text = dashboardChatInputEl.value.trim(); if(!text || !State.user) return;
        dashboardChatInputEl.value = "";
        const { res, data } = await apiPost("/nexus/chat/send", { text });
        
        if (res.status === 403 && data && data.blocked) {
            if(data.kind === "automod_ban") { lockChatInput(true, "You are permanently banned."); showAutomodModal(data.kind, data.reason); } 
            else { 
                startTimeoutCountdown(Date.now() + 5*60000, data.reason, data.kind); 
            }
        }
    });
}