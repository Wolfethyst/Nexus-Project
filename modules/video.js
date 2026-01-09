// src/modules/video.js
import { apiGet, apiPost, escapeHtml, PLACEHOLDER_IMG, CLOUDFLARE_CUSTOMER, State } from './config.js';
import { openVodEditModal } from './admin.js';

let allPlayedGames = [];
let vodsData = []; 
let activeGameVods = []; 
let clipsData = [];
let activeVideoItem = null;
let activeVideoType = null;
let currentGameName = null;

const mainVideoPlayer = document.getElementById('main-video-player');

// --- HELPERS ---
function getThumbUrl(item, type) {
    if (item.vod_provider === 'youtube' || item.youtube_id) {
        // Prefer the ID if available, otherwise fall back to youtube_id prop
        const yId = item.id || item.youtube_id;
        return `https://img.youtube.com/vi/${yId}/maxresdefault.jpg`;
    }
    
    // Cloudflare Fallback (for Clips or legacy)
    const vidId = item.videoId || item.cloudflare_id; 
    if(vidId) return `https://customer-${CLOUDFLARE_CUSTOMER}.cloudflarestream.com/${vidId}/thumbnails/thumbnail.jpg`;
    
    return PLACEHOLDER_IMG;
}

// --- DATA LOADING ---
export async function loadVideoData() {
    // 1. Load the folder names first
    await loadGames();
    
    // [FIX] Render the folders IMMEDIATELY. 
    // This prevents the "Blank Screen" issue while waiting for videos to download.
    renderHubGames();

    // 2. Load Title/Status
    await loadStreamTitle();
    
    // 3. Load Content (Videos & Clips) in the background
    await Promise.all([loadClips(), loadVods()]);
}

async function loadGames() {
    const { data } = await apiGet("/played");
    allPlayedGames = (data?.games || []).map((g, i) => ({ ...g, __index: i }));
    // We render inside loadVideoData now to be safe, but we can also render here if needed.
}

async function loadClips() {
    try { const { data } = await apiGet('/clips/list'); if(data?.ok) clipsData = data.clips; } catch(e){}
}

async function loadVods() {
    try {
      // The backend now filters this to ONLY return YouTube videos (vod_provider='youtube')
      const { data } = await apiGet('/streams/list?limit=100');
      
      if(data && data.streams) {
        vodsData = data.streams;
        let unsortedCount = 0;
        
        // Helper to extract game name from title if missing
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
            // Remove old inbox if exists, add new one
            allPlayedGames = allPlayedGames.filter(g => g.name !== "⚠️ Inbox");
            allPlayedGames.push({ name: "⚠️ Inbox", cover: "https://data.wolfethyst.tv/assets/nexus_icon", isVirtual: true, isInbox: true });
        }
        
        allPlayedGames.sort((a,b) => (a.isInbox ? -1 : a.name.localeCompare(b.name)));
        
        // Re-render to update counts or "Inbox" status once VODs are actually loaded
        renderHubGames(); 
      }
    } catch(e) { console.error("VODs load error", e); }
}

export async function loadStreamTitle() {
  try {
    const { res, data } = await apiGet("/stream/now"); 
    if (!res.ok || !data) return;
    const title = data.title || "Untitled Stream";
    const game = data.game || data.gameName || "";

    const titleInput = document.getElementById("streamTitleInput"); 
    const gameInput = document.getElementById("streamGameInput");
    if (titleInput && document.activeElement !== titleInput) titleInput.value = title;
    if (gameInput && document.activeElement !== gameInput) gameInput.value = game;

    const titleLabel = document.getElementById("streamTitleLabel");
    const gameLabel = document.getElementById("streamGameLabel");
    if (titleLabel) titleLabel.textContent = title;
    if (gameLabel) gameLabel.textContent = game ? `Playing: ${game}` : "";
    
    const tag = document.getElementById("liveStatusTag");
    if(tag) {
        if(data.live) { tag.textContent = "LIVE"; tag.classList.add("live"); tag.classList.remove("hidden"); } 
        else { tag.textContent = "OFFLINE"; tag.classList.remove("live"); tag.classList.remove("hidden"); }
    }
    if (game) updatePlayedGamesList(game); 
  } catch (err) { }
}

