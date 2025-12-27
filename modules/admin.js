// src/modules/admin.js
import { apiPost, State } from './config.js';
import { replyToUser } from './chat.js';
import { loadVideoData, openGameDetails } from './video.js';

let selectedChatUser = null;
let selectedMessageId = null;
let selectedTimeoutDuration = 5;

// --- CHAT CONTEXT MENU ---
const contextMenu = document.getElementById("chatContextMenu"); 
const ctxHeader = document.getElementById("ctxHeader"); 
const ctxModBtn = document.getElementById("ctxModBtn");

// Close menu when clicking elsewhere
document.addEventListener("click", (e) => { 
    if (contextMenu && contextMenu.style.display === "block") { 
        contextMenu.style.display = "none"; 
    } 
});

export function openContextMenu(e, userId, userName, messageId) {
  if (!State.isModOrOwner) return; 
  selectedChatUser = { id: userId, name: userName }; 
  selectedMessageId = messageId; 
  
  if (ctxHeader) ctxHeader.textContent = userName; 
  if (ctxModBtn) {
      ctxModBtn.style.display = State.isOwner ? "block" : "none";
  }
  
  let x = e.pageX; 
  let y = e.pageY; 
  if (x + 150 > window.innerWidth) x -= 150; 
  if (y + 200 > window.innerHeight) y -= 200;
  
  contextMenu.style.left = `${x}px`; 
  contextMenu.style.top = `${y}px`; 
  contextMenu.style.display = "block";
}

// [FIXED] Event Delegation: Listen on document so we don't miss the element
document.addEventListener("contextmenu", (e) => {
    const msgEl = e.target.closest(".chatMsg");
    if (msgEl && State.isModOrOwner) {
        e.preventDefault();
        const userId = msgEl.getAttribute("data-userid");
        const messageId = msgEl.getAttribute("data-msgid");
        const userName = msgEl.querySelector(".chatUsername")?.textContent || "User";
        
        if (userId && messageId) {
            openContextMenu(e, userId, userName, messageId);
        }
    }
});

