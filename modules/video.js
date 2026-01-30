// src/modules/video.js
import { apiGet, apiPost, escapeHtml, PLACEHOLDER_IMG, CLOUDFLARE_CUSTOMER, State } from './config.js';
import { openVodEditModal } from './admin.js';
import { addSystemMessage } from './chat.js';

const API_BASE = "https://data.wolfethyst.tv";
// [FIX] A known working image to stop the loop.
// We use a specific asset path we know exists or a simple placeholder.
const SAFE_PLACEHOLDER = "https://data.wolfethyst.tv/assets/nexus_icon";

// Helper: set an <img> src only after the new image loads successfully
function setImageWhenLoaded(imgEl, url) {
  if (!imgEl || !url) return;
  try {
    const tester = new Image();
    tester.onload = () => {
      try {
        imgEl.dataset.fallbackSet = "false";
        imgEl.src = url;
      } catch (e) {}
    };
    tester.onerror = () => {
      // keep existing image on error
    };
    tester.src = url;
  } catch (e) {}
}

let allPlayedGames = [];
let vodsData = [];
let activeGameVods = [];
let clipsData = [];
let activeVideoItem = null;
let activeVideoType = null;
let currentGameName = null;

// Trackers
let youtubePlayerInstance = null;
let hlsInstance = null;
const mainVideoPlayer = document.getElementById('main-video-player');

// --- GLOBAL IMAGE ERROR HANDLER ---
// Add a global error handler to catch all image errors
function handleImageError(event) {
  const img = event.target;
  // Only set the fallback once
  if (!img.dataset.fallbackSet) {
    img.dataset.fallbackSet = "true";
    img.src = SAFE_PLACEHOLDER;
    // Remove the error handler to prevent further calls
    img.onerror = null;
  }
}

// Register the global error handler
if (typeof document !== 'undefined') {
  document.addEventListener('error', handleImageError, true);
}

// --- HELPERS ---
function getThumbUrl(item, type) {
  // For YouTube videos
  if (item.vod_provider === 'youtube') {
    const thumbUrl = `https://img.youtube.com/vi/${item.id}/maxresdefault.jpg`;
    return thumbUrl;
  }

  // For Odysee videos
  if (item.vod_provider === 'odysee') {
    return `https://thumbnails.lbry.com/${item.id}`;
  }

  // For Cloudflare videos
  const vidId = item.videoId || item.cloudflare_id;
  if (vidId) {
    return `https://customer-${CLOUDFLARE_CUSTOMER}.cloudflarestream.com/${vidId}/thumbnails/thumbnail.jpg`;
  }

  // Always return your safe placeholder as last resort
  return SAFE_PLACEHOLDER;
}

// [UPDATED] Prioritized Loading Sequence
export async function loadVideoData() {
  const params = new URLSearchParams(window.location.search);
  const directClipId = params.get("clip");
  const directVodId = params.get("vod");

  if (directClipId) {
    try {
      const { data } = await apiGet(`/clips/meta?id=${directClipId}`);
      if (data && data.ok && data.clip) playVideo(data.clip, 'clip');
    } catch(e) {
      console.error("Fast load failed", e);
    }
  }

  const heavyLifting = Promise.all([
    loadGames().then(() => {
      if (currentGameName) updatePlayedGamesList(currentGameName);
      else renderHubGames();
    }),
    loadStreamTitle(),
    loadClips(),
    loadVods().then(() => {
      if (directVodId && vodsData.length > 0) handleVideoClick(directVodId, 'vod');
    })
  ]);

  await heavyLifting;

  const loader = document.getElementById("appLoader");
  if(loader) setTimeout(() => loader.classList.add("hidden"), 500);
}

async function loadGames() {
  const { data } = await apiGet("/played");
  allPlayedGames = (data?.games || []).map((g, i) => ({ ...g, __index: i }));
  if (currentGameName) updatePlayedGamesList(currentGameName);
  else renderHubGames();
}

async function loadClips() {
  try {
    const { data } = await apiGet('/clips/list');
    clipsData = (data && data.ok && Array.isArray(data.clips)) ? data.clips : [];
  } catch(e){
    clipsData = [];
  }
}

