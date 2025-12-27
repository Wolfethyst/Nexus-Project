// src/modules/admin.js
import { apiPost, State } from './config.js';
import { replyToUser } from './chat.js';
import { loadVideoData, openGameDetails } from './video.js';

let selectedChatUser = null;
let selectedMessageId = null;
let selectedTimeoutDuration = 5;

// --- 1. FORCE-INJECT MENU STYLES ---
const menuStyles = document.createElement('style');
menuStyles.innerHTML = `
  #chatContextMenu {
    display: none;
    position: fixed;
    z-index: 10000;
    background: rgba(15, 5, 25, 0.98);
    border: 1px solid var(--accent, #d57bff);
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.8);
    backdrop-filter: blur(10px);
    width: 160px;
    padding: 5px 0;
    font-family: system-ui, sans-serif;
  }
  .ctx-header {
    padding: 8px 12px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    margin-bottom: 4px;
    pointer-events: none;
  }
  .ctx-item {
    display: none; /* Hidden by default */
    padding: 8px 12px;
    font-size: 13px;
    color: #eee;
    cursor: pointer;
    transition: background 0.2s;
  }
  .ctx-item.visible { display: block; }
  .ctx-item:hover {
    background: var(--accent, #d57bff);
    color: #000;
  }
`;
document.head.appendChild(menuStyles);

// --- 2. CHAT CONTEXT MENU LOGIC ---
const contextMenu = document.getElementById("chatContextMenu"); 
const ctxHeader = document.getElementById("ctxHeader"); 

// Close menu when clicking anywhere else
document.addEventListener("click", (e) => { 
    if (contextMenu && contextMenu.style.display === "block") { 
        contextMenu.style.display = "none"; 
    } 
});

export function openContextMenu(e, userId, userName, messageId) {
  // Allow menu for everyone, but we filter items below
  if (!State.user) return; 

  console.log("Opening Context Menu for:", userName);

  selectedChatUser = { id: userId, name: userName }; 
  selectedMessageId = messageId; 
  
  if (ctxHeader) ctxHeader.textContent = userName; 
  
  // --- PERMISSION LOGIC ---
  const isMe = String(State.user.id) === String(userId);
  const isMod = State.isModOrOwner;
  const isOwner = State.isOwner;

  // Helper to show/hide IDs
  const setVis = (id, visible) => {
      const el = document.getElementById(id);
      if(el) {
          if(visible) el.classList.add("visible");
          else el.classList.remove("visible");
      }
  };

  setVis("ctxReplyBtn", true); // Everyone can reply
  setVis("ctxDeleteBtn", isMe || isMod); // Own message OR Mod
  setVis("ctxTimeoutBtn", isMod);
  setVis("ctxBanBtn", isMod);
  setVis("ctxCopyIdBtn", isMod);
  setVis("ctxModBtn", isOwner); // Only Owner can make Mods

  // Calculate position
  let x = e.clientX; 
  let y = e.clientY; 
  if (x + 170 > window.innerWidth) x -= 170; 
  if (y + 250 > window.innerHeight) y -= 250;
  
  if (contextMenu) {
      contextMenu.style.left = `${x}px`; 
      contextMenu.style.top = `${y}px`; 
      contextMenu.style.display = "block";
  }
}

// Event Delegation
document.addEventListener("contextmenu", (e) => {
    const msgEl = e.target.closest(".chatMsg");
    if (msgEl) {
        e.preventDefault(); 
        const userId = msgEl.getAttribute("data-userid"); 
        const messageId = msgEl.getAttribute("data-msgid"); 
        const userNameEl = msgEl.querySelector(".chatUsername");
        const userName = userNameEl ? userNameEl.textContent.trim() : "User"; 
        
        if (userId) { 
            openContextMenu(e, userId, userName, messageId); 
        }
    }
});

// --- 3. ACTIONS & BUTTONS ---

const ctxDeleteBtn = document.getElementById("ctxDeleteBtn");
if (ctxDeleteBtn) ctxDeleteBtn.addEventListener("click", async () => { 
    if (!selectedMessageId) return; 
    if (!confirm("Delete this message?")) return; 
    try { 
        const { res, data } = await apiPost("/nexus/chat/delete", { id: selectedMessageId }); 
        if (!res.ok) alert(data?.error || "Failed to delete message."); 
    } catch(e) { alert("Error deleting message."); } 
});

const ctxReplyBtn = document.getElementById("ctxReplyBtn");
if (ctxReplyBtn) { 
    ctxReplyBtn.addEventListener("click", () => { 
        if (selectedChatUser) replyToUser(selectedChatUser.name); 
    }); 
}

const ctxTimeoutBtn = document.getElementById("ctxTimeoutBtn"); 
if (ctxTimeoutBtn) ctxTimeoutBtn.addEventListener("click", () => { 
    document.getElementById("timeoutUserLabel").innerText = selectedChatUser.name; 
    document.getElementById("timeoutCustomMins").value = ""; 
    document.getElementById("timeoutReasonInput").value = ""; 
    document.getElementById("timeoutModal").classList.add("open"); 
});

const ctxBanBtn = document.getElementById("ctxBanBtn"); 
if (ctxBanBtn) ctxBanBtn.addEventListener("click", () => { 
    document.getElementById("banUserLabel").innerText = selectedChatUser.name; 
    document.getElementById("banReasonInput").value = ""; 
    document.getElementById("banModal").classList.add("open"); 
});

