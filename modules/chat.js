// src/modules/chat.js
import { API, State, DECO_DURATIONS, apiPost, escapeHtml, getDisplayName, formatCompact } from './config.js';

let chatWs = null;
let brainrotWords = [];
let timeoutInterval = null;

// Get elements immediately
const dashboardChatInputEl = document.getElementById("dashboardChatInput");
const dashboardChatFormEl = document.getElementById("dashboardChatForm");
const chatPanelEl = document.getElementById("chatPanel");
const timeoutInfoModalEl = document.getElementById("timeoutInfoModal");
const timeoutInfoBodyEl = document.getElementById("timeoutInfoBody");

let isScrolling = false;
export function scrollChatToBottom() { 
    if (chatPanelEl && !isScrolling) { 
        isScrolling = true; 
        requestAnimationFrame(() => { 
            chatPanelEl.scrollTop = chatPanelEl.scrollHeight; 
            isScrolling = false; 
        }); 
    } 
}

export async function loadBrainrotList() {
    try { const { data } = await fetch(`${API}/admin/brainrot/list`).then(r=>r.json()); if(data?.words) brainrotWords = data.words; } catch(e) {}
}

export function checkBrainrot(text) {
    if(!brainrotWords.length) return false;
    const lower = text.toLowerCase();
    return brainrotWords.some(bad => lower.includes(bad.toLowerCase()));
}

// --- AUDIO ENGINE ---
export function playSound(path) {
    if (!path) return;

    // 1. Force Decode
    let cleanPath = decodeURIComponent(path);

    // 2. Construct URL
    let finalUrl = cleanPath;
    if (!cleanPath.startsWith("http")) {
        const baseUrl = API.endsWith('/') ? API.slice(0, -1) : API;
        finalUrl = `${baseUrl}/redeems/sound/${cleanPath}`;
    }

    // 3. Play
    const audio = new Audio(finalUrl);
    audio.volume = 0.6; 
    
    // Safety catch for autoplay blocks
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("[Nexus] Audio Playback Blocked/Failed:", error);
        });
    }
}

// --- MODERATION HELPERS ---
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
    const input = document.getElementById("dashboardChatInput");
    if(!input) return;
    
    if(isLoggedIn) { 
        input.disabled = false; 
        input.placeholder = "Send a message..."; 
    } else { 
        input.disabled = true; 
        input.placeholder = "Sign in to chat"; 
    }
}

export function lockChatInput(isLocked, placeholderText = "") {
    const input = document.getElementById("dashboardChatInput");
    if (!input) return;
    
    if (isLocked) {
        input.disabled = true;
        input.value = "";
        input.placeholder = placeholderText;
        input.classList.add("locked"); 
    } else {
        input.disabled = false;
        input.placeholder = "Send a message...";
        input.classList.remove("locked");
    }
}

export function startTimeoutCountdown(expiresAt, reason, kind = "manual_timeout") {
    const input = document.getElementById("dashboardChatInput");
    if (!input) return;
    
    if (timeoutInterval) clearInterval(timeoutInterval);
    
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
        if(input) input.placeholder = `Timed out: ${m}m ${s}s remaining`;
    };
    
    updateTimer();
    lockChatInput(true, input.placeholder); 
    timeoutInterval = setInterval(updateTimer, 1000);
    const remainingMinutes = Math.ceil((expiresAt - Date.now()) / 60000);
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
    const input = document.getElementById("dashboardChatInput");
    if (!input) return;
    const tag = `@${username} `;
    if (!input.value) {
        input.value = tag;
    } else {
        const prefix = input.value.endsWith(" ") ? "" : " ";
        input.value += `${prefix}${tag}`;
    }
    input.focus();
}

// --- MESSAGE RENDERERS ---

export function addSupportEventMessage(data) {
    const panel = document.getElementById("chatPanel");
    if (!panel) return;
    const el = document.createElement("div");
    el.className = "chatMsg support-event";
    el.innerHTML = `
        <div style="font-size:20px; margin-bottom:4px; text-shadow:0 0 10px gold;">${data.kind === "tip" ? "💎" : "⭐"}</div>
        <div style="font-weight:bold; color:#ffd700; font-family: 'Cinzel', serif; letter-spacing:1px;">
            ${escapeHtml(data.user.display)} ${data.kind === "tip" ? `tipped $${data.amount}!` : `subscribed at Tier: ${data.tier ? data.tier.toUpperCase() : "SUPPORTER"}!`}
        </div>
        ${data.message ? `<div style="font-style:italic; font-size:13px; margin-top:4px; color:#eee;">"${escapeHtml(data.message)}"</div>` : ""}
    `;
    panel.appendChild(el);
    scrollChatToBottom();
}