async function loadVods() {
  try {
    const { data } = await apiGet('/streams/list?limit=50');
    if(data && data.streams) {
      vodsData = data.streams;
      let unsortedCount = 0;
      vodsData.forEach(v => {
        if (!v.game_name && v.title) {
          if (v.title.includes(" - ")) {
            const parts = v.title.split(" - ");
            v.game_name = parts[parts.length - 1].trim();
          } else if (v.title.includes(" | ")) {
            const parts = v.title.split(" | ");
            v.game_name = parts[parts.length - 1].trim();
          }
        }
        if (!v.game_name) unsortedCount++;
      });

      if (State.isModOrOwner && unsortedCount > 0) {
        allPlayedGames = allPlayedGames.filter(g => g.name !== "⚠️ Inbox");
        allPlayedGames.push({ name: "⚠️ Inbox", cover: SAFE_PLACEHOLDER, isVirtual: true, isInbox: true });
      }

      allPlayedGames.sort((a,b) => (a.isInbox ? -1 : a.name.localeCompare(b.name)));
      renderHubGames();
    }
  } catch(e) {
    console.error("VODs load error", e);
  }
}

export async function loadStreamTitle() {
  const { data } = await apiGet("/stream/now");
  const titleInput = document.getElementById("streamTitleInput");
  const gameInput = document.getElementById("streamGameInput");
  const titleLabel = document.getElementById("streamTitleLabel");
  const gameLabel = document.getElementById("streamGameLabel");
  const statusText = document.getElementById("liveStatusCardText");

  if (data) {
    if(titleInput) titleInput.value = data.title || "";
    if(gameInput) gameInput.value = data.game || "";
    if(titleLabel) titleLabel.textContent = data.title || "Stream Title";
    if(gameLabel) gameLabel.textContent = data.game || "Just Chatting";

    if (data.live) {
      if(statusText) {
        statusText.textContent = "● Live";
        statusText.style.color = "#72ffb0";
        statusText.style.textShadow = "0 0 8px rgba(114, 255, 176, 0.5)";
      }
    } else {
      if(statusText) {
        statusText.textContent = "● Offline";
        statusText.style.color = "var(--text-muted)";
        statusText.style.textShadow = "none";
      }
    }

    if (data.game) updatePlayedGamesList(data.game);
  }
}

// --- HUB LOGIC ---
export function renderHubGames(filterText = "") {
  const grid = document.getElementById('hubGamesGrid');
  if (!grid) return;

  const games = allPlayedGames.filter(g => {
    if (!g.name.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (a.isInbox) return -1;
    if (b.isInbox) return 1;
    return a.name.localeCompare(b.name);
  });

  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();

  games.forEach(g => {
    const safeName = g.name.replace(/'/g, "\\'");
    const card = document.createElement('div');
    card.className = 'hub-game-card';
    card.setAttribute('onclick', `window.openGameDetails('${safeName}')`);

    const img = document.createElement('img');
    img.src = g.cover || SAFE_PLACEHOLDER;
    img.loading = 'lazy';
    img.alt = escapeHtml(g.name);

    // Set up error handling for this specific image
    img.addEventListener('error', function() {
      if (!this.dataset.fallbackSet) {
        this.dataset.fallbackSet = "true";
        this.src = SAFE_PLACEHOLDER;
      }
    });

    const title = document.createElement('div');
    title.className = 'hub-game-title';
    title.textContent = escapeHtml(g.name);

    card.appendChild(img);
    card.appendChild(title);
    fragment.appendChild(card);
  });

  // Clear the grid and append the new content
  grid.innerHTML = '';
  grid.appendChild(fragment);
}

function renderHubGrid(containerId, items, type) {
  const container = document.getElementById(containerId);
  if(!container) return;

  if(items.length === 0) {
    container.innerHTML = `<div class="empty-state">No content found.</div>`;
    return;
  }

  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const isYouTube = item.vod_provider === 'youtube';
    const isOdysee = item.vod_provider === 'odysee';
    const thumbUrl = getThumbUrl(item, type);
    const title = escapeHtml(item.title || "Untitled");
    const dateStr = new Date(item.createdAt || item.created_at).toLocaleDateString();

    let badgeHtml = "";
    if (isYouTube) badgeHtml = `<div class="provider-badge">YouTube</div>`;
    else if (isOdysee) badgeHtml = `<div class="provider-badge" style="background:#e0245e;">Odysee</div>`;
    else if (item.is_exclusive) badgeHtml = `<div class="provider-badge" style="background:var(--accent);">Exclusive</div>`;

    let editBtn = "";
    if (type === 'vod' && State.isModOrOwner) {
      editBtn = `<div class="vod-edit-btn" onclick="window.openVodEditModal(event, '${item.id}')">EDIT</div>`;
    }

    const card = document.createElement('div');
    card.className = 'video-card';
    card.setAttribute('onclick', `window.handleVideoClick('${item.id}', '${type}')`);

    const thumb = document.createElement('div');
    thumb.className = 'video-card-thumb';

    const img = document.createElement('img');
    img.src = thumbUrl;

    // Set up error handling for this specific image
    img.addEventListener('error', function() {
      if (!this.dataset.fallbackSet) {
        this.dataset.fallbackSet = "true";
        this.src = SAFE_PLACEHOLDER;
      }
    });

    thumb.innerHTML = `${badgeHtml}${editBtn}<div class="video-card-dur">${item.duration || type.toUpperCase()}</div>`;
    thumb.insertBefore(img, thumb.firstChild);

    const body = document.createElement('div');
    body.className = 'video-card-body';
    body.innerHTML = `
      <div class="video-card-title" title="${title}">${title}</div>
      <div class="video-card-date">${dateStr}</div>
    `;

    card.appendChild(thumb);
    card.appendChild(body);
    fragment.appendChild(card);
  });

  // Clear the container and append the new content
  container.innerHTML = '';
  container.appendChild(fragment);
}

