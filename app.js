// src/app.js
import * as Config from './modules/config.js';
import * as Auth from './modules/auth.js';
import * as Chat from './modules/chat.js';
import * as Store from './modules/store.js';
import * as Video from './modules/video.js';
import * as Admin from './modules/admin.js';

// --- 1. EXPOSE FUNCTIONS TO WINDOW (For HTML onclick) ---
window.setTheme = Auth.setTheme;
window.toggleDecorations = Auth.toggleDecorations;

window.buyItem = Store.buyItem;
window.equipItem = Store.equipItem;
window.toggleTipModal = Store.toggleTipModal;
window.selectTipAmount = Store.selectTipAmount;
window.toggleSubModal = Store.toggleSubModal;
window.renderSubCarousel = Store.renderSubCarousel;
window.handleRedeemClick = Store.handleRedeemClick;
window.toggleStoreSort = Store.toggleStoreSort;
window.switchMarketTab = Store.switchMarketTab;

window.replyToUser = Chat.replyToUser;

window.openGameDetails = Video.openGameDetails;
window.playVideo = Video.playVideo;
window.handleVideoClick = Video.handleVideoClick;
window.openHubHome = Video.openHubHome;
window.switchHubTab = Video.switchHubTab;
window.shareActiveVideo = Video.shareActiveVideo;
window.closeVideoStage = Video.closeVideoStage;
window.handleGameCardClick = Video.handleGameCardClick;
window.toggleMainView = Video.toggleMainView;

window.promptRenameGame = Video.promptRenameGame;
window.promptDeleteGame = Video.promptDeleteGame;
window.promptChangeCover = Video.promptChangeCover;
window.openVodEditModal = Admin.openVodEditModal;

// --- 2. GLOBAL EVENT LISTENERS ---
// General UI handlers that don't fit neatly into one module or handle global modals.
document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("requestModal") && !e.target.id.includes("Panel")) {
        e.target.classList.remove("open");
        return;
    }
    if (e.target.classList.contains("chat-modal-overlay")) {
        Store.toggleSubModal(false);
        Store.toggleTipModal(false);
    }
    const target = e.target;
    if (target.id === "clearChatBtn") { document.getElementById("clearChatConfirmModal").classList.add("open"); return; }
    if (target.id === "confirmClearChatBtn") {
        (async () => {
            const btn = target; btn.innerText = "Clearing...";
            try { const {res} = await Config.apiPost("/nexus/chat/clear", {}); if(res.ok) document.getElementById("clearChatConfirmModal").classList.remove("open"); } catch(e){} 
            btn.innerText = "Yes, Clear It"; 
        })();
        return;
    }
    if (target.id === "clipBtn") {
        (async () => {
             const btn = target; btn.disabled = true; btn.innerText = "Clipping..."; try { const { res, data } = await Config.apiPost("/clips/create", { windowSeconds: 30 }); if(res.ok) alert(`Clip created! ID: ${data.id}`); else alert("Failed: " + (data.error || "Unknown")); } catch(e){} btn.disabled = false; btn.innerText = "Clip"; 
        })();
        return;
    }
    if (target.id === "streamTitleSaveBtn") {
        (async () => {
            const btn = target; 
            const title = document.getElementById("streamTitleInput").value.trim(); 
            const game = document.getElementById("streamGameInput").value.trim();
            if (!title) return;
            btn.innerText = "Saving..."; 
            try { 
                await Config.apiPost("/stream/title", { title, game }); 
                const titleLabel = document.getElementById("streamTitleLabel");
                const gameLabel = document.getElementById("streamGameLabel");
                if (titleLabel) titleLabel.textContent = title;
                if (gameLabel) gameLabel.textContent = game ? `Playing: ${game}` : "";
                if(game) Video.updatePlayedGamesList(game);
                btn.innerText = "Saved"; setTimeout(() => btn.innerText = "Save Info", 2000); 
            } catch (e) { btn.innerText = "Error"; } 
        })();
        return;
    }
    if (target.id === "requestGameBtn") { document.getElementById("requestModal").classList.add("open"); return; }
    if (target.id === "submitRequestBtn") {
        (async () => {
            const t = document.getElementById("submitRequestBtn"); const n = document.getElementById("requestGameInput").value.trim(); if(!n) return;
            t.innerText = "Sending..."; try { const { res } = await Config.apiPost("/requests/add", { name: n }); if(res.ok) { alert("Request sent!"); document.getElementById("requestModal").classList.remove("open"); document.getElementById("requestGameInput").value = ""; } else alert("Failed"); } catch(e){} t.innerText = "Submit"; 
        })();
        return;
    }
    if (target.id === "cancelRequestBtn" || target.id === "gameInfoCloseBtn" || target.id === "unbanCloseBtn" || target.id === "unbanSubmittedOkBtn" || target.dataset.closeModal) {
        document.querySelectorAll(".requestModal, .support-panel, .modal-backdrop").forEach(m => m.classList.remove("open")); return;
    }
    if (target.id === "openStoreBtn" || target.closest("#openStoreBtn")) { 
        document.getElementById("tabStoreBtn").click();
        const market = document.getElementById("marketplacePanel");
        if(market) market.scrollIntoView({behavior: "smooth"});
        return; 
    }
});

// --- 3. INIT ---
(async function init() {
  const loader = document.getElementById("appLoader");
  try {
      await Auth.loadAuth();
      await Promise.all([
          Store.loadStore(),
          Store.loadRedeems(),
          Chat.loadBrainrotList(),
          Store.loadSubscriptionTiers(),
          Video.loadVideoData()
      ]);
      
      // Init Hub Logic (AFTER all data is loaded)
      document.getElementById('hubSearchInput')?.addEventListener('input', (e) => Video.renderHubGames(e.target.value));
      
      Store.setupDigitalWallets();
      Chat.connectDashboardChatWS();

      // URL Params (Clip/Vod Deep Linking)
      const urlParams = new URLSearchParams(window.location.search);
      const clipId = urlParams.get('clip');
      const vodId = urlParams.get('vod');
      if(clipId || vodId) {
          Video.toggleMainView('video'); 
          // Small delay to ensure data lists are populated
          setTimeout(() => Video.handleVideoClick(clipId || vodId, clipId ? 'clip' : 'vod'), 1000);
      }
      if (urlParams.get("sub_success") === "true") {
          window.history.replaceState({}, document.title, "/");
          Config.showCustomConfirm("Welcome to the Nexus!", "Thank you for subscribing! Your unique chat border has been unlocked in the Store.", () => {
                  document.getElementById("openStoreBtn").click();
          });
      }
  } catch(e) { console.error("Init failed", e); } 
  finally { if(loader) setTimeout(() => loader.classList.add("hidden"), 500); }
})();

// --- PWA INSTALL LOGIC ---
let deferredPrompt;
const installBtn = document.getElementById('installAppBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (installBtn) installBtn.style.display = 'flex'; });
if (installBtn) { installBtn.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; deferredPrompt = null; installBtn.style.display = 'none'; }); }
window.addEventListener('appinstalled', () => { if (installBtn) installBtn.style.display = 'none'; });