export function addRedeemMessage(data) {
    console.log("[Nexus] Redeem Event:", data);

    // 1. Play Audio (If present)
    const soundPath = data.redeem?.sound || data.redeem?.soundUrl || data.soundUrl;
    if (soundPath) {
        playSound(soundPath);
    }

    // 2. Add Visual Message
    const panel = document.getElementById("chatPanel");
    if (!panel) return;
    
    const el = document.createElement("div");
    el.className = "chatMsg redeem-event";
    el.style.borderLeft = "3px solid #d57bff";
    el.style.background = "rgba(181, 123, 255, 0.1)";

    const soundIcon = soundPath ? "🔊" : "🎁";
    const displayName = data.user?.display || "User";
    const redeemName = data.redeem?.name || "Reward";

    el.innerHTML = `
        <div style="font-size:20px; margin-bottom:4px; text-shadow:0 0 10px #d57bff;">${soundIcon}</div>
        <div style="font-weight:bold; color:#e0c2ff; font-family: 'Cinzel', serif; letter-spacing:1px;">
            ${escapeHtml(displayName)} redeemed <br>
            <span style="color:#fff; text-transform:uppercase;">${escapeHtml(redeemName)}</span>
        </div>
        ${data.input ? `<div style="font-style:italic; font-size:13px; margin-top:4px; color:#eee; border-left:2px solid rgba(255,255,255,0.3); padding-left:8px;">"${escapeHtml(data.input)}"</div>` : ""}
    `;

    panel.appendChild(el);
    scrollChatToBottom();
}

export function addSystemMessage(text, type = "info") {
    const panel = document.getElementById("chatPanel");
    if (!panel) return;

    const el = document.createElement("div");
    el.className = "chatMsg system-event";
    
    let color = "#d57bff"; 
    let icon = "ℹ️";
    
    if (type === "loading") { color = "#ffffff"; icon = "⏳"; }
    else if (type === "success") { color = "#10b981"; icon = "🎬"; }
    else if (type === "error") { color = "#ff4444"; icon = "⚠️"; }

    el.style.borderLeft = `3px solid ${color}`;
    el.style.background = `linear-gradient(90deg, ${color}15, transparent)`;
    el.style.padding = "8px 12px";
    el.style.marginBottom = "6px";
    el.style.borderRadius = "0 4px 4px 0";
    el.style.color = "#eee";
    el.style.fontFamily = "'Cinzel', serif";
    el.style.fontSize = "13px";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.gap = "10px";

    el.innerHTML = `
        <div style="font-size:18px;">${icon}</div>
        <div style="line-height:1.4;">${text}</div>
    `;
    
    panel.appendChild(el);
    scrollChatToBottom();
}

