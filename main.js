// src/main.js
import * as Config from './modules/config.js';
import * as Auth from './modules/auth.js';
import * as Chat from './modules/chat.js';
import * as Store from './modules/store.js';
import * as Video from './modules/video.js';
import * as Admin from './modules/admin.js';

const loaderEl = document.getElementById('appLoader');
const LOADER_MAX_WAIT_MS = 8000;
const IMAGE_WAIT_MS = 2000;
const STREAM_WAIT_MS = 3000;

function hideLoader() {
  if (!loaderEl) return;
  loaderEl.classList.add('hidden');
}

const waitForDomReady = () => new Promise(resolve => {
  if (document.readyState !== 'loading') return resolve();
  document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
});

const waitForFonts = async () => {
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch (e) {
    // ignore font load failures
  }
};

const waitForImages = async () => {
  const images = Array.from(document.images || []);
  if (!images.length) return;

  const imagePromises = images.map(img => {
    if (img.complete) {
      return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    }

    return new Promise(resolve => {
      const done = () => {
        if (img.decode) {
          img.decode().catch(() => {}).finally(resolve);
        } else {
          resolve();
        }
      };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  });

  await Promise.race([
    Promise.all(imagePromises),
    new Promise(resolve => setTimeout(resolve, IMAGE_WAIT_MS))
  ]);
};

const waitForStreamReady = () => new Promise(resolve => {
  const video = document.getElementById('stream-player');
  if (!video) return resolve();
  if (video.readyState >= 2) return resolve();

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    video.removeEventListener('loadeddata', finish);
    video.removeEventListener('error', finish);
    resolve();
  };

  video.addEventListener('loadeddata', finish, { once: true });
  video.addEventListener('error', finish, { once: true });
  setTimeout(finish, STREAM_WAIT_MS);
});

async function finalizeLoader() {
  if (!loaderEl) return;
  const fullWait = (async () => {
    await Promise.all([waitForDomReady(), waitForFonts()]);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await Promise.all([waitForImages(), waitForStreamReady()]);
  })();

  await Promise.race([
    fullWait,
    new Promise(resolve => setTimeout(resolve, LOADER_MAX_WAIT_MS))
  ]);

  hideLoader();
}

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
window.handleRedeemClick = Store.handleRedeemClick;

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
  finally { await finalizeLoader(); }
})();
