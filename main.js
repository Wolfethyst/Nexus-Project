// src/main.js
import * as Config from './modules/config.js';
import * as Auth from './modules/auth.js';
import * as Chat from './modules/chat.js';
import * as Store from './modules/store.js';
import * as Video from './modules/video.js';
import * as Admin from './modules/admin.js';

// Expose a small set of globals (kept minimal)
window.setTheme = Auth.setTheme;
window.toggleDecorations = Auth.toggleDecorations;
window.openVodEditModal = Admin.openVodEditModal;
window.openGameDetails = Video.openGameDetails;
window.playVideo = Video.playVideo;
window.handleVideoClick = Video.handleVideoClick;
window.openHubHome = Video.openHubHome;
window.switchHubTab = Video.switchHubTab;
window.handleGameCardClick = Video.handleGameCardClick;

// Initialize app data
(async function init() {
  try {
    await Auth.loadAuth();
    await Promise.all([
      Store.loadStore(),
      Store.loadRedeems(),
      Chat.loadBrainrotList(),
      Store.loadSubscriptionTiers(),
      Video.loadVideoData()
    ]);

    // Wire UI: stream title save button
    const saveBtn = document.getElementById('streamTitleSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const btn = saveBtn;
        const title = document.getElementById('streamTitleInput')?.value.trim();
        const game = document.getElementById('streamGameInput')?.value.trim();
        if (!title) return;
        btn.innerText = 'Saving...';
        try {
          await Config.apiPost('/stream/title', { title, game });
          const titleLabel = document.getElementById('streamTitleLabel');
          const gameLabel = document.getElementById('streamGameLabel');
          if (titleLabel) titleLabel.textContent = title;
          if (gameLabel) gameLabel.textContent = game ? `Playing: ${game}` : '';
          if (game) {
            Video.updatePlayedGamesList(game);
            // Trigger metadata refresh (non-blocking) without touching the Save button
            try { if (window.refreshGameMetadata) window.refreshGameMetadata(game, { silent: true }); } catch (e) { console.warn('Auto-refresh metadata failed', e); }
          }
          btn.innerText = 'Saved';
          setTimeout(() => btn.innerText = 'Save', 2000);
        } catch (e) {
          console.error('Error saving stream title', e);
          btn.innerText = 'Error';
          setTimeout(() => btn.innerText = 'Save', 2000);
        }
      });
    }

    // Additional global wiring for mobile toggle that expects renderStore
    window.renderStore = Store.renderStore;
    Chat.connectDashboardChatWS();

  } catch (e) { console.error('Init failed', e); }
})();