export function addDashboardChatMessage(msg) {
  const panel = document.getElementById("chatPanel");
  if (!panel) return;
  
  const rawUser = msg.user || "User"; 
  const source = (msg.platform || msg.source || "nexus").toLowerCase();
  
  let text = msg.text || "";
  if (msg.originPlatform !== "system") {
      text = escapeHtml(text);
  }
  
  const myName = State.user ? getDisplayName(State.user).toLowerCase() : "";
  const isMentioned = myName && text.toLowerCase().includes(`@${myName}`);

  let platformClass = "nexus"; let avatarSrc = "https://data.wolfethyst.tv/assets/nexus_icon.png"; 
  if (source === "twitch") { platformClass = "twitch"; avatarSrc = "https://data.wolfethyst.tv/assets/twitch_icon"; } 
  else if (source === "youtube") { platformClass = "youtube"; avatarSrc = "https://data.wolfethyst.tv/assets/youtube_icon"; } 
  else { 
      platformClass = "nexus"; 
      if (msg.avatar) avatarSrc = msg.avatar; 
      else avatarSrc = "https://data.wolfethyst.tv/assets/wolfe_crystal.png"; 
  }
  
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

  // ATTACH ID FOR DELETION
  el.setAttribute("data-msgid", msg.id || ""); 
  if(msg.userId) el.setAttribute("data-userid", msg.userId); 
  const nameStyle = msg.color ? `style="color:${msg.color}"` : "";
  
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
        <div class="chatText">${text}</div>
    </div>`;
  
  el.querySelector(".chatUsername").onclick = () => replyToUser(rawUser);
  el.querySelector(".chatUsername").style.cursor = "pointer";

  panel.appendChild(el); 
  scrollChatToBottom();
}

export function connectDashboardChatWS() {
  chatWs = new WebSocket("wss://data.wolfethyst.tv/nexus/chat/stream");
  chatWs.onmessage = ev => {
    try {
      const data = JSON.parse(ev.data);

      if (data.type === "stream_update") {
          const titleInput = document.getElementById("streamTitleInput");
          const gameInput = document.getElementById("streamGameInput");
          const titleLabel = document.getElementById("streamTitleLabel"); 
          const gameLabel = document.getElementById("streamGameLabel"); 
          
          if (titleInput && document.activeElement !== titleInput) titleInput.value = data.title;
          if (gameInput && document.activeElement !== gameInput) gameInput.value = data.game;
          
          if (titleLabel) titleLabel.textContent = data.title; 
          if (gameLabel) gameLabel.textContent = data.game ? `Playing: ${data.game}` : "";
          
          if (window.updatePlayedGamesList && data.game) window.updatePlayedGamesList(data.game);
      }

      if (data.type === "stream_live") {
          const tag = document.getElementById("liveStatusTag");
          if(tag) { tag.textContent = "LIVE"; tag.classList.remove("hidden"); tag.classList.add("live"); }
      }
      
      if (data.type === "timeout" || data.type === "ban") {
          if (State.user && String(State.user.id) === String(data.userId)) {
             const kind = data.kind || "manual_timeout";
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

      // --- [FIX] Added missing handlers for Delete and Clear ---
      if (data.type === "message_deleted" || data.type === "delete_message") {
          const target = document.querySelector(`.chatMsg[data-msgid="${data.id}"]`);
          if (target) target.remove();
      }

      if (data.type === "clear") { 
          const panel = document.getElementById("chatPanel");
          if(panel) panel.innerHTML = ""; 
      }

      if (data.type === "chat") addDashboardChatMessage(data.message);
      if (data.type === "redeem") addRedeemMessage(data);
      if (data.type === "support") addSupportEventMessage(data); // In case support events come through
      
      if (data.type === "user_update") { 
          if (State.user && String(State.user.id) === String(data.userId)) {
              if (data.decoration !== undefined) State.user.decoration = data.decoration;
              if (data.messageDecoration !== undefined) State.user.activeMessageDecoration = data.messageDecoration;
          }
      }

      if (data.type === "history") { 
          const panel = document.getElementById("chatPanel");
          if(panel) {
              panel.innerHTML = ""; 
              data.messages.forEach(m => addDashboardChatMessage(m));
              applyActiveTimeouts();
          }
      }

    } catch(e) { console.error("WS Message Error", e); }
  };
  
  chatWs.onclose = () => setTimeout(connectDashboardChatWS, 3000);
}

// --- INITIALIZATION ---
const form = document.getElementById("dashboardChatForm");
if(form) {
    // Replace element to remove any old listeners from index.html or previous loads
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        const input = document.getElementById("dashboardChatInput");
        const text = input.value.trim(); 
        
        if(!text) return;
        if(!State.user) {
            alert("You must be logged in to chat.");
            return;
        }
        
        // [FIX] Removed Optimistic UI (Manually adding message)
        // We now wait for the server to echo it back via WebSocket
        
        input.value = "";
        
        try {
            const { res, data } = await apiPost("/nexus/chat/send", { text });
            if (res.status === 403 && data && data.blocked) {
                if(data.kind === "automod_ban") { 
                    lockChatInput(true, "You are permanently banned."); 
                    showAutomodModal(data.kind, data.reason); 
                } else { 
                    startTimeoutCountdown(Date.now() + 5*60000, data.reason, data.kind); 
                }
            }
        } catch(err) {
            console.error("Chat send failed", err);
        }
    });
}

// --- TTS HANDLER (Direct, not tied to redeems) ---
const ttsForm = document.getElementById("ttsRedeemForm");
if (ttsForm) {
    const newTtsForm = ttsForm.cloneNode(true);
    ttsForm.parentNode.replaceChild(newTtsForm, ttsForm);

    newTtsForm.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const input = document.getElementById("ttsRedeemInput");
        const btn = document.getElementById("ttsRedeemButton");
        const text = input.value.trim();
        if (!text) return;

        if (btn) btn.classList.add("loading");
        try {
            const { res, data } = await apiPost("/nexus/tts/send", { text });
            if (res.ok) {
                input.value = "";
            } else {
                alert(data?.error || "Failed to send TTS.");
            }
        } catch (e) {
            alert("Error sending TTS.");
        } finally {
            if (btn) btn.classList.remove("loading");
        }
    });
}