const ctxModBtn = document.getElementById("ctxModBtn");
if (ctxModBtn) ctxModBtn.addEventListener("click", () => { 
    document.getElementById("modUserLabel").innerText = selectedChatUser.name; 
    document.getElementById("modConfirmModal").classList.add("open"); 
});

const ctxCopyIdBtn = document.getElementById("ctxCopyIdBtn"); 
if (ctxCopyIdBtn) ctxCopyIdBtn.addEventListener("click", () => { 
    navigator.clipboard.writeText(selectedChatUser.id); 
    alert("User ID copied!"); 
});

// --- CLEAR CHAT ---
const clearChatBtn = document.getElementById("clearChatBtn");
if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
        const confirmModal = document.getElementById("clearChatConfirmModal");
        if (confirmModal) confirmModal.classList.add("open");
        else if (confirm("Clear chat history?")) executeClearChat();
    });
}

const confirmClearChatBtn = document.getElementById("confirmClearChatBtn");
if (confirmClearChatBtn) {
    confirmClearChatBtn.addEventListener("click", () => {
        executeClearChat();
        document.getElementById("clearChatConfirmModal").classList.remove("open");
    });
}

async function executeClearChat() {
    try {
        const { res } = await apiPost("/nexus/chat/clear");
        if (res.ok) console.log("Clear command sent.");
        else alert("Failed to clear chat.");
    } catch(e) { alert("Error clearing chat."); }
}

// --- MODAL SUBMITS ---
// (Keeping existing timeout/ban logic unchanged but ensuring IDs match)
const confirmTimeoutBtn = document.getElementById("confirmTimeoutBtn");
if (confirmTimeoutBtn) {
    confirmTimeoutBtn.addEventListener("click", async (e) => {
        if(!selectedChatUser) return; const btn = e.target; 
        const reason = document.getElementById("timeoutReasonInput").value.trim() || "Timed out";
        let duration = 5;
        const customInput = document.getElementById("timeoutCustomMins");
        if (customInput && customInput.value) duration = parseInt(customInput.value);
        else {
             const selectedBtn = document.querySelector(".durationBtn.selected");
             if(selectedBtn) duration = parseInt(selectedBtn.dataset.mins);
        }
        
        btn.innerText = "Processing...";
        try { 
            const { res } = await apiPost("/mods/ban", { userId: selectedChatUser.id, displayName: selectedChatUser.name, reason, durationMinutes: duration }); 
            if (res.ok) document.getElementById("timeoutModal").classList.remove("open"); 
            else alert("Failed."); 
        } catch(e) { alert("Error."); }
        btn.innerText = "Timeout";
    });
}

const confirmBanBtn = document.getElementById("confirmBanBtn");
if (confirmBanBtn) {
    confirmBanBtn.addEventListener("click", async (e) => {
        if(!selectedChatUser) return; const btn = e.target; 
        const reason = document.getElementById("banReasonInput").value.trim(); 
        if (!reason) { alert("Reason required."); return; }
        if(!confirm(`Ban ${selectedChatUser.name}?`)) return;
        
        btn.innerText = "Processing..."; 
        try { 
            const { res } = await apiPost("/mods/ban", { userId: selectedChatUser.id, displayName: selectedChatUser.name, reason, durationMinutes: 0 }); 
            if (res.ok) document.getElementById("banModal").classList.remove("open"); 
            else alert("Failed."); 
        } catch(e) { alert("Error."); }
        btn.innerText = "Ban Permanently";
    });
}

const confirmModBtn = document.getElementById("confirmModBtn");
if (confirmModBtn) {
    confirmModBtn.addEventListener("click", async () => {
        if(!selectedChatUser) return; 
        try { const { res } = await apiPost("/mods/roles/add", { userId: selectedChatUser.id }); 
        if (res.ok) document.getElementById("modConfirmModal").classList.remove("open"); else alert("Failed."); } catch(e) { alert("Error."); }
    });
}

// Duration selectors
document.querySelectorAll(".durationBtn").forEach(btn => { 
    btn.addEventListener("click", () => { 
        document.querySelectorAll(".durationBtn").forEach(b => b.classList.remove("selected")); 
        btn.classList.add("selected"); 
        document.getElementById("timeoutCustomMins").value = ""; 
    }); 
});

// Video Edit exports
export function openVodEditModal(e, vodId) {
    e.stopPropagation(); document.getElementById('editVodId').value = vodId;
    document.getElementById('vodEditModal').classList.add('open');
}
const saveVodBtn = document.getElementById('saveVodBtn');
if (saveVodBtn) {
    saveVodBtn.onclick = async () => {
        const id = document.getElementById('editVodId').value;
        const title = document.getElementById('editVodTitle').value;
        const game = document.getElementById('editVodGame').value;
        const youtubeId = document.getElementById('editVodYoutubeId').value;
        const isExclusive = document.getElementById('editVodExclusive').checked;
        saveVodBtn.innerText = "Saving...";
        try {
            const { res } = await apiPost('/streams/update', { id, title, game, youtubeId, isExclusive });
            if(res.ok) { loadVideoData(); document.getElementById('vodEditModal').classList.remove('open'); }
        } catch(e) {}
        saveVodBtn.innerText = "Save Changes";
    };
}