// --- OPEN GAME DETAILS ---
export async function openGameDetails(gameName) {
  const game = allPlayedGames.find(g => g.name === gameName);
  if (!game) return;

  document.getElementById('hub-home-view').classList.add('hidden');
  document.getElementById('hub-details-view').classList.remove('hidden');

  const summary = game.summary || "No description available.";
  const dev = game.developer || "--";
  const pub = game.publisher || "--";
  const rel = game.release_date || "--";
  const steamUrl = game.steam_url || game.steamUrl || "";
  const safeName = escapeHtml(game.name).replace(/'/g, "\\'");

  let steamBtnHtml = steamUrl ? `<a href="${steamUrl}" target="_blank" class="game-steam-btn"><img src="https://store.steampowered.com/favicon.ico" style="width:14px;height:14px;"> View on Steam</a>` : "";

  let adminBtnsHtml = (State.isModOrOwner && !game.isInbox) ? `
    <div style="display:flex; gap:5px; margin-top:10px;">
      <button onclick="window.refreshGameMetadata('${safeName}')" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.8; font-size:11px;" title="Fetch info from Steam/IGDB">↻ Info</button>
      <button onclick="window.promptRenameGame()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7;" title="Rename">✏️</button>
      <button onclick="window.promptChangeCover()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7;" title="Cover">🖼️</button>
      <button onclick="window.promptDeleteGame()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7; background:rgba(255,0,0,0.2); color:#ffaaaa;" title="Delete">🗑️</button>
    </div>` : "";

  const heroContentEl = document.querySelector('.game-hero-content');
  if (heroContentEl) {
    // Create elements programmatically instead of using innerHTML
    heroContentEl.innerHTML = '';

    const coverImg = document.createElement('img');
    coverImg.id = 'heroCover';
    coverImg.className = 'game-hero-cover';
    coverImg.src = game.cover;

    // Set up error handling for this specific image
    coverImg.addEventListener('error', function() {
      if (!this.dataset.fallbackSet) {
        this.dataset.fallbackSet = "true";
        this.src = SAFE_PLACEHOLDER;
      }
    });

    const mainDiv = document.createElement('div');
    mainDiv.className = 'game-hero-main';
    mainDiv.innerHTML = `
      <h1 id="heroTitle" class="game-hero-title">${escapeHtml(game.name)}</h1>
      <div class="game-hero-stats">
        <span class="game-hero-stat">📼 <span id="heroVodCount">...</span> VODs</span>
        <span class="game-hero-stat">🎬 <span id="heroClipCount">...</span> Clips</span>
      </div>
      ${steamBtnHtml}
      ${adminBtnsHtml}
    `;

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'game-hero-details';
    detailsDiv.innerHTML = `
      <div id="heroDescription" class="game-desc-text">${escapeHtml(summary)}</div>
      <div class="game-meta-grid">
        <div class="game-meta-item"><span class="meta-label">Developer</span><span id="heroDev" class="meta-value">${escapeHtml(dev)}</span></div>
        <div class="game-meta-item"><span class="meta-label">Publisher</span><span id="heroPub" class="meta-value">${escapeHtml(pub)}</span></div>
        <div class="game-meta-item"><span class="meta-label">Release</span><span id="heroRelease" class="meta-value">${escapeHtml(rel)}</span></div>
      </div>
    `;

    heroContentEl.appendChild(coverImg);
    heroContentEl.appendChild(mainDiv);
    heroContentEl.appendChild(detailsDiv);
  }

  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    // Don't set the background image if it's the same as the cover to avoid loading it twice
    // Normalize matching for background-image url(...) and avoid malformed regex
    const bgMatch = heroBg.style.backgroundImage?.match(/url\(['"]?(.+?)['"]?\)/);
    if (game.cover !== bgMatch?.[1]) {
      heroBg.style.backgroundImage = `url('${game.cover}')`;
    }
  }

  activeGameVods = [];
  if (game.isInbox) {
    activeGameVods = vodsData.filter(v => !v.game_name);
  } else {
    try {
      const encoded = encodeURIComponent(game.name);
      const { data } = await apiGet(`/streams/list?game=${encoded}&limit=100`);
      activeGameVods = data.streams || [];
    } catch(e) {
      console.error("Failed to load game videos", e);
    }
  }

  const targetGameLower = game.name.toLowerCase();
  const filteredContent = activeGameVods.filter(v => v.vod_provider !== 'bunny');

  // Sort DESCENDING (Newest First)
  const gameVods = filteredContent.filter(v => !v.type || v.type === 'vod')
    .sort((a, b) => (b.created_at || b.createdAt) - (a.created_at || a.createdAt));
  const gameVideos = filteredContent.filter(v => v.type === 'video')
    .sort((a, b) => (b.created_at || b.createdAt) - (a.created_at || a.createdAt));
  const gameClips = clipsData.filter(c => {
    if (c.game) return c.game.toLowerCase() === targetGameLower;
    return (c.title || "").toLowerCase().includes(targetGameLower);
  });

  const vodCountEl = document.getElementById('heroVodCount');
  const clipCountEl = document.getElementById('heroClipCount');
  if(vodCountEl) vodCountEl.innerText = gameVods.length + gameVideos.length;
  if(clipCountEl) clipCountEl.innerText = gameClips.length;

  renderHubGrid('hub-content-vods', gameVods, 'vod');
  renderHubGrid('hub-content-videos', gameVideos, 'vod');
  renderHubGrid('hub-content-clips', gameClips, 'clip');

  if (gameVods.length === 0 && gameVideos.length > 0) switchHubTab('videos');
  else switchHubTab('vods');
}

export function openHubHome() {
  document.getElementById('hub-details-view').classList.add('hidden');
  document.getElementById('hub-home-view').classList.remove('hidden');
  closeVideoStage();
}

export function switchHubTab(tabName) {
  document.querySelectorAll('.hub-tab').forEach(b => {
    if(b.textContent.toLowerCase().includes(tabName)) b.classList.add('active');
    else b.classList.remove('active');
  });

  ['vods', 'videos', 'clips'].forEach(t => {
    const el = document.getElementById(`hub-content-${t}`);
    if(t === tabName) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

// --- PLAYER ---
export async function playVideo(item, type) {
  activeVideoItem = item;
  activeVideoType = type;

  // Layout
  const videoCol = document.querySelector('.col-video');
  if(videoCol) videoCol.classList.add('watching');

  const stage = document.getElementById('videoStage');
  if(stage) stage.classList.remove('hidden');
  if(stage) stage.scrollIntoView({ behavior: 'smooth' });

  // Metadata
  document.getElementById('meta-title').textContent = item.title || "Untitled";
  document.getElementById('meta-date').textContent = new Date(item.createdAt || item.created_at).toLocaleDateString();

  let tagLabel = "Broadcast Archive";
  if(type === 'clip') tagLabel = "Live Clip";
  else if (item.vod_provider === 'youtube') tagLabel = "Archive (YouTube)";
  else if (item.vod_provider === 'odysee') tagLabel = "Archive (Odysee)";

  document.getElementById('meta-tag').textContent = tagLabel;

  const btnDownload = document.getElementById('btn-download');
  if(btnDownload) btnDownload.style.display = 'none';

  const qualitySelect = document.getElementById('videoQualitySelect');
  if(qualitySelect) qualitySelect.style.display = 'none';

  const videoParent = mainVideoPlayer.parentNode;

  // CLEANUP OLD EMBEDS
  ['nexus-bunny-embed', 'nexus-youtube-embed', 'nexus-odysee-embed'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.remove();
  });

  // RESET NATIVE PLAYER & HLS
  if(hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  mainVideoPlayer.style.display = 'none';
  mainVideoPlayer.removeAttribute('src');
  mainVideoPlayer.innerHTML = '';

  // --- YOUTUBE LOGIC (IMPROVED) ---
  if (item.vod_provider === 'youtube') {
    const wrapper = document.createElement('div');
    wrapper.id = 'nexus-youtube-embed';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.backgroundColor = '#000';
    wrapper.style.position = 'relative';

    // Try to get the video through the proxy first
    try {
      const proxyResponse = await fetch(`${API_BASE}/stream/proxy?id=${item.id}`);
      const proxyData = await proxyResponse.json();

      if (proxyData.type === "invidious_embed" || proxyData.type === "youtube_embed") {
        // Use Invidious embed (better compatibility) with YouTube fallback
        const iframe = document.createElement('iframe');
        iframe.src = proxyData.embedUrl;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.allowFullscreen = true;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        
        // If Invidious fails to load, try YouTube fallback
        if (proxyData.fallbackUrl) {
          iframe.onerror = () => {
            console.log("Invidious failed, trying YouTube fallback");
            iframe.src = proxyData.fallbackUrl;
          };
        }
        
        wrapper.appendChild(iframe);
      } else if (proxyData.url) {
        // Use proxied video URL
        mainVideoPlayer.style.display = 'block';
        const source = document.createElement('source');
        source.src = proxyData.url;
        source.type = 'video/mp4';
        mainVideoPlayer.innerHTML = '';
        mainVideoPlayer.appendChild(source);
        mainVideoPlayer.load();
        mainVideoPlayer.play().catch(e => console.log("Autoplay blocked", e));
      }
    } catch (e) {
      console.error("Proxy failed, using direct embed", e);
      // Invidious direct embed as fallback
      const iframe = document.createElement('iframe');
      iframe.src = `https://inv.tux.pizza/embed/${item.id}?autoplay=1&quality=dash`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allowFullscreen = true;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      
      // YouTube as final fallback
      iframe.onerror = () => {
        console.log("Invidious failed, trying YouTube");
        iframe.src = `https://www.youtube.com/embed/${item.id}?autoplay=1&rel=0`;
      };
      
      wrapper.appendChild(iframe);
    }

    videoParent.appendChild(wrapper);
    return;
  }

  // --- ODYSEE LOGIC ---
  if (item.vod_provider === 'odysee') {
    const wrapper = document.createElement('div');
    wrapper.id = 'nexus-odysee-embed';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.backgroundColor = '#000';

    const iframe = document.createElement('iframe');
    iframe.src = `https://odysee.com/$/embed/${item.id}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allowFullscreen = true;

    wrapper.appendChild(iframe);
    videoParent.appendChild(wrapper);
    return;
  }

  // --- NATIVE / BUNNY LOGIC ---
  if (item.url) {
    mainVideoPlayer.style.display = 'block';

    if (typeof Hls !== 'undefined' && Hls.isSupported() && item.url.endsWith('.m3u8')) {
      hlsInstance = new Hls();
      hlsInstance.loadSource(item.url);
      hlsInstance.attachMedia(mainVideoPlayer);
    } else {
      const source = document.createElement('source');
      source.src = item.url;
      source.type = 'video/mp4';
      mainVideoPlayer.appendChild(source);
      mainVideoPlayer.load();
    }

    mainVideoPlayer.play().catch(e => console.log("Autoplay blocked", e));

    if(btnDownload) {
      btnDownload.href = item.url;
      btnDownload.style.display = 'inline-block';
    }
  }
}

export function handleVideoClick(id, type) {
  let item = vodsData.find(i => i.id === id);
  if(type === 'clip') item = clipsData.find(i => i.id === id);
  if (!item && activeGameVods.length > 0) item = activeGameVods.find(i => i.id === id);

  if(item) playVideo(item, type);
  else console.warn("Video not found:", id);
}

export function closeVideoStage() {
  const videoCol = document.querySelector('.col-video');
  if(videoCol) videoCol.classList.remove('watching');

  const stage = document.getElementById('videoStage');
  if(stage) stage.classList.add('hidden');

  // CLEANUP
  ['nexus-bunny-embed', 'nexus-youtube-embed', 'nexus-odysee-embed'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.remove();
  });

  if (youtubePlayerInstance) {
    try {
      youtubePlayerInstance.destroy();
    } catch(e){}
    youtubePlayerInstance = null;
  }

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  if(mainVideoPlayer) {
    mainVideoPlayer.pause();
    mainVideoPlayer.removeAttribute('src');
    mainVideoPlayer.innerHTML = '';
  }
}

export function shareActiveVideo() {
  if (!activeVideoItem) return;

  const url = new URL(window.location.origin);
  if (activeVideoType === 'vod') url.searchParams.set('vod', activeVideoItem.id);
  else url.searchParams.set('clip', activeVideoItem.id);

  const shareUrl = url.toString();

  navigator.clipboard.writeText(shareUrl).then(() => {
    const btn = document.getElementById('btn-share');
    if(btn) {
      btn.innerText = "Copied!";
      setTimeout(() => btn.innerText = "Share", 2000);
    } else alert("Link copied!");
  }).catch(() => prompt("Copy this link:", shareUrl));
}

export function toggleMainView(mode) {
  const liveEls = document.querySelectorAll('.live-view');
  const videoCol = document.querySelector('.col-video');
  const btnLive = document.getElementById('viewBtnLive');
  const btnVideo = document.getElementById('viewBtnVideo');

  if (mode === 'live') {
    liveEls.forEach(el => el.classList.remove('hidden'));
    if (videoCol) videoCol.classList.add('hidden');
    if (btnLive) btnLive.classList.add('active');
    if (btnVideo) btnVideo.classList.remove('active');
  } else {
    liveEls.forEach(el => el.classList.add('hidden'));
    if (videoCol) videoCol.classList.remove('hidden');
    if (btnLive) btnLive.classList.remove('active');
    if (btnVideo) btnVideo.classList.add('active');
  }
}

// --- FOLDER MANAGEMENT ---
window.refreshGameMetadata = async function(gameName, opts = {}) {
  const silent = !!opts.silent;
  const btn = silent ? null : document.activeElement;
  const oldText = btn ? btn.innerText : "↻ Info";

  if(btn) {
    btn.innerText = "Wait...";
    btn.disabled = true;
  }

  try {
    const { data } = await apiPost('/played/refresh-metadata', { name: gameName });

    if (data && data.ok) {
      // Refresh the local played store so the UI reflects backend changes immediately
      try {
        const playedResp = await apiGet('/played');
        const playedData = playedResp.data || { games: [] };
        allPlayedGames = (playedData.games || []).map((g, i) => ({ ...g, __index: i }));
      } catch (e) {
        console.warn('Failed to refresh played list after metadata update', e);
      }

      // Find the updated game in-memory and apply latest fields (if present)
      const updatedGame = allPlayedGames.find(g => g.name === gameName);
      if (updatedGame) {
        updatedGame.summary = data.data.summary || updatedGame.summary;
        updatedGame.developer = data.data.developer || updatedGame.developer;
        updatedGame.publisher = data.data.publisher || updatedGame.publisher;
        updatedGame.release_date = data.data.release_date || updatedGame.release_date;
        updatedGame.steam_url = data.data.steam_url || updatedGame.steam_url;

        // If there's a new cover, preload it and only swap in on successful load.
        if (data.data.cover) {
          const newCover = data.data.cover;
          // Preload and apply to both now-playing and hero (if present)
          try {
            const tester = new Image();
            tester.onload = () => {
              try {
                updatedGame.cover = newCover;
                const nowImg = document.getElementById('gameCoverImage');
                const heroImg = document.getElementById('heroCover');
                if (nowImg) setImageWhenLoaded(nowImg, newCover);
                if (heroImg) setImageWhenLoaded(heroImg, newCover);
                renderHubGames();
                if (document.getElementById('hub-details-view')) openGameDetails(gameName);
              } catch (e) { renderHubGames(); }
            };
            tester.onerror = () => { renderHubGames(); };
            tester.src = newCover;
          } catch (e) {
            // Fallback: set cover and re-render
            updatedGame.cover = data.data.cover;
            renderHubGames();
            if (document.getElementById('hub-details-view')) openGameDetails(gameName);
          }
        } else {
          // No cover change — re-render and open details
          renderHubGames();
          if (document.getElementById('hub-details-view')) openGameDetails(gameName);
        }
      } else {
        // If the game wasn't in-memory, re-render hub so new entry appears
        renderHubGames();
      }
    } else {
      console.warn('Could not find game info on IGDB.');
    }
  } catch(e) {
    console.error('Error refreshing metadata.', e);
  } finally {
    if(btn) {
      btn.innerText = oldText;
      btn.disabled = false;
    }
  }
};

export async function promptRenameGame() {
  const oldNameElement = document.getElementById('heroTitle');
  const oldName = oldNameElement ? oldNameElement.innerText : "";
  if(!oldName) return;

  const newName = prompt(`Rename folder "${oldName}" to:`, oldName);
  if (!newName || newName === oldName) return;

  if (!confirm(`This will move all videos from "${oldName}" to "${newName}"?\n\nProceed?`)) return;

  try {
    const { res, data } = await apiPost('/played/rename', { oldName, newName });

    if (res.ok) {
      alert(`Success! Moved ${data.count} videos.`);
      await loadVideoData();
      openGameDetails(newName);
    } else {
      alert("Error: " + (data.error || "Move failed"));
    }
  } catch(e) {
    alert("Network error during move.");
  }
}

export async function promptChangeCover() {
  const titleEl = document.getElementById('heroTitle');
  if (!titleEl) return;

  const gameName = titleEl.innerText;
  const newCover = prompt(`Enter new Cover URL for "${gameName}":\n\n(Type "auto" to search SteamGridDB)`, "auto");

  if (!newCover) return;

  try {
    const { res, data } = await apiPost('/played/set-cover', { name: gameName, cover: newCover });

    if (res.ok && data.cover) {
      const localGame = allPlayedGames.find(g => g.name.toLowerCase() === gameName.toLowerCase());
      if (localGame) {
        localGame.cover = data.cover;
        localGame.isVirtual = false;
      } else {
        allPlayedGames.push({ name: gameName, cover: data.cover });
      }

      renderHubGames(document.getElementById('hubSearchInput')?.value || "");
      alert("Cover updated!");
    } else {
      alert("Failed to update cover.");
    }
  } catch(e) {
    alert("Error updating cover.");
  }
}

export async function promptDeleteGame() {
  const titleEl = document.getElementById('heroTitle');
  if (!titleEl) return;

  const gameName = titleEl.innerText;
  const game = allPlayedGames.find(g => g.name === gameName);

  if (!game) return;

  if (game.isInbox) {
    alert("You cannot delete the Inbox.");
    return;
  }

  if (!confirm(`Are you sure you want to delete the folder "${gameName}"?`)) return;

  if (game.__index === undefined || game.__index === -1) {
    alert("Cannot delete (virtual folder).");
    return;
  }

  try {
    const { res } = await apiPost('/played/delete', { index: game.__index });

    if (res.ok) {
      const localArrayIndex = allPlayedGames.indexOf(game);
      if (localArrayIndex > -1) allPlayedGames.splice(localArrayIndex, 1);

      alert("Folder deleted!");
      openHubHome();
      renderHubGames();
    } else {
      alert("Failed to delete.");
    }
  } catch(e) {
    alert("Error deleting folder.");
  }
}

// --- LEGACY SIDEBAR ---
function renderPlayedGames(list) {
  const gamesPlayedEl = document.getElementById("gamesPlayed");
  if (!gamesPlayedEl) return;

  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();

  list.forEach(g => {
    const isCurrent = currentGameName && (g.name || "").toLowerCase() === currentGameName.toLowerCase();

    const card = document.createElement('div');
    card.className = `game-card ${isCurrent ? "current-game" : ""}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('onclick', 'window.handleGameCardClick(this)');
    card.setAttribute('data-name', escapeHtml(g.name));
    card.setAttribute('data-desc', escapeHtml(g.description || ""));
    card.setAttribute('data-cover', escapeHtml(g.cover || ""));
    card.setAttribute('data-steam', escapeHtml(g.steamUrl || ""));
    
    const thumb = document.createElement('div');
    thumb.className = 'game-thumb';
    
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = g.cover;
    img.alt = escapeHtml(g.name);
    
    // Set up error handling for this specific image
    img.addEventListener('error', function() {
      if (!this.dataset.fallbackSet) {
        this.dataset.fallbackSet = "true";
        this.src = SAFE_PLACEHOLDER;
      }
    });
    
    thumb.appendChild(img);
    card.appendChild(thumb);
    fragment.appendChild(card);
  });

  // Clear the container and append the new content
  gamesPlayedEl.innerHTML = '';
  gamesPlayedEl.appendChild(fragment);
}

export function updatePlayedGamesList(gameName) {
  if (!gameName) return;

  const isSameGame = currentGameName && gameName.toLowerCase() === currentGameName.toLowerCase();
  currentGameName = gameName;

  let foundIndex = allPlayedGames.findIndex(g => (g.name || "").toLowerCase() === gameName.toLowerCase());

  if (foundIndex > -1) {
    const game = allPlayedGames.splice(foundIndex, 1)[0];
    allPlayedGames.unshift(game);
  } else {
    const placeholderCover = "https://via.placeholder.com/300x450?text=" + encodeURIComponent(gameName);
    allPlayedGames.unshift({ name: gameName, cover: placeholderCover, __index: -1 });
  }

  const coverImg = document.getElementById("gameCoverImage");
  if (coverImg && allPlayedGames.length > 0) {
    // Set up error handling for this specific image
    coverImg.addEventListener('error', function() {
      if (!this.dataset.fallbackSet) {
        this.dataset.fallbackSet = "true";
        this.src = SAFE_PLACEHOLDER;
      }
    });
    // Only replace the now-playing cover when the new image loads successfully.
    const firstCover = allPlayedGames[0].cover;
    if (firstCover && !firstCover.includes('placeholder.com')) {
      setImageWhenLoaded(coverImg, firstCover);
    }
  }

  renderPlayedGames(allPlayedGames);
}

export function handleGameCardClick(el) {
  const gameInfoModalEl = document.getElementById("gameInfoModal");
  if(!gameInfoModalEl) return;

  document.getElementById("gameInfoTitle").innerText = el.dataset.name;

  const coverImg = document.getElementById("gameInfoCover");
  coverImg.src = el.dataset.cover;

  // Set up error handling for this specific image
  coverImg.addEventListener('error', function() {
    if (!this.dataset.fallbackSet) {
      this.dataset.fallbackSet = "true";
      this.src = SAFE_PLACEHOLDER;
    }
  });

  document.getElementById("gameInfoText").innerText = el.dataset.desc || "No description available.";

  const btn = document.getElementById("gameSteamBtn");
  if(el.dataset.steam) {
    btn.style.display = "inline-block";
    btn.href = el.dataset.steam;
  } else {
    btn.style.display = "none";
  }

  gameInfoModalEl.classList.add("open");
}

document.addEventListener("DOMContentLoaded", () => {
  const clipBtn = document.getElementById("clipBtn");
  if (clipBtn) {
    clipBtn.addEventListener("click", async () => {
      if (!State.user) {
        addSystemMessage("You must be logged in to clip!", "error");
        return;
      }

      addSystemMessage("Clip is being created...", "loading");
      clipBtn.disabled = true;

      try {
        const { res, data } = await apiPost("/clips/create", { windowSeconds: 30 });

        if (res.ok && data.id) {
          const watchLink = `${window.location.origin}/?clip=${data.id}`;
          navigator.clipboard.writeText(watchLink).catch(() => {});
        } else {
          addSystemMessage(data.error || "Failed to create clip.", "error");
        }
      } catch (e) {
        addSystemMessage("Network Error", "error");
      } finally {
        clipBtn.disabled = false;
      }
    });
  }
});

// Global Exports
window.openGameDetails = openGameDetails;
window.openHubHome = openHubHome;
window.handleVideoClick = handleVideoClick;
window.promptRenameGame = promptRenameGame;
window.promptChangeCover = promptChangeCover;
window.promptDeleteGame = promptDeleteGame;
window.handleGameCardClick = handleGameCardClick;