// --- HUB LOGIC ---
export function renderHubGames(filterText = "") {
    const grid = document.getElementById('hubGamesGrid');
    if(!grid) return;
    
    const games = allPlayedGames.filter(g => {
            if (!g.name.toLowerCase().includes(filterText.toLowerCase())) return false;
            return true;
        }).sort((a,b) => {
            if(a.isInbox) return -1; if(b.isInbox) return 1;
            return a.name.localeCompare(b.name);
        });

    grid.innerHTML = games.map(g => {
        const safeName = g.name.replace(/'/g, "\\'"); 
        return `<div class="hub-game-card" onclick="window.openGameDetails('${safeName}')"><img src="${g.cover}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'"><div class="hub-game-title">${escapeHtml(g.name)}</div></div>`;
    }).join("");
}

function renderHubGrid(containerId, items, type) {
    const container = document.getElementById(containerId);
    if(!container) return;
    if(items.length === 0) { container.innerHTML = `<div class="empty-state">No content found.</div>`; return; }

    container.innerHTML = items.map(item => {
        // [UPDATED] Since we only use YouTube now, we check that or generic fallback
        const isYouTube = item.vod_provider === 'youtube' || !!item.youtube_id;
        const thumbUrl = getThumbUrl(item, type);
        const title = escapeHtml(item.title || "Untitled");
        const dateStr = new Date(item.createdAt || item.created_at).toLocaleDateString();
        
        let badgeHtml = "";
        if (isYouTube) badgeHtml = `<div class="provider-badge">YouTube</div>`;
        else if (item.is_exclusive) badgeHtml = `<div class="provider-badge" style="background:var(--accent);">Exclusive</div>`;
        
        let editBtn = "";
        if (type === 'vod' && State.isModOrOwner) {
            editBtn = `<div class="vod-edit-btn" onclick="window.openVodEditModal(event, '${item.id}')">EDIT</div>`;
        }

        return `<div class="video-card" onclick="window.handleVideoClick('${item.id}', '${type}')"><div class="video-card-thumb"><img src="${thumbUrl}" onerror="this.src='${PLACEHOLDER_IMG}'">${badgeHtml}${editBtn}<div class="video-card-dur">${item.duration || type.toUpperCase()}</div></div><div class="video-card-body"><div class="video-card-title" title="${title}">${title}</div><div class="video-card-date">${dateStr}</div></div></div>`;
    }).join("");
}

// --- OPEN GAME DETAILS (UPDATED LAYOUT) ---
export async function openGameDetails(gameName) {
    const game = allPlayedGames.find(g => g.name === gameName);
    if (!game) return;
    
    document.getElementById('hub-home-view').classList.add('hidden');
    document.getElementById('hub-details-view').classList.remove('hidden');

    // 1. Prepare Data with Defaults
    const summary = game.summary || "No description available.";
    const dev = game.developer || "--";
    const pub = game.publisher || "--";
    const rel = game.release_date || "--";
    const steamUrl = game.steam_url || game.steamUrl || "";

    // 2. Prepare Steam Button HTML
    let steamBtnHtml = "";
    if (steamUrl) {
        steamBtnHtml = `<a href="${steamUrl}" target="_blank" class="game-steam-btn"><img src="https://store.steampowered.com/favicon.ico" style="width:14px;height:14px;"> View on Steam</a>`;
    }

    // 3. Prepare Admin Buttons (Rename, Delete, REFRESH INFO)
    let adminBtnsHtml = "";
    if (State.isModOrOwner && !game.isInbox) {
        adminBtnsHtml = `
            <div style="display:flex; gap:5px; margin-top:10px;">
                <button onclick="window.refreshGameMetadata('${escapeHtml(game.name)}')" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.8; font-size:11px;" title="Fetch info from Steam">↻ Info</button>
                <button onclick="window.promptRenameGame()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7;" title="Rename">✏️</button>
                <button onclick="window.promptChangeCover()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7;" title="Cover">🖼️</button>
                <button onclick="window.promptDeleteGame()" class="panelSmallBtn" style="padding:4px 8px; border-radius:4px; opacity:0.7; background:rgba(255,0,0,0.2); color:#ffaaaa;" title="Delete">🗑️</button>
            </div>
        `;
    }

    // 4. Inject Full Hero HTML (Left: Title/Stats, Right: Desc/Meta)
    const heroContentEl = document.querySelector('.game-hero-content');
    if (heroContentEl) {
        heroContentEl.innerHTML = `
            <img id="heroCover" class="game-hero-cover" src="${game.cover}" onerror="this.src='${PLACEHOLDER_IMG}'">
            
            <div class="game-hero-main">
                <h1 id="heroTitle" class="game-hero-title">${escapeHtml(game.name)}</h1>
                <div class="game-hero-stats">
                     <span class="game-hero-stat">📼 <span id="heroVodCount">...</span> VODs</span>
                     <span class="game-hero-stat">🎬 <span id="heroClipCount">...</span> Clips</span>
                </div>
                ${steamBtnHtml}
                ${adminBtnsHtml}
            </div>

            <div class="game-hero-details">
                <div id="heroDescription" class="game-desc-text">${escapeHtml(summary)}</div>
                <div class="game-meta-grid">
                    <div class="game-meta-item"><span class="meta-label">Developer</span><span id="heroDev" class="meta-value">${escapeHtml(dev)}</span></div>
                    <div class="game-meta-item"><span class="meta-label">Publisher</span><span id="heroPub" class="meta-value">${escapeHtml(pub)}</span></div>
                    <div class="game-meta-item"><span class="meta-label">Release</span><span id="heroRelease" class="meta-value">${escapeHtml(rel)}</span></div>
                </div>
            </div>
        `;
    }

    // Set Background
    const heroBg = document.getElementById('heroBg');
    if (heroBg) heroBg.style.backgroundImage = `url('${game.cover}')`;

    // --- Load VODs Logic ---
    activeGameVods = [];

    if (game.isInbox) {
        activeGameVods = vodsData.filter(v => !v.game_name);
    } else {
        try {
            const encoded = encodeURIComponent(game.name);
            const { data } = await apiGet(`/streams/list?game=${encoded}&limit=100`);
            activeGameVods = data.streams || [];
        } catch(e) { console.error("Failed to load game videos", e); }
    }

    const targetGameLower = game.name.toLowerCase();
    
    // [UPDATED] Deprecated Bunny Filter Removed.
    // We trust the backend is sending us clean, YouTube-only data now.
    const filteredContent = activeGameVods; 

    const gameVods = filteredContent.filter(v => !v.type || v.type === 'vod').sort((a, b) => (b.created_at || b.createdAt) - (a.created_at || a.createdAt));
    const gameVideos = filteredContent.filter(v => v.type === 'video').sort((a, b) => (b.created_at || b.createdAt) - (a.created_at || a.createdAt));
    const gameClips = clipsData.filter(c => {
        if (c.game) return c.game.toLowerCase() === targetGameLower;
        return (c.title || "").toLowerCase().includes(targetGameLower);
    });

    // Update Counts
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
export function playVideo(item, type) {
    activeVideoItem = item; activeVideoType = type;
    const stage = document.getElementById('videoStage');
    if(stage) stage.classList.remove('hidden');
    if(stage) stage.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('meta-title').textContent = item.title || "Untitled";
    document.getElementById('meta-date').textContent = new Date(item.createdAt || item.created_at).toLocaleDateString();
    
    let tagLabel = "Broadcast Archive";
    if(type === 'clip') tagLabel = "Live Clip";
    else if (item.vod_provider === 'youtube' || item.youtube_id) tagLabel = "Archive (YouTube)";
    document.getElementById('meta-tag').textContent = tagLabel;
    
    const btnDownload = document.getElementById('btn-download');
    const qualitySelect = document.getElementById('videoQualitySelect');
    if(qualitySelect) qualitySelect.style.display = 'none'; 

    const videoParent = mainVideoPlayer.parentNode;
    const existingBunny = document.getElementById('nexus-bunny-embed');
    const existingYt = document.getElementById('nexus-youtube-embed');
    if(existingBunny) existingBunny.remove();
    if(existingYt) existingYt.remove();
    
    mainVideoPlayer.style.display = 'none'; mainVideoPlayer.src = "";
    if(btnDownload) btnDownload.style.display = 'none'; 

    // YOUTUBE PLAYER LOGIC (Primary)
    if (item.vod_provider === 'youtube' || item.youtube_id) {
        const yId = item.id || item.youtube_id; // Handle legacy prop names
        
        const wrapper = document.createElement('div');
        wrapper.id = 'nexus-youtube-embed';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.backgroundColor = '#000';
        wrapper.style.position = 'relative';
        wrapper.style.cursor = 'pointer';
        wrapper.style.backgroundImage = `url('https://img.youtube.com/vi/${yId}/maxresdefault.jpg')`;
        wrapper.style.backgroundSize = 'cover';
        wrapper.style.backgroundPosition = 'center';

        const playBtn = document.createElement('div');
        playBtn.innerHTML = "▶";
        playBtn.style.position = 'absolute';
        playBtn.style.top = '50%';
        playBtn.style.left = '50%';
        playBtn.style.transform = 'translate(-50%, -50%)';
        playBtn.style.fontSize = '60px';
        playBtn.style.color = '#fff';
        playBtn.style.textShadow = '0 0 20px rgba(0,0,0,0.5)';
        playBtn.style.pointerEvents = 'none'; 
        wrapper.appendChild(playBtn);

        wrapper.onclick = () => {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${yId}?autoplay=1&rel=0&modestbranding=1&origin=${window.location.origin}`;
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            iframe.style.width = '100%'; 
            iframe.style.height = '100%'; 
            iframe.style.border = 'none';
            wrapper.innerHTML = ''; 
            wrapper.appendChild(iframe);
        };

        videoParent.appendChild(wrapper);
        return;
    }

    // CLOUDFLARE PLAYER LOGIC (For clips or legacy manual uploads)
    if (item.url) {
        mainVideoPlayer.style.display = 'block';
        if (Hls.isSupported() && item.url.endsWith('.m3u8')) {
            const hls = new Hls(); hls.loadSource(item.url); hls.attachMedia(mainVideoPlayer);
        } else { mainVideoPlayer.src = item.url; }
        mainVideoPlayer.play().catch(e => console.log("Autoplay blocked", e));
        if(btnDownload) { btnDownload.href = item.url; btnDownload.style.display = 'inline-block'; }
    }
}

export function handleVideoClick(id, type) {
    let item = vodsData.find(i => i.id === id);
    if(type === 'clip') item = clipsData.find(i => i.id === id);
    
    if (!item && activeGameVods.length > 0) {
        item = activeGameVods.find(i => i.id === id);
    }

    if(item) playVideo(item, type);
    else console.warn("Video not found:", id);
}

export function closeVideoStage() {
    const stage = document.getElementById('videoStage');
    if(stage) stage.classList.add('hidden');
    const existingBunny = document.getElementById('nexus-bunny-embed');
    const existingYt = document.getElementById('nexus-youtube-embed');
    if(existingBunny) existingBunny.remove();
    if(existingYt) existingYt.remove();
    if(mainVideoPlayer) { mainVideoPlayer.pause(); mainVideoPlayer.src = ""; }
}

export function shareActiveVideo() {
    if (!activeVideoItem) return;
    const url = new URL(window.location.origin);
    if (activeVideoType === 'vod') url.searchParams.set('vod', activeVideoItem.id);
    else url.searchParams.set('clip', activeVideoItem.id);
    const shareUrl = url.toString();
    navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.getElementById('btn-share');
        if(btn) { btn.innerText = "Copied!"; setTimeout(() => btn.innerText = "Share", 2000); } 
        else alert("Link copied!");
    }).catch(() => prompt("Copy this link:", shareUrl));
}

export function toggleMainView(mode) {
    const liveEls = document.querySelectorAll('.live-view');
    const videoCol = document.querySelector('.video-view'); 
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

// [NEW] Refresh Metadata Logic
window.refreshGameMetadata = async function(gameName) {
    const btn = document.activeElement;
    const oldText = btn ? btn.innerText : "↻ Info";
    if(btn) { btn.innerText = "Wait..."; btn.disabled = true; }

    try {
        const { data } = await apiPost('/played/refresh-metadata', { name: gameName });
        
        if (data && data.success) {
            alert(`Updated!\n\nDeveloper: ${data.data.developer}\nRelease: ${data.data.release_date}`);
            
            // 1. Update the Local Data Cache
            const game = allPlayedGames.find(g => g.name === gameName);
            if(game) {
                game.summary = data.data.summary;
                game.developer = data.data.developer;
                game.publisher = data.data.publisher;
                game.release_date = data.data.release_date;
                game.steam_url = data.data.steam_url;
                if (data.data.cover) game.cover = data.data.cover;
            }

            // 2. Re-open the details view to show new data immediately
            openGameDetails(gameName); 
        } else {
            console.warn("Refresh failed:", data);
            alert("Could not find game info on IGDB.");
        }
    } catch(e) {
        console.error(e);
        alert("Error refreshing metadata.");
    } finally {
        if(btn) { btn.innerText = oldText; btn.disabled = false; }
    }
};

export async function promptRenameGame() {
    const oldNameElement = document.getElementById('heroTitle');
    const oldName = oldNameElement ? oldNameElement.innerText : "";
    if(!oldName) return;
    const newName = prompt(`Rename folder "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    if (!confirm(`This will update all videos in "${oldName}" to "${newName}".\n\nProceed?`)) return;

    let fullList = [];
    try {
         const encoded = encodeURIComponent(oldName);
         const { data } = await apiGet(`/streams/list?game=${encoded}&limit=500`);
         fullList = data.streams || [];
    } catch(e) {}

    if (fullList.length === 0) { alert("No videos found to move."); return; }

    let successCount = 0;
    for (const v of fullList) {
        try {
            await apiPost('/streams/update', { id: v.id, title: v.title, game: newName, youtubeId: v.youtube_id, isExclusive: v.is_exclusive });
            successCount++;
        } catch(e) { console.error("Failed to move", v.title, e); }
    }
    const newGameExists = allPlayedGames.find(g => g.name.toLowerCase() === newName.toLowerCase());
    if (!newGameExists) { allPlayedGames.push({ name: newName, cover: fullList[0].thumbnail_url || PLACEHOLDER_IMG, isVirtual: true }); }
    const oldIdx = allPlayedGames.findIndex(g => g.name.toLowerCase() === oldName.toLowerCase());
    if (oldIdx > -1) allPlayedGames.splice(oldIdx, 1);
    allPlayedGames.sort((a,b) => a.name.localeCompare(b.name));
    alert(`Successfully moved ${successCount} videos!`);
    loadVods(); 
    openGameDetails(newName);
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
            const heroBg = document.getElementById('heroBg'); const heroCover = document.getElementById('heroCover');
            if(heroCover) heroCover.src = data.cover; if(heroBg) heroBg.style.backgroundImage = `url('${data.cover}')`;
            const localGame = allPlayedGames.find(g => g.name.toLowerCase() === gameName.toLowerCase());
            if (localGame) { localGame.cover = data.cover; localGame.isVirtual = false; } else { allPlayedGames.push({ name: gameName, cover: data.cover }); }
            renderHubGames(document.getElementById('hubSearchInput')?.value || "");
            alert("Cover updated!");
        } else { alert("Failed to update cover."); }
    } catch(e) { alert("Error updating cover."); }
}

export async function promptDeleteGame() {
    const titleEl = document.getElementById('heroTitle');
    if (!titleEl) return;
    const gameName = titleEl.innerText;
    const game = allPlayedGames.find(g => g.name === gameName);
    if (!game) return;
    if (game.isInbox) { alert("You cannot delete the Inbox."); return; }
    if (!confirm(`Are you sure you want to delete the folder "${gameName}"?\n\nThis does NOT delete videos, only the folder entry.`)) return;
    if (game.__index === undefined || game.__index === -1) { alert("Cannot delete (virtual folder). Refresh page."); return; }
    try {
        const { res } = await apiPost('/played/delete', { index: game.__index });
        if (res.ok) {
            alert("Folder deleted!");
            await loadGames();
            openHubHome();
        } else { alert("Failed to delete."); }
    } catch(e) { alert("Error deleting folder."); }
}

// --- LEGACY SIDEBAR GAMES LIST ---
function renderPlayedGames(list) {
  const gamesPlayedEl = document.getElementById("gamesPlayed");
  if (!gamesPlayedEl) return;
  gamesPlayedEl.innerHTML = list.map(g => {
    const isCurrent = currentGameName && (g.name || "").toLowerCase() === currentGameName.toLowerCase();
    return `<div class="game-card ${isCurrent ? "current-game" : ""}" tabindex="0" role="button" onclick="window.handleGameCardClick(this)" data-name="${escapeHtml(g.name)}" data-desc="${escapeHtml(g.description || "")}" data-cover="${escapeHtml(g.cover || "")}" data-steam="${escapeHtml(g.steamUrl || "")}"><div class="game-thumb"><img loading="lazy" src="${g.cover}" alt="${escapeHtml(g.name)}"></div></div>`;
  }).join("");
}

export function updatePlayedGamesList(gameName) {
  if (!gameName) return; 
  const isSameGame = currentGameName && gameName.toLowerCase() === currentGameName.toLowerCase();
  const isAlreadyFirst = allPlayedGames.length > 0 && (allPlayedGames[0].name || "").toLowerCase() === gameName.toLowerCase();
  if (isSameGame && isAlreadyFirst) { return; }
  currentGameName = gameName; 
  let foundIndex = allPlayedGames.findIndex(g => (g.name || "").toLowerCase() === gameName.toLowerCase());
  if (foundIndex > -1) { const game = allPlayedGames.splice(foundIndex, 1)[0]; allPlayedGames.unshift(game); } 
  else { allPlayedGames.unshift({ name: gameName, cover: "https://via.placeholder.com/300x450?text=" + encodeURIComponent(gameName), __index: -1 }); }
  renderPlayedGames(allPlayedGames);
}

export function handleGameCardClick(el) {
    const gameInfoModalEl = document.getElementById("gameInfoModal");
    if(!gameInfoModalEl) return;
    document.getElementById("gameInfoTitle").innerText = el.dataset.name; 
    document.getElementById("gameInfoCover").src = el.dataset.cover; 
    document.getElementById("gameInfoText").innerText = el.dataset.desc || "No description available.";
    const btn = document.getElementById("gameSteamBtn");
    if(el.dataset.steam) { btn.style.display = "inline-block"; btn.href = el.dataset.steam; } else { btn.style.display = "none"; }
    gameInfoModalEl.classList.add("open");
}
// Attach to window so onclick attributes work
window.openGameDetails = openGameDetails;
window.openHubHome = openHubHome;
window.handleVideoClick = handleVideoClick;
window.promptRenameGame = promptRenameGame;
window.promptChangeCover = promptChangeCover;
window.promptDeleteGame = promptDeleteGame;
window.handleGameCardClick = handleGameCardClick;