// --- CLEAR CHAT BUTTON ---
const clearChatBtn = document.getElementById("clearChatBtn");
if (clearChatBtn) {
    clearChatBtn.addEventListener("click", () => {
        const confirmModal = document.getElementById("clearChatConfirmModal");
        if (confirmModal) {
            confirmModal.classList.add("open");
        } else if (confirm("Clear the entire chat history?")) {
            executeClearChat();
        }
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
        if (res.ok) {
            // Success is handled by websocket broadcast, but we can alert just in case
            console.log("Chat cleared command sent.");
        } else {
            alert("Failed to clear chat. Check console/logs.");
        }
    } catch(e) {
        console.error(e);
        alert("Error clearing chat.");
    }
}

// --- CONTEXT MENU ACTIONS ---
const ctxTimeoutBtn = document.getElementById("ctxTimeoutBtn"); 
const ctxBanBtn = document.getElementById("ctxBanBtn"); 
const ctxCopyIdBtn = document.getElementById("ctxCopyIdBtn"); 
const ctxDeleteBtn = document.getElementById("ctxDeleteBtn");
const ctxReplyBtn = document.getElementById("ctxReplyBtn");

if (ctxDeleteBtn) ctxDeleteBtn.addEventListener("click", async () => { 
    if (!selectedMessageId) return; 
    if (!confirm("Delete this message?")) return; 
    try { 
        const { res } = await apiPost("/nexus/chat/delete", { id: selectedMessageId }); 
        if (!res.ok) alert("Failed to delete message."); 
        if (contextMenu) contextMenu.style.display = "none"; 
    } catch(e) { alert("Error deleting message."); } 
});

if (ctxTimeoutBtn) ctxTimeoutBtn.addEventListener("click", () => { 
    document.getElementById("timeoutUserLabel").innerText = selectedChatUser.name; 
    document.getElementById("timeoutCustomMins").value = ""; 
    document.getElementById("timeoutReasonInput").value = ""; 
    document.querySelectorAll(".durationBtn").forEach(b => b.classList.remove("selected")); 
    const defaultBtn = document.querySelector('.durationBtn[data-mins="5"]');
    if(defaultBtn) defaultBtn.classList.add("selected"); 
    selectedTimeoutDuration = 5; 
    document.getElementById("timeoutModal").classList.add("open"); 
    if (contextMenu) contextMenu.style.display = "none"; 
});

if (ctxBanBtn) ctxBanBtn.addEventListener("click", () => { 
    document.getElementById("banUserLabel").innerText = selectedChatUser.name; 
    document.getElementById("banReasonInput").value = ""; 
    document.getElementById("banModal").classList.add("open"); 
    if (contextMenu) contextMenu.style.display = "none"; 
});

if (ctxModBtn) ctxModBtn.addEventListener("click", () => { 
    document.getElementById("modUserLabel").innerText = selectedChatUser.name; 
    document.getElementById("modConfirmModal").classList.add("open"); 
    if (contextMenu) contextMenu.style.display = "none"; 
});

if (ctxCopyIdBtn) ctxCopyIdBtn.addEventListener("click", () => { 
    navigator.clipboard.writeText(selectedChatUser.id); 
    alert("User ID copied!"); 
    if (contextMenu) contextMenu.style.display = "none"; 
});

if (ctxReplyBtn) { 
    ctxReplyBtn.addEventListener("click", () => { 
        if (selectedChatUser) replyToUser(selectedChatUser.name); 
        if (contextMenu) contextMenu.style.display = "none"; 
    }); 
}

const durationBtns = document.querySelectorAll(".durationBtn"); 
const customMinsInput = document.getElementById("timeoutCustomMins");

durationBtns.forEach(btn => { 
    btn.addEventListener("click", () => { 
        durationBtns.forEach(b => b.classList.remove("selected")); 
        btn.classList.add("selected"); 
        if(customMinsInput) customMinsInput.value = ""; 
        selectedTimeoutDuration = parseInt(btn.dataset.mins); 
    }); 
});

if (customMinsInput) { 
    customMinsInput.addEventListener("input", (e) => { 
        if(e.target.value) { 
            durationBtns.forEach(b => b.classList.remove("selected")); 
            selectedTimeoutDuration = parseInt(e.target.value); 
        } 
    }); 
}

const confirmTimeoutBtn = document.getElementById("confirmTimeoutBtn");
if (confirmTimeoutBtn) {
    confirmTimeoutBtn.addEventListener("click", async (e) => {
        if(!selectedChatUser) return; const btn = e.target; 
        const reason = document.getElementById("timeoutReasonInput").value.trim() || "Timed out by moderator";
        if (customMinsInput && customMinsInput.value) { selectedTimeoutDuration = parseInt(customMinsInput.value); }
        if (!selectedTimeoutDuration || isNaN(selectedTimeoutDuration)) selectedTimeoutDuration = 5;
        btn.innerText = "Processing...";
        try { const { res } = await apiPost("/mods/ban", { userId: selectedChatUser.id, displayName: selectedChatUser.name, reason, durationMinutes: selectedTimeoutDuration, platform: "nexus" }); if (res.ok) { btn.innerText = "Timeout"; document.getElementById("timeoutModal").classList.remove("open"); } else { alert("Failed to timeout user."); btn.innerText = "Timeout"; } } catch(e) { alert("Error: " + e.message); btn.innerText = "Timeout"; }
    });
}

const confirmBanBtn = document.getElementById("confirmBanBtn");
if (confirmBanBtn) {
    confirmBanBtn.addEventListener("click", async (e) => {
        if(!selectedChatUser) return; const btn = e.target; const reason = document.getElementById("banReasonInput").value.trim(); if (!reason) { alert("Ban reason is required."); return; } if(!confirm(`Are you sure you want to PERMANENTLY BAN ${selectedChatUser.name}?`)) return; btn.innerText = "Processing..."; try { const { res } = await apiPost("/mods/ban", { userId: selectedChatUser.id, displayName: selectedChatUser.name, reason, durationMinutes: 0, platform: "nexus" }); if (res.ok) { btn.innerText = "Ban Permanently"; document.getElementById("banModal").classList.remove("open"); } else { alert("Failed to ban user."); btn.innerText = "Ban Permanently"; } } catch(e) { alert("Error."); btn.innerText = "Ban Permanently"; }
    });
}

const confirmModBtn = document.getElementById("confirmModBtn");
if (confirmModBtn) {
    confirmModBtn.addEventListener("click", async () => {
        if(!selectedChatUser) return; try { const { res } = await apiPost("/mods/roles/add", { userId: selectedChatUser.id }); if (res.ok) { alert(`${selectedChatUser.name} is now a moderator.`); document.getElementById("modConfirmModal").classList.remove("open"); } else { alert("Failed to promote user."); } } catch(e) { alert("Error."); }
    });
}

// --- VOD EDIT ---
export function openVodEditModal(e, vodId) {
    e.stopPropagation(); 
    document.getElementById('editVodId').value = vodId;
    document.getElementById('vodEditModal').classList.add('open');
}

const saveVodBtn = document.getElementById('saveVodBtn');
if (saveVodBtn) {
    saveVodBtn.onclick = async () => {
        const btn = saveVodBtn; btn.innerText = "Saving...";
        const id = document.getElementById('editVodId').value;
        const title = document.getElementById('editVodTitle').value;
        const game = document.getElementById('editVodGame').value;
        const youtubeId = document.getElementById('editVodYoutubeId').value;
        const isExclusive = document.getElementById('editVodExclusive').checked;

        try {
            const { res } = await apiPost('/streams/update', { id, title, game, youtubeId, isExclusive });
            if(res.ok) {
                const currentView = document.getElementById('hub-details-view');
                if(!currentView.classList.contains('hidden')) {
                    const activeGameTitle = document.getElementById('heroTitle').innerText;
                    if (activeGameTitle) openGameDetails(activeGameTitle); 
                } else {
                    loadVideoData(); 
                }
                document.getElementById('vodEditModal').classList.remove('open');
            } else { alert("Failed to save."); }
        } catch(e) { alert("Error saving."); }
        btn.innerText = "Save Changes";
    };
}